# faqs/galaxy/datasets_working_with_deleted_datasets.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `8d36c6dcdf8` (`faq_server.sh main`). Deleted three
datasets, undeleted one with its icon, purged one from the Selection menu, undeleted one in batch. No
tutorial embeds it.

## GTN

- `purging-panel-controls` (main): there are no show/hide deleted links; the trash and eye-slash
  counters at the top of the history toggle **Include deleted** / **Include hidden**.
- `deleted-datasets-expanded-links` (main): an expanded deleted dataset shows no message, and there's
  no "Undelete it" or "Permanently remove it from disk" link (not on 26.1 either). Undelete is the
  item's icon. There's no "Operations on Multiple Datasets" mode; tick items, then use the
  **n of N selected** menu.
- `purging-purge-locations` (main): purging one dataset is **Select Items** > tick > **Delete (permanently)**.

## Galaxy

- Covered: `test_delete_undelete_and_purge_items`.
- gxui: `history-delete --purge` couldn't select already-deleted hids; it now filters `deleted:any`
  first.
- At panel size, the Undelete icon (`faTrashRestore`) is hard to tell from the trash icon. Not filed.
