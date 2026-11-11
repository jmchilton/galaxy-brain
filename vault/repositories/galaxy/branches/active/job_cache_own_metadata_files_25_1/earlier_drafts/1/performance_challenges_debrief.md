Run via Claude Opus at medium effort.

# Performance challenges: job_cache_own_metadata_files_25_1

## Top line

Copying metadata files instead of sharing rows (the upstream-agreed design) adds real per-file cost on every job cache hit. Most of it is inherent: a DB row, a flush, reading the source file and writing a new object. I removed two avoidable pieces and left the rest.

- **Fixed (commit `1bfa20d298c`)**:
  - `FileParameter.make_copy` sets `object_store_id` before its flush. Each copied `MetadataFile` is now inserted complete, which removes one `UPDATE metadata_file` per copied file.
  - `MetadataFile.update_from_file` asks for its own name with `sync_cache=False`. Only the basename is used. On caching (remote) stores, syncing re-checked the remote and downloaded the empty object that `get_file_name()` had just created. This removes 1 HEAD and 1 GET per metadata file write, both here and on the ordinary set-metadata path, which uses the same method.
  - **Coordinator note:** the `update_from_file` change was backed out in `5b4fc0295bd`. It changes every metadata write on caching stores, which is unrelated to this bug and too broad for a release_25.1 fix. It could be its own change on `dev`.
  - New query-count test: `test_copy_from_inserts_each_metadata_file_row_once` in `test/unit/data/test_model_copy.py`. It fails without the fix (it caught the `UPDATE metadata_file SET update_time, object_store_id`) and passes with it.
- **Not changed**: the unconditional per-file `session.flush()`, the create-then-update object store sequence, the per-element synchronous copying at API submission time, and the file I/O inside `Job.copy_from_job`'s lock window. The reasons are below.

## Measurements (data, not speculation)

The scratch harness is `/tmp/claude-1000/-home-ubuntu-projects-repositories-galaxy-brain-vault-agents-gx-workhorse/d6f2485d-f4c6-4ed8-8c54-dd4ae3578d00/scratchpad/perf/`. It runs on SQLite with the disk object store and does 10 × `copy_from` of a BAM HDA that has a `bam_index`:

| mode | object store calls | SQL |
|---|---|---|
| share rows (base behaviour) | exists 10 | SELECT 35, UPDATE 2 (batched) |
| copy, before fix | exists 40, get_filename 20, create 10, update_from_file 10 | SELECT 45, INSERT 10, UPDATE 40 |
| copy, after fix | same call counts at the store API | SELECT 45, INSERT 10, UPDATE 30 |

The remaining extra UPDATEs (one each for hda.dataset_id, dataset purge and hda copied_from per copy) come from the per-file flush. Without it, SQLAlchemy batches these with executemany. The values are the same; there are just more round trips.

A fake caching remote store replays the `MetadataFile.update_from_file` sequence 10 times (`fake_remote.py`):
- before: HEAD 40, PUT 20, GET 10
- after: HEAD 30, PUT 20, GET 0

After the fix, one copy costs this many remote calls in total:
- target dataset exists: 1 HEAD
- source `get_file_name()`: 1 HEAD, plus HEAD and GET if the file is not in the cache
- new file: 3 HEAD, plus 2 PUT (the empty create and the real upload)

## Why the rest stays

- **Per-file flush.** Under `store_by="id"` (the disk default) the new row needs an id before `get_file_name()`. Without the flush, `get_file_name()` would commit, which is the bug the branch fixed. Under `store_by="uuid"` the flush could be skipped. But then the metadata value would be stored as a uuid string instead of an int id, and every later `wrap()` would run a uuid SELECT (with a commit fallback) instead of an identity-map `session.get`. Reads happen far more often than this write, so I kept the flush unconditional.
- **Create, then update.** `update_from_file` on the object stores requires the object to exist, and `_create` PUTs an empty object first. Avoiding that means changing the object store API, which is out of scope for a release_25.1 fix.
- **Mapped-over collections at submission time.** A cached hit over N elements copies N × K files synchronously in the API request. K is 0 for most datatypes. File metadata exists only on a few binary, sequence, interval, tabular and image types, e.g. bam/cram/tabix indexes. For BAM it is one index, with one flush, one source read and one write per element. Across 1000 elements on a remote store that is roughly 5–7k object store calls in the request. This follows directly from the design. The way out is to defer the copy, e.g. to a celery task or to the job handler as with late cache hits, which changes when outputs become usable. Flagged for upstream; no change made.
- **Lock window in `Job.copy_from_job`.** The output-HDA `FOR UPDATE` locks are held across the metadata file copies, including remote uploads. The locked rows are the new job's own fresh outputs and their copies, so contention is near zero. A slow remote store lengthens the transaction, but it does not block unrelated work. The fan-out to `copied_to_history_dataset_associations` copies files once per copy. That count is normally 0 or 1 for a queued output.
- **No double copy.** The submission-time hit (`tools/actions`) and the late hit (`Job.copy_from_job(copy_outputs=True)`) are exclusive paths. `handler.py` calls `copy_from_job` without `copy_outputs`, so it never copies metadata.

## Validation

- Unit: `test/unit/data/test_model_copy.py`, `test_galaxy_mapping.py`, `test/unit/objectstore/test_objectstore.py`: 54 passed, 27 skipped.
- Integration: `test/integration/test_job_cache_metadata_files.py`: 3 passed.
- Postgres: `test/integration/test_scripts_pgcleanup.py`: 9 passed.
- isort, black, ruff and mypy are clean on the changed files.

## Details

Patterns checked from the process list:
- No unbounded queries were introduced.
- No list-endpoint fields were added.
- No CTEs or joins were added.
- Flush/commit hygiene was the only pattern that applied. The flush is needed for correctness under `store_by id`, and the redundant UPDATE it exposed is now gone.
- No async handlers are involved.
