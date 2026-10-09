# PR 474 — Fix amqp durable discussion in docs

**Repo:** galaxyproject/pulsar · **PR:** #474 · **Author:** mvdbeek · **Head:** `df2984b3f6892869e78e781a57bf20040eafc4ed` · **Base:** `master`

Docs-only change to `docs/error_handling.rst` (27+/19-) correcting the `amqp_durable` discussion, which claimed the flag was opt-in/off-by-default. The code has said otherwise since commit `91945e2` ("Restore durable AMQP queues by default"), and both the wrong default (`0463d37`) and its revert (`91945e2`) shipped inside release 0.15.15 — so the *released* docs describe a default that the *released* code never had. Every factual claim in the new prose that can be checked against the tree checks out, including the non-obvious "the consumer then dies on startup" claim. **Verdict: correct, merge-worthy.** No P1s. Three P2s, all of the "incomplete, not wrong" variety: the option is still absent from `app.yml.sample` (the canonical surface both `configure.rst` and `galaxy_conf.rst` point admins at), and the rewritten migration note omits both the shared `pulsar` exchange and the Galaxy-side half of the config.

## What changed

1. `amqp_durable` bullet rewritten: "off by default" → "**on by default**", with a new paragraph explaining the `false` opt-out and warning against it on RabbitMQ 4.x.
2. The migration `.. note::` reframed from one-directional ("to enable durable queues…") to bidirectional ("not a hot flip in *either* direction"), plus a queue-naming gloss.
3. Cheat-sheet rows (§9) relabelled: `(amqp_durable: true)` → `(default, durable)`; `(default, non-durable)` → `(durability opted out)`.
4. Tunables table (§11): `amqp_durable` default `false` → `true`.

## Verification against the code

Worktree: `/Users/jxc755/projects/worktrees/pulsar/pr/474`.

> "``amqp_durable`` (**on by default**)"

Confirmed twice. `pulsar/client/amqp_exchange_factory.py:20` — `durable_param = params.get("amqp_durable", True)`; and the constructor default `durable=True` at `pulsar/client/amqp_exchange.py:77`. Tests pin both: `test/amqp_test.py:77` and `test/amqp_test.py:116`.

> "declares the ``pulsar`` exchange and every per-name queue with ``durable=true``"

Confirmed. Exchange name is `DEFAULT_EXCHANGE_NAME = "pulsar"` (`pulsar/client/amqp_exchange.py:32`), declared durable at `pulsar/client/amqp_exchange.py:104`; every queue gets `durable=self.__durable` at `pulsar/client/amqp_exchange.py:333`.

> "and stamps publishes with ``delivery_mode=2`` (persistent)"

Confirmed as a description of the code: `pulsar/client/amqp_exchange.py:312` sets `publish_kwds["delivery_mode"] = 2` only when `self.__durable` and the caller hasn't already supplied one. See finding 6 for why this is less consequential than it reads.

> "This matches kombu's own default, which is what Pulsar relied on before the flag existed."

Confirmed empirically against kombu 5.6.2: `kombu.Exchange('pulsar','direct').durable` is `True` and `kombu.Queue('x', e).durable` is `True`. Pre-`0463d37` Pulsar passed no `durable=` argument at all, so legacy behaviour was durable. This is the crux of the PR and it is right.

> "**Do not set it on RabbitMQ 4.x**, which rejects such queues outright (``Queue.declare`` fails with ``INTERNAL_ERROR``, "Feature ``transient_nonexcl_queues`` is deprecated")"

**Partially unverified.** Nothing in the Pulsar tree exercises a real RabbitMQ 4.x transient-queue declare — the resilience suite (`test/resilience/config/app_amqp.yml:15`) sets `amqp_durable: true`, so the failure path is never hit. The claim's only in-repo provenance is the commit message of `91945e2`, which reports it from debugging Galaxy's `test_pulsar_embedded_mq` hangs. It is consistent with upstream RabbitMQ 4.0 removing the `transient_nonexcl_queues` deprecated feature. I did not independently reproduce the error code; treat `INTERNAL_ERROR` as author-reported rather than repo-verified.

> "the consumer then dies on startup and jobs are never picked up"

**Confirmed, and this is the strongest part of the new text.** `amqp.exceptions.InternalError` (code 541) has MRO `InternalError → IrrecoverableConnectionError → ConnectionError → AMQPError → Exception` — note it is *not* an `OSError` subclass, and `IrrecoverableConnectionError` is not among the `recoverable_exceptions` tuple at `pulsar/client/amqp_exchange.py:86-97`. So a declare failure inside `consume()` falls through to `except BaseException:` at `pulsar/client/amqp_exchange.py:155-157`, which logs and re-raises. The consumer threads are unsupervised daemons (`pulsar/messaging/bind_amqp.py:98-106`) with nothing restarting them, so Pulsar stays up while setup/kill/status consumption is dead. "Jobs are never picked up" is literally accurate.

> "queues are named ``pulsar_<manager>__<name>``, or ``pulsar__<name>`` for the default manager"

Confirmed. `__key_prefix()` (`pulsar/client/amqp_exchange.py:342-350`) returns `pulsar_` for manager `_default_` and `pulsar_<manager>_` otherwise; `__queue_name()` (`pulsar/client/amqp_exchange.py:337-340`) then joins with `_`, giving the doubled underscore. The `rabbitmqctl delete_queue pulsar__setup` example is correct for the default manager. Incomplete — see finding 4.

> "RabbitMQ refuses to redeclare an existing queue with mismatched durability."

Correct (AMQP `PRECONDITION_FAILED`, 406). Incomplete with respect to the exchange — see finding 2.

**Claims the old text made that the new text drops:** the only substantive one is *"The default is `false` so existing deployments with non-durable queues keep working."* Dropping it is correct — that rationale was the actual bug `91945e2` fixed (pre-flag deployments had *durable* queues, so `false` broke them rather than preserving them). Nothing correct was lost.

**Untouched claims spot-checked and still accurate:** `amqp_publish_retry` bounded defaults `max_retries: 5, interval_start: 1, interval_step: 2, interval_max: 30` match `DEFAULT_PUBLISH_RETRY_POLICY` (`pulsar/client/amqp_exchange_factory.py:45-50`); `amqp_consumer_timeout` default `0.2` matches `DEFAULT_TIMEOUT` (`pulsar/client/amqp_exchange.py:35`); `amqp_acknowledge` default off matches `pulsar/client/amqp_exchange_factory.py:24`.

## Findings

1. **P2 — `amqp_durable` is still missing from `app.yml.sample`, the canonical config surface.** This is the reuse/canonical-location problem, not a new-abstraction one. `docs/configure.rst:223` tells operators the `amqp_publish*` options are "documented in `app.yml.sample`_", and `docs/galaxy_conf.rst:75` states "All of the ``amqp_*`` options documented in `app.yml.sample`_ can be specified" in a Galaxy destination. `app.yml.sample` documents `amqp_consumer_timeout`, `amqp_publish_timeout`, `amqp_acknowledge`, `amqp_ack_republish_time`, the `amqp_connect_ssl_*` family and the `amqp_publish_retry*` family — but not `amqp_durable`. An admin following the documented route never learns the option exists; only `error_handling.rst`, a resilience narrative, mentions it. This PR is exactly the right moment to add the commented stanza (`#amqp_durable: true`) with a one-line "opt out only on pre-4.x brokers" comment. Pre-existing gap from `0463d37`, but the PR titles itself "Fix amqp durable discussion in docs".

2. **P2 — the migration note tells you to delete the queues but not the exchange, and the exchange carries the same flag.** `pulsar/client/amqp_exchange.py:104-106` declares the shared `pulsar` exchange with `durable=self.__durable`, and it is re-declared on every publish (`declare=[self.__exchange]`, `pulsar/client/amqp_exchange.py:244`). Flipping `amqp_durable` therefore hits a `PRECONDITION_FAILED` on the *exchange* redeclare even after every `pulsar__*` queue has been deleted. Follow the note as written and the migration fails at the second step. Add the exchange to the drain/delete instruction, and note that `pulsar` is shared across all managers on that vhost, so deleting it is not a per-manager operation.

3. **P2 — the note is Pulsar-side only; the Galaxy side declares through the same factory.** `pulsar/client/manager.py:189` calls the same `get_exchange(self.url, self.manager_name, kwds)` with Galaxy destination params, so `amqp_durable` is read on both ends. A one-sided flip (Pulsar's `app.yml` but not the Galaxy destination, or vice versa) produces exactly the mismatched-declare failure the note is warning about, with no queue deletion able to fix it. Given `docs/galaxy_conf.rst:75` explicitly invites setting `amqp_*` on the Galaxy destination, the note should say both sides must agree.

4. **P3 — the queue-naming gloss is incomplete in two ways.** It omits `amqp_key_prefix`, which replaces the whole `pulsar[_manager]_` prefix (`pulsar/client/amqp_exchange.py:342-345`) — a deployment using it has no `pulsar__*` queues at all, so the `rabbitmqctl` example silently doesn't apply. It also omits the `<name>_ack` queues created when `amqp_acknowledge` is on (`ACK_QUEUE_SUFFIX`, `pulsar/client/amqp_exchange.py:42`), which are declared with the same durability and need the same treatment.

5. **P3 — stale conditional left in the cheat sheet.** `docs/error_handling.rst:366` still reads `outbox (+ durable queues if enabled)`. Every other row was updated to the new "default, durable" framing; this one preserves the opt-in phrasing the PR is removing. Suggest `outbox + durable queues`.

6. **P3 — the `delivery_mode=2` framing overstates what the flag controls.** kombu resolves an unspecified delivery mode to `PERSISTENT_DELIVERY_MODE = 2` (verified: `kombu.messaging.Producer._delivery_details` → `maybe_delivery_mode(..., default=PERSISTENT_DELIVERY_MODE)` returns `2` for a bare `Exchange`). So with `amqp_durable: false`, Pulsar stops *passing* `delivery_mode` (`pulsar/client/amqp_exchange.py:312`) but kombu still publishes persistent. The flag's real effect is queue/exchange durability alone. The doc isn't false, but a reader will infer message persistence hangs off this flag when it doesn't. Same overstatement in `test/amqp_test.py:109` (`test_non_durable_publishes_do_not_force_persistent_mode`), which asserts an implementation detail with no observable broker-side consequence — not this PR's doing, worth knowing.

7. **P3 — `LP1` is a dangling reference.** `docs/error_handling.rst:143` says "the publisher-side leak (LP1)" and `LP1` appears nowhere else in the file (or the repo). Pre-existing, survived the rewrite of the surrounding bullet; either expand it inline or drop the tag.

8. **P3 — adjacent, not in this PR: function-level imports in `test/amqp_test.py`.** Lines 117, 125, 135, 145, 157, 166 and 176 each import from `pulsar.client.amqp_exchange_factory` inside the test body, with no comment explaining why. `pulsar/client/amqp_exchange.py` is already imported at module top (line 8) and there's no import-cycle or optional-dependency reason for the split — `skip_unless_module("kombu")` guards the kombu dependency at decoration time, and the non-guarded tests at lines 153-189 import the factory too. Introduced by `0463d37`/`91945e2`; if the branch gets touched again, hoisting them is a one-line cleanup.

9. **P3 — §11's tunables table duplicates `app.yml.sample` rather than referencing it.** Six of its ten rows restate defaults already documented (or documentable) in the sample config, and this PR had to hand-edit one of them to keep it in sync — precisely the drift cost duplication buys. Not worth blocking on, but the sustainable shape is for `error_handling.rst` to explain *why* each knob matters and link to `app.yml.sample` for defaults, so there's one source of truth for the values.

## Verdict

**Approve.** The core correction is right and well-motivated: the released 0.15.15 docs described `amqp_durable` as off-by-default when the released 0.15.15 code defaults it on, and the new text's causal explanation (kombu defaults durable; `0463d37` inverted rather than preserved legacy behaviour; RabbitMQ 4.x then kills the consumer) matches the code path by path. Nothing correct was dropped from the old text.

The gaps are all completeness, not correctness. Finding 2 is the one I'd want addressed before merge, because it makes the migration instruction fail in practice for anyone who follows it; findings 1 and 3 are the difference between "documented somewhere" and "discoverable where operators look." None of these justify holding a correct fix hostage — if the author prefers, 1/2/3 are a clean follow-up.

One thing to keep in mind if the RabbitMQ 4.x warning is ever challenged: it is the author's field report from `91945e2`, not something this repo tests. A resilience scenario asserting the `amqp_durable: false` declare failure against the suite's real RabbitMQ would turn the doc's most load-bearing warning into something CI defends.
