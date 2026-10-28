# Normal review 1 debrief

Verdict: sound, no blockers, nothing security-related. Acted on the dry-run toolbox leak (a successful `dry_run` update unloads admin tools it loaded) and on the `unload_dynamic_tool` cache and `old_id` nit, and added a unit test that restores the previous default version (`5d27bcc22e1`).

Not acted on:
- Redundant flush in `create_unprivileged_tool`: it isn't redundant. Galaxy's session doesn't autoflush, and removing it broke uuid ownership lookups (12 API failures), so it stays with a comment.
- `max(version_object)` vs `_newer_tool`: equivalent, since `_newer_tool` compares `version_object`.
- Implicit scope dependency of `create_tool(commit=False)`: the only callers are inside the scope. Left as is.
- Test that a successful import commits: existing `test_import_embedded_user_tools_after_step_metadata` (incl. nested) and the user-defined round-trip tests cover it.

<details><summary>Full review</summary>

- `rollback_tools_on_error` nesting is correct. Rolling back the whole session is safe for every caller (api workflows create/update, wes, TRS/URL, refactor).
- `is_subworkflow=True` callers are all nested inside an outer commit.
- Dry run: rows are flushed but never committed, so they vanish. Admin tools stayed in the toolbox; this is fixed.
- `unload_dynamic_tool` is correct in the main case. Nits: caches and `old_id` were not cleaned when the tool wasn't the default (fixed).
- Tests: good red→green coverage. Gaps: unload restore unit test (added).
</details>
