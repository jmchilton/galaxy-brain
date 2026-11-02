Run via Claude Opus 5.5 at high effort.

# Test challenges debrief

Both red checks went red as expected, so the PR description's "fails without" claim holds and `pr_description.md` is unchanged. I made two small test changes: the startup unit test's log assertions now pin the uuid and the error, and the via-group populator reuses `create_group`. I dropped nothing new, removed no assertions and added no E2E test.

New HEAD: `7eccb6af993` (pushed to `jmchilton/pr_24607_followup`).

## Red checks

**API test `test_queued_job_fails_when_user_is_removed_from_execute_role_group`: RED without #24607's fix.**
- I reverse-applied the `381deb993ec^1..381deb993ec` lib changes into the worktree:
  - `jobs/__init__.py`: the `prepare()` role check, which is the change that makes the test go red.
  - `jobs/runners/__init__.py` and `jobs/runners/pulsar.py`.
  - `managers/tools.py`: its `user is None` guard, reverted by hand because the type annotation has drifted on dev.
- I did not revert `handler.py`. The branch rewrote the same lines, and the hunk only touches startup recovery, which this test never reaches.
- I ran the single test against a fresh server on port 9437. It failed at `assert job_details["state"] == "error"` with an actual value of `'ok'`: the queued job ran to completion.
- I restored with `git checkout -- lib` and the tree was clean.
- This check is against #24607's merged fix, not this branch's lib change. Without the branch, the test fails at `group['id']` because the helper only yields the group on this branch, which is a missing fixture rather than the assertion. That is expected for a coverage follow-up.

**Startup unit test caplog assertions: RED with the branch's `handler.py` change reverted.**
- I reversed only `git diff origin/dev...HEAD -- lib/galaxy/jobs/handler.py`.
- Both parameters failed at the "not available to the job's owner" assertion. The log said `... Tool 'user_tool' removed from tool config, unable to recover job`.
- After I strengthened the assertion I ran the check again, and both parameters failed at the new uuid-and-error assertion.
- Restored; the tree was clean.

## Challenges

- **Dropped `test_job_wrapper_user_tool.py` (branch commit `3ac075e8bf6`):** I agree with the drop. It was mock-only: it stubbed `dynamic_tool_manager` and the evaluator, then asserted the call. The two queued-job API tests cover the same `prepare()` check for real.
- **`test_handler_startup_user_tool.py`:**
  - Kept, because it is the only coverage of startup recovery for user tools. A restart integration test (like `test/integration/test_job_recovery.py`) would need the beta tool formats, role setup and the handler `server_name` swap, which is not an easy rewrite.
  - Strengthened (`fa6ae60c00d`). The `DynamicTool` previously had no uuid, so the log said `(uuid None)`. It now gets `uuid4()`, and the test asserts the full `(uuid <uuid>) not available to the job's owner: <error>` fragment.
  - Considered and skipped: pulling the reason logic out into a module-level `(toolbox, job) -> str | None` helper. The test would still need the queue mock to assert `fail()` was called and `recover()` was not, so no mocks would go away. It would only add surface to merged code for the sake of a log string.
  - `Mock(spec=JobHandlerQueue)` is fine as is. Writing fake dataclasses for the queue, app and dispatcher would cost more than it gives.
- **API tests and helpers:**
  - `user_tool_execute_permissions_via_group` hand-posted to `groups` right below the existing `create_group` populator. It now calls `create_group` (`7eccb6af993`). Its only other caller, `test_create_unprivileged_with_group_inherited_role`, still passes.
  - The `DELETE groups/{id}/users/{id}` call is used once in this branch, so I added no populator helper for it. `test_group_users.py` uses raw calls on purpose, since it tests that endpoint.
  - The comment on `_queue_user_tool_job_behind` said "when the role is revoked", which doesn't fit the group test. It now says "when execute access is removed".
- **E2E:** none needed. There is no UI change.
- **Baseline tests:** none on this branch.

## Test runs

- `test/unit/app/jobs/test_handler_startup_user_tool.py`: 2 passed.
- API tests, run one sequential pytest invocation on port 9437, all passed:
  - `test_create_unprivileged_with_group_inherited_role`
  - `test_queued_job_fails_when_execute_role_is_revoked`
  - `test_queued_job_fails_when_user_is_removed_from_execute_role_group`
- ruff, black, isort and flake8 are clean on the changed files. I installed the pinned lint requirements into `.venv`, because ruff and flake8 were missing.
