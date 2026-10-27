---
upstream_base_branch: release_26.2
---
# selenium_resume_paused_purge_deleted

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:selenium_resume_paused_purge_deleted?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_resume_paused_purge_deleted)

## Status

POLISHED: ready for John's final review; see [polish debrief](polish_debrief.md), [PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md). Rebased onto `release_26.2` `a680ed79834`, head `3c8b6169aa7`.

No PR.

Fork CI on pre-rebase `257d514929c` green except unrelated Singularity `test_mulled_simple` timeout; CI rerunning on `3c8b6169aa7`.

## Scope

Missing 26.2 E2E coverage for UI paths that had none, plus the client test hooks they need. Four commits:

1. `navigate_to_storage_dashboard` helper; `test_history_storage_accessibility` uses it.
2. History options > Resume Paused Jobs (`test_history_panel.py::test_resume_paused_job`). Adds `data-description="resume paused jobs"` and `click_history_option_resume_paused_jobs`.
3. Storage Dashboard > Free up disk space purges deleted datasets (`test_purge_deleted_datasets_from_storage_dashboard`). Adds `data-description="<operation id> cleanup"` on the cleanup cards, `storage_dashboard.cleanup` selectors and `storage_dashboard_cleanup(operation)`.
4. The same for deleted and archived histories (`test_purge_deleted_and_archived_histories_from_storage_dashboard`). This is the re-scope; the original scope is kept as [an alt](alts/original_scope.md).

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) (FAQ-loop commits `c184ed00be2`, `0cf8353fc84`) per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). It differs from those commits in three ways:
- The paused-job test undeletes its input through the API, not the history panel. The panel helpers come from [#24380](../../merged/selenium_delete_items_dataset_privacy/index.md), which isn't on 26.2.
- `storage_dashboard_purge_deleted_datasets` is now `storage_dashboard_cleanup("deleted_datasets", ...)`, with no wrapper.
- The purge helper waits for `:not(.g-disabled)` buttons.

On restack, drop both source commits by subject and rebind gxui's `datasets-purge-deleted` verb to `storage_dashboard_cleanup`.

## Worktree

`~/projects/worktrees/galaxy/branch/selenium_resume_paused_purge_deleted/`. `.venv` and `client/node_modules` are symlinks into `galaxy_ui_driver_gxui`; never run `pnpm install` here. Client built in place (`static/dist`). Tests use a framework-managed server; Selenium needs chromedriver on `PATH` and `GALAXY_TEST_SELENIUM_HEADLESS` unset.
