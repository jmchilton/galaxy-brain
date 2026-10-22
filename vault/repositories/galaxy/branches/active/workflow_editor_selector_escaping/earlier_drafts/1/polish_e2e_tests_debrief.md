# Polish E2E tests: workflow_editor_selector_escaping

**Top-line:** `test_connections_with_labels_needing_css_escapes` already goes through `workflow_editor_*` helpers and navigation.yml targets with no raw selectors or sleeps, so no polish commit was needed (head stays `21508cf7686`).

## Checked (`git diff 9699ec45644..HEAD`)

- **Raw selectors.** None in the test. Every DOM interaction uses `workflow_editor_connect`, `_assert_connected`, `_assert_not_connected`, `_destroy_connection`, `open_in_workflow_editor` and `assert_workflow_has_changes_and_save`. Saved-state checks go through the API (`_saved_step_connections_by_label`).
- **navigation.yml.** The branch changes only `connector_for` and `connector_invalid_for` (`#id` to `[id='…']`). Both are existing targets used by the helpers. No new target is needed.
- **Sleeps.** None in the test or in the changed helpers (`css_attribute_value`, `workflow_editor_node`, `_node_and_terminal`, `_source_sink_terminal_ids`).
- **Shared abstractions.** These already exist:
  - `_saved_step_connections_by_label()` replaced 3 duplicate comprehensions in test challenges.
  - `css_attribute_value` is the single escape point used by the helpers.
- **Screenshots: not added.** The editor connection component already has many screenshotted tests in `test_workflow_editor.py` (42 `self.screenshot(` calls, including `workflow_editor_connection_*` in the sibling connection tests). This test is a selector-escaping regression, so a screenshot would add nothing new.

## Not acted on

- **`sleep_for(UX_RENDER)` in sibling `test_reconnecting_nodes`** (line ~747). It dates from 2021 (`88dcba87af2`), sits outside this branch's diff, and the branch doesn't touch that test.

## Tests run

None. No code changed, and the test-challenge step already ran the test green on Playwright and Selenium at `21508cf7686`.
