Two behavior-preserving refactor commits now sit on the base (`29d1801ad21`, unchanged merge-base with `origin/release_26.0`): custom build populator helpers, then a pass-through `HistoryManager.get_converted_dataset` seam with all three API call sites routed through it. The fix is rebuilt on top as cherry-pick + id-encoding fix + one history-resolution commit. Final tree identical to old head `2b86cad3ba8`; new head `0a6c27e2cae`, force-pushed to `jmchilton`.

## New history

1. `a5de02c79cf` Add custom build populator helpers (refactor). `create_custom_build_raw`/`get_custom_builds` on `BaseDatasetPopulator`. The existing `test_custom_build_from_unconvertible_dataset` and `test_custom_build_from_inaccessible_dataset` now use them plus `dataset_populator.user_id()`. Test-only. `get_converted_dataset_raw`/`search_dataset_features_raw` stay in the fix commit because nothing on base calls them.
2. `f7603faeb1f` Route API dataset conversions through HistoryManager (refactor). Adds `HistoryManager.get_converted_dataset(trans, dataset, ext)` as a pure `dataset.get_converted_dataset(trans, ext)` pass-through. Adds `FastAPIUsers.history_manager` DI. Custom builds, `_get_or_create_converted` and `_search_features` call it. The `add_custom_builds` trans annotation becomes `ProvidesHistoryContext`, which is typing-only (same `DependsOnTrans`). Behavior unchanged.
3. `897eabb92b3` Pass conversion context to dependency converters. Unmodified carry of `5e777761b18` (backport of `a3cb32cd95d`) with its trailer intact, so merge-forward can still drop it as one commit.
4. `bb3f23dc1c9` Stop double-encoding ids in converted/{ext} response. The `encode_id=False` fix, split out of the old `8207e6f2e80`. It changes the public response, so it is not a refactor. Its only coverage is the `history_id`/`id` assertions in the next commit's tests.
5. `0a6c27e2cae` Run API conversions in an active history the user owns (the fix, #24529). `_is_active`, `_history_for_conversion`, the real `get_converted_dataset` body, the two raw populator helpers and all new API tests.

The old commits `0ee1473ec4e`, `cef99a41ee1`, `4be0305934b`, `8207e6f2e80`, `dacb7d38dd6`, `d23bf1d1cf5` and `2b86cad3ba8` were folded into 1, 2, 4 and 5. Their back-and-forth (unit test added then dropped, public method later made private) is gone. `5e777761b18` became 3.

## Notes

- Restore point: local branch `backup/issue_24529_pre_baseline_refactor` at `2b86cad3ba8`.
- `_alt_original_scope` still points at `cef99a41ee1` (intended).
- Earlier debriefs and differential-review snapshots cite pre-rewrite SHAs.
- Not rebased onto the current `origin/release_26.0` tip (`e27589acb8d`). Out of scope.
- No "Baseline tests" commit. The new API tests 500 on base, and the refactored existing tests are covered by commit 1.

## Validation

- `git diff 2b86cad3ba8 0a6c27e2cae` is empty.
- Commits 3 and 4 were checked only through head. The cherry-pick produced an identical patch, and the encode change is one line.
- At `f7603faeb1f` (the riskiest new state, tested directly):
  - ruff/black/isort/mypy clean on changed files.
  - Unit `test_actions.py` + `test_HistoryManager.py`: 40 passed.
  - API `test_users.py -k "unconvertible or inaccessible"`: 2 passed.
  - API `test_datasets.py -k "converted or search_features or raw_data_no_converter"`: 1 passed (only `raw_data_no_converter` exists there).
- At `a5de02c79cf`: lint clean.
- At head:
  - ruff/black/isort/mypy clean on all 8 changed files.
  - Unit: 41 passed.
  - API `test_datasets.py -k "converted or search_features or raw_data_no_converter"`: 5 passed.
  - API `test_users.py -k custom_build`: 4 passed. Run one at a time.
