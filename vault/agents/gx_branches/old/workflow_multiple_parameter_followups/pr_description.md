Follow-up to 🔀 #23802 - lets multiple integer parameters connect into subworkflows and take list defaults in the workflow editor.

#23802 added an "Allow multiple values" toggle for integer workflow parameters. Two common next steps with that toggle still fail in the editor, and a list default doesn't reach the run form as a list:

✅ works as intended · ❌ blocks the user · 💥 500

| What the author does | Before | After |
|---|---|---|
| Connect a multiple integer (or text) parameter to a subworkflow whose input is multiple | ❌ "This output parameter represents multiple values but input only accepts a single value" | ✅ connection accepted |
| Give a multiple integer parameter a default of `1, 2` | ❌ field error "an integer or workflow parameter is required" whenever the form is validated (edit or reopen) | ✅ one number row per value, saved as `[1, 2]`, and reopened as rows `1` and `2` |
| Open the run form for a workflow whose `[integer]` input has `default: [1, 2]` | ❌ default sent as the string `"[1, 2]"` | ✅ default sent as `[1, 2]` |
| Turn "Allow multiple values" back off while the list default is still set, then open the run form | 💥 `Uncaught exception in exposed API method` | ✅ 400: "Workflow step 'columns' cannot be run: the attribute 'value' must be an integer" (the editor already flags the default field) |

***Both gaps predate #23802; its toggle just makes them easy to reach. Editor changes only affect parameters with "Allow multiple values" on, and only `InputParameterModule` changes how the editor validates. Invocations don't change. Separately, the run form now returns 400 instead of 500 when any step's saved parameter value is invalid.***

<details><summary>What changed</summary>

- **Subworkflow inputs report `multiple`.** `SubWorkflowModule.get_all_inputs` hardcoded `multiple=False` for inner `parameter_input` steps. It now reads `multiple` from the inner step, so the editor's `acceptsMultipleValues` check passes. This mirrors what #23802 did for tool steps.
- **The default field follows the toggle.** `get_default_parameter(param_type, multiple=False)` builds a multiple `IntegerToolParameter` when the integer type is selected with `multiple` on, so the editor renders `FormNumberList`.
- **`build_module` validates against the definition being edited.** The controller ran `populate_state` against a module built from empty state, so the default field was always single-valued at validation time. The controller logic moves into a new `WorkflowModule.populate_state_from_tool_form(incoming, errors)` hook. `InputParameterModule` overrides it: a first pass, with its errors discarded, recovers the edited definition, then a second pass validates against it. `ToolModule` keeps the old behavior.
- **List defaults reach the client as lists.** `IntegerToolParameter` had no `to_json`, so the base `unicodify` sent `"[1, 2]"` to the editor and the run form. Multiple integer lists now pass through unchanged, as `SelectToolParameter` does. Without this, reopening a saved list default in the editor showed two empty rows (`"[1"` / `"2]"`).
- **Invalid saved values return 400 on the run form.** The save path doesn't validate, so `{multiple: false, default: [1, 2]}` can be stored. `IntegerToolParameter.__init__` now raises `ParameterValueError` for it, not a bare `TypeError`. `_workflow_to_dict_run` turns that into a `RequestParameterInvalidException` that names the step. Any other invalid saved parameter value, such as a non-integer default on a single integer, gets the same 400.
- **Multiple integer values must be lists.** `IntegerToolParameter` split strings on commas and newlines, left over from the run form's old one-per-line textarea. Both forms submit lists now and multiple integers are new, so `"1,2"` is now "an integer is required". A single integer is still accepted.

</details>

<details><summary>Known limitations</summary>

- Multiple **text** parameters still get a single-valued default field.
- A `null` default (what an emptied number list submits) gets the editor field error "an integer or workflow parameter is required". Covered by a unit test, not in the browser.
- A cleaner long-term design would make integer `multiple` a `Conditional` test parameter, so a single `populate_state` pass picks the right default field. That changes the form state shape and `step_state_to_tool_state`. The two-pass hook is easy to back out.

</details>

## Risks

Risks are minimal. Format2 `[integer]` inputs with list defaults already ran through subworkflows before this PR (the new subworkflow run test passes on `dev` too), and this PR only lets the editor and run form handle them (a two-way door).

<details><summary>Risk Details</summary>

- `build_module` and subworkflow step `inputs` now report `multiple: true` for multiple parameter inputs. The field already exists, so only its value changes. The client reads it for connection checks.
- The tool form JSON for a multiple integer workflow parameter now carries its value as a list rather than a stringified list.
- The run-form download returns 400 instead of 500 for invalid saved parameter values on any step type. The first bad step fails the whole form, whereas missing tools are collected and reported together.

</details>

## Context

Builds on 🔀 #23802. The subworkflow `multiple=False` dates from 2017 and already affected multiple text parameters. #23802's integer toggle makes it easy to hit.

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? An invalid saved default gets a field error in the editor and a 400 naming the step on the run form (see table).
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They round-trip through the tool form, save, reload and runtime, and assert the messages users see.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? In the editor and run form, only workflows with multiple integer or text parameter inputs. Workflows with an invalid saved parameter default now get a 400 on the run form instead of a 500. Invocation is unchanged.
- [x] Who hits this in practice and what is the evidence? Authors using #23802's toggle, merged 2026-10-03. No IWC workflow uses multiple parameters yet, so this closes the gaps before workflows depend on them.
- [x] Were simpler or existing approaches considered? Yes. A `Conditional` on `multiple` would avoid the two-pass hook, but it changes the form state shape (see "Known limitations").

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
  <details><summary>Tests</summary>

  Tests marked 🔴 fail without this PR's fix, at the assertion about the bug.

  - `test/unit/workflows/test_modules.py`:
    - 🔴 subworkflow `multiple` for integer and text inputs.
    - A list default round-trips through tool form, save, reload and runtime value.
    - Turning multiple off with a list default gives the editor error and a `ParameterValueError`.
    - Clearing every row gives the editor error.
    - 🔴 `"1,2"`, `"1\n2"` and `["1,2"]` defaults give "an integer is required".
  - `lib/galaxy_test/api/test_workflow_build_module.py`:
    - 🔴 a `[1, 2]` default validates, and the default field reports `multiple`.
    - 🔴 a `"1,2"` default gives "an integer is required".
  - `lib/galaxy_test/api/test_workflows.py`:
    - 🔴 `test_run_form_multiple_integer_list_default`: the run form gets `[1, 2]`, not `"[1, 2]"`.
    - 🔴 `test_run_form_invalid_default_on_single_integer_parameter`: `[1, 2]` and `x` defaults on a single integer return 400 naming the step, not 500.
    - `test_run_multiple_integer_list_default_through_subworkflow`: an `[integer]` list default runs through a subworkflow into `column_param_list`. It passes on `dev` too.
  - 🔴 `lib/galaxy_test/selenium/test_workflow_editor.py::test_multiple_integer_parameter_list_default`: toggles multiple, enters 1 and 2 as number rows, saves, checks the stored `tool_state`, reopens and checks the rows. Passes on both Selenium and Playwright.
  - 🔴 `IntegerToolParameter` doctest: a `to_json` → `from_json` round trip returns `[1, 2]`, and `"1,2"` raises.

  </details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
