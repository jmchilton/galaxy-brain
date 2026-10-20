The branch already applies its one base refactor ahead of the fix: `c2cc018262d` changes the folder listing so it no longer calls `LibraryDataset.to_dict()`. I re-evaluated from scratch after the re-scope and found nothing else worth splitting out, so this round rewrote no history and created no branch. The working branch and its tree are unchanged.

## Current history (vs `origin/release_25.1` `3e7b53eaf75`, which HEAD contains)

1. `9d3606f644b` Baseline tests for folder contents dataset item fields (still first)
2. `c2cc018262d` Don't resolve file paths when listing library folder contents (the base refactor)
3. `7b988167e0b` Fix dataset to_dict crash when dataset can't be located in object store
4. `654118f2dd6` Don't crash serializing extra_files_path for unlocatable datasets

## Why the refactor stands alone

- On base, `LibraryDataset.to_dict()` sets `state=ldda.state`, `date_uploaded=ldda.create_time.isoformat()` and `file_ext=ldda.ext`. The listing now reads those same three fields directly, so the swap doesn't change behavior.
- The baseline API test checks those three fields against `GET /libraries/datasets/{id}`. It guards the refactor, and it passes both before and after it.

## Candidates considered and rejected

- **`global_object_store_for_models` test helper** (in `7b988167e0b`): a separate commit would add a helper that nothing on base uses. The existing hand-rolled swaps (`test_collect_primary_datasets.py`, `test_model_copy.py` and others) are unrelated tests. The thermo review ruled converting them out of scope for a release branch, so the helper stays with its first caller.
- **`MetadataFile.get_file_name_if_locatable`**: it only does something once the new `store_by is None` → `ObjectNotFound` guard exists, so it belongs with the fix.
- **`Dataset.get_extra_files_path_if_locatable`** (`654118f2dd6`): this is a second fix, not a refactor.

## Validation (current hashes)

| Commit | Check | Result |
|---|---|---|
| `9d3606f644b` | `pytest lib/galaxy_test/api/test_folder_contents.py` | 9 passed |
| `c2cc018262d` | `pytest lib/galaxy_test/api/test_folder_contents.py` | 9 passed |
| `c2cc018262d` | black and flake8 on `library_folder_contents.py` | clean |
| `654118f2dd6` (HEAD) | `pytest test/unit/data/test_galaxy_mapping.py test/unit/app/managers/test_DatasetManager.py` | 29 passed, 16 skipped (postgres-only) |

The intermediate commits ran in a throwaway detached worktree, which has since been removed. I did not check anything out in the working directory, and there was no push, reset or stash.
