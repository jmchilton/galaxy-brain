# Test challenges: workflow_editor_selector_escaping

**Top-line:** I kept the branch's one E2E test and made it stronger. I added no unit test. New commit `21508cf7686` on top of `949ab6faf13`:
- **Rename.** `test_subworkflow_terminal_labels_needing_css_escapes` is now `test_connections_with_labels_needing_css_escapes`. The test also covers a step label (`cat's downstream`), so the old name undersold it. There is no PR yet, so nothing outside this branch's records refers to the old name. The earlier debriefs keep it as a historical snapshot.
- **Stronger check.** The post-destroy check used to compare only two keys. It now compares the full saved connection dict, so it also catches a stray connection on `outer_input`.
- **Helper.** New `_saved_step_connections_by_label()` replaces the same by-label comprehension at its three sites: two in this test and one in the parent's `test_refused_connection_and_removed_step`.

STATUS: not blocked.

## Challenges

### `test_connections_with_labels_needing_css_escapes` (E2E)
- **Right layer.** The bug is a browser selector-parse failure, so only a real browser on both backends proves the fix.
- **Follows the E2E research notes.** It goes through the `workflow_editor_*` helpers and `open_in_workflow_editor`, not raw components. It checks the saved state through the API (`_saved_steps_with_connections`) and not only the DOM.
- **Covers both escapes:**
  - `'` in an inner input name and a step label.
  - `\` in an inner output name, which also flows into the connector `[id='…']`.
- **Covers both ref shapes:** a string ref (`label#terminal`) and a tuple ref.
- **Covers more than connect.** It also runs connect, destroy, the assert helpers and save, with API checks after each save.
- **Fails at its own assertion without the fix.** The recorded reds fail inside `workflow_editor_connect` and `workflow_editor_assert_connected` on the selector parse, which is the behavior under test, not a setup step.
  - Red 1: terminal name.
  - Red 2: connector `#id`.
  - Red 3: step label.
- **Comment:** one short line. Fine.

### Unit test for `css_attribute_value`: not added
- It is two chained `str.replace` calls. A string-equality test would just restate the implementation (rule: testing the implementation directly).
- Its behavior is already covered end to end by the E2E test above, through real CSS parsing on Playwright and Selenium (rule: also covered at E2E).
- `test/unit/selenium/test_has_driver.py` could check selector matching against a real page, but that would duplicate the E2E coverage without adding signal.

### No API/integration or Vitest tests in the branch
Nothing to challenge for helper use.

## Known gaps (not acted on)
- **`connector_invalid_for`** got the same `[id='…']` change, but no escaped-label run exercises it. The `try_connect` refusal path is also untested with escapes. Its form is identical to the proven `connector_for`, and the existing `assert_connection_invalid` tests passed after the change (implementation debrief).
- **Other unescaped targets.** `data-output-name` and the XPath `output_data_row` are still out of scope, as already recorded.

## Tests run (one at a time, Galaxy 8095 / Vite 5195)
- Playwright:
  - `test_connections_with_labels_needing_css_escapes`: passed, 70s.
  - `test_refused_connection_and_removed_step`: passed, 35s.
- Selenium:
  - `test_connections_with_labels_needing_css_escapes`: passed, 68s.
  - `test_refused_connection_and_removed_step`: passed, 45s.
- Lint: `uvx ruff@0.17.0 check`, black, and the `.pre-commit-config.yaml.sample` hooks all pass.
