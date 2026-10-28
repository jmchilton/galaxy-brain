# Re-scope review: workflow_editor_selector_escaping (5f0cfe9d558)

**Verdict: ship as-is.** I found no bugs and made no code changes, so there are no new commits. The one-line fix is complete for `workflow_run_specify_inputs`. The new test is red without the fix, at the targeted selector, and green on both backends. Lint is clean.

## Not acted on

- **The test hand-rolls setup → open → expand → specify → submit instead of calling `workflow_run_and_submit(..., ensure_expanded=True)`.** That helper returns only `history_id`, and the test needs `inputs` for the invocation-input-id check. The hand-rolled sequence matches the sibling `test_execution_with_multiple_integer_parameter` line for line. Changing the helper's return shape for one caller isn't worth it.
- **The invocation-input-id assertion overlaps the ordered content check** (`"quoted\nplain\n"`). I kept it: it's the stricter check and pins the label→dataset mapping directly.
- **`simplified_input` / `simplified_value_list_*` / `input_select_field`** (XPath, `@data-label="${label}"`) are unescaped. No `NavigatesGalaxy` or framework helper feeds them free text, only literal labels in tests. They also need XPath quoting, not `css_attribute_value`. This is the same reasoning as Expand 3 in scope_evaluation.md.
- **`input_div`** (`[step-label='${label}']`) has only one caller, at `test_workflow_run.py:643`, and it passes a literal. This matches the scope evaluation.

<details>
<summary>Full review</summary>

### Missed free-text-label sites?
None in `workflow_run_specify_inputs` or the run-form helpers:
- The method's only selector is `input_data_div(label=...)`, which is now escaped.
- The value goes to `select_set_value` as typed text (`f"{hid}: "`), not a selector.
- `grep` of `lib/galaxy/selenium` and `lib/galaxy_test/selenium/framework.py` finds no other `workflow_run.*(label=...)` calls.
- `workflow_run_and_submit` (`framework.py:1398`) reaches the fix through `workflow_run_specify_inputs`, so every shared-helper caller benefits.
- `[step-label]` is only rendered by `WorkflowRunDefaultStep.vue` / `WorkflowRunInputStep.vue`, which make up the expanded form. That is why the test calls `workflow_run_ensure_expanded()`.

### Test reuse / red
- **Reuse:** uses `workflow_run_setup_inputs`, `workflow_run_open_workflow`, `workflow_run_ensure_expanded`, `workflow_run_specify_inputs`, `workflow_run_submit`, plus the `wait_for_history_workflows` → `history_invocations` → `get_invocation` populator chain and `get_history_dataset_content(dataset_id=...)`. All of these are existing patterns from sibling tests. No new fixtures.
- **Red** (fix line reverted, Playwright): fails at `navigates_galaxy.py:2070` with `Unexpected token "" while parsing css selector "[step-label='it's input'] .multiselect". Did you mean to CSS.escape it?`.
  - The failure comes from the helper the test exercises, before the test's own assertions. That is the expected red for a selector-parse bug: the assertions can't run until the selector parses.
  - With the fix, the assertions pass and confirm the `'` label maps to the right dataset.
- `expected_input_ids` is computed before `workflow_run_specify_inputs` pops `hid` from `inputs`, so that mutation doesn't affect it.

### Duplication
None in the code. The test body follows the sibling run-form test layout; see the first "Not acted on" item.

### Imports / comments
No new imports. `css_attribute_value` is module-level in the same file. The commit adds no comments.

</details>

## Tests run (Galaxy 8095 / Vite 5195, one at a time)

- `TestWorkflowRun::test_execution_with_input_label_needing_css_escape`:
  - Playwright: passed (39s).
  - Selenium: passed (43s).
  - Playwright with the fix line reverted: failed as expected, as described above; the file was then restored.
- `TestWorkflowRun::test_execution_with_multiple_integer_parameter` (existing `workflow_run_specify_inputs` consumer), Playwright: passed.
- `uvx ruff@0.17.0 check` and `black --check` on both changed files: clean.
