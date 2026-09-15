# Support configuring the AMQP heartbeat interval, or disabling heartbeats

Supersedes #357, preserving Nate Coraor's authorship on the original commit. The branch
is that commit rebased onto current `master`, plus fixes for two defects found reviewing
the rebase, and the tests and documentation the option needs.

Branch: `jmchilton/pulsar:rescue-357-amqp-heartbeat`

## Summary

Adds `amqp_heartbeat`, which sets the interval Pulsar requests for AMQP heartbeats on its
consumer connections, or disables heartbeats entirely when set to `false`/`0`. Previously
the interval was hard-coded to `DEFAULT_HEARTBEAT` (580) with no way to change or turn it
off.

Original motivation, from #357: heartbeats have been considered unnecessary and disabled
by default upstream since 2013, but they are sometimes needed to keep connections alive
through firewalls — so make it configurable rather than picking a side.

## Rebase notes

Two conflicts, both from changes that postdate the 2024 commit:

- `PulsarExchange.__init__` gained `durable=True` (`91945e2`); the new `heartbeat` kwarg
  sits alongside it.
- `docs/configure.rst` gained the pulsar-relay section; the heartbeat paragraph stays
  immediately after the `amqp_publish*` paragraph, ahead of it.

## Review follow-up

Two defects in the original patch, fixed here with regression tests (both were red before
the fix):

- **`consume()` wrote the heartbeat into its own mutable default argument.** That dict is
  created once at definition time and shared by every `PulsarExchange` in the process, so
  once any exchange with a heartbeat consumed, every later consumer inherited it — including
  one configured with `amqp_heartbeat: 0`, which then negotiated a heartbeat with the broker
  *while skipping the thread that sends them*. Outbound heartbeat frames only ever come from
  `heartbeat_check()` in that thread, so RabbitMQ closed the connection after two missed
  intervals; `ConnectionForced` is recoverable, so the consumer reconnect-churned
  indefinitely. Realistic on the Galaxy side, where each `PulsarMQJobRunner` builds its own
  exchange. Now the dict is copied and `setdefault` used, and the heartbeat is always passed
  explicitly rather than conditionally.
- **The value reached kombu uncoerced.** Galaxy destination params and Pulsar's ini config
  both hand over strings, and a non-numeric heartbeat raises `TypeError` inside py-amqp's
  `_on_tune`. `TypeError` is not in `recoverable_exceptions`, so `consume()` re-raises and
  the consumer thread — unsupervised in `bind_amqp` — is dead for the life of the process.
  `"0"` is truthy, so the documented "set to 0 to disable" recipe was the worst case.
  Coercion lives in `amqp_exchange_factory`, next to the `amqp_durable` coercion that exists
  for exactly this reason, because `pulsar/client/manager.py` reaches the factory directly
  and bypasses `bind_amqp.TYPED_PARAMS`. The constructor normalises again so direct
  construction is covered.

Documentation corrections in the same pass:

- 580 is the *requested* interval. py-amqp negotiates `min(client, server)` and RabbitMQ has
  proposed 60 by default since 3.5.5, so the effective interval on a stock broker is 60s.
- The setting governs consumer connections. Publisher connections are pooled and have never
  carried a heartbeat; `configure.rst` now says so rather than implying otherwise.
- `docs/error_handling.rst` postdates #357 and is the document operators are pointed at for
  AMQP resilience. It gains a bullet in §3 and a row in §11's tunables table.
- Two comments in the resilience harness described the heartbeat timeout as "580s by
  default", which was already wrong against the suite's stock `rabbitmq:3-management`.

Unrelated tidy-up in its own commit: `test/amqp_test.py` imported `amqp_exchange_factory`
inside six test bodies with no cycle or optional-dependency reason; those are hoisted to
module scope.

## Tests

New coverage in `test/amqp_test.py`, following the existing `amqp_durable` tests:

- factory default is `DEFAULT_HEARTBEAT`
- `False`, `0`, `"false"`, `"0"`, `"off"`, `""` all disable
- `60`, `"580"`, `" 60 "`, `True` all coerce to an `int`
- `consume()` passes the configured heartbeat and starts the heartbeat thread
- with heartbeats disabled, `consume()` passes `0` and starts no thread
- a heartbeat configured on one exchange does not leak into a later one

Local validation:

- `test/amqp_test.py`: 26 passed.
- Unit suite (`test/`, excluding `resilience/` and the integration tests): 308 passed,
  4 pre-existing environment failures that reproduce unchanged on `master` (missing
  `cow` binary).
- mypy on the changed modules: no issues.
- flake8 and isort clean on the changed files.

## Deliberately not in scope

- Extending heartbeats to the publish path. Pooled producer connections have no thread
  calling `heartbeat_check()`, so negotiating a heartbeat there would reproduce the failure
  mode fixed above. Doing it properly needs a publisher-side sender and belongs in its own
  change; for now the docs state the limit.
- Folding `bind_amqp.TYPED_PARAMS` into the factory so every `amqp_*` option is typed once,
  for both the Pulsar server and the Galaxy client, instead of the four parsing idioms that
  exist today. That would make this class of bug impossible by construction, but it is a
  wider change than a rescue of #357 should carry.
- Setting a low `amqp_heartbeat` in `test/resilience/config/app_amqp.yml` so the real-broker
  suite exercises the knob — the harness currently force-drops dead consumers via the
  management API precisely because the timeout is too long to wait on.
