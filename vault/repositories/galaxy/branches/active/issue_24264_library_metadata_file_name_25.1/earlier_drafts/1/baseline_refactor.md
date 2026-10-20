Moved the folder-listing refactor (stop calling `LibraryDataset.to_dict()` in `_serialize_library_dataset`) ahead of the fix. Commits were reordered only; no content changed. The result is on a new local branch, `issue_24264_library_metadata_file_name_25.1_refactor_baseline` (`5a8081d3034`). The working branch has not been moved.

## New history (vs `origin/release_25.1`)

1. `ef71554b95f` Baseline tests for folder contents dataset item fields (unchanged, still first)
2. `95d68e38ba6` Don't resolve file paths when listing library folder contents (was `b0b6805bba0`)
3. `5a8081d3034` Fix dataset to_dict crash when dataset can't be located in object store (was `5531e4fd5da`)

The final tree is identical to the old HEAD `b0b6805bba0` (`git diff b0b6805bba0 5a8081d3034` is empty).

## Why

- The listing commit doesn't depend on the fix. It swaps three `to_dict()` lookups for the LDDA fields that `to_dict()` itself reads (`ldda.ext`, `ldda.create_time.isoformat()`, `ldda.state`). The baseline API test pins those three values against `GET /libraries/datasets/{id}`, so it already guards this commit.
- On base it is a standalone improvement: listings stop resolving and creating metadata files for every row. A side effect: it also removes the folder-listing route to the #24264 crash, even without the fix. The fix commit still covers `to_dict()` / serializer callers (`/libraries/datasets/{id}`, HDA/LDDA `to_dict`, `expose_dataset_path`).
- Nothing else could move ahead of the fix. `get_file_name_if_locatable()` only exists to catch the new `ObjectNotFound` from the `store_by is None` guard, so it belongs with the fix.
- For merge-forward, two small commits that each make sense alone are easier to backport, split, or drop.

## Validation

- Intermediate `95d68e38ba6`: `pytest lib/galaxy_test/api/test_folder_contents.py` gave 9 passed. black and flake8 were clean on `library_folder_contents.py`. mypy shows the same 50 environment errors (missing stubs) as `origin/release_25.1`, none in the touched file.
- Final `5a8081d3034`: `pytest test/unit/data/test_galaxy_mapping.py` gave 16 passed and 16 skipped (postgres-only). `test_library_dataset_to_dict_dataset_in_unknown_backend` passes.
- I built the branch in a temporary worktree (since removed). No push, no `reset`, no `stash`.
