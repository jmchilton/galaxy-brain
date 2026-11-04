# Normal review

Acted on: #2 (`get_tool_at_version` now tries the exact id before the non-exact lookup), #3 (exact-version integration test now waits for the job and asserts it ran the versioned guid) and #6 (pre-flight keeps the early-`continue` shape). Found no blockers and nothing security-sensitive.

Not acted on:
- #1, short ids accepted under exact versions: kept on purpose. `CachedToolBox` already accepts a short id at an installed version for exact requests (`cached_toolbox.py` `has_tool`/`get_tool` short-id paths), so this brings the eager toolbox in line. Trying the exact id first (#2) narrows the ambiguity. Listed in the debrief as a decision.
- #4, two-repo short-id unit test: the eager unit fixture has a single repository. Building a second-repo fixture is out of scope.
- #5, no safe-version upgrade for an unversioned guid whose version isn't installed: behavior is unchanged from before. Recorded as a known limitation.

<details><summary>Full review</summary>

No blockers or security-sensitive issues; fix is correct and minimal. Ran: both new unit tests pass; `test_workflow_invocation.py -k "unversioned or missing_tool"` passes (10 tests) under eager and cached toolboxes; mypy clean on changed lines.

Domain checks:
- CachedToolBox, unversioned guid: not in index/short-id map, falls to `super().get_tool` → lineage map keyed by versionless guid; stays inside one repo.
- CachedToolBox, short id: `has_tool`/exact `get_tool` already accept short id at an installed version on main; fallback never reached on cached path; fix makes eager match cached.
- Safe-version path: fallback only returns tool with version == `self.tool_version`, so the `get_safe_version` branch (which would `assert` on an exact-id re-lookup of an unversioned id) is never entered.
- tool_uuid: both sites skip fallback when set.
- Other exact_tools=True callers: only `ToolModule.from_dict` (create/import/update); `from_workflow_step`, refactor, `inject_all` pass False. Import of unversioned guid at installed version now resolves the tool; tool_id stored unchanged.

Findings:
1. minor – base.py: eager short id via `_tools_by_old_id` spans repos; under exact-versions a short id shared by two repos at the same version resolves to the first registered. Matches non-exact and cached behavior. Fix: comment+test, or restrict fallback to guids.
2. minor – cached_toolbox.py short-id path: non-exact `get_tool` for a short id mapping to several guids returns the newest default overall, so `get_tool_at_version(short, "1.0")` may return None even when some guid has 1.0. Fix: try exact first.
3. minor – exact-version integration test only asserts 200; fix: wait for jobs and assert tool_id.
4. nit – no two-repo short-id unit test; eager-only coverage.
5. nit – unversioned guid gets no safe-version upgrade when its version isn't installed; unchanged behavior.
6. nit – inverted if/else in pre-flight harder to read than early `continue`.

</details>
