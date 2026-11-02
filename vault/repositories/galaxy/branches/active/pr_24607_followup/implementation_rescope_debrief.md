# Re-scope debrief

The first scope evaluation (now `earlier_drafts/1/scope_evaluation.md`) said to expand. When the owner lost the execute role, the startup log still read `(uuid X) unavailable: Failed to find a tool with uuid [X]`: `get_unprivileged_tool_or_none` swallows `InsufficientPermissionsException`, and `_get_tool_by_uuid` then raises `ObjectNotFound`. The original scope is kept as `pr_24607_followup_alt_original_scope` (`d5f130d73ac`), described in [alts/original_scope.md](alts/original_scope.md).

## Changes

- `59f2aa5b7be`: new `DynamicToolManager.ensure_job_owner_can_run(job)`. `_tool_unavailable_reason(app, job)` calls it before `has_tool` and logs `not usable by the job's owner: <error>`. Red to green: 4 unit tests (manager guard, startup role-loss path, helper signature) failed before the change.
- `e6efabbcbf4`: test in `test_user_defined_tool_loading.py` that uses the existing `_executor`/`_create`/`_job` fixture. It deletes the real role and asserts the reason. It's red against the alt's lib (gets `Failed to find a tool with uuid`). This came from the normal review.
- Dropped the `test_job_wrapper_user_tool.py` deletion commit. Open #24635 (release_26.2) extends that file right next to the dropped method, and `BaseWrapperTestCase` gives that file inherited `prepare()` runs for user tools.

## Decisions

- `prepare()` keeps its inline guard. #24635 adds a hunk right after `jobs/__init__.py:1404-1407`, so editing those lines would conflict on merge-forward. Follow-up: switch it to `ensure_job_owner_can_run` after #24635 lands. The review confirmed #24635's hunks still apply cleanly to HEAD.
- The user-facing fail message "This tool was disabled..." is unchanged. #24607's verified review kept it; changing it to match `prepare()` is a question for John.
- Skipped the `__verify_job_ready` log fix (Q5). Its context is `job_wrapper.tool is None`, so it can't reuse the helper.
- Skipped from the review's nits: a `Job.user_defined_tool` property (optional, 4 open-coded sites, would grow scope), the user id in the log (job id is already logged), and the duplicate disabled-message constant (out of scope).

Review: [subagents/rescope_review.md](subagents/rescope_review.md). Both real items were acted on: the stale PR description and the missing real-chain test.
