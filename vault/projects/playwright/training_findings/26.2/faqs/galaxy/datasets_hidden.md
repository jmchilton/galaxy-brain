# faqs/galaxy/datasets_hidden.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `3f1d565241a` (`faq_server.sh main`). Three pasted
datasets: Select Items, tick 1 and 2, **2 of 3 selected** > **Hide** ("Really hide 2 content
items?" > **Hide**); then Include hidden and Unhide 1. Embedded in `galaxy-interface/history`.

## GTN

- No findings. Hide now asks for confirmation (in 26.1 too) — marginal, not filed. Unhiding is
  `datasets_unhidden.md`'s job.
- `shared/images/datasets_hide.gif` still matches the selection menu.

## Galaxy

- Gap: nothing tested Hide or Unhide. Added `test_hide_and_unhide_items` (`3f1d565241a`) with
  `history_panel_hide_selected(unhide=False)`, `history_panel_include_hidden` and
  `history_panel.include_hidden_button`. The pick-and-confirm step shared with delete is now
  `history_panel_confirm_selected_operation`. Green under Playwright and Selenium, as is the delete
  test after the refactor.
- gxui: `history-hide HIDS... [--unhide]` (tip `fa8cfda6c7c`).
