# Alt: original scope

`pr_24607_followup_alt_original_scope` at `d5f130d73ac` ([GitHub](https://github.com/jmchilton/galaxy/tree/pr_24607_followup_alt_original_scope)): the branch after its first hardening pass (baseline refactor applied).

Differs from the parent:
- Deletes `test/unit/app/jobs/test_job_wrapper_user_tool.py` (mock-only `prepare()` test). Parent keeps it: open #24635 extends that file, and deleting it also dropped the inherited `BaseWrapperTestCase` runs for user tools.
- No `DynamicToolManager.ensure_job_owner_can_run`. Owner role loss at startup logs as `(uuid X) unavailable: Failed to find a tool with uuid [X]`; parent logs `not usable by the job's owner: User is not allowed to run unprivileged tools`.
