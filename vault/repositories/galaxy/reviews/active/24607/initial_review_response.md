(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Opus 5.5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Opus 5.5 at low effort.
- Review profile [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) was run via Opus 5.5 at medium effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Mostly a two-way door: the one lasting behavior it sets is that revoking the `Custom Tool Execution` role, or deleting the role, now also fails that user's queued and not-yet-prepared private user-defined tool jobs. The PR documents this, and later releases would have to keep it.

<details><summary>Risk Details</summary>

- Jobs that were valid when queued now fail at prepare time if the owner has lost the role. A permission change by an admin now hits work already in flight, not only new submissions.
- The check uses `job.user`. Anonymous or user-less jobs that run a private dynamic tool now always fail at prepare (`ensure_can_use_unprivileged_tool` accepts `None` and rejects it).
- Public dynamic tools (`dynamic_tool.public`) skip the recheck, so this only covers the private user-tool path.
- The job handler's startup recovery now treats `ObjectNotFound`/`ToolMissingException` from a uuid tool lookup as "tool removed" and fails those jobs instead of raising. This is wider than role loss: it also covers definitions that no longer load.
- Runner code paths (base runner and Pulsar) now treat `InsufficientPermissionsException` as a user-facing rejection, with an info log and no traceback. The exception message is shown to the user as the job's misc_info.
- Targets release_26.1. The changes are small and easy to revert, and there are no schema or API changes.

</details>

<details><summary>Risk Review Advice</summary>

Check that failing already-queued jobs on role revocation is the behavior admins want on a stable release, as opposed to only blocking new submissions. Also check that widening the startup `except` in `handler.py` cannot hide real lookup errors for non-user tools.

The new API test relies on timing: a 10s sleep keeps the user-tool job queued. Watch it for flakiness on slow CI.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24607_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

`pr_24607_review_0` ([jmchilton/galaxy](https://github.com/jmchilton/galaxy/tree/pr_24607_review_0)) sits on top of the reviewed commit [`1c0f219f3f4`](https://github.com/galaxyproject/galaxy/commit/1c0f219f3f4e774b897620c44c318f0c987fe95c). It addresses each verified finding in its own commit. It adds an API test for the membership-removal revocation path that the docs promise. It gives the startup path a distinct log reason when a user tool's uuid lookup fails. It drops the mock-only `prepare()` unit test, which the API test already covers, and specs the mock that stands in for `JobHandlerQueue` in the startup unit test.

- [`7ad861cb506`](https://github.com/jmchilton/galaxy/commit/7ad861cb50610f179e9eb9f1d58a7bcbeaa40364) Drop mock-only prepare() unit test: removes `test/unit/app/jobs/test_job_wrapper_user_tool.py`, which asserted a mocked manager call that the API test covers for real.
- [`97ca730bb3f`](https://github.com/jmchilton/galaxy/commit/97ca730bb3f3f83e9935a8739610c204256bc714) Log distinct startup reason when user tool uuid lookup fails: the startup recovery path logs "not available to the job's owner: <error>" instead of "removed from tool config", with a `caplog` assertion in the startup unit test.
- [`1db126b32e4`](https://github.com/jmchilton/galaxy/commit/1db126b32e44e3b6dbdd7dda66ea87c221ec1923) Spec the JobHandlerQueue mock in startup unit test: replaces the bare `MagicMock` self with `Mock(spec=JobHandlerQueue)`, setting `app` and `dispatcher` explicitly.
- [`948076753bc`](https://github.com/jmchilton/galaxy/commit/948076753bc686a2ff4459f60e19e34c6b073721) Test queued user tool job fails when user leaves execute-role group: adds an API test that removes the user from the role's group while the role stays live, factors the shared steps out of the existing deletion test, and has `user_tool_execute_permissions_via_group()` yield the group.

</details>

</details>

### P2 1: Revoke-by-membership path untested (implementation verified)

The docs change says that removing a user from the `Custom Tool Execution` role, or deleting the role, fails that user's queued user-defined tool jobs. `test_queued_job_fails_when_execute_role_is_revoked` covers only the deletion path, because `user_tool_execute_permissions()` deletes and purges the role. Nothing checks that the job handler sees a membership change while the role stays live.

Add a sibling API test. It grants the role through a group, removes the user from the group while the job waits on the slow input, and asserts the job errors with the permission message while the role still exists. To give the test the group to remove the user from, `user_tool_execute_permissions_via_group()` needs to yield the group it creates.

<details><summary>Details</summary>

On `pr_24607_review_0`, the existing test's body is split into `_run_slow_job`, `_queue_user_tool_job_behind` and `_assert_queued_user_tool_job_rejected` helpers. The new `test_queued_job_fails_when_user_is_removed_from_execute_role_group` uses the same helpers and calls `DELETE /api/groups/{id}/users/{user_id}`. It asserts inside the `with` block so that the role stays live.

</details>

Fixed on the review branch in [`948076753bc`](https://github.com/jmchilton/galaxy/commit/948076753bc686a2ff4459f60e19e34c6b073721).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort: the new test passes against the PR and fails with the `prepare()` recheck removed, and the refactored deletion test still passes.

</details>

### P3 1: Startup path logs revoked role as "removed from tool config" (implementation verified)

At startup, when the owner has lost the role, or a user tool's definition no longer loads, `has_tool` raises during the uuid lookup and the job is failed. The admin log then reads `Tool '...' removed from tool config, unable to recover job`, which is misleading for someone tracking down a role change. The tool is still configured. The owner just can't run it.

Log a distinct reason when the uuid lookup raises, including the exception text. Keep the user-facing fail message unchanged.

Fixed on the review branch in [`97ca730bb3f`](https://github.com/jmchilton/galaxy/commit/97ca730bb3f3f83e9935a8739610c204256bc714).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort: a `caplog` assertion added to `test_handler_startup_user_tool.py` fails on the PR's handler and passes with the fix.

</details>

### P3 2: Mock-only `prepare()` unit test duplicates the API test (implementation verified)

`test/unit/app/jobs/test_job_wrapper_user_tool.py` replaces `dynamic_tool_manager` with a mock and asserts `ensure_can_use_unprivileged_tool.assert_called_once_with(job.user)`. That tests the implementation's call rather than behavior. It doesn't exercise role resolution or the runner's fail handling. `test_queued_job_fails_when_execute_role_is_revoked` already drives the real `prepare()`, the real manager and the runner fail path end to end.

Drop the unit test.

Fixed on the review branch in [`7ad861cb506`](https://github.com/jmchilton/galaxy/commit/7ad861cb50610f179e9eb9f1d58a7bcbeaa40364).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort: removed on the review branch, and the API tests covering the behavior pass.

</details>

### P3 3: Startup unit test uses an unspecced `MagicMock` as `self` (implementation verified)

`test_handler_startup_user_tool.py` calls `JobHandlerQueue._check_job_at_startup(queue, job)` with a bare `MagicMock` standing in for `self`. Any new attribute the method reads from `self` would silently pass.

Use `Mock(spec=JobHandlerQueue)`, and set `app` and `dispatcher` explicitly, because `__init__` assigns them and the class spec doesn't include them.

Fixed on the review branch in [`1db126b32e4`](https://github.com/jmchilton/galaxy/commit/1db126b32e44e3b6dbdd7dda66ea87c221ec1923).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort: the test passes with the specced mock.

</details>
