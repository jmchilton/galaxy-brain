# Re-scope debrief

[Scope evaluation](scope_evaluation.md) recommended a modest expansion. The two deferred review suggestions were both about it: generalize the cleanup helper, and cover the other Free up disk space operations.

- Saved the pre-re-scope branch as `selenium_resume_paused_purge_deleted_alt_original_scope` (`ed05d842b20`); see [alts/original_scope.md](alts/original_scope.md).
- `storage_dashboard_purge_deleted_datasets` → `storage_dashboard_cleanup(operation, screenshot_prefix=None)`, folded into the dataset purge commit (message reworded). **No compat wrapper**, despite the evaluation's suggestion: nothing in the PR would call it, so it would be dead API on a release branch. The re-scope review agreed. On restack, `galaxy_ui_driver`'s `datasets-purge-deleted` verb must call `storage_dashboard_cleanup("deleted_datasets", ...)`.
- New 4th commit, `test_purge_deleted_and_archived_histories_from_storage_dashboard`:
  - A fresh user deletes one history and archives another, then purges each from the dashboard.
  - Each card must then show no items, and only its history may be purged.
  - The archived history must also be unarchived, since purging unarchives first.
  - No new client hooks or selectors were needed.
- The autosquash rebase picked up the newer `release_26.2` (`b66ec973f2b`). Scope evaluation found no upstream changes on the touched paths, so I kept the new base and rebuilt the client.

Verification at head `6d21d8c4d45`, one test at a time, framework-managed server:

| Test | Playwright | Selenium |
|---|---|---|
| `test_resume_paused_job` | pass | pass |
| `test_purge_deleted_datasets_from_storage_dashboard` | pass | pass |
| `test_purge_deleted_and_archived_histories_from_storage_dashboard` | pass | pass |
| `test_history_storage_accessibility` | pass | pass |

Red check: with the deleted-histories cleanup removed, the test fails at `assert purged(deleted_id)`.

[Re-scope review](subagents/rescope_normal_review.md): ship-it, no bugs. Acted on the `archived` strengthening and the stale record.
