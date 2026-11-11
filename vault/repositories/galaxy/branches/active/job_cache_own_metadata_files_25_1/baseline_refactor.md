Run via Claude Opus at medium effort.

The `FileParameter.make_copy` change lands as its own commit on the base, after the baseline tests and before the job cache fix. That change sets the copy's `object_store_id`, flushes the new `MetadataFile` row before writing its file, and drops the commit-and-retry fallback. The re-scope adds nothing more to split out.

## How the history was restructured

The rebuilt history is on `job_cache_own_metadata_files_25_1_refactor_baseline_2`, cut from `origin/release_25.1` (`e631e8fb37e`). Its final tree matches the branch tip `ff28c6828a9` exactly (both are tree `c67d594fdc6`).

The first seven commits are the first round's restructuring (`job_cache_own_metadata_files_25_1_refactor_baseline`). I reused them after checking them again against the current branch:

- the baseline commit has the same tree as `0459a61`;
- `lib/galaxy/model/metadata.py` at the prep commit matches the branch tip;
- `lib/` at the fix commit matches the pre-re-scope tip `da18684`;
- the round-one tip has the same tree as `da18684`.

1. **Baseline tests for job cache outputs' metadata files** (`a23a1b96991`): unchanged. It stays first.
2. **Flush copied MetadataFiles instead of committing under store_by id** (`91b79fe8603`, the prep commit): the final `metadata.py`. On the base, `make_copy` serves `HDA.copy()`. Before this change, under store_by id, `get_file_name()` committed the caller's session to get the new row's id. Now the row is flushed and inserted complete, and the caller commits. The `except AssertionError` fallback goes too. Once the flush gives the row its id, the fallback can't trigger. It would also have raised `TypeError`, because `session(target_context.parent)` calls the session object with an argument.
3. **Give job cache outputs their own metadata files** (`520ac7a8db0`): the core fix for `HDA.copy_from`, the job cache hit in `tools/actions`, and detached deferred materialization.
4. to 7. Round-one test commits (`f15416b6b39`, `86f92874413`, `9f6a2aa9c0e`, `6123341aca7`).
8. **Give in-place deferred materialization its own metadata files** (`603233d9839`): the re-scope fix (`b20d1d5`), cherry-picked.
9. and 10. Its test extension and the re-challenge (`ce3c20a081d`, `ce0cb6ba9bc`, from `62a9cb8` and `ff28c68`), cherry-picked.

## Not split out

- The `copy_from` reordering, which moves the metadata assignment after `self.dataset` is set. On the base it would change nothing; only the fix needs it.
- The `source_instance` local in `deferred.py`. It is a one-line extraction that matters only together with the `include_metadata=attached` change.
- The in-place `elif replacement_dataset:` change. It is a fix that changes behavior, not a refactor, so it stays a separate commit after the core fix.
- The shared fixture and helper in the re-challenge commit. They are test-only code that tests the branch's own behavior.

## Validation

Unit tests: `test_model_copy.py`, `test_dataset_materialization.py` and `test_galaxy_mapping.py`.

| Commit | Unit tests | Integration tests (SQLite) |
|---|---|---|
| prep `91b79fe` | 39 passed, 15 skipped | 12 passed |
| fix `520ac7a` | 39 passed, 15 skipped | not rerun |
| round-one tip `6123341` | 42 passed, 15 skipped | not rerun |
| `603233d` | 43 passed, 15 skipped | 14 passed |
| `ce3c20a` | 43 passed, 15 skipped | not rerun |
| tip `ce0cb6b` | 44 passed, 15 skipped | 14 passed |

The integration tests are `test_job_cache_metadata_files.py` and `test_materialize_dataset_instance_tasks.py`. At the tip, the full `test_scripts_pgcleanup.py` on Postgres passes: 9 passed.
