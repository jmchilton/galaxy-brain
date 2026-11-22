Run via Claude Opus 5.5 at high effort.

Two behavior-preserving refactor commits now sit between the baseline tests and the fix. One pulls the metadata file path rewrite out into a `_job_metadata_path` helper. The other rebuilds the collection staging JSON from the wrapper rows and adds a shared metadata file staging helper. The review follow-ups were squashed into the fix and caching commits, and the final tree is unchanged.

- Old head: `cb4e8562bbf5d300a7fa2c8da37d859372f8d338` (7 commits)
- New head: `1690cf9a5e89ee562f00856d8755ac581f4cdbdd` (5 commits). Its tree is `dfeeaeba2b7c`, the same tree as the old head.

## New history (on `origin/release_26.2` @ `4cc69d30122`)

1. `f52c53ef038` **Baseline tests for collection and dataset wrapper path accessors**. Unchanged (same SHA).
2. `01bdac113ab` **Extract the metadata file path rewrite from DatasetFilenameWrapper** (refactor). Adds `_job_metadata_path(compute_environment, dataset, path)` to `lib/galaxy/tools/wrappers.py`. `DatasetFilenameWrapper.__getattr__` now calls it for `FileParameter` metadata. No behavior change.
3. `1e282606558` **Build collection staging JSON from the wrapper rows directly** (refactor). `wrapped_json.py` pairs each staging path with its row instead of transposing the rows and zipping them back. The property is read once instead of twice. `_metadata_files_to_staging_path_and_source_path` is shared by the single-dataset and collection builders. No behavior change against the base model-backed rows, which have the same 4-item shape.
4. `72b658f1e5e` **Route collection and metadata file path accessors through the compute environment** (the fix, `Fixes #25040`). Squashes four old commits:
   - the original fix `cc055d0d`
   - `b763e633`: paths-only accessors skip metadata, and the model property `DatasetCollection.element_identifiers_extensions_paths_and_metadata_files` and its mapping test assertion are dropped
   - `28476299`: trims the tests that `cc055d0d` added
   - the repeated-identifier half of `32b065a1`: elements are flattened from the element list, not the identifier dict
5. `1690cf9a5e8` **Cache metadata file paths per dataset wrapper so collection accessors load them once**. Combines `27dd98a5`'s wrapper and test changes with the tuple-cache / fresh-list half of `32b065a1`.

## How the work was split

- **`_job_metadata_path`:** this is a pure extraction of the existing `__getattr__` logic, so it goes on the base by itself. The fix then reuses it in `all_metadata_files`.
- **`wrapped_json.py`:** the final version from old `cb4e8562`, plus the walrus tidy from `27dd98a5` that it replaced, works unchanged against the base wrapper. On the base, `element_identifiers_extensions_paths_and_metadata_files` comes from the model and is cached on the wrapper. Moving this change ahead of the fix leaves no `wrapped_json.py` changes in the fix or caching commits. One effect: the "serialize() built the rows twice" problem that `27dd98a5` fixed never shows up in the new history. That commit message was reworded to match.
- **Old `32b065a1` was split** by what each half fixed. The repeated-identifier fix corrects a regression in the original fix, so it went into the fix commit. The tuple cache that returns a fresh list corrects the first caching commit, so it went into the caching commit.
- **Left in the fix:**
  - Dropping the model property. It can't happen before the fix, because the base wrapper still reads it.
  - `_dataset_elements_with_identifiers` and the `__element_identifiers` list. Building rows from the element wrappers is the fix itself: `str(element)` applies the path rewrite.
  - The `cached_property`. It's a performance follow-up to the fix, and on the base `all_metadata_files` has no rewrite to cache.

## Verification

- `test/unit/app/tools/test_wrappers.py` at each commit:
  - baseline: 37 passed
  - refactor 1: 37 passed
  - refactor 2: 37 passed
  - fix: 38 passed
  - cache: 39 passed
- With the fix commit's test file run against refactor 2, `test_collection_wrapper_path_accessors_follow_compute_environment` fails, so the regression test still catches the bug.
- `test/unit/data/test_galaxy_mapping.py` at refactor 2 (the model property and its assertion are still there): 17 passed, 17 skipped.
- ruff, black and isort pass on each commit's changed Python files.
- mypy on `wrappers.py` and `wrapped_json.py`: the refactor commits leave the error count in those files unchanged from the base (24, pre-existing).
- Integration test `test/integration/test_pulsar_embedded_rewrite_parameters.py` on the final head: 1 passed.
- The final tree is identical to the old head's tree.

Nothing was pushed. The local branch is now 5 ahead / 2 behind `jmchilton/issue_25040_collection_paths_rewrite_26_2`, so publishing it will need a force-push.
