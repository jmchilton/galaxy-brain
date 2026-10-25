# Polish E2E tests debrief

Moved the SelectorModal selectors into a shared top-level `history_selector_modal` component (used by `history_panel_switch_to` and upload `select_target_history`), made the switch helper wait for the modal to close, and added a screenshot (commit `4f61d010c98`).

- Selectors: already navigation.yml; `history_panel.switch_history_modal_item` and `upload_activity.history_selector_modal{,_item}` replaced by `history_selector_modal._` / `.item(history_id=...)`, both scoped to `dialog.g-dialog[open]` (upload ones were bare `.g-dialog`).
- Sleeps: none.
- Screenshots: `history_panel_switched_history` added (test file already screenshots others).
- DOM decoration / client refactor: none; existing `data-description` + `data-pk` hooks suffice and target is release_26.2.
- Tests: `test_history_panel_switch_history` passes Playwright + Selenium; `test_upload_activity.py::test_target_history_change` passes Playwright.
