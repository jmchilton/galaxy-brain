# faqs/galaxy/datasets_deleting.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `cac01c0884a` (`faq_server.sh main`). Four pasted
datasets: hid 1 by its trash button (no confirm); 2 and 3 by Select Items > **n of N selected** >
**Delete** ("Really delete 2 content items?" > **Delete**); 4 by **Delete (permanently)** ("Purge
Selected Content?" > **Purge**). The API reports 1-3 deleted and 4 purged; hid 1 then undeletes.
Embedded in 4 tutorials.

## GTN

- Both bulk options now ask for confirmation (in 26.1 too) — marginal, not filed.
- "datasets can be undeleted" twice, but never how: click the trash counter at the top of the
  history (**Include deleted**), then the item's **Undelete** icon. Purged items show a **Purged**
  badge and can't be restored (`deleting-undelete-how`).
- `shared/images/datasets_deleting.gif`: the history panel still matches, but it shows the old
  masthead and the tool panel's **Upload Data** button (screenshot, medium).

## Galaxy

- Gap: no E2E deleted a dataset from the Selection menu, purged one, or undeleted one. Added
  `test_delete_undelete_and_purge_items` (`cac01c0884a`) with `history_panel_item_delete`,
  `history_panel_item_undelete`, `history_panel_delete_selected(purge=False)` (picks the option and
  confirms) and `history_panel_include_deleted`, plus `content_item.undelete_button` and
  `history_panel.include_deleted_button`. Green under Playwright and Selenium.
- A bulk delete ends selection mode (the test reopens it), unlike Build (`builder-selection-stays-on`).
- At 16px the **Undelete** (trash-restore) icon reads as the trash icon, so a deleted item shown via
  Include deleted looks undeleted. UX note only.
- gxui: `dataset-delete HID`, `dataset-undelete HID`, `history-delete HIDS... [--purge]`;
  `history-items --deleted` marks items `(deleted)`/`(purged)` (tip `fa8cfda6c7c`).
- gxui friction: `call` takes no keyword arguments, and its string results come back repr-quoted
  (`'#dataset-…'`), which breaks when pasted into the next selector.
