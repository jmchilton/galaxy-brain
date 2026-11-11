Run via Claude Opus at medium effort.

# Test challenges debrief (after the re-scope)

This is a fresh pass over every test on the branch, including the re-scope's in-place materialization test. The branch changes no UI, so it needs no E2E test. The "Baseline tests" commit (`0459a61e593`) is still first and unchanged.

One commit: `ff28c6828a9` "Rechallenge metadata file tests after the re-scope".

## Changes

1. **New test: materialization that copies a found replacement into a new instance** (`test_materialization_from_replacement_owns_metadata_files`, `test/unit/data/test_dataset_materialization.py`). The re-scope's fixture, a deferred BAM plus an OK BAM with the same source and hash, made this cheap. Attached materialization that isn't in place reaches `copy_from(replacement, include_metadata=attached)` in `deferred.py`. Nothing exercised that wiring before. The `copy_from` unit tests call it directly and don't cover the `include_metadata=attached` argument. The test fails on base at the ownership assert: the new instance reads the replacement's row.
2. **Shared fixture and assertions for the two materialization tests.** I added `_deferred_bam_with_replacement`, `_set_source` (the source URI and hash were set twice inline) and `_assert_materialized_from_replacement_owns_its_index`. The in-place test now reads as setup, call, `is deferred`, then the shared assert.
3. **Integration helper `_pick_larger_file`** (`test/integration/test_job_cache_metadata_files.py`). The two expression-tool tests repeated the same `run_tool("expression_pick_larger_file", ...)` call and job wait. The process says to add a helper for any repeated HTTP call.

## Challenged and kept

- **`copy_from` unit tests** (`test_model_copy.py`). They use the real mapping and disk object store, with no mocks or `SimpleNamespace`.
  - `..._gives_target_and_its_copies_their_own_metadata_files` covers the `copies` loop, which no integration test reaches.
  - `..._leaves_the_transaction_to_the_caller` pins the `make_copy` flush. Integration can't observe it: it needs a rollback inside the copy.
- **`test_copy_from_inserts_each_metadata_file_row_once`.** This counts SQL statements, which is close to testing the implementation. I kept it because it is the only pin on `1bfa20d298c`'s performance property, which the thermo-nuclear review also accepted as intentional. Reverting only the `object_store_id` line makes it fail at its own assert (`UPDATE metadata_file SET update_time=?, object_store_id=?`). The `object_store_id` assert alone would pass either way.
- **In-place materialization unit test.** It can't easily move to integration, because it needs workflow scheduling of a deferred input that matches an existing dataset. Reverting only the `elif replacement_dataset:` line in `deferred.py` makes it fail at the ownership assert.
- **Integration tests: cache hit at submission and at job preparation, expression passthrough, and linked passthrough.** These need `self._app` because MetadataFile ids aren't exposed by the API. API purge also doesn't remove metadata files; only pgcleanup does. So they belong in integration, as `writing_tests.md` allows. The linked-input test guards the Codex "linked BAM loses its index" concern, which a probe refuted for the disk store. It still fails on base at the ownership assert.
- **pgcleanup (`hit_at_submission`, `hit_at_job_preparation`).** This is the user-visible consequence, under Postgres. It overlaps the ownership tests, but those also run under SQLite, so I kept both.
- **Helpers.** Everything goes through `DatasetPopulator`. The linked `fetch` payload is used once, and no populator helper exists for path-linked HDA uploads.

## Not done, and why

- **Detached materialization with a metadata file.** The branch keeps the raw `_metadata` assignment there. A test would pass on base, so it belongs in the Baseline commit, and that commit isn't rewritten here. It's still a gap. A one-off check: materialize a deferred BAM with `materializer_factory(False, transient_directory=...)` and read `metadata.bam_index`.
- **Cached collection elements (`replace_elements_with_copies`).** The earlier round found no simple way to reach it: cached HDCAs share the source's `DatasetCollection`. I didn't retry.

## Fail-without-the-change checks (fresh)

For each check, I reverted all of the `lib/` changes against `origin/release_25.1` and restored them afterwards.

- **Unit tests.** All 5 new unit tests fail, each at its own assert:
  - both materialization tests and the `copies` test fail at `history_dataset is ...`;
  - the rollback test fails at `id != ...`, before the rollback;
  - the statement-count test fails because no INSERT happens.
- **Single-line reverts.** I also reverted single lines to check which test pins them:
  - Reverting only `deferred.py`'s in-place setter fails just the in-place test.
  - Reverting only `make_copy`'s `object_store_id` line fails just the statement-count test, at its UPDATE assert.
- **SQLite integration.** All 4 `test_job_cache_metadata_files.py` tests fail at the ownership assert. The Baseline commit's version of that file passes, 2 of 2. I ran it as a temporary copy and then deleted it.
- **Postgres pgcleanup.**
  - Both `cached_copy` cases fail, with `b'' == b'BAI...'`.
  - The Baseline commit's version of the test passes.

## Test results

- `test/unit/data/test_dataset_materialization.py` with `test_model_copy.py`: 29 passed.
- `test/integration/test_job_cache_metadata_files.py` (SQLite): 4 passed.
- `test/integration/test_scripts_pgcleanup.py` (Postgres): 9 passed.
- isort, black, ruff and mypy are clean on the two changed files.
