# galaxy#23802 - Allow multiple integer workflow parameters for multiple data_column inputs

PR: https://github.com/galaxyproject/galaxy/pull/23802 | head `347255cc028` | base `dev` | reviewed 2026-10-03 | author mvdbeek | fixes #19832 | CI green | no reviews yet

Supersedes the unposted review at `5b6b30b` (`old/..._at_5b6b30b.md`). Since then the run form went from a one-per-line textarea to `FormNumberList` (a row of number fields with add/remove).

## Summary

The backend could already run a format2 `[integer]` into a multiple `data_column` (`lib/galaxy_test/workflow/multiple_integer_into_data_column.gxwf.yml`). The editor and run form couldn't build or fill one. This PR:

- `ToolModule.get_all_inputs` reports `multiple` for `SelectToolParameter` subclasses (`modules.py:2817`). That covers `data_column`, multi-select, drill_down and group_tag.
- Adds an "Allow multiple values" toggle on integer workflow params (`modules.py:1516-1526`). It's the editor twin of the existing native `multiple` key that gxformat2 already round-trips as `[int]`.
- Client `InputParameterTerminal` splits `acceptsMultipleValues` (the connection-type check) from `multiple` (data-style list consumption, forced `false`). Parameter inputs keep the single-connection and map-over semantics (`terminals.ts:560-568,594`).
- `IntegerToolParameter` gains multiple-aware `validate`/`from_json`/`to_python`/`get_initial_value`. Each value is range-checked and parsed with `multiple_select_value_split` (`basic.py:529-583`).
- The run form renders a multiple integer as the new `FormNumberList` (`FormElement.vue:102,378`). `run_request` stores the parsed list (`run_request.py:394-396`).

The direction is right: a multiple *integer* goes to `data_column`, and multiple *text* is explicitly rejected. It reuses the split helper, the text param's existing `multiple` toggle and `InRangeValidator`. No tests were weakened. The open questions are gaps at the edges: subworkflows, defaults, and an unannounced change to the multiple-text run form.

When this closes #19832, note that the issue asked for text -> `data_column`. The PR delivers multiple integer instead, and text stays rejected by design.

**Recommendation: Comment.** Approve once #1 and #2 are fixed or explicitly deferred, and #3 is acknowledged.

## Findings

1. **Medium - subworkflow parameter inputs still report `multiple=False`** (`lib/galaxy/workflow/modules.py:797`). With `acceptsMultipleValues = attr.input.multiple` (`terminals.ts:567`), a multiple integer or text param can't connect to a subworkflow whose inner input is `[integer]`. The editor shows "This output parameter represents multiple values but input only accepts a single value". It's the same bug class this PR fixes for tool steps. Fix: for `parameter_input` steps, `input["multiple"] = step.tool_inputs.get("multiple", False)`. Add a terminals test or a `build_module` subworkflow assertion.

2. **Medium - the editor default stays single-valued.** The default field comes from `get_default_parameter("integer")` (`lib/galaxy/workflow/workflow_parameter_input_definitions.py:34-35`), a plain single `IntegerToolParameter`. A multiple integer can't get a list default in the editor. I confirmed locally that `get_default_parameter("integer").from_json([1, 2], ...)` raises `ParameterValueError`. So a format2 `[integer]` with `default: [1, 2]` should show an error on the default field when opened in the editor. That's inferred, not run end to end. Runtime is fine, because `get_runtime_inputs` passes `multiple` and `_to_int_values` accepts lists. Fix: thread `multiple` into `get_default_parameter`, from `parameter_def`, which `get_inputs` already has. `FormNumberList` would then render it for free. Add a `build_module` test with a list default.

3. **Low-Medium - multiple *text* params change in the run form, unannounced.** `TextToolParameter` now sets `self.multiple` and emits it from `to_dict` (`basic.py:452,478`). An unrestricted multiple text workflow param (for example `multiple_text.gxwf.yml`'s `[string]`) now reaches `FormText` with `:multiple="attrs.multiple"` and renders as a textarea instead of a single-line input (`FormText.vue:117`). It submits a newline-joined string. The change is probably good, but:
   - The PR description doesn't mention it, and no test covers it.
   - It diverges from the new integer UX (number rows versus a textarea).
   - Regex validators still run on the joined `"a\nb"` string, while integers now validate per value.

   Either call it out and add a run-form test, or scope `multiple` to integer params for now.

4. **Low - `run_request` integer special case and stale comment** (`run_request.py:394-395`). `isinstance(input_param, IntegerToolParameter) and input_param.multiple` puts parameter-type knowledge in the request builder and adds an import just for the check. The comment "The run form submits one integer per line" is stale since `FormNumberList` submits a list; the branch now only matters for API callers sending `"1,2"` or `"1\n2"`. Suggest a type-agnostic hook, e.g. `InputParameterModule.normalize_runtime_value(value)` returning `to_python(...)` when the param is multiple. Text (#3) could adopt it later.

5. **Low - API string form is a new contract, but only doctested.** The PR description advertises newline or comma separated strings for multiple-int run inputs. The API test (`test_workflows.py:7578`) sends only a list, so that contract is covered only by the `basic.py` doctest. The doctest builds `min: 1` but never checks an out-of-range value. Add `validate([0])` raising to the doctest. Put the string form in a framework test (see #7).

6. **Low - `SelectTagParameter.multiple` can be the string `"false"`** (`basic.py:1412`, `input_source.get(...)`, not `get_bool`). The new `isinstance(input, SelectToolParameter) and input.multiple` (`modules.py:2817`) now sends that truthy string to the editor as `multiple`. The bug predates this PR, but the PR exposes it. Fix with `get_bool` there, or `bool(...)` at the call site.

7. **Low - test placement.** The success half of `test_run_with_multiple_int_parameter` (`test_workflows.py:7578-7617`) duplicates the existing framework case `multiple_integer_into_data_column.gxwf-tests.yml`, with the same tool, `[1, 2]` and `"col 1,2"` assertion. Suggestions:
   - Add a second framework case with `column: "1\n2"` or `"1,2"`, which covers #5 cheaply.
   - Keep the API test for the recorded `parameter_value == [1, 2]` and the 400.
   - That tests file's `doc:` still says "text parameter". Fix it while there.
   - The three `build_module` tests (`test_workflow_build_module.py:34-64`) are near-identical and could be one parametrized test.

8. **Nit**
   - `string_as_bool(input_source.get_bool("multiple", False))` (`basic.py:452`): `get_bool` already returns a bool.
   - The integer "multiple" toggle (`modules.py:1516-1526`) copies the text branch (`modules.py:1424-1438`). A tiny `_specify_multiple_param(label, help)` helper would make adding float trivial. Format2 `[float]` already round-trips but is still single-valued in Galaxy. `FormNumberList` takes `type: "integer" | "float"`, so the client side is ready.
   - `ParameterStepInput.type` adds only `"select" | "data_column"` (`workflowStepStore.ts:320`), but `get_all_inputs` now reports `multiple` for drill_down and group_tag too. Widen the type or leave it, but it's not exhaustive.

Positives: `acceptsMultipleValues` vs `multiple` is a clean way to keep map-over semantics. The terminals tests pin the rules, including map-over of a connected list and the single-connection rule. `FormNumberList` is small and its vitest covers add, remove and empty. The Selenium editor test checks the saved workflow, not just the canvas.

## Risks

Medium one-way risk: once the editor can author multiple-integer parameters, workflows (IWC and user) will ship with them, and Galaxy then has to support their runtime, run-form and API-input semantics, including the newly advertised comma/newline string form.

<details><summary>Risk Details</summary>

- Serialization is not new. Native `parameter_definition.multiple` already exists and gxformat2 already round-trips `[int]`. The PR makes it authorable in the editor, which turns a format2-only corner into a mainstream feature.
- New API input contract: multiple-int run inputs accept a list, or a newline/comma separated string, stored as `[int, ...]` in `input_step_parameters.parameter_value`. Clients will depend on both the input forms and the stored shape.
- `get_all_inputs` / `build_module` now report `multiple: true` for select-family tool params. That's an additive response change. The client handles it, but other consumers of step `inputs` (`refactor/execute.py:301`, external tooling) see a new value.
- Tool-form `to_dict` now includes `multiple` for all text/integer/float params. It's additive, but it silently changes how unrestricted multiple text workflow params render in the run form (#3).
- Gaps (subworkflow inputs, list defaults) are fixable later without format changes, but workflows authored before the fix may carry single-int defaults on multiple params.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether the string input form (`"1,2"`, `"1\n2"`) for multiple integers should be a supported API contract, and should check that it matches how multi-select and `data_column` tool inputs already parse. They should also confirm the multiple-*text* run-form change (#3) is intended.

Before many workflows are authored with the new toggle, check the subworkflow connection gap (#1) and the default-value form (#2). Those decide whether multiple integers compose and roundtrip cleanly through the editor.

</details>

## Draft review

_This review was posted by Claude (AI assistant) on behalf of jmchilton._

Nice. A multiple integer into `data_column` is the right typing call. Splitting `acceptsMultipleValues` from `multiple` on `InputParameterTerminal` keeps single-connection and map-over semantics intact, and reusing `multiple_select_value_split` and per-value range validation keeps the backend small.

A few things:

1. **Subworkflow inputs:** `SubWorkflowModule.get_all_inputs` still hardcodes `multiple=False` (`modules.py:797`). A multiple integer can't connect to a subworkflow whose inner input is `[integer]`. Suggested fix: `input["multiple"] = step.tool_inputs.get("multiple", False)` for `parameter_input` steps, plus a test.
2. **Defaults:** the editor's default field is still a single `IntegerToolParameter` (`get_default_parameter`), so you can't set a list default. `from_json([1, 2])` on that field raises, so I'd expect a format2 `[integer]` with `default: [1, 2]` to show an error when opened in the editor. Passing `multiple` through would let `FormNumberList` handle it.
3. **Multiple text in the run form:** `TextToolParameter.to_dict` now emits `multiple`, so unrestricted multiple text params become a textarea in the run form. Probably fine, but it isn't in the description or the tests, it differs from the new integer rows, and regex validators see the joined string. Either mention it and test it, or scope `multiple` to integers for now.
4. `run_request.py:394`: the comment "run form submits one integer per line" is stale now that `FormNumberList` sends a list. The `isinstance(IntegerToolParameter)` branch would sit better as a small hook on `InputParameterModule`, so the request builder stays type-agnostic.
5. Tests: the success half of `test_run_with_multiple_int_parameter` duplicates `multiple_integer_into_data_column.gxwf-tests.yml`. A second framework case with `column: "1,2"` would cover the advertised string form, which is currently only doctested. The doctest could also assert an out-of-range value is rejected. That tests file's `doc:` still says "text parameter".
6. Small:
   - `string_as_bool(get_bool(...))` is redundant (`basic.py:452`).
   - `SelectTagParameter.multiple` uses `input_source.get` (`basic.py:1412`), so `"false"` is truthy, and it now reaches the editor through the new `get_all_inputs` check.

## Verification (10-03, head `347255cc028`)

- Finding 1 CONFIRMED: `SubWorkflowModule.get_all_inputs()` returns `multiple: False` for inner `[integer]` param; outer `get_all_outputs()` returns `multiple: True`. Pre-existing (2017), same bug class PR fixes for tool steps.
- Finding 2 CONFIRMED: `populate_state(check=True)` rejects `[1, 2]`, `"[1, 2]"`, `"1,2"` defaults; `IntegerToolParameter(multiple=True)` fix parses all three. Caveat: default widget switches only after next form round trip.
- Inline comment anchors (in diff): `terminals.ts:567` (finding 1), `modules.py:1526` (finding 2).
