# Initial review: galaxyproject/galaxy#24367

- Profile: default
- Model: claude-opus-5-5, low effort
- Reviewed commit: `63c6cbf9eb3` (base `origin/release_26.2`)
- PR: [24367 "[26.2] Keep unmappable resubmissions from stopping job dispatch"](https://github.com/galaxyproject/galaxy/pull/24367)

## Verdict

Small, correct fix for a real wedge. It reuses the new-job failure path through a shared helper. No blockers. The main gap is that the resubmit loop still has no per-job backstop like the one the new-job loop has.

Verified locally (sqlite; PostgreSQL unavailable, so those variants were skipped):

- On the PR head, `test_deferred_resubmission_does_not_interrupt_other_jobs[sqlite]` and `test_unmappable_resubmission_fails_without_interrupting_other_jobs[sqlite]` both pass, along with the rest of `test_handler.py`.
- Against `origin/release_26.2` with the PR's test file in a throwaway worktree, both new tests fail.
- With only the `__fail__` placeholder line removed from the PR's handler, the unmappable test fails with `assert 4 == 2`. The count assertion really does guard the placeholder.
- `JobHandlerQueue.job_wrapper` builds a real `JobWrapper`, whose `set_cached_job_destination` goes through the mapper (`jobs/__init__.py` ~L3090). It is not the no-op on `MinimalJobWrapper`, so the placeholder takes effect in production.

## Findings

### P2 1: Resubmit loop still lacks the per-job backstop the new-job loop already has

The PR guards only `__recover_job_wrapper`. The description flags that rebuilding the wrapper in the failure branch can still raise. Other steps in the loop body can raise too, and any of them escapes `__handle_waiting_jobs` and stops dispatch for every job on the handler, which is the failure mode this PR targets:

- `job_wrapper.fail(...)` in the new failure branch, which refreshes, collects metrics, updates outputs and pauses dependents;
- `jw.is_ready_for_resubmission(job)`, which calls `float(destination_params["__resubmit_delay_seconds"])`;
- `self.dispatcher.put(jw)`, which resolves a runner and calls `runner.put`;
- `self.job_wrapper(job)` in the failure branch (already flagged by the author).

The new-job loop directly below already wraps each job's body in `try: ... except Exception: log.exception("failure running job %d", job.id)` (handler.py ~L566). Use the same pattern on the resubmit loop: keep the targeted `JobNotReadyException` and mapping-failure handling, and wrap the whole body in an outer per-job `except Exception: log.exception(...)`. That costs a few lines and closes the gap the description leaves open. It also brings the two loops in line with each other.

Optional, related: `__recover_job_wrapper` builds the wrapper and then calls `cache_job_destination`. If the resubmit path built the wrapper first and only the caching sat inside the `try`, the failure branch could reuse that wrapper. It would no longer construct a second one.

### P3 1: Put the `__fail__` placeholder in the shared helper so both paths behave the same

`__fail_unmappable_job` is now the shared "mapping failed" path, but only the resubmit caller caches `JobDestination(id="__fail__")` before calling `fail()`. The new-job path (`__verify_job_ready`) still leaves no cached destination. So `JobWrapper.fail()` maps the job again from the tool default, which means four mapping attempts, the count the PR's own test notes. `fail()` only catches `JobMappingException` from that re-map. A `JobMappingConfigurationException` or `JobNotReadyException` raised the second time escapes `fail()`. For a new job, that leaves it NEW and logs "failure running job" on every poll.

Pre-existing on the new-job path, but the PR introduces the helper that is the natural home for the fix. Moving the `set_cached_job_destination(JobDestination(id="__fail__"))` call into `__fail_unmappable_job` makes the two callers identical and removes the duplicate mapping. If that widens the scope too much for a release-branch fix, a dev follow-up is fine.

### P3 2: Resubmit path still logs "dispatched immediately" when `dispatcher.put` declines the job

The description says the log line now fires "only after a resubmission is actually dispatched". `DefaultJobDispatcher.put` returns `False` when no runner is found (handler.py ~L1336), and in that case the job has already been failed. The resubmit branch ignores that return value. It still logs "being dispatched immediately", and it bumps `increase_running_job_count` first. The new-job branch checks the return value (`if self.dispatcher.put(...): log.info("Job dispatched") else: ...`, from the recent `b1d7b4781de` fix). Mirror it:

```python
if self.dispatcher.put(jw):
    log.debug("(%s) Job was resubmitted and is being dispatched immediately", job.id)
else:
    log.debug("(%s) Resubmitted job selected for dispatch but was not queued", job.id)
```

### P3 3: Test double now re-implements `JobWrapper.fail()`'s destination fallback

`HandlerJobWrapper.fail` copies the `try: self.job_destination / except JobMappingException: cache __fail__` logic from `JobWrapper.fail` so that the mapping-attempt count means something. That is reasonable. However, the "must not map again" assertion now depends on the fake staying in sync with the real `fail()`. A one-line comment naming `JobWrapper.fail` as the source would help (the existing comment almost says this). Alternatively, an integration test against a real `JobWrapper` through `test/integration/delay_rules` (which already raises `JobNotReadyException`) would remove the dependency on the fake. Low priority.

## Observations (not findings)

- Mapping still runs before the `__resubmit_delay_seconds` check in `is_ready_for_resubmission`. A delayed resubmission is therefore re-mapped on every poll during its delay, and can now be failed as unmappable before the delay ends. The ordering is unchanged by this PR, and before it such a job wedged the handler anyway.
- A `JobNotReadyException.job_state` is ignored on the resubmit path: the job always stays `resubmitted`. No in-tree rule sets a non-wait state, so this is acceptable.
