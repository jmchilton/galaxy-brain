# pulsar #531 - Wait for recovered jobs instead of sleeping in persistence tests

- PR: https://github.com/galaxyproject/pulsar/pull/531 (nuwang:fix-persistence-test-race, head `09da8ca`)
- Scope: `test/persistence_test.py` +19/-3. Based on current `origin/master` (`c6d9df6`).
- Worktree: `~/projects/worktrees/pulsar/pr/531` (branch `pr-531`, made via https fetch, not ghwt)

## Verdict

Approve with one small change. The wait conditions are right. `_wait_for` should raise
on timeout, and ideally it should be the shared helper rather than a fourth private copy.
The flakiness has a real root cause in Pulsar, a `montior` typo; see the bottom section. It
belongs in a separate PR, not this one.

## Correctness of the conditions

**Preprocess step**: the PR waits for `TEST_JOB_ID` in the `launched` index. That's right.
`_handling_of_preprocessing_state` calls `active_jobs.activate_job(job_id)` as its last step,
after `launch()` and after `preprocessed` is written. The job only enters that index there,
because queue1 put it in the `preprocessing` index only. The preprocess thread is
`daemon=False` and `shutdown()` never joins it, so a wait is needed here.

**Execute step**: the PR waits for the touch file plus `submitted` metadata to disappear.
That's also right, and the PR body's reasoning holds. I confirmed it. With the wait patched
to a no-op, all 20/20 iterations returned from `queue2.shutdown()` before the job ran.
`touch` was False and `submitted` was True, and the late monitor thread then raised
`FileNotFoundError: .../4/return_code` into the deleted temp dir. `submitted` is removed in
`_monitor_execution`'s `finally`, after `return_code` is written, so it is the right "run
finished" marker. The only write left afterwards is the `pid` removal in the same locked
block, and the test still has to shut down and assert first, so it's negligible.

I also checked whether the stateful monitor could start a postprocess thread that outlives
`shutdown()`. The postprocess thread is non-daemon and not joined. Over 150 probe iterations
after the wait, no `final_status` or `postprocessed` was ever written and no threads were
left alive. The job finishes inside the monitor's 0.5 s poll interval. Not worth acting on.

The remaining `time.sleep(.4)` in `test_launched_job_recovery` checks that something does
*not* happen (no worker, so no touch file). It can't be turned into a poll, so it's fine
to keep.

## Finding 1: `_wait_for` times out silently

```python
def _wait_for(condition, timeout=10):
    deadline = time.time() + timeout
    while not condition() and time.time() < deadline:
        time.sleep(0.05)
```

On timeout it returns, and the test carries on. In the execute step a timeout then fails as
`assert exists(touch_file)`, or as the teardown `FileNotFoundError` in `rmtree` that this PR
is fixing. Neither says "the job never finished". All three existing copies on master raise
or return a bool that gets asserted (`stateful_test._wait_for` raises with a description,
`manager_live_stdout_test._wait_for` raises, and `messaging_outbox_test._wait_for` returns a
bool that callers `assert`). Smallest fix, keeping it local:

```python
def _wait_for(condition, description, timeout=10):
    deadline = time.time() + timeout
    while not condition():
        if time.time() >= deadline:
            raise AssertionError(f"Timed out after {timeout}s waiting for {description}.")
        time.sleep(0.05)
```

with call sites `_wait_for(..., "the preprocessed job to be marked launched")` and
`_wait_for(..., "the recovered job to finish running")`. The descriptions can replace
the two comments above the calls.

## Finding 2: reuse, and the overlap with `consolidate-test-wait-for`

Master already has three private polling helpers:
`test/stateful_test.py::_wait_for(condition, description, timeout)`,
`test/manager_live_stdout_test.py::_wait_for`, and `test/messaging_outbox_test.py::_wait_for`.
The `wsgi_app_test` fix (#525) did its own thing too. #531 adds a fourth copy, with yet
another signature and different timeout semantics.

The local branch `consolidate-test-wait-for` (2 commits, `0f01433` and `375f302`, also on
the `jmchilton` remote) adds `test_utils.wait_for(poll, description, until=None,
timeout=5, interval=0.01) -> T`, which raises with the description. It also adds
`test/wait_for_test.py` and moves the stateful, live_stdout, messaging_outbox and wsgi_app
tests onto it. It does **not** touch `persistence_test.py`, so neither order causes a
textual conflict, but whichever merges second has to clean up after the other:

- **Branch merges first**: #531 imports `wait_for` from `.test_utils` and drops its private
  helper:
  ```python
  wait_for(
      lambda: TEST_JOB_ID in queue2.active_jobs.active_job_ids(active_status=ACTIVE_STATUS_LAUNCHED),
      "the preprocessed job to be marked launched",
      timeout=10,
  )
  wait_for(
      lambda: exists(touch_file) and not job_directory.has_metadata(JOB_FILE_SUBMITTED),
      "the recovered job to finish running",
      timeout=10,
  )
  ```
- **#531 merges first** (likely, since it's tiny): rebase the branch and add
  `persistence_test.py` to the files it converts. This gets Finding 1 for free.

Either way, ask on the PR for Finding 1 now. Don't hold this PR for the branch.

## Root cause the PR didn't find: `montior` typo in the queued manager

The PR body says it "didn't find the source of the occasional slow run". The real reason
`shutdown()` doesn't wait for the recovered job is a pre-existing typo, introduced in
`8fd077b` ("Generalize orchestrated container scheduling", 2022):

- `pulsar/managers/queued.py:119` calls `self._run(job_id, command_line, montior=MonitorStyle.FOREGROUND)`
- `pulsar/managers/unqueued.py:217,226` passes it on as `self._start_monitor(..., montior=montior)`
- `pulsar/managers/unqueued.py:109` reads `kwd.get("monitor", MonitorStyle.BACKGROUND)`

`monitor` is never set, so `QueueManager` always monitors in the background via
`_thread.start_new_thread`. Those threads are untracked and don't show in
`threading.enumerate()`. The worker goes back to the queue right after `Popen`, which means:

1. `QueueManager.shutdown()` joins workers that have already exited, so it doesn't wait for
   running jobs. That's the race these tests hit.
2. **`num_concurrent_jobs` doesn't limit concurrency.** The queued manager has run jobs
   without a limit since 2022.

I verified this in a scratch master worktree with the fix applied, `s/montior/monitor/`
in both files. The probe's `queue2.shutdown()` took 0.23 s instead of 0.009 s and the touch
file existed on return. `persistence_test.py` and `manager_queued_test.py` passed 3/3. It
deserves its own issue or PR because it changes production behavior: the concurrency limit
would start being enforced again. #531's waits are still worth having after that fix. The
preprocess thread is never joined, and an explicit condition beats relying on shutdown
semantics.

## Test runs (local, macOS)

| | runs | result | time |
|---|---|---|---|
| master `persistence_test.py` | 5 | 5/5 pass | 6.3-6.9 s |
| #531 `persistence_test.py` | 10 | 10/10 pass | 2.1-2.7 s (one cold run 7.1 s) |
| #531, wait made a no-op (probe) | 20 iterations | job not run at shutdown in 20/20, late `FileNotFoundError` | - |
| #531, residual-postprocess probe | 150 iterations | no `final_status`/`postprocessed` and no live threads | - |
| master + `montior` fix | 3 | persistence + manager_queued 5/5 pass | ~6.8 s |

I couldn't reproduce the original flake locally without coverage plus the extra tests the
author mentions. I injected it instead by removing the wait.

## Suggested PR comment (not posted)

> Conditions look right to me. Small ask: have `_wait_for` raise on timeout, e.g.
> `AssertionError(f"Timed out after {timeout}s waiting for {description}.")`. Right now it
> returns silently, and a timeout shows up as `assert exists(touch_file)` or the `rmtree`
> error instead. FWIW, the reason `shutdown()` doesn't wait is `montior=` vs `monitor` in
> `QueueManager.run_next` / `_run` / `_start_monitor`, so queued jobs always monitor in the
> background (and `num_concurrent_jobs` isn't enforced). That's worth a separate fix.

## Resolution (2026-10-03)
Merged as-is (382f7e4). Finding 1 + reuse applied on `jmchilton:persistence-test-wait-for` (8803ba4): persistence_test uses `test_utils.wait_for` (raises on timeout); local `_wait_for` removed. `montior` typo still open.
