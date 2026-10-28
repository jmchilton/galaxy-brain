# Test challenges: workflow_editor_selector_escaping (round 2)

**Top-line:** Both E2E tests are at the right layer and need no changes. The branch has no unit, API or Vitest tests to challenge. The one test-code change from this round, a shared invocation helper, is recorded in [polish_e2e_tests_debrief.md](polish_e2e_tests_debrief.md) (`0199d579296`). STATUS: not blocked.

The challenge ran against `9699ec45644..5f0cfe9d558`.

## Commit layout

Each new test is in the same commit as its fix, so the "fails without the change" check holds per commit:
- `9269c3e687d`: adds `css_attribute_value` and switches the connector targets to `[id='…']`. It is a refactor with no new test, and the existing connection tests cover it.
- `11f41f72e31`: extracts `_saved_step_connections_by_label`. This is test-only, and the parent's `test_refused_connection_and_removed_step` uses it.
- `248fba718cc`: escapes node labels and terminal names, together with `test_connections_with_labels_needing_css_escapes`.
- `5f0cfe9d558`: escapes the run-form labels, together with `test_execution_with_input_label_needing_css_escape`.

There is no "Baseline tests" commit. The branch adds no tests of current behavior on their own, and none are needed: the changed helpers are already covered by the existing editor and run tests that earlier rounds ran green.

## Challenges

### `TestWorkflowEditor::test_connections_with_labels_needing_css_escapes`
- **Layer.** The bug is a CSS selector-parse failure, so only a real browser on both backends proves the fix. Unit tests can't parse selectors the way the drivers do.
- **Red without the fix.** It fails inside `workflow_editor_connect` / `_assert_connected` while the selector parses. That is the behavior under test, not a missing fixture. Reds for the terminal name, connector `#id` and step label are recorded in the initial debrief and the initial review. Per the process, I reasoned about this rather than re-running it.
- **Assertions.** It checks the full saved connection dict through the API after connecting and again after destroying. That is strict and not a count.
- **Helpers.** It uses `open_in_workflow_editor`, `workflow_editor_*`, `assert_workflow_has_changes_and_save` and `_saved_step_connections_by_label`, with no raw components or selectors.
- **Kept as is.**

### `TestWorkflowRun::test_execution_with_input_label_needing_css_escape`
- **Layer.** E2E, for the same reason.
- **Red without the fix.** It fails with `[step-label='it's input'] .multiselect` in `workflow_run_specify_inputs`, as recorded in the re-scope debrief.
- **Assertions.**
  - The label → dataset-id map from the invocation pins which dataset fed the quoted input.
  - The ordered output content `"quoted\nplain\n"` confirms the same thing end to end.
  - I kept both. The id check is the stricter of the two, and it doesn't depend on `cat1` ordering semantics.
- **Hand-rolled run sequence vs `workflow_run_and_submit(ensure_expanded=True)`.** It stays hand-rolled:
  - The helper returns only `history_id`, and the test needs `inputs` for the id check.
  - The helper also adds a `sleep_for(UX_TRANSITION)`, which the test doesn't need because it waits on the API.
  - The sibling `test_execution_with_multiple_integer_parameter` uses the same sequence.
- **Duplication.** The wait → list → get invocation chain was now repeated three times in the file. It was extracted in the polish step.

### Unit test for `css_attribute_value`: not added
- It is two chained `str.replace` calls, so a unit test would only restate the implementation.
- The two E2E tests already cover its behavior through real CSS parsing on Playwright and Selenium.

### API / integration / Vitest
There are none in the branch, so there is nothing to challenge.

## Known gaps (not acted on)
- **`connector_invalid_for` / `try_connect`.** The refusal path is not exercised with escaped labels. Its form is identical to `connector_for`, which is proven, and the existing `assert_connection_invalid` tests pass. A test for it would grow scope.
- **XPath `data-label` run-form targets and editor `data-output-name` targets.** These stay unescaped, as recorded in the reviews. They need XPath quoting, and no free-text helper feeds them.

## Tests run
None for this step: no test changed here. The polish step re-ran the affected run tests; see its debrief.
