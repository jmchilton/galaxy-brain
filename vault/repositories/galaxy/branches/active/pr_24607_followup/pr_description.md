Follow-up to #24607, which re-checks a user-defined tool owner's execution role at job prep.

- Add API test: queued user tool job fails when the owner is removed from the group granting the execute role (passes with #24607's fix, fails without).
- Log a distinct startup reason (`(uuid ...) unavailable: <error>`) when a dynamic tool job can't be recovered because its uuid lookup raises (owner lost the execute role, definition can't load, tool deactivated); previously logged as "removed from tool config". Startup unit test asserts the uuid and error.
- Drop mock-only `prepare()` unit test duplicating API coverage.
- Spec the `JobHandlerQueue` mock in the startup unit test.
- `user_tool_execute_permissions_via_group()` yields the group and reuses `create_group`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
