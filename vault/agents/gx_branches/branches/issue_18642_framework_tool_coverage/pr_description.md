Fix 🎯 #18642 - add the missing drill_down/select framework coverage, and fix the parameter-model failure it exposed for relative `from_file` drill_downs.

A drill_down whose `from_file` path is relative can't get a parameter model on dev. That's the shape the issue cites, and devteam `annotation_profiler` is the one known tool that uses it. The parser asserts when it isn't given a tool data path, and nothing that builds models passes one:

| | dev | this branch |
|---|---|---|
| Main Tool Shed, `GET /api/tools/devteam~annotation_profiler~Annotation_Profiler_0/versions/1.0.0` | ❌ HTTP 500 in production, which runs a release branch with the same assertion (fastqc on the same endpoint: 200) | ✅ model builds (`parse_tool_custom(…, ShedParsedTool)` run locally) |
| tool_util `parse_tool()` on `annotation_profiler.xml` | ❌ `AssertionError: This tool cannot be parsed outside of a Galaxy context` | ✅ `DrillDownParameterModel` |
| Galaxy loading `gx_drill_down_from_file` | ⚠️ `Failed to generate parameter models for tool 'gx_drill_down_from_file'`; tool left without a parameter schema | ✅ schema built |
| `gx_drill_down_from_file` framework tests, `GALAXY_TEST_USE_LEGACY_TOOL_API=never` | ❌ 2/2 fail: `could not build request: This tool cannot be parsed outside of a Galaxy context` | ✅ 2/2 |

The Tool Shed row is consistent with the local run: dev's Tool Shed code raises this assertion building the model for that tool. The main Tool Shed's logs weren't checked. ***On dev the tool form still runs these tools, because it falls back to the legacy `/api/tools` when a tool has no parameter schema. What breaks is the Tool Shed tool API, tool_util, and Galaxy's typed tool APIs.*** By code, `/api/jobs` and the tool inputs schema endpoint reject a tool without a schema (`Tool … has no parameters defined`).

When the path is relative and there's no tool data path, the parser now returns `None` ("options unknown"), as it already does for `dynamic_options`, and the model falls back to a strict string. ***Galaxy still rejects values that aren't in the options file at runtime*** (`DrillDownSelectToolParameter.from_json`: `an invalid option ('option4') was selected`). The new framework tool checks this with an `expect_failure` test. ***Only the pre-validation model is a plain string.***

The branch also deletes a drill_down `filter` check from the parser. ***This doesn't remove a feature: the check could never fire, and Galaxy has no runtime support for drill_down filters.*** Deleting it resolves the issue's fourth item.

<details><summary>The four items in #18642</summary>

1. **Drill downs with `from_file`:** new framework tool `parameters/gx_drill_down_from_file.xml` with a passing test and an `expect_failure` test for a value missing from the file. Its options fixture is `test/functional/tool-data/gx_drill_down_from_file_options.xml`. It also has a `parameter_specification.yml` entry pinning the tool_util model.
2. **Drill downs with `dynamic_options`:** already covered by `gx_drill_down_code.xml` from 🔀 #19027. This branch adds its spec entry and removes a stray `g` before its `<param>`.
3. **Selects with `dynamic_options`:** already covered by `gx_select_dynamic*.xml` from 🔀 #19027. This branch adds a spec entry for `gx_select_dynamic`.
4. **Drill downs with filters:** resolved by deleting dead code. Galaxy has no runtime support for drill_down `<filter>`s. The parser check that remained read `filter`/`dynamic_options` *attributes* on the static-options path, which callers take only when `dynamic_options` is absent, so it could never fire.

</details>

<details><summary>Other changes</summary>

- **XSD:**
  - Documents `from_file` on `param` (drill_down only) and lists it in the drill_down attribute table.
  - Adds `checkbox` to the `display` enum, which only had select's `checkboxes|radio`. drill_down has always accepted `checkbox`. The docs say plainly that it does nothing: the form shows checkboxes or radio buttons based on `multiple`.
  - Accepts `selected` on drill_down `<option>`s, documented the same way as select's. The runtime uses selected options as the parameter's default.
  - Before this, schema validation rejected annotation_profiler (`from_file`, `display="checkbox"`) and the existing `gx_drill_down_exact_with_selection` test tool (`selected`). A `test_tool_linters.py` case now locks in that the XSD accepts all three. The runtime has always supported them.
- **`DrillDownSelectToolParameter`:** asserts that the options were resolved, so a relative `from_file` built without a tool data path (`tool=None`; no callers found) fails with a clear message, not a `TypeError` from `os.path.join(None, …)`. Inside Galaxy, `tool_data_path` is always set, so this doesn't fire.
- `open()` in the parser is now a context manager.

</details>

<details><summary>Fixture location</summary>

`from_file` is resolved against Galaxy's `tool_data_path`, so the tool uses `from_file="../test/functional/tool-data/…"`. ***The fixture stays under `test/` rather than the deploy-time `tool-data/` directory.*** That path works with the from-source default `tool_data_path` (`<root>/tool-data`), which is what framework CI uses. The two integration tests that load framework tools with an overridden `tool_data_path` (`test_data_manager.py`, `test_data_manager_refgenie.py`) will log one load error for this tool at startup. Neither uses it or asserts on toolbox load errors.

</details>

## Risks

The one hard-to-reverse part is that the XSD now accepts drill_down `from_file`, `display="checkbox"` and option `selected`. ***None of them is a new feature: the runtime has always supported all three, and the schema just stops rejecting them.*** The parser and test changes are two-way.

<details><summary>Risk Details</summary>

- Documenting `from_file` in the XSD makes it officially supported, and linting accepts it.
- The `display` enum is shared by every `param`. XSD 1.0 can't condition it on `type`, so a select with `display="checkbox"` now passes the schema too. At runtime nothing changes: it still renders as a drop-down, as any unrecognized `display` value does.
- Outside Galaxy (tool_util, the Tool Shed), a relative `from_file` drill_down now validates any string rather than erroring. It doesn't validate against the file's values.
- In Galaxy, the parameter model for these tools is also a strict string, since `input_models_for_pages` doesn't get `tool_data_path`. Runtime `from_json` still enforces the options.
- Removing the dead `filter` check changes no behavior, because it could never fire.

</details>

<details><summary>Risk Review Advice</summary>

Check that returning `None` from `parse_drill_down_static_options` is the right "unknown options" contract for tool_util consumers. It matches `dynamic_options`. The alternative is passing `tool_data_path` through `input_models_for_pages` for a stricter Galaxy-side model, which would change that signature and still wouldn't help tool_util or the Tool Shed. Also confirm that the `../test/functional/tool-data/` fixture path is acceptable.

</details>

## Context

Builds on 🔀 #19027, which added the `dynamic_options` drill_down and select framework tools covering items 2 and 3 of the issue.

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? tool_util and the Tool Shed get a strict-string model instead of a parse error. In Galaxy, a value missing from the file is rejected with `an invalid option ('…') was selected`. A missing options file stops the tool from loading, with a logged error, the same as before.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. The spec entries pin what each request representation accepts and rejects. The framework tool covers loading from the file and rejecting a value end to end.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests run</summary>

- Red: with dev's `parser/xml.py`, `gx_drill_down_from_file` fails 2/2 under `GALAXY_TEST_USE_LEGACY_TOOL_API=never` (`could not build request: This tool cannot be parsed outside of a Galaxy context`), and Galaxy logs `Failed to generate parameter models`. `test_parameter_test_cases.py::test_validate_framework_test_tools` fails with the same assertion.
- Green:
  - `gx_drill_down_from_file`, `gx_drill_down_code` and `gx_select_dynamic` pass 6/6 under both `GALAXY_TEST_USE_LEGACY_TOOL_API=never` and `always`.
  - `test_parameter_specification.py` and `test_parameter_test_cases.py` pass.
  - The doctests in `basic.py` and `parser/xml.py` pass.
  - `xmllint` on the XSD and `validate_tools.sh` on the new tool pass.
- `parse_tool()` and the Tool Shed's `parse_tool_custom(…, ShedParsedTool)` on devteam `annotation_profiler.xml`: dev raises the assertion, and this branch builds the model.
- XSD:
  - Before each fix, `test_xsd_drill_down_attributes` failed with `The value 'checkbox' is not an element of the set {'checkboxes', 'radio'}`, and then with `Element 'option', attribute 'selected': The attribute 'selected' is not allowed`.
  - On `85f79a9ab6c`, all 135 tests in `test_tool_linters.py` pass, as do the 36 parameter spec and test-case tests.
  - `validate_tools.sh` passes `gx_drill_down_exact_with_selection.xml`, `gx_drill_down_from_file.xml` and `drill_down.xml`.
  - `xmllint --schema` on devteam `annotation_profiler.xml` reports `validates`.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
