# Baseline refactor

Pulled one refactor commit ahead of the tests: `navigate_to_storage_dashboard`, with `test_history_storage_accessibility` switched to it. Head `a78490c3e76` → `ed05d842b20`, and the final tree is identical.

## New history (on `5a8f781d0ea`, the same base as before)

1. `cdf468d38c8` Add navigate_to_storage_dashboard selenium helper. Adds the helper (home, masthead link, wait for `free_space_link`) next to `navigate_to_histories_page`, and replaces the two inline home + masthead clicks in `test_history_storage_accessibility`.
   - One strengthening: the `storage_dashboard` screenshot now waits for the dashboard to render.
2. `46e355f7534` Test resuming a paused job from History options. Unchanged pick of `02dc8466188`.
3. `ed05d842b20` Test purging deleted datasets from the Storage Dashboard. Same as `a78490c3e76` minus the helper and the accessibility hunks, and the paragraph about them is dropped from the message.

`git diff a78490c3e76 ed05d842b20` is empty. Nothing was rebased onto the newer `origin/release_26.2` tip (`b66ec973f2b`), so the tree stays identical.

## Considered, not split out

- `data-description` hooks (`HistoryOptions.vue`, `CleanupOperationSummary.vue`), the `storage_dashboard.cleanup` selectors, `storage_dashboard_purge_deleted_datasets` and `click_history_option_resume_paused_jobs`: each one's only caller is a new test. A hooks-first commit would just add unused code, so they stay with their tests. The helper names are unchanged because `galaxy_ui_driver` binds them.
- The `storage_dashboard_cleanup(operation)` generalization: still deferred, as the thermo-nuclear review decided. It isn't a base refactor, and renaming would break the gxui name binding.

## Tests (one at a time, framework-managed server)

| Commit | Test | Playwright | Selenium |
|---|---|---|---|
| `cdf468d38c8` | `test_history_storage_accessibility` | pass (34s) | pass (34s) |
| `46e355f7534` | `test_resume_paused_job` | pass (46s) | pass (47s) |
| `ed05d842b20` | `test_purge_deleted_datasets_from_storage_dashboard` | pass (26s) | pass (30s) |
| `ed05d842b20` | `test_history_storage_accessibility` | pass (26s) | pass (32s) |

- No flakes or hangs this pass.
- No `.vue` changes, so there was no rebuild. `static/dist` is built from the final tree. Its extra `data-description` attributes don't affect the earlier commits' tests.
- `test_resume_paused_job` was run only at `46e355f7534`. Commit 3 doesn't touch its code path.

Force-pushed to `jmchilton`.
