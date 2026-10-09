# issue_18642_framework_tool_coverage — implementation debrief

Branch at `f66d1f0f97d` (off dev `4fe00d9e7ab`), pushed to the `jmchilton` fork. No PR has been opened. The earlier debrief is in `earlier_drafts/1/`.

## Scope decision (2026-10-08): deprecate drill_down `from_file`, don't document it

- **Search:** I re-ran it on fresh fetches of tools-iuc, tools-devteam, galaxytools, tools-iwc-lab and galaxy-image-analysis, plus GitHub code search.
  - The only drill_down `from_file` is devteam `deprecated/tools/annotation_profiler`. Every other hit is select `<options from_file>`, which is already linted as deprecated.
  - drill_down itself has only two users: annotation_profiler and GMAJ.
- **annotation_profiler can't load in Galaxy even with a correct tool data path.**
  - Its options sample wraps `<options>` in `<filter type="data_meta">`, the dead feature behind issue item 4.
  - The branch parser given the installed sample raises `Non-dynamic drilldown parameters must supply an options element`.
  - It isn't installed on .org, .eu or .org.au. So the feature has zero working users.
- **Options weighed:**
  - Tool-relative resolution gated on profile: it needs a tool dir and profile plumbed into `XmlInputSource`, and it duplicates macro `<import>`.
  - An allowlist of tool ids in Galaxy: it would guard nothing.
  - Dropping the attribute from the XSD: it would break the stacked `issue_23978_parameter_tools_xsd`, which XSD-validates every `parameters/` tool.
- **John chose demote + deprecate:**
  - The attribute stays in the XSD as `gxdocs:deprecated` and is out of the drill_down `$attribute_list`.
  - New `InputsDrillDownFromFile` lint warning, a sibling of `InputsSelectDynamicOptions`. It's red to green via `test_inputs_drill_down_from_file_deprecated`.
  - The parser `None` fix and the framework test stay as legacy coverage, so the Tool Shed model endpoint no longer returns 500 for such tools.

## Rest of the branch (unchanged)

- The parser returns `None` for a relative `from_file` without a tool data path.
- `DrillDownSelectToolParameter` asserts that options were resolved.
- The dead drill_down `filter` check is deleted.
- New tool `gx_drill_down_from_file` with fixture `test/functional/tool-data/gx_drill_down_from_file_options.xml`.
- Spec entries for `gx_drill_down_code`, `gx_select_dynamic` and `gx_drill_down_from_file`.
- XSD now accepts drill_down `display="checkbox"` and option `selected`.

## Validation

- `test_tool_linters.py`: 136 passed.
- `test_parameter_specification.py` and `test_parameter_test_cases.py` pass. Together with the linter suite that's 172 passed.
- `xmllint` on the XSD passes. `validate_tools.sh` passes `gx_drill_down_from_file.xml`, and annotation_profiler still validates.
- Framework tests weren't re-run, since no runtime code changed since the last run.

## Follow-ups

- The stacked `issue_23978_parameter_tools_xsd` was rebased onto `f66d1f0f97d` (now `2bd2d9cf1b4`, force-pushed with lease). `validate_test_tools.sh` passes all 410 tools, and all 136 linter tests pass.
- The scope questions in the polish debrief still stand: `tool_data_path` plumbing, a Tool Shed regression test, and the fixture path.
