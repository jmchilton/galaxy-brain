# Review: `pulsar_mq_status_poll` (7f672f94ac3 on origin/dev f763f6cf2ab)

Worktree: `~/projects/worktrees/galaxy/branch/pulsar_mq_status_poll`. Revives galaxyproject/galaxy#9911; depends on galaxyproject/pulsar#532.
Unit tests: `test/unit/app/jobs/test_pulsar_runner.py` passes (32 tests). No integration tests run.

## Verdict

**Changes requested.** With polling off, the entry-point path behaves the same as before (checked
below). Two things block merge. First, the double-finish guard only works for celery metadata, so
with polling on, a poll reply that lands during a normal finish can finish the job a second time.
Second, the guard drops `cancelled`/`complete` for DELETED jobs, which used to go through cleanup.
Fix both with one per-runner "finish in flight" claim and a narrower DB guard. Also bump the
pulsar-galaxy-lib pin or gate the param on its version.

## Findings (by severity)

### H1. FINISHING is almost never set, so polling causes double finishes. `pulsar.py:400-419`, `pulsar.py:441-444`

`FINISHING` is only written in `_handle_metadata_externally` on the **celery** path
(`runners/__init__.py:489-490`). On the default path the job stays `RUNNING` in the DB for the
whole finish: `client.full_status()`, then `pulsar_finish_job` (cleanup), then local subprocess
metadata (MQ destinations default to `remote_metadata` false), then `job_wrapper.finish`. It only
becomes `OK`/`ERROR` at the very end.

Here is the sequence when polling is on:

1. The `complete` message is consumed and `mark_as_finished` queues `finish_job`. The DB still says `RUNNING`.
2. The monitor still watches its own `PulsarJobState`. `_request_status_if_due` sees `RUNNING` and calls `get_status()`.
   The `last_status_request` timer has nothing to do with the `complete` message, so this can fire
   one tick later.
3. In MQ mode Pulsar never removes the job dir itself (no cleanup in `stateful.py`; MQ
   `client.clean()` only drops Galaxy's `status_cache` entry). So Pulsar answers `complete` again.
4. `__async_update` runs `_update_job_state_for_status` → `get_state()` == `RUNNING` → the guard
   lets it through → a **second `mark_as_finished`**. `callback_wrapper` refills `status_cache`, so
   the second `full_status()` succeeds. Now two `finish_job`s run at once on two worker threads.

The chance per job is roughly finish time ÷ interval. With `status_poll_interval: 2` in the
integration test this probably already happens. The test still passes because it only checks
`assert_ok`.

A smaller variant of the same problem: if the reply arrives just after the job turns `OK`, the guard
ignores it, but `status_cache[job_id]` has already been refilled with the full status (stdout and
stderr included), and nothing ever cleans it up. That leaks memory per job in long-running handlers.

The unit test `test_repeated_terminal_status_does_not_finish_job_twice[FINISHING-*]` covers a DB
state that the default path never reaches, so it gives false confidence.

**Fix.** Make "finish in flight" a runner-level, thread-safe claim instead of a DB read:

```python
# PulsarJobRunner.__init__
self._finishing_job_ids: set[str] = set()
self._finishing_lock = threading.Lock()

def mark_as_finished(self, job_state):
    with self._finishing_lock:
        if job_state.job_id in self._finishing_job_ids:
            log.debug("(%s) Finish already in progress, ignoring", job_state.job_id)
            return
        self._finishing_job_ids.add(job_state.job_id)
    super().mark_as_finished(job_state)

def finish_job(self, job_state):
    try:
        ...existing body...
    finally:
        self._finishing_job_ids.discard(job_state.job_id)
```

- `_request_status_if_due` returns `None` (stops watching) when `job_state.job_id in self._finishing_job_ids`.
- Overriding `mark_as_finished` covers all three callers: complete/cancelled, the STOPPED kill path, and
  the `check_watched_item_state` exception path. It also removes the extra per-message
  `get_state()` for the in-process case.
- Keep the DB guard for duplicates that arrive after the finish is done, but see H2 for which states it should cover.
- When the guard ignores a duplicate, also call `client.clean()` (or
  `self.client_manager.status_cache.pop(job_id, None)`) so the refilled cache entry doesn't leak.
- Red test first: a unit test that calls `_update_job_state_for_status(state, "complete")` twice with the DB state
  `RUNNING` must call `work_queue.put` once. This fails on the current branch.
- Remaining gap: with several handlers sharing one `status_update` queue, a poll reply already in
  flight can still be consumed by another handler. The claim at `pulsar.py:1286` then moves the job
  there, and the in-memory set can't stop that. The window is one poll round-trip once the owning
  handler stops polling jobs it is finishing. Mention it in the PR; don't try to solve it here.

### H2. The guard drops `cancelled`/`complete` for DELETED jobs, so their cleanup never runs. `pulsar.py:254`, `pulsar.py:441-444`

`FINISHED_OR_FINISHING_STATES = finished_states + [FINISHING]` includes `DELETING` and `DELETED`.
When a user deletes a running job, the handler sets `DELETED` (`handler.py:1173-1180`), and
`stop_job` → `client.kill()` makes Pulsar send `cancelled`.

- **Before:** `mark_as_finished` → `finish_job` → `pulsar_finish_job(job_completed_normally=False)` →
  `job_wrapper.finish` → `fail()`. That cleans the outputs (`clean_only`), runs `tool.job_failed`,
  calls `cleanup(delete_files=...)` (`jobs/__init__.py:1558-1582`), and `client.clean()` drops the
  status_cache entry.
- **After:** the message is ignored. The Galaxy job working directory and partial outputs stay on disk, and
  the status_cache entry leaks.

This changes behavior even with `status_poll_interval: 0`, because the guard isn't tied to the
param. Narrow the guard to `(OK, ERROR, FINISHING)`, or better, rely on H1's in-flight set plus
`(OK, ERROR)`. Add a unit test where a DELETED job receives `cancelled` and `mark_as_finished` is
still called.

### M1. Nothing stops the param from running against pulsar-galaxy-lib versions that lack #532. `pyproject.toml:78`, `pinned-requirements.txt:196`

The pin is still `pulsar-galaxy-lib==0.15.15`. That version's `MessageJobClient.get_status` publishes
`{'request': 'status', ...}` to the **setup** queue. Whether that is harmless depends on the Pulsar
server: newer ones drop it via `_is_duplicate_setup`; older ones run it through `submit_job` with no
command line. The commit message says a release is required, but the code neither enforces nor
documents that.

**Fix:** bump the minimum in `pyproject.toml` and the pin once #532 is released. If this has to
merge first, raise `ConfigurationError` in `__init__` when `pulsar.__version__` is older than the
fixed release. Put the minimum version in the sample-conf comment either way. The Pulsar server side
is fine: it has consumed the `status` queue since 0.14.0 (217a48f, 2020).

### M2. Destinations using `shell_plugin` on PulsarMQJobRunner raise `AttributeError` with a traceback on every poll. `pulsar.py:413-417`

`MessageQueueClientManager.get_client` returns `MessageCLIJobClient` when `shell_plugin` is in the
destination params. That client has no `get_status` (only `JobClient`, `MessageJobClient` and
`RelayJobClient` define one). The bare `except Exception: log.exception(...)` then logs a full
traceback per running job per interval. The class-level `supports_status_requests` check can't
catch this because it's a per-destination setting. The same applies to `k8s_enabled`/`tes_url`/`project_id` destinations on an
MQ runner.

**Fix:** decide once per destination. For example, skip polling and `log.warning` once when the
client lacks `get_status`. Or narrow the except to the transport errors the poll can actually hit
(`PulsarClientTransportError`, amqp errors) so programming errors surface early.

### M3. Polling recovers only jobs in RUNNING, not STOPPED or QUEUED. `pulsar.py:413`

- **STOPPED:** this job is waiting on a `cancelled` message. If that message is lost, the job stays watched
  forever. Polling STOPPED jobs is safe and already handled: any reply for a STOPPED job hits the
  kill+finish branch at `pulsar.py:447-451`. Recommended: poll `RUNNING` and `STOPPED`.
- **QUEUED:** skipping it is justified (Pulsar returns `LOST` when the job dir doesn't exist yet,
  `stateful.py:305-306`). But if the `running` message *and* the `complete` message are both lost,
  the job is never recovered. Say so in the sample docs ("only jobs Galaxy has seen start running
  are polled") rather than leaving it implicit.

### M4. Guest-port jobs aren't polled until their entry points are configured. `pulsar.py:376-396`

The early `return job_state` at :395-396 skips `_request_status_if_due`. An interactive tool whose
`job_ip()` never resolves, and whose `complete` was lost, is never recovered. That's a niche case,
but the fix is cheap: drop the early return and let the guest-port block fall through to the poll
check. Then return `job_state` if either the entry points are still pending or polling is on.

On the "is the off path the same" question, it is. I traced every branch with `status_poll_interval=0`:

| Case | Before | After |
| --- | --- | --- |
| No guest ports | `None` | `None` |
| Terminal/DELETING | `None` | `None` |
| RUNNING with an IP | configure, then `None` | `configured=True` → poll branch off → `None` |
| Otherwise | `job_state` | `job_state` |

After a restart, `recover()` builds a fresh `PulsarJobState` with `entry_points_configured=False`, so it
re-configures the entry points, same as before. There is no unit test for any guest-port path. Add
one parametrized over polling off/on: an IP is available, `configure_entry_points` is called once,
and the item is dropped when polling is off or kept when it's on.

### L1. Reuse and abstraction

- Subclassing `PulsarJobState` is a reasonable home. `AsynchronousJobState` has nothing to reuse
  (`check_count` isn't a timestamp). Better than #9911's base-runner `poll_jobs_older_than`, which
  needed a DB `touch()`.
- If H1 is adopted, the in-flight claim belongs on `PulsarJobRunner` (overriding `mark_as_finished`),
  not on the state. The monitor's state and the consumer's freshly built `_job_state()` are different
  objects, which is why the state is the wrong place.
- `supports_status_requests` is fine and more honest than inferring from `use_mq`/`poll`. The
  Kubernetes runner (`use_mq=True, poll=True`) and TES/GCP use clients without `get_status`. One nit:
  `poll` is now ambiguous next to `status_poll_interval`. A one-line comment on `poll`, or renaming
  the class attr later, would help readers.
- Naming: `status_poll_interval` reads well. The closest precedent is `gcp_batch.py:60`
  `polling_interval`, which overrides `monitor_sleep_time` instead. A per-job timer is the right
  choice here because a global sleep would slow down guest-port IP discovery. No rename needed.
- `FINISHED_OR_FINISHING_STATES` becomes unnecessary or narrower after H1/H2. If it stays, make it a
  tuple.

### L2. Tests

- The unit tests aren't trivial: each covers a distinct decision (interval, queued, finished, off,
  guard). But `_mq_runner` sets `use_mq`/`status_poll_interval` on an `object.__new__` instance, so
  it never runs `__init__` or `_monitor`.
  - The `ConfigurationError` check is untested. Add one test that instantiates `PulsarJobRunner`
    (or a `PulsarLegacyJobRunner`) with `status_poll_interval=5`, mocking `_init_*` if needed, and
    asserts `ConfigurationError`.
  - `test_mq_without_poll_interval_stops_watching` and `test_mq_poll_waits_for_interval` overlap with
    the integration test's red case. Keep them: they're cheap and pin the off path.
  - The `FINISHING` cases in `test_repeated_terminal_status_does_not_finish_job_twice` should become
    the in-flight case from H1. The `DELETED` case from H2 should assert the opposite (it *does*
    finish).
- Integration test (`test_pulsar_embedded_mq.py:105-145`): the hook is sound. It drops only the
  first `complete` per external job id, whether it came from Pulsar's original message or a poll
  reply. Either way the next poll recovers it, and with interval 0 the test turns red as intended.
  Suggestions:
  - Have the subclass count `mark_as_finished`/`finish_job` calls per job, and assert exactly one
    once the job is done. That turns H1 into a (somewhat timing-dependent) integration-level check.
  - Move `LosesFirstCompleteStatusJobRunner` into a small helper module, matching the
    `integration.resubmission_runners` precedent. Loading a runner from the test module itself
    (`integration.test_pulsar_embedded_mq:...`) can import that module twice under different names.

### L3. Style

- Imports are at the top. Typing narrows correctly (`AsynchronousJobRunner[PulsarJobState]`).
  `finish_job(self, job_state: JobState)` with its `isinstance(..., AsynchronousJobState)` assert
  could now take `PulsarJobState`. Optional.
- The `_request_status_if_due` docstring (3 lines) is OK. Its second sentence repeats the commit
  message; trim it to one line if you're editing nearby.
- The sample-conf comments are good. Per M1/M3, add the required pulsar-galaxy-lib version and
  "only running jobs are polled."
- After a restart every recovered job gets `last_status_request = now`, so their polls fire in sync.
  That's harmless at sane intervals. If anyone cares, a random initial offset would spread them out.

### L4. Commit message

It's clear and explains why. But this sentence:

> ignore complete/cancelled statuses for jobs already finishing or finished, so a poll reply or redelivered message doesn't finish a job twice

claims more than the code delivers (H1), and doesn't mention the DELETED behavior change (H2).
After the fix, describe it as "in-process finish claim + skip already-OK/ERROR jobs". "Requires a
pulsar-galaxy-lib release" should become an actual pin bump (M1).

## Checked and OK

- **Relay:** `PulsarMQJobRunner` with `relay_url` uses `RelayJobClient.get_status`. It posts to
  `job_status_request`, and `bind_relay.__process_status_message` → `trigger_state_change_callback`
  → reply via the relay → `__async_update`. The cached return value is ignored, which is fine.
- **`PulsarEmbeddedMQJobRunner`** inheriting `supports_status_requests=True` is fine. The integration test runs on it.
- **Extra DB reads:** `get_state()` adds one `refresh` per terminal message. That's small, and
  non-terminal messages already pay one for the STOPPED check. Monitor-side `get_state()` runs only
  once the interval has elapsed. Good ordering.
- **Recovery of FINISHING jobs** (`recover()` → `_finish_staged_job`) doesn't go through
  `_update_job_state_for_status`, so the guard doesn't affect it. A redelivered `complete` during
  celery-metadata recovery is now correctly ignored.
- **Resubmission** and **STOPPED → `cancelled`** behave as before.

## Resolution (2026-10-03, `bde5c42735c`)

- H1: fixed with a lock-protected set of job ids that are mid-finish in `mark_as_finished`/`_finish_tracked_job`. Polling skips those jobs.
- H2: guard narrowed to OK/ERROR/FINISHING; DELETED/DELETING jobs still finish. Tested.
- M3: STOPPED jobs are polled; QUEUED being skipped is documented.
- Integration test: asserts exactly one finish; runner moved to `test/integration/pulsar_mq_runners.py`.
- Commit message corrected.
- Deferred to the debrief follow-ups: M1 (pin bump, blocked on a Pulsar release), M2, M4, the cache leak, and testing the `ConfigurationError` gate.
