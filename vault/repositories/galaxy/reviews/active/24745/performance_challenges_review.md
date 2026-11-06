# Performance review: #24745

- Profile: `gx_performance_challenger`
- Model: Opus 5.5
- Effort: medium
- Reviewed commit: `5fad7684e37846e4f5459d67d08d2dc16a735b34`

**Verdict: no performance blocker.** One small fix is worth making, in the `copy_from` path used by job caching. The rest is minor. Numbers and method are in [performance_challenges_debrief.md](performance_challenges_debrief.md). All measurements use synthetic data, and object store latency was not measured.

## P2 1: `_delete_metadata_files` loads every association to get its IDs

`Dataset.full_delete()` issued no SQL of its own before this PR. It now lazy-loads `history_associations` and `library_associations` as full ORM rows, only to build two `IN` lists, then runs the metadata SELECT.

`HistoryDatasetAssociation.copy_from` calls `full_delete()` on the replaced dataset, so every job-cache hit pays for this, usually for a dataset with no metadata files. Other callers that don't check `user_can_purge` first include the two job-finish paths for purged datasets.

Measured for one `copy_from`: 2 statements before, 5 with the PR, 3 with the fix below. A map-over of 10,000 cached outputs would go from about 20,000 to 50,000 statements, or 30,000 with the fix (extrapolated). This is the "load everything in Python" pattern from #22831, though each statement is cheap.

Paths through `user_can_purge` or the library purge check have already loaded these associations, so the fix saves them nothing.

Suggested fix, using the indexed `dataset_id` columns:

```python
hda_ids = select(HistoryDatasetAssociation.id).where(HistoryDatasetAssociation.dataset_id == self.id)
ldda_ids = select(LibraryDatasetDatasetAssociation.id).where(LibraryDatasetDatasetAssociation.dataset_id == self.id)
metadata_files = session.scalars(
    select(MetadataFile).where(
        or_(MetadataFile.hda_id.in_(hda_ids), MetadataFile.lda_id.in_(ldda_ids)),
        MetadataFile.purged.isnot(True),
    )
)
```

This variant ran in the harness. The `purged` filter is P3 2.

## P3 1: the final `SELECT` in `DeleteLibraryDatasets` multiplies rows

`deleted_ldda_ids` and `deleted_metadata_file_ids` are both joined to `target_lds` on the library dataset ID, with no relation between them. A library dataset returns versions × metadata files rows.

Measured: a library dataset with 20 versions and 60 metadata files went from 20 rows to 1,200. A dataset with one version and one metadata file is unaffected, so this needs many versions to matter.

`causals` and `objects_to_remove` deduplicate, so the rows waste memory and iteration rather than causing wrong results. The exception is `objects_to_remove` being cleared every 1,000 entries: a duplicate arriving after a clear is removed again, and logs an `ObjectNotFound` warning.

Suggested fix: return metadata files as their own rows with `UNION ALL` instead of a third join, keeping `ORDER BY` on the library dataset ID because `handle_results` groups on it. This SQL has not been run.

## P3 2: `_delete_metadata_files` doesn't skip purged metadata files

The new query has no `purged` filter, although the pgcleanup CTE in this PR uses `metadata_file.purged IS NOT TRUE` for the same reason. Files already removed by `purge_old_hdas`, or by an earlier `full_delete()`, get another `object_store.delete()` call and flag write. This comes from reading the code and was not measured. The cost is one store round trip per file on remote stores.

Suggested fix: add `MetadataFile.purged.isnot(True)`, as in P2 1.

## P3 3: the library purge sweeps metadata files inside the web request (speculative)

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
