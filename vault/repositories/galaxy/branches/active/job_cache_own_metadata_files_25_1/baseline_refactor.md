Run via Claude Opus at medium effort.

The `FileParameter.make_copy` change (set the copy's `object_store_id`, flush the new `MetadataFile` row before writing its file, and drop the commit-and-retry fallback) now lands as its own commit on the base, after the baseline tests and before the job cache fix.

## How the history was restructured

The rebuilt history is on `job_cache_own_metadata_files_25_1_refactor_baseline`, cut from `origin/release_25.1`. The final tree matches the old tip `da18684880d` exactly (both are tree `3e46d8be36d`).

1. **Baseline tests for job cache outputs' metadata files**: cherry-picked unchanged. It stays first.
2. **Flush copied MetadataFiles instead of committing under store_by id** (new prep commit): the final `lib/galaxy/model/metadata.py`. On the base, `make_copy` serves `HDA.copy()`. Before this change, under store_by id, `get_file_name()` committed the caller's session to get the new row's id. Now the row is flushed, inserted complete, and the caller commits. The dead `except AssertionError` fallback goes too: once the flush gives the row its id it can't trigger, and `session(target_context.parent)` would have raised `TypeError` anyway. This folds together the `make_copy` parts of old commits `654f397`, `1bfa20d` and `789931f`. The baseline tests still pass at this commit.
3. **Give job cache outputs their own metadata files**: the core fix, in its final form. It covers `HDA.copy_from`, the job cache hit in `tools/actions`, and detached deferred materialization. Because the flush now sits in `make_copy`, the extra `copy_from` flush that `08db941` added and `654f397` later removed never appears. The integration test edits from `08db941` move here.
4. **Challenge job cache metadata file tests**: test state as of `704a5a7`. The store_by id integration class that `654f397` added and `704a5a7` dropped cancels out, so it never shows up.
5. **Test that copying a metadata file inserts its row once**: the unit test from `1bfa20d`. Commit 2 now holds the code it checks.
6. and 7. Cherry-picked unchanged: the expression tool passthrough test (`7f71b59`) and the direct-read test tightening (`da18684`).

The `get_file_name(sync_cache=False)` change in `1bfa20d` was reverted in `5b4fc02`, so it nets to nothing and both commits are gone.

## Not split out

- The `copy_from` reordering, which moves the metadata assignment after `self.dataset` is set. On the base it would be a no-op that only the fix needs.
- The `source_instance` local in `deferred.py`. It is a one-line extraction that only matters together with the `include_metadata=attached` change.

## Validation

- Prep commit `91b79fe`: `test/unit/data/test_model_copy.py` and `test_galaxy_mapping.py` pass (17 passed, 15 skipped). The baseline `test_job_cache_metadata_files.py` passes on SQLite (2 passed). The pgcleanup cache test passes on Postgres.
- Fix commit `520ac7a`: the same integration tests pass.
- Tip `6123341`: `test_model_copy.py` passes (5 passed). `test_job_cache_metadata_files.py` passes on SQLite (4 passed). The full `test_scripts_pgcleanup.py` passes on Postgres (9 passed).
