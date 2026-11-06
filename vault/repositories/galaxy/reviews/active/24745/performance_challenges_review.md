# Performance review: #24745

- Profile: `gx_performance_challenger`
- Model: Opus 5.5
- Effort: medium
- Reviewed commit: `5fad7684e37846e4f5459d67d08d2dc16a735b34`

**Verdict: no performance blocker, and nothing above P3.** Numbers and method are in [performance_challenges_debrief.md](performance_challenges_debrief.md). All measurements use synthetic data, and object store latency was not measured.

## P3 1: `_delete_metadata_files` adds three statements to every `copy_from`

`Dataset.full_delete()` issued no SQL of its own before this PR. It now lazy-loads `history_associations` and `library_associations`, builds two `IN` lists, then runs the metadata SELECT.

`HistoryDatasetAssociation.copy_from` calls `full_delete()` on the replaced dataset, so every job-cache hit pays for this, usually for a dataset with no metadata files. Other callers that don't check `user_can_purge` first include the two job-finish paths for purged datasets. Paths through `user_can_purge` or the library purge check have already loaded these associations, so they pay only for the SELECT.

Measured for one `copy_from`: 2 statements before, 5 with the PR. A map-over of 10,000 cached outputs would go from about 20,000 to 50,000 statements (extrapolated). Each statement is cheap.

Suggested fix: return early when both association lists are empty, before the SELECT. Measured: 4 statements, so a small saving.

**Don't replace the lists with a `dataset_id` subquery.** That gets `copy_from` to 3 statements, but it isn't safe. Galaxy sessions use `autoflush=False` (`lib/galaxy/model/base.py`), and `copy_from` reassigns `self.dataset` before calling `full_delete()` on the old dataset. A subquery still sees the unflushed row and would purge the metadata files of the live output, while the PR's relationship-based lists correctly exclude it. `perf_swap_check.py` shows this on the dataset swap in isolation, not through a full `copy_from`.

## P3 2: the final `SELECT` in `DeleteLibraryDatasets` multiplies rows

`deleted_ldda_ids` and `deleted_metadata_file_ids` are both joined to `target_lds` on the library dataset ID, with no relation between them. A library dataset returns versions × metadata files rows.

Measured: a library dataset with 20 versions and 60 metadata files went from 20 rows to 1,200. A dataset with one version and one metadata file is unaffected, so this needs many versions to matter.

`causals` and `objects_to_remove` deduplicate, so the rows waste memory and iteration rather than causing wrong results. The exception is `objects_to_remove` being cleared every 1,000 entries: a duplicate arriving after a clear is removed again, and logs an `ObjectNotFound` warning.

Suggested fix: return metadata files as their own rows with `UNION ALL` instead of a third join, keeping `ORDER BY` on the library dataset ID because `handle_results` groups on it. This SQL has not been run.

## P3 3: `_delete_metadata_files` doesn't skip purged metadata files

The new query has no `purged` filter, although the pgcleanup CTE in this PR uses `metadata_file.purged IS NOT TRUE` for the same reason. Files already removed by `purge_old_hdas`, or by an earlier `full_delete()`, get another `object_store.delete()` call and flag write. This comes from reading the code and was not measured. The cost is one store round trip per file on remote stores.

Suggested fix: add `MetadataFile.purged.isnot(True)` to the existing query.

## P3 4: the library purge sweeps metadata files inside the web request (speculative)

`LibraryContentsService` calls `full_delete()` synchronously, while HDA purges go through Celery when it is enabled. `FileParameter.make_copy` gives each HDA copy its own metadata file, so a popular library dataset can sweep one file per purged copy. Measured with 5,000 copies: 5,001 store deletes, up from 1. On a remote store that could exceed a request timeout, and the surrounding `except Exception: pass` would hide the failure.

No production data shows how many copies with metadata files exist. Step 2 of the debrief's measurement plan would settle it.

Suggested fix, if the counts justify it: send this path through `DatasetManager.purge_datasets` as a task, as `HDAStorageCleanerManager._request_full_delete_all` does.

## Checked, no finding

- **`--force-retry` no-op:** 140 ms with the PR and 148 ms at base on 200,000 already-purged library datasets, so the new CTE adds no measurable cost when there is nothing to do.
- **`delete_library_datasets` first run:** 10.2 s at base and 33.6 s with the PR on 200,000 library datasets. This is a single run biased toward base, and it is expected work: one more table updated and one more event table filled.
- **Locks during object store removal:** `_update` commits before `handle_results` runs, so none are held.
- **`purge_datasets` / history purge:** 4 SELECTs per dataset become 5. A prefetch across the batch could remove that, but it isn't worth reshaping `full_delete()` without a profile showing the need.
- **Indexes:** `metadata_file.hda_id`, `metadata_file.lda_id` and `library_dataset_dataset_association.library_dataset_id` are all indexed.

## Pre-existing, outside this PR

- `DeleteLibraryDatasets` ignores `--batch-size`, as do most pgcleanup actions, so a first run on a large backlog is a single statement in a single transaction. This PR makes that statement larger.
- `RemovesObjects.remove_from_object_store` calls `get_filename()` before deleting. Its own TODO notes this can cache a file locally from S3, and this action now reaches that code for library metadata files.
