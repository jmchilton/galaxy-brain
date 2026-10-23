# faqs/galaxy/datasets_unhidden.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `391dd82665d` (`faq_server.sh main`). Three pasted
datasets, 1 and 2 hidden. Typing `visible:hidden` showed only them and lit the eye-slash counter
(**Include hidden (2)**). Select Items, tick 1, Selection menu > **Unhide**. Then 2's eye-slash
**Unhide** icon. Embedded in 5 tutorials.

## GTN

- No findings. The filter, the Selection menu's **Unhide** and the item's eye-slash icon
  (`galaxy-show-hidden`) match 26.2. The **Select Items** omission is as in `datasets_undelete`
  (not filed).
- `shared/images/datasets_unhide.gif` (2024) shows only the history panel, which still matches.

## Galaxy

- Gap: no E2E clicked an item's Unhide icon, and it had no nav entry. `391dd82665d` adds
  `content_item.unhide_button` and `history_panel_item_unhide`. It extends `test_hide_and_unhide_items`:
  filter `visible:hidden`, then 2's Unhide icon. Green under Playwright and Selenium.
- gxui: `dataset-unhide HID`, twin of `dataset-undelete` (tip `7e323178dc0`).
