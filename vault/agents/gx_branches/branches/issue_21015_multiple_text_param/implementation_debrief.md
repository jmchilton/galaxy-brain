# issue_21015_multiple_text_param — implementation debrief

Multiple **text** workflow parameters ("Allow multiple selection"), done the same way as #23802 / #23939 did multiple integers. Issue: [#21015](https://github.com/galaxyproject/galaxy/issues/21015). Branch on the `jmchilton` fork at `1da2ac95f78`. No PR opened.

**Stacked on #23939** (`workflow_multiple_parameter_followups`, head `e95b6a48fe9`). Both branches rewrite the same `IntegerToolParameter` multiple methods in `basic.py`, and #23939's list-only decision shapes this design. Open this PR after #23939 merges, then rebase onto dev (a 3-commit cherry-pick).

## Finding that shaped the work

#23802 already fixed the bug in #21015, the rejected editor connection. Its `ToolModule.get_all_inputs` change reports `multiple` for multi-select tool inputs, and its PR body mentions this. What remained was the runtime and the forms around the connection.

The first pass split newline strings on the backend. It was dropped after finding #23939. Its last commit makes multiple integer values list-only ("splitting ... was leftover from the textarea"), so text followed suit: the form submits a list and the backend stores lists.

## Commits

1. `e6a979b6964` Validate and store multiple text values as lists.
   - Moves the multiple handling (`_is_multiple_value`, `_multiple_values`, per-entry `validate`, list `to_json`) up from `IntegerToolParameter` to `TextToolParameter`. Integer keeps only its int conversion.
   - Text entries become strings. Empty entries and entries containing a newline are rejected; the newline check mirrors #23939's rejection of `"1\n2"`. A bare string becomes a one-item list.
   - Float gets the same conversion, initial-value and `__init__` handling as Integer. This is needed because `run_request` now calls `to_python` for every multiple `TextToolParameter` subclass. Without it, gxformat2 `[float]` list submissions would have started failing.
   - `get_default_parameter` passes `multiple` for text too, so the editor default takes a list.
   - `MockTrans` gains `security`, which `get_config_form` needs for select fields.
2. `23111bdf2b3` Rename/generalize `FormNumberList` → `FormValueList`, with text rows that render `FormText` and skip comma splitting.
   - `FormElement` routes multiple integer, float and text to it.
   - Navigation selectors renamed `*_number_list_*` → `*_value_list_*`. Row selector is `//input[not(@type="range")]`.
   - New Selenium tests: editor connection to `multi_select` (the #21015 flow) and run form with a text list.
   - The commit message doesn't mention float, which was added in review.
3. `1da2ac95f78` `restrict_options` preselects every value of a list default.
   - Caught in review: once the editor default became a list, `restrictOnConnections` stopped preselecting it.

## Validation

- Red first for each:
  - API `test_run_with_multiple_text_parameter`: `'ex2' != ['ex2']` against #23939's backend.
  - Unit `test_parameter_input_multiple_text_list_default`: field not multiple, list stringified.
  - API `test_value_restriction_selects_multiple_text_list_default`: `[] != ['ex2', '--ex3']`.
  - Doctests for text entry checks and float defaults.
- Green:
  - `test/unit/workflows/`: 150 passed, 1 skipped.
  - `basic.py` doctests: 15 passed.
  - `test_workflows.py -k "multiple or wrapped_parameter_input or value_restriction"`: 18 passed.
  - `test_workflow_build_module.py`: 8 passed.
  - Framework workflows `multiple_text|multi_select|multiple_integer`: 3 passed.
  - Vitest `FormValueList` + `FormElement`: 17 passed.
- Playwright, against this worktree's Galaxy on 8081 and Vite on 5175, all passing on the final backend:
  - the new `test_multiple_text_parameter_connections` and `test_execution_with_multiple_text_parameter`;
  - the renamed-selector tests `test_execution_with_multiple_integer_parameter` and `test_multiple_integer_parameter_list_default`;
  - `test_execution_with_text_default_value_connected_to_restricted_select`.
  - Selenium backend not run.
- `vue-tsc` is clean for touched files; the `WorkflowExtractionForm.test.ts` errors are already on the base. mypy (run from `lib/`) is clean for touched files. Pre-commit hooks pass.
- Port 8080 belonged to the `workflow_multiple_parameter_followups` worktree's Galaxy, so this worktree's untracked `config/galaxy.yml` binds 8081.

## Review (subagent) — acted on

- Must-fix: list default not preselected under `restrictOnConnections` → commit 3.
- Float was half done (a list `value` crashed `__init__`, `get_initial_value` dropped lists, the run form had no list widget) → finished like Integer.
- Newline-joined strings would wrap silently to `["a\nb"]` → now rejected. Non-string and empty entries are handled too.
- Missing doctest for the empty required list → added.
- Loose row selector → `[not(@type="range")]`.

## Review — not acted on

- **Defaults and subworkflow inputs skip normalization.** `InputParameterModule.execute` validates but outputs the raw value, so only values sent through `run_request` become lists. #23939's integers share the gap. Better as a shared follow-up that normalizes in `execute`.
- **`staticRestrictions` defaults are never preselected**, single or multiple. `parameter_kwds["selected"]` seems to be ignored by the dict input source (`tool_util/parser/yaml.py` reads `selected` per option). This predates the branch; follow-up.
- **Text rows drop `datalist` suggestions**; the old textarea dropped them too. Easy add, needs per-row ids.
- **Duplicate Selenium tests.** `test_multiple_text_parameter_connections` nearly duplicates the integer one. Not parametrized because the tools, terminals and assertions differ.
- **Message change.** "at least one integer is required" is now "at least one value is required" (shared by all types).

## Behavior changes to flag in the PR

- A multiple text value sent as a bare string is stored as `[string]`. A newline-containing string is rejected; before, it passed through, and the old textarea run form produced such strings.
- The `FormNumberList` component and its `*_number_list_*` selectors are renamed. The selectors are only used in #23802/#23939 tests.

## Open questions

- Normalize in `InputParameterModule.execute` here, or in a follow-up shared with integers?
- Reject newline strings outright, or keep accepting them from API callers for back-compat?
