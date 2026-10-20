# Polish E2E tests debrief

Polished `test_parameter_editor_save_keeps_validators_the_form_cannot_show`: pulled the open-workflow-in-editor steps into a shared helper and added a screenshot. The test was already mostly clean.

## Review
- Selectors: the test already used only `navigation.yml` components (`workflow_editor.node`, `tool_form.repeat_insert`, `tool_form.parameter_input`). No raw CSS/DOM selectors. Nothing to change.
- Sleeps: the test has no direct sleeps. It reaches two existing ones through helpers. Both are commented and both predate this branch:
  - `save_after_node_form_changes`: waits for the extra `build_modules` POST.
  - `workflow_editor_dismiss_state_upgrade_modal`: gives the modal time to appear if it is going to. Out of scope here.
- Shared abstraction: the three steps `workflow_index_open` + `workflow_index_open_with_name` + `workflow_editor_dismiss_state_upgrade_modal` appeared in both the new test and `open_in_workflow_editor`. They are now one helper, `workflow_editor_open_with_name(name)`, in `test_workflow_editor.py`, and both callers use it. Other tests in the file open by name without dismissing the modal, so they were left alone.
- Screenshots: no other test screenshots the validator repeat on parameter inputs. `test_parameter_regex_validation` covers the same form but takes no screenshot. Added `workflow_editor_parameter_input_validator_added`, taken after the new row is filled in and before saving. Checked by eye: it shows the `^good` row, and the hidden negated validator does not appear as a row.

## Tests
Run one at a time against this worktree's Galaxy (8080) through Vite (5173):
- Playwright, headless: target test passed. `test_data_column_input_editing` also passed; it is a consumer of the refactored `open_in_workflow_editor`.
- Selenium (chromedriver 155): target test passed.
- Galaxy's DB was fresh, so the `~/galaxy_selenium_context.yml` user was registered through the UI first.

## Commits (pushed to `jmchilton`)
- `85c6410c28d` E2E: share editor open-by-name helper; screenshot validator form
