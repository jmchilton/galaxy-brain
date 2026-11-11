Run via Claude Opus at medium effort.

# Test challenges debrief

All tests on the branch are integration tests except the two new unit tests below. There is no UI change, so no E2E test is needed. The "Baseline tests" commit (`0459a61e593`) stays first and unchanged. It pins today's behavior: the cached output shares the source's row, and pgcleanup destroys the index. The later commits flip those assertions.

## Changes

1. **Dropped `TestJobCacheMetadataFilesStoreById`** (`test_job_cache_metadata_files.py`). It claimed to cover the `make_copy` flush, but it passed with or without that flush (as the normal review noted), so it cost a second server boot without pinning anything. The `store_by` config and the basename assertion it needed went with it.
2. **Added unit tests in `test/unit/data/test_model_copy.py`.** The existing in-memory mapping fixture, the disk object store (store_by id) and `_create_hda` were enough, with no mocks.
   - `test_copy_from_gives_target_and_its_copies_their_own_metadata_files`: a queued output and a copy of it. After `copy_from(source, include_metadata=True)`, source, target and the copy each own a distinct `bam_index` row with the right bytes. This covers the `copies` loop in `copy_from`, which no other test reaches. It fails on the base branch: the target's row belongs to the source.
   - `test_copy_from_leaves_the_transaction_to_the_caller`: copy, then roll back, then check that only the source's `MetadataFile` row exists. This pins the `654f397da8c` flush. Without it, `get_file_name()` commits mid-copy, the count is 2, and the test fails. With the branch's first two commits applied, it fails at the count. On the base branch it fails earlier, at the ownership assertion that runs before the rollback.
3. **Added `test_expression_tool_output_copied_from_input`** (integration). `expression_pick_larger_file` on a BAM input reaches the `tools/__init__.py` `copy_from(copy_object, include_metadata=True)` passthrough. The output now owns its index. It fails on base: the output's row belongs to the input HDA. The shared helper was renamed `_check_owns_copied_metadata_file`, and the module docstring was widened to match.
4. **Parametrized `test_purge_deleted_hdas_with_cached_copy`** over `hit_at_submission` and `hit_at_job_preparation`, so pgcleanup now also covers the late path (`Job.copy_from_job` → `copy_from`). Both cases fail on base (`b'' == b'BAI...'`) and pass on the branch under Postgres.

## Not done, and why

- **Cached collection elements (`replace_elements_with_copies`).** I tried `collection_paired_structured_like` over a pair of BAMs with `use_cached_job`, with and without renaming the input HDCA. In both cases the cached HDCA pointed at the source's `DatasetCollection` (same `collection_id`, same element HDAs), so there are no separate rows to own and nothing to test there. `replace_elements_with_copies` is only reached when the late search hits for a job with a pre-structured collection output. I found no simple way to force that, so I dropped the test. Side observation, not a branch issue: such a cached HDCA shares its elements outright with the source.
- **Deferred materialization, attached and detached.** The deferred fixtures (`deferred_hda_model_store_dict`) are bed files with no `MetadataFile`, and building a deferred BAM with an index fixture is out of proportion for this branch. The detached path keeps the old raw assignment, and the existing `test_dataset_materialization.py` tests still pass. Still a gap.
- **Unit tests duplicating integration tests.** The submission and job-preparation integration tests cover different code (`tools/actions` and `Job.copy_from_job`) from the unit tests, which call `copy_from` directly. Nothing was dropped for duplication.
- **Helpers.** The integration tests use `DatasetPopulator` throughout, and no URL is hit directly more than once.

## Test results

- `test/unit/data/test_model_copy.py`: 4 passed. Run against reverted lib code, each new test fails at its own assertion, as described above.
- `test/integration/test_job_cache_metadata_files.py` (SQLite): 3 passed. The expression test fails on base.
- `test/integration/test_scripts_pgcleanup.py` (Postgres 16): 9 passed. Both `cached_copy` cases fail on base.
- `test/unit/data/test_dataset_materialization.py` and `test_galaxy_mapping.py`: 37 passed, 15 skipped.
- isort, black, ruff and mypy are clean on the three changed test files.
