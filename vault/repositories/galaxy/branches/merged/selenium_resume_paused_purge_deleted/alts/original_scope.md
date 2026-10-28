# original_scope

`selenium_resume_paused_purge_deleted_alt_original_scope` at `ed05d842b20` (base `release_26.2` `5a8f781d0ea`), [on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_resume_paused_purge_deleted_alt_original_scope).

This is the branch as hardened before the re-scope: the `navigate_to_storage_dashboard` refactor, the Resume Paused Jobs test, and the deleted-datasets Storage Dashboard purge test. Its helper is `storage_dashboard_purge_deleted_datasets(screenshot_prefix=None)`, under the same name `galaxy_ui_driver`'s gxui verb uses.

The parent generalizes that helper to `storage_dashboard_cleanup(operation, screenshot_prefix=None)` and adds `test_purge_deleted_and_archived_histories_from_storage_dashboard` for the other two Free up disk space operations. The parent is also rebased onto a newer `release_26.2` (`b66ec973f2b`).
