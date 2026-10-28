# Re-scope debrief: workflow_editor_selector_escaping

The first [scope evaluation](earlier_drafts/1/scope_evaluation.md) recommended one small expansion: route `workflow_run_specify_inputs`' `[step-label='…']` lookup through `css_attribute_value`. That is the same bug class in the run form, and the helper's second real consumer. The original scope is kept as the [alt](alts/original_scope.md) at `248fba718cc`.

## What changed

- `5f0cfe9d558` makes a one-line fix: `workflow_run.input_data_div(label=css_attribute_value(label))`.
- It also adds `TestWorkflowRun::test_execution_with_input_label_needing_css_escape`. The test runs a `cat1` workflow with inputs `it's input` and `plain_input`, and checks through the API which dataset fed each input, plus the order of the output content.
- **Red:** on Playwright, with the fix reverted, it fails with `Page.wait_for_selector: Unexpected token "" while parsing css selector "[step-label='it's input'] .multiselect"`.
- **Green:**
  - the new test passes on Playwright and Selenium;
  - `test_execution_with_multiple_inputs`, `test_execution_with_multiple_integer_parameter`, `test_execution_with_rules` and `test_connections_with_labels_needing_css_escapes` pass on Playwright.

## Findings

- No other run-form site takes free-text labels into a single-quoted selector.
  - `input_div` only gets literals.
  - The `simplified_*` / `input_select_field` targets are XPath with double quotes, so a `'` is harmless there.
- **Pre-existing limitation:** `workflow_run_specify_inputs` needs `step-label`. For some workflows the simplified run form renders only `data-label`, so the test expands the form first. gxui could hit this on real workflows. It's a possible follow-up.

## Review

[subagents/rescope_review.md](subagents/rescope_review.md) found no bugs and made no changes.

The branch was then re-hardened. The first round's debriefs are in `earlier_drafts/1/`.
