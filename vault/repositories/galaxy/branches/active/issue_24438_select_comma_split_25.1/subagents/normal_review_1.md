# Normal review 1

**Verdict: approve, no bugs.** Fix is minimal, correctly scoped, and now matches how the newer test-case state path (`tool_util/parameters/case.py`) already treats comma strings: split only when `multiple`. Two optional nits below, neither needs action.

## Bugs

None.

## Nits (optional)

1. `_test_value_as_list` reads `input_source.get("type")` again although the caller already has `param_type`. Fine as is, because the conditional call site has no `param_type` local. Leave it.
2. No test covers a boolean conditional discriminator, but that path behaves as before (`"true"` -> `["true"]` both ways). Not worth adding.

## Not acted on / no change needed

- No existing "is multiple" helper in `tool_util` to reuse. `input_source.get_bool("multiple", False)` is the same idiom used in `tool_util/parameters/factory.py` (select, drill_down, data_column, group_tag, genomebuild, data) and `tools/parameters/basic.py`.
- `multiple_select_value_split` (`tool_util/parser/util.py`) is not a drop-in: it also splits on newlines and strips whitespace, which would change existing multi-select behavior.

<details>
<summary>Full review</summary>

### Scope
`git diff origin/release_25.1...HEAD`: 2 commits (baseline test, then the fix). Touches `lib/galaxy/tool_util/verify/parse.py` (+8/-2), a new framework tool `test/functional/tools/select_comma_value.xml` registered in `sample_tool_conf.xml`, and 2 unit tests in `test/unit/tool_util/test_test_definition_parsing.py`.

### Correctness: param types that relied on splitting
The behavior only changes for string values that contain a comma on an input that is neither `data` nor `multiple`. Comma-free strings give `["x"]` both before and after. By type:
- **select / drill_down / data_column / genomebuild / group_tag** with `multiple="true"`: still split. The parser models (`factory.py`) and runtime classes all read `multiple` with `get_bool("multiple", False)`, so the gate agrees with them. Single-valued variants with a comma value were already invalid (data_column, genomebuild) or broken (select, which is the bug).
- **boolean**: `_process_bool_param_value` unwraps a 1-element list. Values only differ when truevalue/falsevalue contain a comma, which was broken before and is fixed now.
- **hidden / color / baseurl / integer / float**: comma values used to become multi-element lists, which the submit path does not flatten. Now they are submitted as the literal string, which is an improvement.
- **data**: always split, as before. Location-based multi-data handling is untouched.
- **data_collection**: now wrapped instead of split, but `param_value` is ignored on that branch. No effect.
- **ftpfile**: runtime default is `multiple=True`, but here the gate defaults to False. Not used in tool tests (no functional tool declares it), so this doesn't matter.
- **text**: still never processed.

### InputSource `multiple` exposure
- XML: `XmlInputSource.get_bool` -> `string_as_bool(elem.get(...))`. Correct.
- YAML/CWL: `YamlInputSource.get_bool` returns the raw dict value. YAML `multiple: true` is a bool, and an unset key gives the `False` default. Correct, and the same as every other `get_bool("multiple")` caller.

### Conditional discriminator (`case_when`)
`case_when` comes from the matched `<when value>`. For a select, that is a string, which is now wrapped rather than split. For a boolean, the when value string is wrapped just as it was split before, then normalized by `_process_simple_value` -> `_process_bool_param_value`. A conditional test param can't be `multiple`, so the gate always wraps here. That is correct.

### Submit path
`interactor.py` flattens single-item lists ("HACK: Flatten single-value lists") before submitting, so `["relax,150,100"]` reaches the API as `"relax,150,100"`. The debrief says the framework test was red before the fix and green after.

### Consistency with sibling path
In `tool_util/parameters/case.py` (validated test-case state), comma splitting for group_tag, genomebuild and data_column is already gated on `parameter.multiple`. This fix brings the legacy parse path into line with it instead of diverging.

### Tests
- Baseline commit pins multi-select splitting (`multi_select.xml`, including the label->value mapping in test 1). Good, and it comes first.
- The new framework tool exercises both bug shapes from the issue (plain select and conditional discriminator), plus `value_json` with a string, which also went through `split_if_str` before. These tests are not trivial: they assert the commands' actual output.
- The unit test duplicates the framework test but is cheap, has no server dependency, and fails red before the fix. Keep it.
- Naming and conventions: the tool id matches the file name, profile 24.2 matches nearby modern test tools (`section_24_2.xml`), and the tool is registered in `sample_tool_conf.xml`. `test_parameter_test_cases.py`, which validates every functional tool's test cases, still passes with the new tool.
- I ran `test_test_definition_parsing.py` (12 passed) and `test_parameter_test_cases.py` (5 passed).

### Style
No new imports. The one-line docstring is fine. The helper is private, and its `Any` types match the neighboring helpers.

### Known limitation (documented in the debrief)
On a `multiple` select whose option values contain commas, `value=` is still ambiguous. The workaround is a `value_json` list. On forward-merge to dev, the split condition must also include `hidden_data` (dev checks `param_type in ("data", "hidden_data")`). The initial debrief already notes this.

</details>
