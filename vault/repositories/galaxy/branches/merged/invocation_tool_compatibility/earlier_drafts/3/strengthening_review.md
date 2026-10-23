# Fresh strengthening review — invocation_tool_compatibility

Reviewed the supplied rebased diff, fresh checklist, current PR description, branch record and scope/implementation debriefs. No implementation work is necessary to make the stated motivation convincing. The existing API reproductions demonstrate both early incompatibility rejection and prevention of empty requested histories; a broader readiness framework would dilute this independent fix.

Necessary in-scope work is prose only:

- Add one concrete example above the table: an API invocation of an imported workflow containing installed `test_data_source` now returns HTTP 400 naming that tool, before creating a requested history. This turns the general claim into the real reproducer already covered by tests; no new code or demonstration infrastructure is needed.
- Make the audience explicit in a highlighted sentence. Likely misreading: this changes tool installation/import acceptance or requires tool-author changes. Suggested sentence: ***This validates workflow invocation requests, including imported workflows containing installed tools that cannot run in workflows.*** Current highlighting covers lookup semantics, but does not identify this audience/entry point.
- Make the scope bound explicit in a highlighted sentence. Likely misreading: the opener's “before creating run state” promises universal invocation atomicity or resolves all of #20900. Suggested sentence: ***This prevents history creation for missing or workflow-incompatible tools; other invocation validation remains unchanged.*** The existing highlighted sentence correctly handles a different misreading—new tool-resolution policy—and should remain.

The current “can accept” and “can create” describe concrete conditional failure modes, not unsupported hedging. No code development is needed to replace them with a stronger universal claim. Preserve the “Toward” opener, missing-tool precedence, exact-version formatting and acknowledged earlier error ordering.

No design decision, scope expansion, tests or further Git operations are needed for these prose improvements. This review did not execute validation; the existing checklist appropriately reserves fresh results for the polishing parent.
