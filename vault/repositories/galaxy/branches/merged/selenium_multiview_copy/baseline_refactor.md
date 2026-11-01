# selenium_multiview_copy baseline refactor (2026-10-21, re-harden)

No further refactoring of the base branch was performed. The branch already starts with a refactor commit, `bb5ef3a54a3` "Drop unused Multiview selectors", carried over from the pre-rescope pass (`earlier_drafts/1/baseline_refactor.md`). History is unchanged.

Head stays `4352a0f4ff6` (matches `jmchilton/selenium_multiview_copy`). 6 commits on `release_26.2`:

| Commit | Role |
| --- | --- |
| `2b530b5fb65` Baseline tests for useHistoryDragDrop drop handling | baseline (passes on unfixed `&&`) |
| `bb5ef3a54a3` Drop unused Multiview selectors | refactor on base |
| `bf260c4d28e` Point Multiview selectors at real per-history hooks | test-infra fix |
| `c6b0b9473cf` Add a Multiview helper to copy items between history columns | feature |
| `4eaf4afa350` Test switching histories from a Multiview column | test |
| `4352a0f4ff6` Refresh Multiview target column after single-type drops | core fix (`&&` → `\|\|`) + vitest/E2E |

## Why nothing more was split
- The core fix is a one-operator change in `historyDragDrop.ts`, already the last commit. All other commits are prep that sits ahead of it.
- `current_label`/`switch_history` still have no callers in `lib/`, `client/src`, `packages/` or `test/` (re-grepped at head), so `bb5ef3a54a3` still stands alone on `release_26.2`.
- The `data-history-id`/`data-description` hooks and repointed selectors are already their own commit ahead of the fix. Splitting the Vue hooks from the selectors would leave hooks nobody reads.
- `history_column_item`/`history_column_drop_zone`, `multi_history_copy_item`, `_wait_for_text` and `_wait_for_switch_button_labels` are new code, not reshaped base code.
- The fix commit's E2E edit (wait for the item in the target column, screenshot after the drop) only works with the fix, so it stays with it.
- No existing base-branch code is duplicated by the branch that a prior extraction could absorb (e.g. `test_list_list_copy`'s drop-box path isn't touched).

## Verification
- No reorder or rewrite, so the tree is unchanged and earlier results still apply: vitest 6/6 at head (2 fix-commit cases fail under `&&`, baseline cases pass on unfixed code), Playwright `test_history_multi_view.py` 6/6. No tests rerun, no push.
