# Polish E2E tests debrief (round 2)

Test already polished: all selectors via navigation.yml, no sleeps, screenshot `tool_form_use_cached_job` captured; no changes.

- Selectors: `parameter_switch_label`, `parameter_data_select_value`, `parameter_checkbox_input` (navigation.yml); no raw CSS in tests.
- Shared abstraction: `tool_form_set_switch` already serves three callers (new test, `RunsToolTests._set_boolean_value`, workflow rerun).
- Waits: `wait_for_visible` on default pick, `wait_for_text`, `history_panel_wait_for_hid_ok`; no sleeps.
- DOM decoration / client refactor: not needed; release_26.2 target, no client changes.

Not acted on:
- Stale `tool_form.parameter_checkbox` (`.ui-switch`) still used by `test_workflow_editor.py` for select_single; out of this branch's switch scope.
