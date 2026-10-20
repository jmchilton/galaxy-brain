# Baseline refactor

Added one refactor commit after the baseline tests: `fetchForms()` is extracted out of `DatasetAttributes.vue`'s initial load on the base. The restructured history is on the local branch `issue_24273_dataset_edit_alert_26.0_refactored` (tip `072f8e9fa80`). Its tree is identical to the original tip `a6907de2c31` (empty `git diff`). The original branch is unchanged, because the reviews cite its hashes.

## Refactor

`c9bd3b0909d` Extract dataset attribute form fetch from initial load.
- `fetchForms()` fetches `get_edit`, stores the result, and catches the error and reports it with `onError`. It returns whether it succeeded.
- `loadDatasetAttributes()` sets `loadingFailed` from that return value.
- Base behavior is unchanged. The existing "doesn't render edit controls with error" test covers the failure path.

DatasetView had nothing that could be split out as a refactor. `loadedDatasetId`/`showLoading` is the fix itself.

## History mapping (old → new)

| Old | New | Note |
|---|---|---|
| `b7db9b4199a` Baseline tests | `b7db9b4199a` | unchanged, still first |
| — | `c9bd3b0909d` | new refactor commit |
| `1b41b798ea7` Keep dataset view mounted | `38399eb1eda` | cherry-pick |
| `b97d01f2144` Rebuild forms after save | `6de7ee68c12` | now only `formRevision`, `:id`s and the post-save `fetchForms()` |
| `b0fb93a994a` Share reload error handling | `e2166feec48` | test-only now, so retitled "Pin dataset attribute form reload failure handling" |
| `86357ab2c43` Restore null narrowing | `76f43614e7c` | cherry-pick |
| `a6907de2c31` Reload on dataset update | `072f8e9fa80` | cherry-pick |

## Verification (node 22.20.0)

- At `c9bd3b0909d`, running `DatasetView.test.js` and `DatasetInformation/`: 23 passed, 2 skipped. eslint and prettier are clean.
- At the tip `072f8e9fa80`: 27 passed, 2 skipped.
