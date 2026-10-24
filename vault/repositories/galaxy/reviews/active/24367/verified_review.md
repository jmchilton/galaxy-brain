### P2 1: Resubmit loop still lacks the per-job backstop the new-job loop has (implementation verified)

The PR guards only `__recover_job_wrapper`. Other steps in the resubmit loop body can still raise and escape `__handle_waiting_jobs`, which stops dispatch for every job on the handler, the failure this PR targets. These steps are `job_wrapper.fail(...)` and the second `self.job_wrapper(job)` in the new failure branch, `jw.is_ready_for_resubmission(job)` (a `float()` on `__resubmit_delay_seconds`), and `self.dispatcher.put(jw)`. The new-job loop directly below already wraps each job in `try: ... except Exception: log.exception("failure running job %d", job.id)`.

<details><summary>Evidence</summary>

A new unit test makes the harness dispatcher raise for the resubmitted job. It fails on the PR head with `RuntimeError: Runner unavailable.` escaping the poll. With the backstop, the other job is dispatched and the resubmission stays `resubmitted`.

</details>

Move the resubmit body into a `__dispatch_resubmitted_job(job)` method. Keep its targeted `JobNotReadyException` and mapping-failure handling, and wrap each call in the loop in the same per-job `except Exception: log.exception(...)` used by the new-job loop.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 2: Real `JobWrapper.fail` and the monitor loop are not exercised (implementation verified)

The "don't map again from the tool default" guarantee is checked only against `HandlerJobWrapper.fail`. That test double copies the destination fallback from `JobWrapper.fail`, so drift in the real `fail()` would go unnoticed. The real symptom, a handler that stops all dispatch, is never run end to end.

<details><summary>Evidence</summary>

The new test passes on the review branch. With `lib/galaxy/jobs/handler.py` from `release_26.2` it times out, with the output stuck `queued` and `resubmitted: True`.

</details>

Add an integration test in `test/integration/test_job_resubmission.py` with a new job conf. The conf routes `exit_code_oom` to `failure_runner`, which resubmits on `any_failure` to a dynamic destination. That destination's rule (`resubmission_rules/rules.py`) raises `JobMappingException`. The test asserts that the output errors with the rule's message, that the job is `error`, and that a later `create_2` job still completes.

<details><summary>Details</summary>

The test waits on the output dataset, not the job. `wait_for_job` returns as soon as the job reaches `resubmitted`, because that state is not in `wait_on_state`'s skip list.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 1: Put the `__fail__` placeholder in the shared helper so both paths behave the same (implementation verified)

`__fail_unmappable_job` is now the shared "mapping failed" path, but only the resubmit caller caches `JobDestination(id="__fail__")` before calling `fail()`. On the new-job path (`__verify_job_ready`), `fail()` therefore maps the job again from the tool default. `fail()` catches only `JobMappingException` from that second mapping. A `JobMappingConfigurationException` (not a subclass) or a `JobNotReadyException` escapes it and leaves the job NEW, so "failure running job" is logged on every poll. That part of the behavior predates the PR.

<details><summary>Evidence</summary>

A new unit test, `test_unmappable_new_job_fails_without_mapping_again`, fails on the PR head because the job is mapped again inside `fail()`. It passes with the placeholder moved into the helper.

</details>

Move `set_cached_job_destination(JobDestination(id="__fail__"))` into `__fail_unmappable_job`. Both callers then behave the same, and the duplicate mapping goes away. The `except Exception` in `__verify_job_ready` covers only `job_wrapper.job_destination`, so the placeholder never overrides a resolved destination.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: Resubmit path logs "dispatched immediately" even when `dispatcher.put` declines the job (implementation verified)

The PR description says the log line now fires only after a resubmission is actually dispatched. However, `DefaultJobDispatcher.put` returns `False` when no runner is found and the job has already been failed. The resubmit branch ignores that return value and logs "being dispatched immediately" anyway. The new-job branch checks it.

<details><summary>Evidence</summary>

The fix is applied; this is a log-only change with no new test, and the existing resubmission unit tests pass.

</details>

Mirror the new-job branch:

```python
if self.dispatcher.put(jw):
    log.debug("(%s) Job was resubmitted and is being dispatched immediately", job.id)
else:
    log.debug("(%s) Resubmitted job selected for dispatch but was not queued", job.id)
```

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 3: Unit test assertion is tied to the mapper's retry internals (implementation verified)

`assert handler.poll().count(resubmit) == 2` depends on `JobRunnerMapper.__handle_rule` retrying a failing rule once without resource parameters. A change to that retry would break the test for reasons unrelated to this PR.

<details><summary>Evidence</summary>

With the `__fail__` line removed from the handler, the new assertion fails (`assert [1] == []`), so it still guards the placeholder.

</details>

Assert the guarantee directly instead. Have the harness `fail()` record whether resolving the destination added a mapping attempt, then assert `handler.remapped_on_fail == []`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>
