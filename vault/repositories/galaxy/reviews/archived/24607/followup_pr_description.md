Follow-up to #24607, which re-checks a user-defined tool owner's execution role at job prep.

- Add API test: queued user tool job fails when the owner is removed from the group granting the execute role (passes with #24607's fix, fails without).
- Log a distinct startup reason when a user tool job can't be recovered because its owner lost the execute role or the definition can't load; previously logged as "removed from tool config".
- Drop mock-only `prepare()` unit test duplicating API coverage.
- Spec the `JobHandlerQueue` mock in the startup unit test.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
