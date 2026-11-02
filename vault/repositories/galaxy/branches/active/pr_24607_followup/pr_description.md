Follow-up to #24607, which re-checks a user-defined tool owner's execution role at job prep.

- Add API test: queued user tool job fails when the owner is removed from the group granting the execute role (passes with #24607's fix, fails without). `user_tool_execute_permissions_via_group()` yields the group and reuses `create_group`.
- Startup recovery now logs why a dynamic tool job can't be recovered instead of "removed from tool config":
  - owner lost the execute role: `(uuid ...) not usable by the job's owner: User is not allowed to run unprivileged tools`, via new `DynamicToolManager.ensure_job_owner_can_run(job)`. Checked before the uuid lookup, which otherwise swallows the permission error and reports `ObjectNotFound`.
  - any other uuid lookup failure (definition can't load, tool deactivated): `(uuid ...) unavailable: <error>`.
- The startup tool check moves into a `_tool_unavailable_reason` helper. A unit test runs the real startup check against a real role deletion; the `unavailable:` fallback is unit tested with a mocked lookup.
- Spec the `JobHandlerQueue` mock in the startup unit test.
- Hoist the "tool was disabled" message into `TOOL_DISABLED_MESSAGE`, shared by startup recovery and `__verify_job_ready`.

`JobWrapper.prepare()` keeps its inline role check for now; #24635 adds code right after it, so switching it to `ensure_job_owner_can_run` can follow once that merges forward.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
