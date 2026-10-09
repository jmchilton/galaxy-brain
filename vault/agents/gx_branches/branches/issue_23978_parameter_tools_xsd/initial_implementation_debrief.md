# issue_23978_parameter_tools_xsd — implementation debrief

Fixes galaxyproject/galaxy#23978. Two commits (`20d5c431172`, `2a42bff3bfc`) **stacked on `issue_18642_framework_tool_coverage`** (`85f79a9ab6c`), pushed to `jmchilton` fork. No PR opened. Stacked because the parent already removes the stray `g` in `gx_drill_down_code.xml` and adds drill_down `option selected` to the XSD; branching off dev would conflict there and leave CI red.

## Changes

- **`ext=` → nothing / `format=`** in 14 `test/functional/tools/parameters/` tools: `ext="data"` dropped (9 tools, default anyway); `ext="txt"` → `format="txt"` (4 `*select_dynamic` tools) and `ext="tabular"` → `format="tabular"` (`gx_drill_down_code`). The 5 now actually restrict their inputs.
- **Titles:** `title="Section Parameter"` on `gx_section_boolean`, `gx_section_data`, `gx_section_select_dynamic`; `title="Repeat Parameter"` on `gx_repeat_select_dynamic` (matches sibling tools).
- **XSD:** `rules` added to `ParamType` enum, plus a short `#### rules` doc section (core-only, `directory_uri` precedent). Second commit syncs docs: `type` attribute's hand list gains `group_tag`, `directory_uri`, `rules`; `data_ref` docs list `rules` (`RulesListToolParameter` reads it).
- **CI:** `.ci/validate_test_tools.sh` now validates `parameters/*.xml` (excluding `macros.xml`); fixed its XSD lint path (`lib/galaxy/tools/xsd` → `lib/galaxy/tool_util/xsd`, the old one never existed, the lint silently errored). Touching it triggered shellcheck pre-commit, so the `ls | grep` list became a glob + `case` loop; verified the resulting 410-file list is identical to the old logic + `parameters/`.
- **Test expectation:** `test_tool_linters.py::test_inputs_param_type` hardcodes the full enum set in the expected XSD error; extended with `'rules'`. Not a weakening.

## Validation

- **Red:** on the parent tip, 16 of 98 `parameters/` tools fail XSD (matches issue: 17 on dev minus the `g`).
- **Green:** all 410 tools the CI script now covers pass `xmllint --schema` after macro expansion; XSD lints clean.
- **Framework:** `gx_select_dynamic`, `gx_conditional_select_dynamic`, `gx_repeat_select_dynamic`, `gx_section_select_dynamic`, `gx_drill_down_code` 10/10 under default and `GALAXY_TEST_USE_LEGACY_TOOL_API=always`. Test data sniffs as `txt` / `tabular`, so the new restrictions accept it.
- **Unit:** `test/unit/tool_util` + `tool_util_models` (excluding mulled, container resolution, conda — network-bound, hung) 1539 passed, 28 failed — all environmental: 27 CWL conformance files not fetched, timing `test_watcher`. Same set the parent branch saw.
- Did not run `tox -e validate_test_tools` itself (runs `common_startup.sh`); ran its exact file list through the same loader + xmllint pipeline instead. CircleCI will exercise the real script.

## Review

Subagent review (REVIEW_FOCUS.md): no must/should-fix. Applied XSD doc nits (type list, `data_ref`).

Not acted on:

- **`test/functional/tools/CLAUDE.md` line saying validation covers "all test tools in the directory"** — editing it makes pre-commit prettier reformat the whole (pre-existing, unformatted) file. Dropped to avoid churn.
- **Other never-validated subdirs** (`for_workflows/` 17 tools, `expression_tools/` 2, `deprecated/` 1, `for_tours/` 1) — outside the issue; possible follow-up.
- **`ftpfile` in the `type` doc list** isn't in the XSD enum (is in `parameter_types`). Left as-is.
- **GX_CHALLENGE_TESTS skipped:** no new test code, only one extended expected string and fixture-tool edits.

## For the PR

- Parent PR (issue_18642) must open/merge first; until then the compare includes its commits.
- Swap the 🌿 branch link in #23978 for the parent PR once it opens (open item from issue notes).
