### P2 1: Revoke-by-membership path untested (implementation verified)

The docs change says that removing a user from the `Custom Tool Execution` role, or deleting the role, fails that user's queued user-defined tool jobs. `test_queued_job_fails_when_execute_role_is_revoked` covers only the deletion path, because `user_tool_execute_permissions()` deletes and purges the role. Nothing checks that the job handler sees a membership change while the role stays live.

Add a sibling API test. It grants the role through a group, removes the user from the group while the job waits on the slow input, and asserts the job errors with the permission message while the role still exists. To give the test the group to remove the user from, `user_tool_execute_permissions_via_group()` needs to yield the group it creates.

<details><summary>Details</summary>

On `pr_24607_review_0`, the existing test's body is split into `_run_slow_job`, `_queue_user_tool_job_behind` and `_assert_queued_user_tool_job_rejected` helpers. The new `test_queued_job_fails_when_user_is_removed_from_execute_role_group` uses the same helpers and calls `DELETE /api/groups/{id}/users/{user_id}`. It asserts inside the `with` block so that the role stays live.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort: the new test passes against the PR and fails with the `prepare()` recheck removed, and the refactored deletion test still passes.

</details>

### P3 1: Startup path logs revoked role as "removed from tool config" (implementation verified)

At startup, when the owner has lost the role, or a user tool's definition no longer loads, `has_tool` raises during the uuid lookup and the job is failed. The admin log then reads `Tool '...' removed from tool config, unable to recover job`, which is misleading for someone tracking down a role change. The tool is still configured. The owner just can't run it.

Log a distinct reason when the uuid lookup raises, including the exception text. Keep the user-facing fail message unchanged.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort: a `caplog` assertion added to `test_handler_startup_user_tool.py` fails on the PR's handler and passes with the fix.

</details>

### P3 2: Mock-only `prepare()` unit test duplicates the API test (implementation verified)

`test/unit/app/jobs/test_job_wrapper_user_tool.py` replaces `dynamic_tool_manager` with a mock and asserts `ensure_can_use_unprivileged_tool.assert_called_once_with(job.user)`. That tests the implementation's call rather than behavior. It doesn't exercise role resolution or the runner's fail handling. `test_queued_job_fails_when_execute_role_is_revoked` already drives the real `prepare()`, the real manager and the runner fail path end to end.

Drop the unit test.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort: removed on the review branch, and the API tests covering the behavior pass.

</details>

### P3 3: Startup unit test uses an unspecced `MagicMock` as `self` (implementation verified)

`test_handler_startup_user_tool.py` calls `JobHandlerQueue._check_job_at_startup(queue, job)` with a bare `MagicMock` standing in for `self`. Any new attribute the method reads from `self` would silently pass.

Use `Mock(spec=JobHandlerQueue)`, and set `app` and `dispatcher` explicitly, because `__init__` assigns them and the class spec doesn't include them.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort: the test passes with the specced mock.

</details>
