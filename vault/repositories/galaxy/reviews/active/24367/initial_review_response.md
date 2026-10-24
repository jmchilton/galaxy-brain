(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Opus 5.5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Risk profile gx_risk_assessment via Claude Opus 5.5 at low effort; reviewed commit 63c6cbf9eb3.

Mostly a two-way door: no API, schema, or config changes, and it reverts cleanly. The one-way part is per job: a resubmission whose mapping raises is now failed to `error` for good, where before it stalled the handler but could still run after an admin fix.

<details><summary>Risk Details</summary>

- The new `except Exception` branch fails resubmitted jobs on any mapping error, including transient ones (DB hiccups, a TPV rule or config bug during a deploy). Before, those jobs blocked dispatch but survived; now they end as user-visible errors and the user has to rerun them.
- It matches how the new-job path already handles these errors, so admins see one behavior on both paths rather than a new policy.
- Setting the `__fail__` placeholder destination before `fail()` means failure handling no longer re-evaluates the tool's default destination for these jobs. Any admin hook that relied on `fail()` remapping (for example, destination-specific failure handling) won't run for them.
- Deferred resubmissions (`JobNotReadyException`) now stay in `resubmitted` and are retried on every poll. Nothing caps this, so a job a rule always defers waits forever and is mapped again on each poll.
- This targets the release_26.2 branch, so it reaches deployers in a point release. The change is small and contained to `JobHandlerQueue.__handle_waiting_jobs`.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether failing on every exception is the right call for resubmissions, or whether only `JobMappingException`/`failure_message`-bearing errors should fail the job while unexpected errors are logged and skipped (retried next poll) without blocking other jobs. That choice decides whether a transient TPV or config error during a deploy wipes out in-flight resubmissions.

Also check that skipping destination remapping in `fail()` through the `__fail__` placeholder is acceptable for resubmitted jobs. The unit test harness reimplements `fail()` rather than using `JobWrapper.fail`, so this interaction is covered only by the mock.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24367_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_24367_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24367_review_0) (on `jmchilton/galaxy`, from reviewed commit `63c6cbf9eb3`) adds a per-job backstop to the resubmit loop, matching the new-job loop. It moves the `__fail__` placeholder into the shared unmappable-job helper so both paths fail without mapping the job again. Resubmission dispatch is logged only when the runner actually queued the job. It replaces the unit test's mapper-attempt count with a direct "no remap during fail" check, and adds an integration test that runs the real `JobWrapper.fail` and handler monitor loop.

- [`d8dd87f90b9`](https://github.com/jmchilton/galaxy/commit/d8dd87f90b9) Assert unmappable resubmission is not remapped during fail — the harness `fail()` records any mapping attempt it triggers, replacing `count(resubmit) == 2`.
- [`8e14315619d`](https://github.com/jmchilton/galaxy/commit/8e14315619d) Keep any resubmission failure from stopping job dispatch — extracts `__dispatch_resubmitted_job` and wraps each call in `except Exception: log.exception(...)`, with a unit test whose dispatcher raises.
- [`f5f6b7c5f18`](https://github.com/jmchilton/galaxy/commit/f5f6b7c5f18) Cache __fail__ destination for every unmappable job — moves the placeholder into `__fail_unmappable_job`, with a new-job unit test.
- [`218caba3832`](https://github.com/jmchilton/galaxy/commit/218caba3832) Log resubmission dispatch only when the runner queued it — checks the `dispatcher.put` return value, as the new-job branch does.
- [`dd33df60f6a`](https://github.com/jmchilton/galaxy/commit/dd33df60f6a) Integration test unmappable resubmission against real JobWrapper.fail — new `resubmission_unmappable_job_conf.yml` and `dynamic_unmappable_resubmission` rule, plus `TestJobResubmissionUnmappableIntegration`.

</details>

</details>

### P2 1: Resubmit loop still lacks the per-job backstop the new-job loop has (implementation verified)

The PR guards only `__recover_job_wrapper`. Other steps in the resubmit loop body can still raise and escape `__handle_waiting_jobs`, which stops dispatch for every job on the handler, the failure this PR targets. These steps are `job_wrapper.fail(...)` and the second `self.job_wrapper(job)` in the new failure branch, `jw.is_ready_for_resubmission(job)` (a `float()` on `__resubmit_delay_seconds`), and `self.dispatcher.put(jw)`. The new-job loop directly below already wraps each job in `try: ... except Exception: log.exception("failure running job %d", job.id)`.

<details><summary>Evidence</summary>

A new unit test makes the harness dispatcher raise for the resubmitted job. It fails on the PR head with `RuntimeError: Runner unavailable.` escaping the poll. With the backstop, the other job is dispatched and the resubmission stays `resubmitted`.

</details>

Move the resubmit body into a `__dispatch_resubmitted_job(job)` method. Keep its targeted `JobNotReadyException` and mapping-failure handling, and wrap each call in the loop in the same per-job `except Exception: log.exception(...)` used by the new-job loop.

Fixed in [`8e14315619d`](https://github.com/jmchilton/galaxy/commit/8e14315619d).

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

Fixed in [`dd33df60f6a`](https://github.com/jmchilton/galaxy/commit/dd33df60f6a).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 1: Put the `__fail__` placeholder in the shared helper so both paths behave the same (implementation verified)

`__fail_unmappable_job` is now the shared "mapping failed" path, but only the resubmit caller caches `JobDestination(id="__fail__")` before calling `fail()`. On the new-job path (`__verify_job_ready`), `fail()` therefore maps the job again from the tool default. `fail()` catches only `JobMappingException` from that second mapping. A `JobMappingConfigurationException` (not a subclass) or a `JobNotReadyException` escapes it and leaves the job NEW, so "failure running job" is logged on every poll. That part of the behavior predates the PR.

<details><summary>Evidence</summary>

A new unit test, `test_unmappable_new_job_fails_without_mapping_again`, fails on the PR head because the job is mapped again inside `fail()`. It passes with the placeholder moved into the helper.

</details>

Move `set_cached_job_destination(JobDestination(id="__fail__"))` into `__fail_unmappable_job`. Both callers then behave the same, and the duplicate mapping goes away. The `except Exception` in `__verify_job_ready` covers only `job_wrapper.job_destination`, so the placeholder never overrides a resolved destination.

Fixed in [`f5f6b7c5f18`](https://github.com/jmchilton/galaxy/commit/f5f6b7c5f18).

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

Fixed in [`218caba3832`](https://github.com/jmchilton/galaxy/commit/218caba3832).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 3: Unit test assertion is tied to the mapper's retry internals (implementation verified)

`assert handler.poll().count(resubmit) == 2` depends on `JobRunnerMapper.__handle_rule` retrying a failing rule once without resource parameters. A change to that retry would break the test for reasons unrelated to this PR.

<details><summary>Evidence</summary>

With the `__fail__` line removed from the handler, the new assertion fails (`assert [1] == []`), so it still guards the placeholder.

</details>

Assert the guarantee directly instead. Have the harness `fail()` record whether resolving the destination added a mapping attempt, then assert `handler.remapped_on_fail == []`.

Fixed in [`d8dd87f90b9`](https://github.com/jmchilton/galaxy/commit/d8dd87f90b9).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>
