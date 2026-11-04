Run via Claude Opus 5.5 at high effort.

**Top line:** Acted on the two structural findings in `services/workflows.py`. The pre-flight lookup's three-way branch moved into `_find_workflow_tool`. The installed-versions block and the optional `installed_versions` parameter on the shared `_describe_tool_references` became a dedicated `_describe_missing_tools`. Each change was folded into its own commit (fix, then installed versions). The baseline commit is unchanged. Did not act on the deeper fix of making `get_tool(exact=True)` match by version, which is out of scope for a release branch. Also left the duplicated `exact and version and not uuid` guard and the small `get_tool_at_version` loop alone.

Final commits: `99f05078e1b` (baseline, unchanged), `a7e01a3162a` (fix), `0c29b5fdc4c` (installed versions).

## Not acted on

- **Make `exact` mean exact version in `get_tool`/`has_tool`.** This is the real simplification. It would delete `get_tool_at_version` and both fallbacks. But it changes every exact caller and both toolbox implementations (eager and cached), and their exact semantics already differ: the eager `get_tool` can return another version under `exact=True`. That is too broad for release_26.2. Good dev follow-up.
- **The `exact and tool_version and not tool_uuid` guard is duplicated** in the pre-flight and in `ToolModule.__init__`. Each caller's surrounding lookup is different (UUID/unprivileged handling in ToolModule). Moving the guard into the toolbox would hide which caller-side cases it covers. Two short occurrences with comments are acceptable.
- **`get_tool_at_version` loops over `exact in (True, False)`.** The loop is slightly clever, but it is commented, short and unit-tested. Unrolling it would only duplicate the version check.
- **Format duplication.** `_describe_missing_tools` repeats the two-line `"id (version v...)"` format and `dict.fromkeys` join from `_describe_tool_references`. I chose this over a callback or an optional mapping parameter on the shared helper.
- **File size.** `toolbox/base.py` (already about 1.85k lines) and `workflow/modules.py` were over 1k lines before this branch. `services/workflows.py` grows from 743 to about 775 lines. No file crosses the threshold.

<details>
<summary>Full review</summary>

### 1. Pre-flight loop grew into a nested three-way branch (structural, acted)

`_check_workflow_tools` previously ran `has_tool`, then `get_tool`, then the compatibility check. The fix added an `if not has_tool:` block that set a `tool = None` sentinel, conditionally called `get_tool_at_version`, re-tested `None` and then `continue`d, plus an `else:` holding the old `get_tool`. That is a special case inside an already busy loop, and the loop body mixed "how do we find the tool" with "classify it as missing or incompatible".

Remedy applied: added a module-level `_find_workflow_tool(toolbox, tool_reference, require_exact_tool_versions, user) -> ToolLike | None`, which does:
1. `has_tool` then `get_tool`, with the existing comment about cached-toolbox version drift.
2. Otherwise, for exact non-UUID references with a version, `get_tool_at_version`.
3. Otherwise `None`.

The loop is now: resolve; if `None`, mark missing; if not workflow-compatible, mark incompatible. This also removes the `if tool and ...` truthiness guard. One behavior edge: if `has_tool` is true but `get_tool` returns `None`, the reference is now reported missing instead of silently passing. That case can't happen with the eager toolbox, where `has_tool` is defined as `get_tool(...) is not None`. With the cached toolbox it would mean the two methods disagree, and reporting missing is the safer outcome.

### 2. Missing-tool description logic leaked into the shared formatter and the service method (spaghetti, acted)

The installed-versions commit added two things:
- An inline 12-line block in `_check_workflow_tools` that built a `tool_id -> versions` dict, only in exact mode and only for non-UUID references.
- An optional `installed_versions: dict | None = None` parameter, read with `(installed_versions or {})`, on `_describe_tool_references`. That helper is also used for incompatible tools, which never pass the parameter.

So missing-tool logic sat in a shared path, behind an optional parameter and a silent fallback.

Remedy applied: restored `_describe_tool_references` to its upstream form and added `_describe_missing_tools(toolbox, tools, require_exact_tool_versions, user)`. It delegates to `_describe_tool_references` in non-exact mode. In exact mode it adds the `installed:` note. `_installed_tool_versions` now takes the reference and owns the "no id or has UUID returns `[]`" guard. The service method is back to a single `raise`. Duplicate tool ids now trigger one `get_all_versions` lookup per reference instead of one per id. This only happens on the error path, so the cost is negligible.

### 3. `get_tool_at_version` (boundary, not acted)

This is the right layer: the toolbox owns lineage resolution. It is a near-duplicate of what `get_tool(exact=True)` arguably should do (see "Not acted on"). The `str(tool_version)` coercion is redundant given the `str` annotation, but harmless, since callers pass values from loosely typed reference dicts.

### 4. `ToolModule.__init__` fallback (spaghetti, minor, not acted)

This adds a third conditional lookup to an already layered init: unprivileged UUID, then `get_tool`, then `get_tool_at_version`. It is acceptable because it mirrors the pre-flight, has a comment, and keeps the following safe-version upgrade untouched. Consolidating it would require a toolbox method aware of UUIDs and unprivileged tools, which is a larger change.

### 5. Tests

The integration tests now use `_assert_missing_tools` and `_upload_compose_text_param_workflow` helpers, which cut the repeated invoke-and-assert blocks. The unit tests pin both the `exact`-means-id semantics (baseline) and `get_tool_at_version`. No concerns.

### Validation after changes

- `test/unit/app/tools/test_toolbox.py`: 58 passed, 2 xpassed.
- Integration (`test_workflow_invocation.py`, `test_tool_source_storage.py`): 46 passed.
- ruff, black and isort are clean. mypy shows no new errors on changed lines; the errors at lines 232, 676 and 684 of `services/workflows.py` are pre-existing.

</details>
