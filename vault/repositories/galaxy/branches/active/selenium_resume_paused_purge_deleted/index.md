# selenium_resume_paused_purge_deleted

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:selenium_resume_paused_purge_deleted?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_resume_paused_purge_deleted)

## Status

Implemented, hardening in progress. Base `release_26.2`, head `e6e3502cc67`.

No PR.

No CI yet.

## Scope

Missing 26.2 E2E coverage for two UI paths that had none, with the client test hooks they need:

1. History options > Resume Paused Jobs (`test_history_panel.py::test_resume_paused_job`). Adds `data-description="resume paused jobs"` and `click_history_option_resume_paused_jobs`.
2. Storage Dashboard > Free up disk space purges deleted datasets (`test_history_storage.py::test_purge_deleted_datasets_from_storage_dashboard`). Adds `data-description="<operation id> cleanup"` on the cleanup cards, `storage_dashboard.cleanup` selectors and `storage_dashboard_purge_deleted_datasets`.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) (FAQ-loop commits `c184ed00be2`, `0cf8353fc84`) per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). Difference from those commits: the paused-job test undeletes its input through the API (`update_dataset`), not the history panel, because the panel undelete helpers come from [#24380](../selenium_delete_items_dataset_privacy/index.md), which isn't on 26.2. On restack, drop both commits from `galaxy_ui_driver` by subject.

## Worktree

`~/projects/worktrees/galaxy/branch/selenium_resume_paused_purge_deleted/`. `.venv` and `client/node_modules` are symlinks into `galaxy_ui_driver_gxui`; never run `pnpm install` here. Client built in place (`static/dist`). Tests use a framework-managed server.
