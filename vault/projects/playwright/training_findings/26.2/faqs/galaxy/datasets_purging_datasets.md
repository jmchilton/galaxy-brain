# faqs/galaxy/datasets_purging_datasets.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `0cf8353fc84` (`faq_server.sh main`). Three pasted
datasets:
- the Datasets list;
- the trash icon on 1 and 2;
- **Delete (permanently)** on 3;
- Storage Dashboard > Free up disk space > Deleted datasets, which purged 1 and 2 ("You've cleared
  12 b").

Usage counted deleted datasets until the purge. Embedded in `introduction/galaxy-intro-rdm`.

## GTN

- Step 1's **User > Datasets** is the Activity Bar's **Datasets** (`finding-datasets-user-menu`).
- `purging-purge-locations` (main): there is no "Purge Deleted Datasets option in the History
  menu", and no purge link inside a dataset (26.1 too). To purge, use:
  - **Select Items** > **Delete (permanently)**; or
  - the masthead usage meter > Storage Dashboard > **Free up disk space** > Deleted datasets >
    **Review and clear**, then select, **Permanently delete**, and confirm.
- `purging-panel-controls` (main):
  - There are no "deleted" or "hidden" links under the history name. The counters at the top of
    the history do it: the trash count for **Include deleted**, the eye-slash count for
    **Include hidden**.
  - The "far right X" is a trash icon.
- The quota notes are right; usage dropped only on purge.

## Galaxy

- Gap: the Storage Dashboard cleanup was only screenshotted (`test_history_storage_accessibility`).
  Added `test_purge_deleted_datasets_from_storage_dashboard` (`0cf8353fc84`):
  - a fresh user deletes one of two datasets;
  - usage still counts it;
  - the dashboard purges it, and only it;
  - usage drops to the kept dataset.

  Adds `data-description="<operation id> cleanup"` on the cleanup cards, `storage_dashboard.cleanup.*`
  and `storage_dashboard_purge_deleted_datasets`. Its checkboxes take a JS click (bootstrap-vue hides
  the input), as `_set_boolean_value` does. Green under Playwright and Selenium.
- After the purge, the history panel's size (15 B) stayed stale until reload while the masthead
  meter updated. Minor; not filed.
- gxui: `datasets-purge-deleted` (tip `6e95ac5a804`).
