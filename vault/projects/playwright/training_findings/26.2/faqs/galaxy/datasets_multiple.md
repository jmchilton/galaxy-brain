# faqs/galaxy/datasets_multiple.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `6e95ac5a804` (`faq_server.sh main`). Four pasted
datasets: Select Items (the checkbox under the history size), then Hide 1 and 2, Delete 3, and
**Delete (permanently)** 4. Embedded in `galaxy-interface/history`.

## GTN

- The steps match. The step numbers skip 5 (Markdown renumbers them anyway), and "n of N selected"
  reads **All N selected** when every item is ticked (`all-n-selected-2`); neither is filed here.
- `multiselect.gif` (24.1): the history panel still matches, but it shows the old masthead
  (screenshot, low).

## Galaxy

- Covered by `test_hide_and_unhide_items` and `test_delete_undelete_and_purge_items` (batch 4). No
  new tests.
