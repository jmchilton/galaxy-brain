# PR 439 — Fix race condition in job recovery causing external_id lookup failure

PR: https://github.com/galaxyproject/pulsar/pull/439

Follow-up branch: https://github.com/jmchilton/pulsar/tree/fix-job-recovery-startup-order

Draft PR: https://github.com/galaxyproject/pulsar/pull/496

## Follow-up implementation

The follow-up branch keeps the status callback bound during recovery but
defers `ManagerMonitor` startup until recovery has restored external job IDs.
It adds focused regressions for both sides of the lifecycle: the monitor does
not poll before recovery, and a failed recovery still publishes `LOST` through
the bound callback. Local validation passed with 313 unit tests (63 skipped),
plus mypy, flake8, isort, and `git diff --check`.

Reviewed rebased head: `b896e34`

Current base at review: `5e4982e`

## Recommendation

**Do not merge the rebased one-line change as-is.** The reported race is real,
and recovering external IDs before the monitor polls is the right invariant,
but reversing the two calls in `PulsarApp.__init__` restores a previously fixed
data-loss bug: recovery failures are deactivated before Pulsar has installed the
message-queue callback that tells Galaxy the job is `LOST`.

The fix should preserve this lifecycle ordering:

1. install the status-change publisher callback without starting pollers;
2. recover persisted jobs and their external IDs, publishing `LOST` for jobs
   that cannot be recovered;
3. only then start the manager monitor and message consumers.

That likely means separating callback configuration from monitor startup rather
than moving the entire message-queue bind after recovery.

## Blocking finding

`pulsar/core.py` now calls `__recover_jobs()` before
`__setup_bind_to_message_queue()`. When an external ID cannot be loaded,
`StatefulManagerProxy.recover_active_jobs()` calls
`__handle_recovery_problem()`, which deactivates the job and invokes
`self.__state_change_callback(status.LOST, job_id)`. Before queue binding, that
callback is only `_default_status_change_callback`, which logs the transition.
The subsequent bind installs the real AMQP or relay publisher, but the active
job has already been removed, so Galaxy never receives the terminal state.

This is not hypothetical behavior. Commit `61ed774` ("Revise job recovery
behavior", 2015) deliberately established the current bind-before-recovery
order, with the explicit rationale that recovery must happen after the MQ
callback is set; it added the `LOST` state and a test that the callback fires.
PR 439 reverses that ordering.

Current tests still encode the contract:

- `test/integration_test_state.py::test_recovery_failure_fires_lost_status`
  creates an active job with no recoverable external job and requires exactly
  one `lost` status-update message after Pulsar starts.
- `test/resilience/scenarios/test_pulsar_restart.py` requires restart failures
  to deliver exactly one terminal status rather than leaving Galaxy waiting.

The integration test is gated by optional DRMAA/Kombu dependencies, so a normal
unit run can pass without exercising this regression.

## Missing regression coverage

The PR adds no test for its reported startup race. Coverage should demonstrate
both sides of the required ordering:

- a persisted external ID is recovered before the monitor's first
  `get_status()` call; and
- a failed recovery still reaches the installed status-change publisher as
  `LOST` exactly once.

The existing integration and resilience tests cover the second outcome at a
higher level, but a small deterministic lifecycle/unit test would prevent the
two requirements from being traded against each other again.

## Reuse and structure

No import or abstraction duplication is introduced by the current patch. The
problem is instead that `StatefulManagerProxy.set_state_change_callback()`
currently performs two lifecycle operations at once: it installs the callback
and immediately constructs `ManagerMonitor`, which starts its thread in the
constructor. Splitting those operations would leave a reusable and explicit
startup boundary and let both the AMQP and relay integrations share the correct
ordering.

Queue binding also starts control-message consumer threads, so a complete fix
should avoid exposing the managers to status/kill/setup messages until recovery
has completed, not only delay `ManagerMonitor`.

## Rebase and CI

The single contributor commit rebases cleanly onto current `master`, remains
authored by Marius van den Beek, and `git diff --check` passes. GitHub reports
the rebased branch as mergeable. Fresh CI was still running at review time;
even if the ordinary matrix passes, it does not resolve the lifecycle
regression above. The resilience suite is the most relevant check.
