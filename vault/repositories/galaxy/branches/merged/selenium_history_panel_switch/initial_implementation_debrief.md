# Initial implementation debrief

Cherry-picked `galaxy_ui_driver` `8b84ce48e0f` onto `release_26.2` `e3affe97eb8` cleanly as `a8d87e5653e`.

- Adds `history_panel.switch_history_button` / `switch_history_modal_item` selectors, `NavigatesGalaxy.history_panel_switch_to`, and `TestHistoryPanel.test_history_panel_switch_history`.
- Passes under Playwright (headless) and Selenium (local chromedriver), framework-managed server, client built in place.
- Red check: dropping the modal-item click makes the test fail.
- Possible reuse: `upload_activity.history_selector_modal_item` targets the same `SelectorModal` (`.g-dialog [data-pk=...]`); left for polish.
