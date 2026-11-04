# Re-scope review

Acted on: #2 (installed versions are filtered by `allow_user_access(user, attempting_access=False)`, matching the tools API) and #4 (each missing id is looked up once). Both were folded into the expansion commit (`363783a0bff`). Found no blockers and nothing security-sensitive; #2 was a parity fix, not an exposure.

Not acted on:
- #1, short ids: under the eager toolbox a short id pools versions from every repository with that short id. The cached toolbox lists only each guid's default version. Both say truthfully what that id resolves to; this is display text on the error path only.
- #3, `AbstractToolBox` import used only for a type hint: the module already imports from `galaxy.tool_util` indirectly, and a top-level import follows house style.
- #5, unit test for `_describe_tool_references`/`_installed_tool_versions`: integration assertions on both toolboxes cover the eager unversioned-guid case, the short id with an existing version, `nonexistent_tool` (no note) and the cached `multiple_versions` case. A stub-toolbox unit test would mostly retest string formatting.

<details><summary>Full review</summary>

Verdict: correct and safe to keep. No blockers or majors; no security-sensitive finding.

Domain checks: `get_tool(..., get_all_versions=True)` can't raise here (None/uuid ids skipped, exact False); returns list or None (`or []`). Unversioned and versioned guids resolve to one lineage via `LineageMap._get_versionless`; the per-shed loop returns the first shed with matches, so sheds aren't mixed. Order is oldest first. Uninstalled ids get no note. Message matches outside the branch (`test_workflows.py:8060,8099`) use `nonexistent_tool`, so they're unchanged; the client parses `missing_tool_ids` from run-download, not this text.

1. minor – short ids: eager pools versions across repositories via `_tools_by_old_id`; cached short-id path returns only each guid's default version, so the two toolboxes can differ. Fix: restrict the note to guids, or comment.
2. minor – no `allow_user_access` filter, unlike `api/tools.py:765`. Low exposure. Fix: filter by user.
3. nit – `AbstractToolBox` import only for a type hint.
4. nit – helper called once per reference rather than once per id.
5. minor – no unit test of the helpers; no versioned-guid-missing or short-id-across-repos case.

</details>
