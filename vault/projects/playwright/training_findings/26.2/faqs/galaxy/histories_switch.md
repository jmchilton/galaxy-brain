# faqs/galaxy/histories_switch.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `8b84ce48e0f`. Embedded by galaxy-interface/history, galaxy-intro-rdm, galaxy-intro-short.

- `histories-switch-modal` (main): **Switch to history** opens a modal of histories (click one), not
  a list in the center panel. list_of_histories.png is stale (screenshots yaml).

Coverage gap: nothing drove the panel's switch button (test_history_switch uses the list card).
Added `history_panel.switch_history_button` / `switch_history_modal_item`,
`history_panel_switch_to`, `test_history_panel_switch_history` (8b84ce48e0f; Playwright + Selenium
green, red without the row click). gxui `history-switch` now goes through the modal.
Replay: `histories_switch.gxui.sh`.
