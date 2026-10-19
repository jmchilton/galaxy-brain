# issue_18642_framework_tool_coverage — implementation debrief

Addresses galaxyproject/galaxy#18642 ("Missing Tool Framework Test Coverage"). Two commits on dev `4fe00d9e7ab` (`7026585840c`, `93eef27e194`), pushed to `jmchilton` fork. No PR opened.

## Issue items vs dev

1. **Drill downs with `from_file`**: not covered on dev, and the test exposed a real bug. Now done.
   - The bug: `XmlInputSource.parse_drill_down_static_options` asserted when it got a relative `from_file` without a tool data path. The parameter factory never passes one. So every relative `from_file` drill_down (for example devteam annotation_profiler) had no parameter model. Galaxy logged a warning and left `tool.parameters` unset; tool_util and planemo raised.
   - The fix: return `None` instead, meaning the options are unknown, the same as dynamic options. The model degrades to `StrictStr`.
   - New tool `parameters/gx_drill_down_from_file.xml` plus fixture `test/functional/tool-data/gx_drill_down_from_file_options.xml`. It has a passing test and an `expect_failure` test for a value that isn't in the file.
2. **Drill downs with `dynamic_options`**: already covered by `gx_drill_down_code.xml`, added in #19027 (`951ab47f47e`, 2024-10). That PR doesn't reference #18642. This branch adds a spec entry and fixes a stray `g` before `<param>` in that tool.
3. **Selects with `dynamic_options`**: already covered by `gx_select_dynamic*.xml` from #19027. This branch adds a spec entry for `gx_select_dynamic`.
4. **Drill downs with filters**: the feature is gone.
   - The 2008 feature used child `<filter type="data_meta">` elements, and `basic.py` no longer has any runtime support for it.
   - All that remained was a parser check that could never fire. It read the `filter` and `dynamic_options` *attributes*, and it only ran when `dynamic_options` was absent, because both callers take the static path only in that case.
   - This branch removes that check. Suggested PR text: item 4 is resolved by deleting dead code.

## Other changes

- **XSD:** adds a `from_file` attribute on `param`, documented for drill_down only and listed in the drill_down `$attribute_list`. Before this, schema validation rejected a real runtime feature, which also breaks lint for annotation_profiler-style tools.
- **`DrillDownSelectToolParameter`:** asserts that options were resolved. This keeps a clear error for the `tool=None` plus relative `from_file` case (no callers found). `open()` in the parser is now a context manager.

## Fixture path caveat

- `from_file="../test/functional/tool-data/..."` is resolved against Galaxy's `tool_data_path`. It works only when that path is the from-source default `<root>/tool-data`, which is the case in framework CI.
- Integration tests that override `tool_data_path` and load framework tools (`test_data_manager*.py`) will log one load exception for this tool. That's log noise, not a failure, and neither test uses this tool.
- The alternative, a fixture in root `tool-data/`, would pollute the deploy directory. Worth a line in the PR description.

## Validation

- **Red:** `test_parameter_test_cases.py::test_validate_framework_test_tools` failed with "This tool cannot be parsed outside of a Galaxy context". It's green after the parser fix.
- **Unit tests:** `test_parameter_specification.py` and `test_parameter_test_cases.py` pass (36), as do the doctests in `basic.py` and `parser/xml.py`.
- **Wider suite:** the full `test/unit/tool_util` run (excluding mulled) had 1497 passed and 32 failed. All the failures are environmental:
  - 31 are CWL conformance files that were never fetched into this worktree.
  - 1 is the timing-based `test_watcher`.
- **Framework:** `gx_drill_down_from_file`, `gx_drill_down_code` and `gx_select_dynamic` pass 6/6 under both `GALAXY_TEST_USE_LEGACY_TOOL_API=never` and `always`. Those are the two modes in the CI matrix.
- **Schema:** `xmllint` on the XSD passes, and `validate_tools.sh` on the new tool passes. Note that CI XSD validation only covers top-level `test/functional/tools/*.xml`, not `parameters/`.

## Review

Subagent review against `_shared/REVIEW_FOCUS.md` found nothing must-fix. I applied the run in `never` mode, the basic.py assert, the XSD wording and attribute list, `with open`, and the `gx_select_dynamic` spec entry.

Not acted on:

- **Plumbing `tool_data_path` through `input_models_for_pages`**, which would give a stricter Galaxy-side Literal model. It would change a signature, and tool_util and planemo still couldn't use it. Possible follow-up.
- **A Galaxy-side unit test that `from_file` options load.** The framework test covers loading and rejection end to end.
- **`ext=` on `type="data"` params in about 10 `parameters/` tools.** It isn't valid XSD; `format` is the right attribute. It's pre-existing, and those tools aren't schema-validated in CI. Separate cleanup.
- **The original annotation_profiler sample** wrapped its options in `<filter>`, so today's `find("options")` wouldn't load it as-is. That tool's sample file is gone from Galaxy anyway.
