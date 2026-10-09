# galaxy#23802 - Allow multiple integer workflow parameters for multiple data_column inputs

PR: https://github.com/galaxyproject/galaxy/pull/23802 | head `5b6b30b4a9d` | base `dev` | reviewed 2026-09-30 | author mvdbeek (draft) | fixes #19832

## Summary

Three commits, one feature: tool `select`-family inputs (so `data_column`) now report `multiple` in `ToolModule.get_all_inputs`; integer workflow parameters get an "Allow multiple values" option (editor twin of format2 `[integer]`); the run form renders a multiple integer as a one-per-line textarea, and `run_request` stores the parsed `[1, 2]` list. Client `InputParameterTerminal` splits "accepts multiple values" from `multiple` (which drives data-style list consumption) so parameter inputs keep single-connection + map-over semantics.

The approach is small and reuses what exists: `multiple_select_value_split`, the text param's `multiple` toggle pattern, `FormText`'s existing multiple/array handling, `InRangeValidator` per value. Tests span doctest, API, vitest, and two Selenium tests, with no weakening. The backend runtime path (`multiple_integer_into_data_column.gxwf.yml`) already worked, so this is mostly editor/run-form plumbing.

Note: the issue asked for *text* to connect to multiple `data_column`; the PR delivers multiple *integer* instead, per the maintainer's comment, and explicitly rejects multiple-text -> `data_column`. That's the right typing call, but mention it when closing #19832.

CI: the only red is `test/integration_selenium/test_trs_import.py::test_import_by_search_workflowhub` (external WorkflowHub search timeout). Unrelated.

**Verdict:** Comment for now, approve once #1 is handled (or explicitly deferred). #2 needs a quick check. The rest are small.

## Findings

1. **Medium - subworkflow parameter inputs still report `multiple=False`.** `SubWorkflowModule.get_all_inputs` hardcodes `multiple=False` (`lib/galaxy/workflow/modules.py:797`). With the new `acceptsMultipleValues = attr.input.multiple` (`client/.../terminals.ts:567`), a parent multiple integer (or multiple text) parameter can't connect to a subworkflow whose inner parameter input is itself multiple. It gets "This output parameter represents multiple values but input only accepts a single value". That's the same class of bug this PR fixes for tool steps. Fix: for `step_type == "parameter_input"`, set `input["multiple"] = step.tool_inputs.get("multiple", False)`. Add a `terminals.test.ts` case (or a `build_module` subworkflow assertion).

2. **Medium - default value stays single-valued for multiple integers.** The editor's default field comes from `get_default_parameter("integer")` (`lib/galaxy/workflow/workflow_parameter_input_definitions.py:35`), a plain single `IntegerToolParameter`. So the editor can't author a list default. A format2 `[integer]` with `default: [1, 2]` will probably hit `int([1, 2])` when its state is loaded into the editor form. I didn't verify that. Runtime is fine because `get_runtime_inputs` passes `multiple` and `_to_int_values` accepts lists. Fix: pass `multiple` through to `get_default_parameter` (the `multiple` value is already in `parameter_def` at `modules.py:1650`). Add an editor/`build_module` test that loads `[integer]` with a list default.

3. **Low - unannounced behaviour change for multiple *text* params in the run form.** `TextToolParameter` now always sets `self.multiple` and emits it in `to_dict` (`lib/galaxy/tools/parameters/basic.py:452,478`). An unrestricted multiple text workflow param (no restrictions/`restrictOnConnections`) now renders as a `FormText` textarea through `:multiple="attrs.multiple"`, where it used to be a single-line input. That's probably an improvement. But the PR description doesn't mention it, no test covers it, and regex validators still run on the whole `"a\nb"` string, while integers now validate per value. Either note it and add a run-form test, or scope `multiple` to `IntegerToolParameter`.

4. **Low - integer special case in `run_request`.** `if isinstance(input_param, IntegerToolParameter) and input_param.multiple:` (`lib/galaxy/workflow/run_request.py:394`) puts parameter-type knowledge into the request normalizer, and it drags in a new import only for that check. Suggest one hook on the module, e.g. `InputParameterModule.normalize_runtime_value(value)` that returns `input_param.to_python(...)` when the param is multiple. Then `run_request` calls it without caring about the type, and multiple text (#3) can adopt it later.

5. **Low - duplicated "multiple" toggle.** The integer branch (`modules.py:1516-1526`) copies the text branch's `BooleanToolParameter("multiple")` + front-insert idiom (`modules.py:1424-1438`). A small `_specify_multiple_param(label, help)` helper would give one place to add future types (float?).

6. **Low - redundant coercion.** `string_as_bool(input_source.get_bool("multiple", False))` (`basic.py:452`). `get_bool` already returns a bool, so drop `string_as_bool`.

7. **Low - `SelectTagParameter.multiple` can be the string `"false"`.** It's read with `input_source.get("multiple", False)` (`basic.py:1412`), so a `group_tag` with `multiple="false"` in XML gives a truthy string. The new `isinstance(input, SelectToolParameter) and input.multiple` (`modules.py:2817`) now sends that to the editor as `multiple: "false"`, which the client treats as accepts-multiple. This bug was already there, but the PR now exposes it. Fix: `input_source.get_bool("multiple", False)` in `SelectTagParameter`, or `bool(...)` at the call site.

8. **Low - test placement.** The success half of `test_run_with_multiple_int_parameter_one_per_line` (`lib/galaxy_test/api/test_workflows.py:7578`) duplicates the existing framework case. It could be a second case in `lib/galaxy_test/workflow/multiple_integer_into_data_column.gxwf-tests.yml` with `column: "1\n2"`, which is cheaper and sits next to the list case. Keep the API test for the recorded `parameter_value == [1, 2]` and the 400. That existing tests file's `doc:` says "text parameter", which is stale; fix it while there. The three `build_module` tests (`test_workflow_build_module.py:35-65`) are near-identical and could share a helper or be parametrized.

## Draft review

_This review was posted by Claude (AI assistant) on behalf of jmchilton._

Nice, compact fix. Reusing `multiple_select_value_split`, `FormText`'s existing multiple handling, and per-value range validation keeps this small. Splitting `acceptsMultipleValues` from `multiple` on `InputParameterTerminal` is the right way to keep single-connection and map-over semantics. The only CI red (`test_trs_import` WorkflowHub search) looks unrelated.

A few things:

1. **Subworkflow inputs** - `SubWorkflowModule.get_all_inputs` still hardcodes `multiple=False` (`modules.py:797`). With the new terminal logic, a multiple integer/text parameter can't connect to a subworkflow whose inner parameter input is multiple. Something like `input["multiple"] = step.tool_inputs.get("multiple", False)` for `parameter_input` steps, plus a terminals test, would close that.
2. **Defaults** - the editor's default field is still a single `IntegerToolParameter` (`get_default_parameter`), so you can't author a list default in the editor. I suspect a format2 `[integer]` with `default: [1, 2]` hits `int([1, 2])` when opened in the editor. Can you confirm? Passing `multiple` through to `get_default_parameter` seems like the fix.
3. **Multiple text in the run form** - `TextToolParameter.to_dict` now emits `multiple`, so unrestricted multiple text params become a textarea in the run form. Probably good, but it's not in the description or tests, and regex validators still see the joined string. Either mention it and test it, or scope `multiple` to integers.
4. `run_request.py:394` - the `isinstance(input_param, IntegerToolParameter)` branch would sit better as a small hook on `InputParameterModule` (e.g. `normalize_runtime_value`), so the request builder stays type-agnostic.
5. Small: `string_as_bool(input_source.get_bool(...))` is redundant (`basic.py:452`). The integer "multiple" toggle copies the text one in `get_inputs`, so a tiny helper would do. `SelectTagParameter.multiple` uses `input_source.get` (a string `"false"` is truthy), and that now reaches the editor through the new `get_all_inputs` check, so switch it to `get_bool`.
6. Tests: the success half of the new API test could be a second case in `multiple_integer_into_data_column.gxwf-tests.yml` (`column: "1\n2"`), keeping the API test for the recorded value and the 400. That file's `doc:` still says "text parameter".

Also worth saying when this closes #19832: it enables multiple *integer* -> `data_column`, and multiple *text* -> `data_column` is still rejected by design.
