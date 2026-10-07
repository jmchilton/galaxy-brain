# issue_18642_framework_tool_coverage — polish debrief

Polished 2026-10-07. The branch went from `93eef27e194` to `ae3e417411e` with one comment-only commit, pushed to the `jmchilton` fork. No PR has been opened.

## CI

- At the start, fork CI on `93eef27e194` was all queued and showed no reds.
- The push of `ae3e417411e` cancelled those runs. Fork CI on `ae3e417411e` is queued, so nothing has finished yet.
- Watch Tool framework, Integration (load-error noise from `test_data_manager*.py`), Test Galaxy packages and Build docs (the XSD attribute table).

## Checklist (GENERAL.md)

- The subagent passed all five items an agent can answer. The human-read item is left for John.
- After the comment-only commit, I re-ran a subagent on the two comment items. Both pass, and both reworded comments are accurate against `factory.py:281` and `tools/__init__.py:1738`. It noted that "(parameter models)" in `xml.py` is terse. I didn't push another commit for it, which would have restarted the backlogged fork CI. That's left for John's read.
- The description's production Tool Shed row is backed by checks: the assertion is present on `release_26.0` and `release_26.1`, and the branch XSD still rejects annotation_profiler's `display="checkbox"` (xmllint).

## Red evidence gathered during polish

- **Framework tests on dev's parser:** I ran `gx_drill_down_from_file` with dev's `parser/xml.py` under `GALAXY_TEST_USE_LEGACY_TOOL_API=never`.
  - It failed 2/2 with `could not build request: This tool cannot be parsed outside of a Galaxy context`.
  - The server also logged `Failed to generate parameter models for tool 'gx_drill_down_from_file'`.
  - I restored the file afterwards, leaving the worktree clean.
- **Real tool:** I ran `parse_tool()` and the Tool Shed's `parse_tool_custom(…, ShedParsedTool)` on devteam `annotation_profiler.xml`. Both assert on dev, and both build the model on the branch.
- **Main Tool Shed:** `GET /api/tools/devteam~annotation_profiler~Annotation_Profiler_0/versions/1.0.0` returns HTTP 500, while fastqc returns 200. The cause matches the local run, but I haven't confirmed it in the shed's logs, and the description says so.
- **Only known user:** in local tools-devteam, tools-iuc and galaxytools, annotation_profiler is the only drill_down that uses `from_file`. The other hits are select `<options from_file>`.

## Strengthening round

Tasks applied:

- Replaced "planemo" with "Tool Shed". Planemo never calls `parse_tool`, and its lint path swallows the exception. The Tool Shed is the real consumer outside Galaxy.
- Added the main Tool Shed 500 row to the before/after table.
- Added a bold-italic line on severity. On dev the tool form still runs these tools through the legacy `/api/tools` fallback. What breaks is the Tool Shed tool API, tool_util and the typed tool APIs. I cited `Tool … has no parameters defined` as coming from the code, not from a run.
- Reworded two comments (`xml.py`, `parameter_specification.yml`) from "outside Galaxy" to "without a tool data path". Galaxy's own model build doesn't get one either.
- Moved the "filter check isn't a feature" and "XSD `from_file` isn't new" answers above the fold, in bold-italic.

## Follow-up after hand-off (John's answers)

- **The XSD now accepts `display="checkbox"`, folded in at `1e8e1f9d97d`.**
  - `checkbox` was added to the shared `DisplayType` enum, and the `display` docs say it does nothing on drill_down. The client's `FormDrilldown` picks checkboxes or radios from `multiple` and ignores `display`.
  - Red to green: the new `test_tool_linters.py::test_xsd_drill_down_from_file_and_display` failed on the enum and now passes. All 135 linter tests and the 36 parameter tests pass. annotation_profiler now validates against the branch XSD.
  - XSD 1.0 can't condition the enum on `type`, so select also gets `checkbox` in the schema. At runtime it still renders as a drop-down, as any unrecognized `display` value does. The description's Risk Details says so.
- **The `ext=` cleanup went to an issue draft,** [`gx_issues/to_file/framework_parameter_tools_ext_attribute.md`](../../../gx_issues/to_file/framework_parameter_tools_ext_attribute.md). It covers 14 tools, plus the other XSD failures in `parameters/`: 17 of 100 tools fail macro-expanded validation, and CI validates only top-level tools.

- **John asked to fold in drill_down option `selected`, done at `85f79a9ab6c`.**
  - `ParamDrillDownOption` gains `selected` (PermissiveBoolean, worded like select's). The runtime uses selected options as the default (`basic.py` ~1920, `tool_util_models` `selected_drill_down_options`).
  - The linter test was renamed `test_xsd_drill_down_attributes` and given an inline option with `selected="true"`. It was red on the attribute and is green now.
  - `validate_tools.sh` passes `gx_drill_down_exact_with_selection.xml`.
  - The issue draft now marks that row as fixed on this branch.

## Scope questions for John

- Should `tool_data_path` go through `input_models_for_pages`, for a strict Literal model inside Galaxy? It changes the signature, and tool_util and the Tool Shed still wouldn't benefit.
- Should there be a Tool Shed regression test, a model endpoint test for a relative-`from_file` drill_down?
- Is the `../test/functional/tool-data/` fixture path acceptable? The alternative is the root `tool-data/` directory.
