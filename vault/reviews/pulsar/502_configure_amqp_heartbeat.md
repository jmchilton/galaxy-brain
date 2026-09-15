# PR 502 — Support configuring the AMQP heartbeat interval, or disabling heartbeats

**Repo:** galaxyproject/pulsar · **PR:** [#502](https://github.com/galaxyproject/pulsar/pull/502) (jmchilton, opened 2026-09-13) · **Supersedes:** [#357](https://github.com/galaxyproject/pulsar/pull/357) (natefoo, opened 2024-03-26, never merged) · **Original commit:** `d340cdd` · **Rescue commit:** `f700db8` on `rescue-357-amqp-heartbeat` · **Rebase base:** `323a1bd` (`origin/master`) · **Reviewed:** 2026-09-12

The idea is right and the option is one Pulsar should have. The implementation is not merge-ready. Two defects will bite real deployments: the new code writes into `consume()`'s **mutable default argument**, so a heartbeat set by one `PulsarExchange` leaks into every later `consume()` call in the process — including one on an exchange whose operator explicitly disabled heartbeats, which then negotiates a heartbeat with the broker while starting no thread to send one (verified empirically, see Verification). And `amqp_heartbeat` is fed to kombu **without type coercion**, so a string value — the shape Galaxy's XML job config and Pulsar's ini config hand over, and the shape `amqp_durable` and every numeric `amqp_*` param already coerce for exactly this reason — raises `TypeError` inside py-amqp's tune handshake, which is *not* in `recoverable_exceptions` and therefore kills the consumer thread permanently. Note `"0"` is truthy, so the documented "set to 0 to disable" recipe is the worst case. Beyond that: heartbeats still don't apply to the publish path (pre-existing, but it's the case the PR body's firewall motivation actually describes), the factory line is a fourth competing idiom for parsing `amqp_*` params rather than a reuse of the two that exist, there are no tests, and `docs/error_handling.rst` — which didn't exist in 2024 — is left stale. **Verdict: do not push as-is.** Findings 1, 2 and 5 are small, mechanical fixes; the rebase itself is clean.

## What changed

1. `DEFAULT_HEARTBEAT = 580` (already present at `pulsar/client/amqp_exchange.py:37`) becomes the default of a new `heartbeat` kwarg on `PulsarExchange.__init__`, stored as `self.__heartbeat`.
2. `consume()` stops hard-coding `heartbeat=DEFAULT_HEARTBEAT` on the connection. Instead it writes `connection_kwargs["heartbeat"] = self.__heartbeat` when the value is truthy, and only starts the heartbeat thread when truthy.
3. `amqp_exchange_factory.get_exchange()` maps `params["amqp_heartbeat"]` onto the kwarg `if params.get("amqp_heartbeat") is not None`.
4. Docs: a 3-line stanza in `app.yml.sample` and a paragraph plus link target in `docs/configure.rst`.

Net: 18 insertions, 2 deletions across four files. No tests.

## Verification

Worktree: `/Users/jxc755/projects/worktrees/pulsar/branch/rescue-357-amqp-heartbeat`. Library behaviour checked against kombu 5.6.2 / py-amqp 5.3.1 (`/Users/jxc755/projects/worktrees/pulsar/branch/terminal-job-statuses/.venv`); the rescue worktree has no venv of its own.

**The rebase is faithful.** `git show d340cdd` (shared clone `/Users/jxc755/projects/repositories/pulsar`) against `git show f700db8`: the four hunks are semantically identical. The `__init__` conflict resolved correctly — `durable=True` (master, `91945e2`) is retained at `pulsar/client/amqp_exchange.py:78` with `heartbeat=DEFAULT_HEARTBEAT` appended at `:79`; `self.__durable = bool(durable)` and the durable `kombu.Exchange(...)` at `:105-108` survive intact. The `docs/configure.rst` conflict also resolved sensibly: the original landed the paragraph before "Caching (Experimental)", the rescue lands it at `docs/configure.rst:225-227`, still immediately after the `amqp_publish*` paragraph and before master's new "Message Queue (pulsar-relay)" heading at `:229`. Master's relay section is untouched. The `.. _AMQP heartbeats:` target went to the end of the link block at `:568`. Nothing from master was dropped.

**kombu's default for an omitted `heartbeat` is `0`, identical to passing `0`.** `kombu.Connection.__init__` signature: `heartbeat=0`, stored verbatim in `_initial_params`. So the PR's "only pass it when truthy" idiom is not, by itself, a behaviour change versus passing `heartbeat=0` — there is no "omit vs zero" distinction to worry about.

**py-amqp treats a falsy client heartbeat as a hard disable, not "let the server decide."** `amqp/connection.py:362-377` — `_on_tune` computes `max(server, client)` when either is 0, but then `if not self.client_heartbeat: self.heartbeat = 0`. Simulated over the real class:

```
580   -> negotiated 60     (server proposed 60)
0     -> negotiated 0
False -> negotiated 0
None  -> negotiated 0
```

So YAML `amqp_heartbeat: false` and `amqp_heartbeat: 0` genuinely disable heartbeats in both directions. That half of the docs is accurate.

**A string value raises `TypeError` in the same function.** Same simulation:

```
'580' -> TypeError: '<' not supported between instances of 'str' and 'int'
'0'   -> TypeError: '<' not supported between instances of 'str' and 'int'
```

(`min(self.server_heartbeat, client_heartbeat)` at `amqp/connection.py:373`; with a broker that proposes 0 it's the `max()` at `:371` and the error is `'>'`.) This fires during connection establishment, inside `consume()`'s `with self.connection(...)`. `TypeError` is absent from `self.recoverable_exceptions` (`pulsar/client/amqp_exchange.py:88-99`), so it lands in `except BaseException` at `:161-163`, which logs and re-raises. Consumer threads in `pulsar/messaging/bind_amqp.py` are unsupervised, so that queue is dead for the life of the process.

**The mutable-default leak, reproduced.** Spying on `PulsarExchange.connection` and driving one `consume()` iteration each on two exchanges:

```python
a = PulsarExchange(URL, "mgr_a")                 # default heartbeat 580
a.consume("q1", callback=None, check=Stop())
b = PulsarExchange(URL, "mgr_b", heartbeat=0)    # heartbeats explicitly off
b.consume("q2", callback=None, check=Stop())
```

```
connection kwargs seen: [{'heartbeat': 580}, {'heartbeat': 580}]
shared default dict now: (True, {'heartbeat': 580})
```

`b` — configured with heartbeats off — opened its connection with `heartbeat=580`, and `PulsarExchange.consume.__defaults__` now permanently carries the pollution for the whole process. `pulsar/client/amqp_exchange.py:147-148` only ever *sets* the key; nothing clears it.

**Why that combination is worse than either setting alone.** Outbound heartbeat frames are only ever sent from `heartbeat_tick` (`amqp/connection.py:715`), reachable solely via `kombu.Connection.heartbeat_check()` → `kombu/transport/pyamqp.py:221-222`. Pulsar calls `heartbeat_check()` in exactly one place: the heartbeat thread body at `pulsar/client/amqp_exchange.py:218`. The leaked path negotiates a heartbeat with the broker *and skips the thread* (`:152-153` is guarded by the same falsy `self.__heartbeat`), so nothing sends heartbeats on an idle queue. RabbitMQ closes the connection after two missed intervals; that surfaces as `amqp.exceptions.ConnectionForced`, which *is* in `recoverable_exceptions` (`:95`), so the consumer silently reconnect-churns every ~2× the negotiated interval forever.

**Heartbeats still do not apply to the publish path.** `publish()` opens its connection at `pulsar/client/amqp_exchange.py:242` as `self.connection(self.__url)` with no kwargs, and `connection()` (`:328-331`) only injects `ssl`. Producer connections come from `kombu.pools.producers` (`:243`) and are long-lived and idle between jobs. This was true before the PR too — `DEFAULT_HEARTBEAT` was only ever on the consume connection — so it is not a regression, but it means the option does not address the motivation in the PR body ("keeping connections alive across firewalls"), which is a publisher-side concern on the Galaxy end.

**Existing param-parsing idioms, for the reuse question.** There are already three, none reused here:

- `pulsar/client/amqp_exchange_factory.py:28-30` — sentinel: `timeout = params.get('amqp_consumer_timeout', False); if timeout is not False:`. No coercion.
- `pulsar/client/amqp_exchange_factory.py:20-23` — explicit inline string coercion for `amqp_durable`, with a comment, added by `91945e2`.
- `pulsar/messaging/bind_amqp.py:17-25` — `TYPED_PARAMS`, a table mapping `amqp_consumer_timeout`, `amqp_publish_timeout`, `amqp_publish_retry` and the four `amqp_publish_retry_*` ints to coercion callables, applied in `bind_amqp.get_exchange()` under the comment "HACK: Fixup non-string parameters".

Crucially, `TYPED_PARAMS` runs **only on the Pulsar server side**. The Galaxy side reaches the factory directly (`pulsar/client/manager.py:25` imports `get_exchange` from `amqp_exchange_factory`; called at `:188`), bypassing it entirely — which is precisely why `amqp_durable`'s coercion had to live in the factory instead. `docs/galaxy_conf.rst:75` says "All of the ``amqp_*`` options documented in `app.yml.sample`_ can be specified as parameters under a ``PulsarMQJobRunner`` runner", so adding `amqp_heartbeat` to `app.yml.sample` makes it a Galaxy-destination param by documented contract.

**Test coverage: none.** `test/amqp_test.py` has no heartbeat test. It does have the exact template the heartbeat param needs — `test_factory_defaults_durable_true` (`:114-119`), `test_factory_respects_amqp_durable_false` (`:122-129`) and `test_factory_respects_amqp_durable_string_true` (`:142-149`), the last of which exists only because of the string problem described above. The resilience suite (`test/resilience/`) never sets `amqp_heartbeat` (`test/resilience/config/app_amqp.yml` sets `amqp_durable` and `amqp_publish_retry` only).

**`docs/error_handling.rst` never mentions heartbeats**, despite §3 "AMQP durability defenses" (`:124-164`) cataloguing `amqp_durable` / `amqp_publish_retry` / `amqp_acknowledge`, and §11's tunables table (`:389-401`) listing `amqp_consumer_timeout` at 0.2s. Meanwhile the resilience harness encodes the heartbeat default as an operational fact in two places: `test/resilience/harness/pulsar_control.py:144-150` ("RabbitMQ doesn't notice the TCP drop until the AMQP heartbeat times out (default 580s)") and `:324-328` ("the broker won't drop the dead consumer until heartbeat timeout (~580s by default)").

**"580 seconds" is not the effective interval on any modern broker.** `_on_tune` takes `min(client, server)` when both are non-zero; the simulation above shows client 580 negotiating down to 60 against a server proposing 60. RabbitMQ's default `heartbeat` has been 60 since 3.5.5, and the resilience suite runs stock `rabbitmq:3-management` (`test/resilience/docker-compose.yml:17-18`). 580 is the *old* RabbitMQ default, which is presumably where Pulsar's constant came from.

**Typing.** `pulsar/client/amqp_exchange.py` has exactly one annotation — `__handle_io_error(self, exc: BaseException, heartbeat_thread: Optional[threading.Thread] = None)` at `:201`. `__init__` is entirely unannotated. mypy runs in CI (`.github/workflows/pulsar.yaml:30,36`, tox env `mypy`) but `mypy.ini` sets no `disallow_untyped_defs`, and kombu/amqp are both `ignore_missing_imports`.

## Findings

1. **P1 — `connection_kwargs={}` is a mutable default and the new code writes into it, leaking heartbeat settings across every exchange in the process.** `pulsar/client/amqp_exchange.py:139` declares the default; `:147-148` mutates it. Because the default dict is created once at function-definition time, it is shared by every `PulsarExchange` instance and every `consume()` call. Once any exchange with a truthy heartbeat consumes, the key sticks forever, and nothing ever removes it — so an exchange configured with `amqp_heartbeat: 0` gets `heartbeat=580` on the wire while skipping the heartbeat thread. Reproduced above. The failure mode is not "disable didn't work", it's worse than either endpoint: a negotiated heartbeat with no sender means RabbitMQ drops the connection every ~2 intervals and the consumer reconnect-churns indefinitely. Realistic trigger on the Galaxy side, where `docs/files/job_conf_sample_mq.yml` itself ships two `PulsarMQJobRunner` runners, each building its own `MessageQueueClientManager` and therefore its own exchange (`pulsar/client/manager.py:188`). Also hit by `test/amqp_test.py:20-23`, which builds four exchanges in one process.

   The cleanest fix keeps the pre-PR shape and is a one-line delta from master — don't touch `connection_kwargs` at all:

   ```python
   with self.connection(self.__url, heartbeat=self.__heartbeat or 0, **connection_kwargs) as connection:
   ```

   If the intent is for a caller-supplied `connection_kwargs` to be able to override, then change the default to `None` and copy defensively (`connection_kwargs = dict(connection_kwargs or {})`) before `setdefault`. Either way the mutable default should go; it is a latent trap independent of this feature, and no caller passes `connection_kwargs` today (`grep` finds only the definition).

2. **P1 — a string-valued `amqp_heartbeat` kills the consumer thread, and `"0"` is truthy.** `pulsar/client/amqp_exchange_factory.py:26-27` guards on `is not None` and passes the value through untouched; `consume()` then guards on truthiness. A string reaches py-amqp's `_on_tune` and raises `TypeError`, which is not in `recoverable_exceptions` and so re-raises out of `consume()` and terminates the thread permanently (evidence above). Both `"580"` and `"0"` fail, and `"0"` additionally starts a heartbeat thread the operator asked not to have. Strings are the live vector for both entry points: Galaxy's XML `job_conf` yields strings for destination/runner params (the reason `amqp_durable` carries an explicit `isinstance(str)` branch at `:21-22` and a dedicated test at `test/amqp_test.py:142-149`), and Pulsar's own ini-derived `conf` is why `bind_amqp.TYPED_PARAMS` exists at all. Fix in the **factory**, not `bind_amqp` — `bind_amqp` is server-side only and `pulsar/client/manager.py:188` bypasses it. Something like:

   ```python
   heartbeat = params.get("amqp_heartbeat")
   if heartbeat is not None:
       exchange_kwds["heartbeat"] = 0 if str(heartbeat).strip().lower() in ("false", "none", "off", "no") else int(heartbeat)
   ```

   Belt-and-braces: also normalise in the constructor next to its sibling, `self.__durable = bool(durable)` at `pulsar/client/amqp_exchange.py:105` — e.g. `self.__heartbeat = int(heartbeat or 0)` — so direct `PulsarExchange(...)` construction (tests, `pulsar/mesos/framework.py`) can't pass a bad type either. That mirrors the local idiom exactly and makes finding 8 moot.

3. **P2 — the option only affects the consume path; the publish path never gets a heartbeat.** `pulsar/client/amqp_exchange.py:242` opens the publisher connection with no `heartbeat`, so kombu's `0` applies and the pooled producer connections (`:243`) have no keepalive. Pre-existing, not a regression — but it directly contradicts the PR body's motivation, since "keeping connections alive across firewalls" is about the idle Galaxy→broker publisher connection more than the consumer, which drains every 0.2s. Either extend the setting to `publish()` (pass `heartbeat=self.__heartbeat or 0` at `:242` — note the producer pool is keyed on the connection, so the value must be stable, which it is) or say plainly in the docs that `amqp_heartbeat` governs consumer connections only. Silently documenting it as "AMQP heartbeats are enabled" invites the wrong conclusion.

4. **P2 — the factory line is a fourth parsing idiom rather than a reuse of the two that exist, and it accretes.** `pulsar/client/amqp_exchange_factory.py:26-27` introduces `is not None`-passthrough alongside sentinel-`False` (`amqp_consumer_timeout`, `:28-30`), inline string coercion (`amqp_durable`, `:20-23`) and the `TYPED_PARAMS` table (`pulsar/messaging/bind_amqp.py:17-25`). For an old codebase this is the interesting part of the review: the right shape is to give `get_exchange()` a small typed-param table of its own — `{param name: (exchange kwarg, coercion, "unset" sentinel)}` — and move `TYPED_PARAMS` onto it, so the factory becomes the single place where `amqp_*` values are typed for *both* the Pulsar server and the Galaxy client. That would retire the `HACK` comment in `bind_amqp`, cover the Galaxy-side gap that forced `amqp_durable`'s inline branch, and make finding 2 impossible by construction for the next option anyone adds. A four-line refactor's worth of work, and this PR is the natural moment. If that's out of scope, at minimum follow `amqp_durable`'s precedent rather than inventing a fifth idiom. Nit within the same two lines: `params.get("amqp_heartbeat")` is called twice — bind it to a local.

5. **P2 — no test coverage, and the file has a ready-made template.** Following `test/amqp_test.py`'s existing style (`@skip_unless_module("kombu")`, `TEST_CONNECTION = "memory://test_amqp"`, name-mangled private access like `exchange._PulsarExchange__queue(...)`, and the one-shot `check` object idiom from `TestThread.__bool__` at `:53-56`), the set I'd want is:

   - `test_factory_defaults_heartbeat` — `get_exchange(TEST_CONNECTION, "factory_hb_default", {})`, assert `exchange._PulsarExchange__heartbeat == amqp_exchange.DEFAULT_HEARTBEAT`. Mirrors `test_factory_defaults_durable_true:114`.
   - `test_factory_respects_amqp_heartbeat_false` and `..._zero` — `{"amqp_heartbeat": False}` / `{"amqp_heartbeat": 0}`, assert the stored value is falsy. Mirrors `test_factory_respects_amqp_durable_false:122`.
   - `test_factory_coerces_amqp_heartbeat_string` — `{"amqp_heartbeat": "580"}` asserts `== 580` and `isinstance(..., int)`; `{"amqp_heartbeat": "0"}` asserts falsy. Direct analogue of `test_factory_respects_amqp_durable_string_true:142`, and **red today** — this is the red-to-green test for finding 2.
   - `test_consume_passes_configured_heartbeat` — spy on `PulsarExchange.connection` (monkeypatch), drive one `consume()` iteration with a one-shot `check`, assert the connection saw `heartbeat=DEFAULT_HEARTBEAT` and that a thread named `consume-heartbeat-*` appeared in `threading.enumerate()`.
   - `test_consume_with_heartbeat_disabled_starts_no_thread` — `heartbeat=0`, same harness, assert the connection saw a falsy heartbeat and no `consume-heartbeat-*` thread was started.
   - `test_heartbeat_does_not_leak_between_exchanges` — the regression test for finding 1: default-heartbeat exchange consumes once, then a `heartbeat=0` exchange consumes once, assert the second connection's kwargs carry no truthy heartbeat. **Red today**; I ran exactly this shape and it fails.
   - If the `TYPED_PARAMS`/table refactor in finding 4 is taken, one test asserting `bind_amqp.get_exchange` coerces `{"amqp_heartbeat": "0"}` before the factory sees it.

   Resilience-side, optional but valuable: `test/resilience/config/app_amqp.yml` could set a low `amqp_heartbeat` (e.g. 10) so the real-broker suite exercises the knob at all — see finding 9.

6. **P2 — `docs/error_handling.rst` is left stale by the rebase.** That file postdates the original PR, and it is now the document an operator reads about AMQP resilience. It never mentions heartbeats: §3 "AMQP durability defenses" (`:124-164`) lists `amqp_durable`, `amqp_publish_retry` and `amqp_acknowledge` but not this; §11's tunables table (`:389-401`) has rows for `amqp_consumer_timeout` and friends but no `amqp_heartbeat`. Heartbeats are squarely on-topic for that document — they are the mechanism by which a blackholed or firewall-dropped connection is *detected*, which is what §3 and the B5 blackhole scenario (`test/resilience/scenarios/test_broker_outage.py:90-101`) are about. Add a table row and a sentence in §3 saying what heartbeats buy (dead-peer detection on both sides) and what disabling them costs (a half-open connection is only noticed on the next write).

7. **P2 — the docs' "580 seconds" figure is wrong in practice.** `docs/configure.rst:225-226` and `app.yml.sample:148-150` both present 580 as the interval. It is the *requested* interval; py-amqp negotiates `min(client, server)` and RabbitMQ has proposed 60 by default since 3.5.5, so the effective interval on a stock broker is 60s. Reword to "requests an interval of 580 seconds; the broker may negotiate a shorter one." Worth also stating the two facts that are non-obvious and that I verified: `false`/`0` disables heartbeats in *both* directions (py-amqp ignores the server's proposal when the client heartbeat is falsy), and — per finding 3 — the setting applies to consumer connections. As written, both doc additions describe intended behaviour accurately apart from these; neither is actively false.

8. **P3 — annotate the kwarg only as part of annotating the signature, or skip it.** `pulsar/client/amqp_exchange.py:67-80` is fully unannotated; the file's only annotation is `__handle_io_error` at `:201`. `manager.py` is annotated (PR 427-era work), this file is not. Annotating `heartbeat` alone would be an outlier. If the constructor normalises the value as suggested in finding 2 (`self.__heartbeat = int(heartbeat or 0)`), the honest signature is `heartbeat: Union[int, float, bool, None] = DEFAULT_HEARTBEAT` with `self.__heartbeat: int` — but mypy is non-strict here (`mypy.ini` sets no `disallow_untyped_defs`; kombu and amqp are both `ignore_missing_imports`), so CI won't care either way. My preference: do the runtime coercion, leave the annotations for whoever types the whole signature.

9. **P3 — the resilience harness is the obvious first consumer of this knob and isn't wired to it.** `test/resilience/harness/pulsar_control.py:143-150` reaches into the RabbitMQ management API to force-drop dead consumer connections *specifically because* the heartbeat timeout is too long for a test to wait on, and `:324-328` repeats the rationale. Setting `amqp_heartbeat: 10` in `test/resilience/config/app_amqp.yml` would let the broker notice on its own and would give the new option real-broker coverage for free. This is the answer to "does the change leave behind a reusable abstraction": yes, and the repo already has a place that wants it. Separately, both of those comments say "default 580s" / "~580s by default", which per finding 7 was already inaccurate against the suite's stock `rabbitmq:3-management` — if the comments are touched, fix the number.

10. **P3 — `app.yml.sample` comment-prefix inconsistency.** The new stanza at `app.yml.sample:148-149` uses `#` for prose; its immediate neighbours (`amqp_consumer_timeout` at `:138-141`, `amqp_publish_timeout` at `:144-145`, and the whole relay block above) use `##` for prose and reserve `#` for the commented-out setting itself. The `amqp_acknowledge` block just below uses `#`, so the file isn't consistent with itself either — but matching the adjacent lines costs nothing.

## Verdict

**Do not push as-is; the rescue is worth finishing.** The rebase is clean and faithful — I diffed it hunk-for-hunk against `d340cdd` and nothing from master's `durable=True` or the pulsar-relay docs section was lost, and the new `configure.rst` paragraph sits in the right place.

The blockers are findings 1 and 2, and both are small. Finding 1 is a one-line change back toward the pre-PR shape (`heartbeat=self.__heartbeat or 0` on the connection call, mutable default deleted). Finding 2 is three lines in the factory plus one in the constructor, following the coercion pattern `amqp_durable` already set. Finding 5's test list is mostly copy-and-adapt from the `amqp_durable` tests sitting in the same file, and two of those tests are red against the current branch — good red-to-green material.

Finding 4 is the one I'd actually think about rather than mechanically apply. Four idioms for parsing `amqp_*` params in a codebase this old is the kind of accretion that makes the next option's bug inevitable — this PR's own bug is that bug. Folding `TYPED_PARAMS` into the factory would fix the Galaxy-side coercion gap once for every `amqp_*` option instead of once more by hand. If the author would rather not widen the PR, it should at least reuse `amqp_durable`'s shape and leave a follow-up note.

Findings 3 and 6/7 are what I'd want resolved before this is presented as "heartbeats are configurable": right now the option says one thing in `configure.rst` and does a narrower thing in the code (consume-only, negotiated down to the broker's 60s), and the document operators are pointed at for AMQP resilience doesn't know the option exists.

## Resolution (2026-09-12)

Rescued on `jmchilton/pulsar:rescue-357-amqp-heartbeat`. Opened as [#502](https://github.com/galaxyproject/pulsar/pull/502); description drafted at
`502_configure_amqp_heartbeat_pr_description.md`.

Fixed: 1 (copy `connection_kwargs` and `setdefault`), 2 (`parse_amqp_heartbeat()` in the
factory next to the `amqp_durable` coercion, plus `int(heartbeat or 0)` in the constructor),
5 (seven tests, two red before the fix), 6, 7, 10, and the stale "580s" comments from 9.

Finding 3 resolved as documentation rather than code: extending heartbeats to the pooled
producer connections would reproduce finding 1's failure mode, since nothing on that path
calls `heartbeat_check()`. Needs a publisher-side sender first.

Not taken, listed as out of scope in the PR description: finding 4 (folding
`bind_amqp.TYPED_PARAMS` into the factory), finding 8 (annotations), finding 9's
`amqp_heartbeat: 10` in the resilience config.
