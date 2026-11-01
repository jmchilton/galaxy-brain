# selenium_multiview_copy screenshot debrief (2026-10-21)

Screenshots successfully obtained.

The branch's two E2E tests already take screenshots, so no test changes were needed. The user-visible change is the target-column refresh fix, so I also recorded a "before" shot of the same test against the `release_26.2` version of `historyDragDrop.ts`.

## Screenshots (`screenshots/`, gitignored)

| File | Source | Shows |
| --- | --- | --- |
| `before_multi_history_copy_between_columns.png` | `test_copy_dataset_between_columns` with `historyDragDrop.ts` from `origin/release_26.2` (`&&`). The test failed, and this is the error dump's `last.png` | Bug: after dropping "1: to copy" onto the "Multiview copy target" column, that column still says "This history is empty" (0 B, 0 items) when the wait times out. The source column has the item. |
| `after_multi_history_copy_between_columns.png` | `multi_history_copy_between_columns` at head `4352a0f4ff6` (`\|\|`) | Fix: the target column shows "1: to copy" (4 B, 1 item) next to the source column, with the "Dataset copied to history" toast. |
| `multi_history_switch_from_column.png` | `multi_history_switch_from_column` at head | After clicking the target column's switch button, that column is labelled "Current History", the source column is labelled "Switch to", and the right panel shows "Multiview switch target". |

I looked at all three. They show what's expected. The `data-history-id` and `data-description` hooks don't render, so the switch shot only confirms Multiview looks the same.

## How

- Isolated Galaxy on 8082 and Vite on 5175 (`GALAXY_URL` → 8082), started from the polish worktree. Playwright ran headless with `GALAXY_TEST_EXTERNAL=http://localhost:5175/`, `GALAXY_TEST_TIMEOUT_MULTIPLIER=2` and a scratch config holding only `admin_api_key`. Runs were one at a time.
- Head: both tests passed (2 passed in 39.32s).
- Before: `git checkout origin/release_26.2 -- client/src/composables/historyDragDrop.ts`, which is a diff of just the `&&`/`||` operator, picked up by Vite HMR. The copy test timed out on `.history-column[data-history-id=…] .content-item[data-hid="1"]` as expected (1 failed in 43.29s). After that I restored the file from HEAD. I didn't check out the whole base, because `release_26.2` doesn't have the column hooks the test needs to drag onto a column.
- The worktree is back on `selenium_multiview_copy` at `4352a0f4ff6` and clean. Servers are stopped and the ports are free. `galaxyctl shutdown` left gunicorn running, so I killed it by PID after confirming its cwd was the polish worktree.

## Problems
- In the "before" shot the toast is gone, because it's the failure-time capture and the toast had expired by then. The 0 B / empty target column is the evidence.
- Selenium wasn't run, so only Playwright was used.
