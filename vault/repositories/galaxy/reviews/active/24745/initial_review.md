# Initial review: #24745 Purge metadata files of purged library datasets

- Profile: `_shared/reviewers/default.md`
- Model: Opus 5.5
- Effort: medium
- Reviewed commit: `5fad7684e37846e4f5459d67d08d2dc16a735b34` (merge-base `ab036aead321293bd814df75d08fa7c7b4aaa998`)

## Verdict

Core mechanics are right: `full_delete()` removes the files, the SQL is sound, and file naming matches `get_file_name()`. No P1. Two gaps contradict the PR's stated scope, though: the API library purge path still leaks in the case the PR says it handles, and two pgcleanup actions now mark rows purged without removing the file. The safety claim behind the deviation from the legacy script has no test.

## Findings

### P2 1: API library purge leaves LDDA metadata files behind, and plain pgcleanup never revisits them

`DELETE /api/libraries/{id}/contents/{id}?purge=true` (`lib/galaxy/webapps/galaxy/services/library_contents.py:212-229`) sets `ld.purged = True`, then calls `full_delete()` only when the current LDDA's dataset has no live HDAs and no other library association. Two common cases skip it:

- **Live HDA copy of the dataset.** `can_purge_dataset` is false, so the LDDA's metadata file stays.
- **Older versions.** Only `ld.library_dataset_dataset_association.dataset` is considered. Each version usually has its own `Dataset`, so metadata files of expired versions are never reached.

`DeleteLibraryDatasets` then skips the row without `--force-retry`, because `target_lds` applies `force_retry_sql = " AND NOT purged"`. This is the failure the PR's "Why not leave this to pgcleanup alone?" section argues against. It also diverges from the "removes them at library dataset purge time, even while the same Dataset row is still referenced by a live HDA" claim, which holds only for pgcleanup. Sibling paths now behave differently for the same logical purge.

Suggested fix: in the API purge, remove metadata files for every LDDA with `library_dataset_id == ld.id`, independent of `can_purge_dataset`. A per-row helper (see P3 1) lets `full_delete()` and this path share the code. Add an API test for both cases. If this is deliberately out of scope, the description should say the API leaves these for `--force-retry`.

### P2 2: `PurgesHDAs` now marks rows `purged` in two actions that never remove the file

The shared CTE (`scripts/cleanup_datasets/pgcleanup.py:341-343`) now sets `purged = true`. Two of its users do not have the `RemovesMetadataFiles` mixin:

- `PurgeHDAsOfPurgedHistories` (`:1039`)
- `PurgeDeletedHistories` (`:1080`)

Both return `deleted_metadata_file_id`, `deleted_metadata_file_uuid` and `object_store_id`, but nothing consumes those columns. Their rows become `deleted=true, purged=true` with the file still on disk. That contradicts the PR's rationale that the flag lets a retry tell "already released" from "still to do", and it means the PR does not close the "last gap" for HDAs in purged histories.

Suggested fix: add `RemovesMetadataFiles` to both classes. The columns are already selected and the object store is already required through `RequiresDiskUsageRecalculation`. Add a `purge_deleted_histories` assertion modeled on `test_purge_old_hdas_metadata_files`. If removal there is intentionally deferred, set `purged` only in the actions that remove files.

### P2 3: No test covers the safety argument for the legacy deviation

The PR's main risk is removing an LDDA's metadata while a live HDA shares its `Dataset`, and the description argues at length that this is safe. No test exercises it. All new library tests use a dataset with a single LDDA and no HDA copy.

Suggested fix: add to `test/integration/test_scripts_pgcleanup.py` a test that copies a library dataset to a history through the normal path, so `make_copy` runs, then deletes the library dataset and runs `delete_library_datasets`. Assert that the LDDA's file is gone, the HDA's file still exists with its content, and the HDA's `Dataset` is not purged. Also add a two-version library dataset to cover the `deleted_ldda_ids` x `deleted_metadata_file_ids` join.

### P3 1: Metadata file object-store addressing belongs on `MetadataFile`

`Dataset._delete_metadata_files()` re-derives `extra_dir="_metadata_files", extra_dir_at_root=True, alt_name=f"metadata_{...}.dat"`, already present in `MetadataFile.get_file_name()` (`lib/galaxy/model/__init__.py:11458-11482`), with a comment asking readers to keep the two in sync. It also sets the row's `deleted` and `purged` flags from `Dataset`.

Suggested fix: add `MetadataFile.purge(user=None)` plus a small private helper for the naming kwargs, used by `get_file_name()` and `update_from_file()`. `_delete_metadata_files()` becomes the query and a loop, and P2 1 can reuse the method. That leaves a reusable abstraction rather than a third copy.

### P3 2: Reading a purged metadata file silently re-creates it empty

`MetadataFile.get_file_name()` creates the object when it is missing (`__init__.py:11473-11474`). Before this PR the file always existed. Now any read after purge writes a 0-byte file back to the store, while the row stays `purged=true`, so `--force-retry` skips it because of `metadata_file.purged IS NOT TRUE`.

Reproduced at model level with a disk object store, for both `store_by` values:

```text
id   after full_delete    exists False purged True
id   after get_file_name  exists True  size 0 still flagged purged True
uuid after full_delete    exists False purged True
uuid after get_file_name  exists True  size 0 still flagged purged True
```

By reading only, not exercised: `LibraryDataset.to_dict` (`:7086`) and `LDDA.to_dict` (`:7242`) call `get_file_name()` with no purge guard. `GET /api/libraries/{id}/contents/{id}` serves `to_dict` through `get_library_dataset`, which has no visible deleted check, so a purged library BAM would hit this. `HDA.to_dict` (`:6630`, only with `expose_dataset_path`) and `get_metadata_file_paths_and_extensions` (`:5791`) are also unguarded. `managers/datasets.py:755` and `ensure_dataset_on_disk` are already guarded.

Impact is small: stray empty objects, plus an empty path handed to the caller. Suggested fix: skip creation when `self.purged` is set, or guard the `to_dict` readers the way `managers/datasets.py` does.

### P3 3: Tests use synthetic rows and repeat setup

All new tests attach a hand-built `MetadataFile(name="bai")` to a dataset. The row is never referenced from `_metadata`, so `hda.metadata.bam_index` and real metadata generation are not exercised. The same create-row, write-temp-file, `update_from_file` block appears in `test_datasets.py`, `test_library_contents.py` and `_add_metadata_file`. `store_by: uuid` naming in `_delete_metadata_files()` has no test; the model-level repro above shows it working.

Suggested fix: use a real BAM upload in at least one API test (`1.bam` fixtures are already used in `test_tool_execute.py`), asserting on `hda.metadata.bam_index`, and share the helper.

## Checked, not findings

- **`copy_from()` calling `old_dataset.full_delete()`.** This is a new side effect in job caching, but it is safe. `self.dataset` moves first and `back_populates` drops `self` from the old list. Repro: the source file stays intact and the moved HDA's row is not purged.
- **The final `SELECT` fan-out** (versions x metadata files) is harmless. `objects_to_remove` and the log results are sets, and events are inserted from the CTE rather than the final rows.
- **Other `full_delete()` callers** go through `user_can_purge` or act on datasets being discarded. Session-less import paths are handled by the `session is None` return.

## For the verifier

The "Residual caveat" says a shared `metadata_file` row is impossible, which is overstated. `HDA.copy_from(include_metadata=True)` shallow-copies `_metadata`, so the copy points at the source HDA's row (the repro showed `out._metadata == src._metadata`). This is safe for `full_delete()` because both share one `Dataset`, and it is pre-existing for `PurgesHDAs`.

The new exposure would be an LDDA source: `ExpressionTool.exec_after_process` (`lib/galaxy/tools/__init__.py:3461-3476`) matches `inp_data` values by id only, so an LDDA input could leave a live HDA pointing at an `lda_id` row that `delete_library_datasets` then removes. I did not confirm that an LDDA can reach this path, so it is not labeled as a finding.

Duplicate `metadata_file.uuid` rows from `replace_metadata_file` look unreachable through ordinary export and import, since `strip_metadata_files` defaults to true (from a quick read, not traced end to end).

## What was run

- Model-level repro against the PR's `lib/`, on SQLite and a disk object store, covering `full_delete()`, `get_file_name()` after purge and `copy_from()`.
- The PR's API and integration tests were not run. The PR reports them passing on PostgreSQL.
- No security findings.
