# Initial review — PR #24607 (default profile)

- Profile: default
- Model: Opus 5.5 (claude-opus-5-5), effort medium
- Reviewed commit: `1c0f219f3f4e774b897620c44c318f0c987fe95c` (base `release_26.1`)
- Tests not run locally (worktree has no `.venv`).

## Verdict

Small, well-targeted fix; approve-able as is. The `prepare()` gate closes the queued-job gap, the startup change fixes a real "neither failed nor recovered" hole, and the API test is red-to-green against real behavior. Findings below are all P3 polish. No security concerns beyond what the PR itself fixes.

## How it fits

- `JobWrapper` loads its tool with `tool_for_job(job, check_access=False)` (`lib/galaxy/jobs/__init__.py:2906`, `:2931`), so the role is never rechecked after job creation; the new check in `MinimalJobWrapper.prepare` is the right choke point — both `BaseJobRunner.prepare_job` and Pulsar's `prepare` call go through it, as do resubmissions and job-cache hits (check runs before the cache short-circuit).
- At startup `has_tool(..., tool_uuid=..., user=...)` → `get_unprivileged_tool_or_none` swallows the permission error and falls through to `_get_tool_by_uuid`, which raises `ObjectNotFound`; previously that propagated to `__check_jobs_at_startup`'s `except Exception` and the job was left in limbo. Catching it and failing is correct.

## Findings

### P3 1: Access predicate re-implemented instead of reusing the existing one

`prepare()` hand-codes `job.dynamic_tool is not None and not dynamic_tool.public` + `ensure_can_use_unprivileged_tool(job.user)`. The same rule already lives in `ToolBox.tool_for_job(check_access=True)` (`lib/galaxy/tools/__init__.py:~725`), and the loaded tool already carries `is_unprivileged_tool` (set in `dynamic_tool_to_tool`). Calling `tool_for_job` again would reload the tool (costly), so a direct check is reasonable, but the rule is now in two places. Suggest a small `DynamicToolManager` helper (e.g. `ensure_job_owner_can_run(job)` / `ensure_can_run_dynamic_tool(user, dynamic_tool)`) used by both `tool_for_job` and `prepare`, or at least key off `self.tool.is_unprivileged_tool`, so the "who may run a private dynamic tool" rule has one home.

### P3 2: Broadened `InsufficientPermissionsException` catch in runners

`BaseJobRunner.prepare_job` and the Pulsar runner now treat any `InsufficientPermissionsException` raised during `prepare()` as a validation-style rejection (info log, no traceback, `exception=False`). Today only the new check raises it there, but any future permission error from evaluation/file sources/object stores would silently lose its traceback. Low risk; alternatives are a narrower subclass for this case, or a comment noting the catch exists for the owner-role recheck.

### P3 3: Startup path logs and reports revoked role as "removed from tool config"

When the startup path fails a job because the owner lost the role, the log says `Tool '...' removed from tool config, unable to recover job` and the user sees "This tool was disabled before the job completed. Please contact your Galaxy administrator.", while the `prepare()` path reports "User is not allowed to run unprivileged tools". Same cause, two messages; the log line is misleading for admins debugging a role change. Consider a distinct log line (and optionally the permission message) when `job.dynamic_tool` is private and the lookup raised.

### P3 4: Mock-only `prepare` unit test duplicates the API test

`test/unit/app/jobs/test_job_wrapper_user_tool.py` mocks `dynamic_tool_manager` and only asserts `prepare()` calls it and re-raises — it doesn't exercise role resolution or the runner's fail handling. `test_queued_job_fails_when_execute_role_is_revoked` already covers the real behavior end to end (and is red without the fix). Per review focus (prefer integration over trivial mocked unit tests), consider dropping the unit test, or replacing it with one that covers something the API test can't (e.g. `public=True` dynamic tool is not checked; `job.user is None` fails). The startup unit test (`test_handler_startup_user_tool.py`) is justified since restart recovery is hard to drive from the API, though calling `_check_job_at_startup` unbound on a `MagicMock` self is fragile to refactors.

## Notes (non-findings)

- API test revokes via role delete+purge only; the "remove user from role" path from the doc isn't exercised directly, but both go through `user.all_roles()` so coverage is adequate.
- API test timing relies on `sleep_time: 10` outlasting tool creation + run submission; the dependent job is held in `new` by its unready input, so the race window is small.
- With Pulsar, `client.setup()` runs before `prepare()`, so a revoked job still makes the remote setup call before failing; harmless, and checking earlier (handler `__verify_job_ready`) would miss jobs already sitting in a runner queue.
