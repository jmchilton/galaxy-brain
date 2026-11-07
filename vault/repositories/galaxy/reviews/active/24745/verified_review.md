### P1 1: Purging a dataset can delete the metadata file of a live dataset under `store_by: uuid` (implementation verified)

The root cause here is pre-existing and outside this PR, and it's tracked separately in a draft issue. Under `metadata_strategy: extended` with `store_by: uuid`, a discovered output with `metadata_source` gets a `metadata_file` row carrying the input's uuid, on a different `Dataset`, so both rows name one file. This PR makes that more damaging because `full_delete()` now removes the file: purging the output through the API deletes the BAM index of the still-live input, and the next read recreates it empty, so tools get a 0-byte index with no error. It also means the PR's "per-association, so safe" argument is factually wrong. The purge decision itself is fine.

<details><summary>Details</summary>

The row comes from `replace_metadata_file` in `lib/galaxy/model/store/__init__.py`, which inserts a new row with the exported uuid when the existing row belongs to another dataset instance. `FileParameter.wrap` already says `metadata_file.uuid is not unique in existing databases`. This goes back to `14dceed32b6`, and `b37de64b702` deliberately kept the insert for another dataset's uuid.

On current `dev`, without this PR, the shared file already goes wrong: the tool job overwrites the input's index with the output's, and so does a later set metadata job on the output. So when the output's data differs from the input's, this PR turns an already wrong index into an empty one. When the data is the same, it turns an intact index into an empty one. A red test for the root cause is on [`metadata_source_extended_shared_uuid`](https://github.com/jmchilton/galaxy/tree/metadata_source_extended_shared_uuid).

The trigger is narrow: extended metadata, `store_by: uuid`, and a tool with `metadata_source` on discovered outputs whose datatype has metadata files. The `directory` strategy produced no duplicates in the same run. Before this PR `full_delete()` removed no metadata files, so the API path is new exposure. The `PurgesHDAs` actions with `RemovesMetadataFiles` already had this problem, and `delete_library_datasets` gains it here. Under `extended` with `store_by: id`, a BAM upload got no index at all, so this path couldn't be reached there.

A related case is not a uuid duplicate. `HDA.copy_from(include_metadata=True)` makes the copy reference the source HDA's row. `full_delete()` is safe there because both share a `Dataset`, but pgcleanup removal by `hda_id` is not. On current `dev`, with a real job-cache hit, `purge_deleted_hdas` on the source output removed the index the live cached output reads. That is pre-existing, and **the fix for P2 2 extends this hazard to `purge_deleted_histories` and `purge_hdas_of_purged_histories`**, which don't remove these files today. The uuid check below doesn't catch it because there is no second row.

</details>

<details><summary>Evidence</summary>

End-to-end run with a temporary tool (`<collection metadata_source="input1">` with `discover_datasets`), a real BAM, `metadata_strategy: extended` and `store_by: uuid`:

```text
ROW 1 9d6fed3b-... hda 1 dataset 1 purged False
ROW 2 9d6fed3b-... hda 3 dataset 3 purged False
both rows resolve to .../_metadata_files/9/d/6/metadata_9d6fed3b-....dat
purge HDA 3 through the API
ROW 2 purged True, ROW 1 purged False, HDA 1 purged False
input index file exists after output purge: False
```

The same run with `metadata_strategy: directory` gave distinct uuids, and the input's file survived.

Red tests for the root cause on `dev` at `a1ade917000`, with `1.bam` as the metadata source and `3.bam` as the output's data. All of them pass under `directory`:

```text
test_output_row_has_own_uuid: same uuid on both rows
test_output_metadata_resolves_to_its_own_row: output resolves to the input's row
test_output_and_input_index_paths_differ: same path
test_tool_job_keeps_input_index: input's index bytes changed by the tool job
test_set_metadata_on_output_keeps_input_index: input's file overwritten by the set metadata job
```

</details>

Suggested fix: still mark the row purged, but remove the file only when no other unpurged row has the same uuid, so the last row releases it. Apply this in `full_delete()` and in the shared `RemovesMetadataFiles` removal step, which covers `delete_library_datasets` and the existing HDA actions in one place. This is a guard, not a root-cause fix. It costs one extra `SELECT` per `full_delete()` with metadata files, and it stays necessary after the root cause is fixed, because existing duplicate rows remain.

<details><summary>Details</summary>

The review branch adds `MetadataFile.purge_all()` for the model path and `RemovesMetadataFiles._uuid_in_use()` for pgcleanup. The pgcleanup check runs after the flags commit, and the model check reads the session's instances because `purge_datasets` commits only at the end of a batch, so two rows purged together still release the file. `store_by: id` is unaffected, and a test pins that.

Tests were red without the fix and green with it: `test_purge_hda_keeps_file_named_by_row_of_live_dataset`, `test_purge_deleted_hdas_keeps_metadata_file_named_by_live_row`, `test_delete_library_datasets_keeps_metadata_file_named_by_live_row` and `test_batch_purge_releases_file_all_rows_name`.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P2 1: API library purge leaves metadata files behind when an HDA copy or older version exists (implementation verified)

`DELETE /api/libraries/{id}/contents/{id}?purge=true` reaches metadata only through `full_delete()`, which runs on the current version's dataset once nothing else references it. A live HDA copy skips it, and older versions never reach it. `ld.purged` is already set by then, so plain `delete_library_datasets` skips the row too and the files wait for `--force-retry`. The description says they go at library dataset purge time, which holds only for pgcleanup.

<details><summary>Evidence</summary>

Both tests failed before the fix on `{'deleted': False, 'purged': False, 'exists': True}` for the row expected gone: `test_purge_library_item_with_live_hda_copy` (real BAM copied into a library) and `test_purge_library_item_removes_files_of_all_versions`.

</details>

Suggested fix: purge the metadata files of every version when the API purges a library dataset, independently of whether the dataset can be purged. The review branch adds `LibraryDataset.purge_metadata_files()` and calls it from `LibraryContentsService.delete`. A failure there is logged and doesn't block the dataset's own removal.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P2 2: `purge_deleted_histories` and `purge_hdas_of_purged_histories` mark files purged without removing them (implementation verified)

The shared `PurgesHDAs` CTE now sets `purged = true`, but `PurgeHDAsOfPurgedHistories` and `PurgeDeletedHistories` don't have `RemovesMetadataFiles`. Their rows read as released while the file stays on disk. That contradicts the description's rationale for the flag, and it leaves HDAs in purged histories outside the "last gap" the PR closes.

<details><summary>Evidence</summary>

New tests on PostgreSQL, before the fix: `{'deleted': True, 'purged': True, 'exists': True}` for both actions.

</details>

Suggested fix: add `RemovesMetadataFiles` to both classes. Their final `SELECT`s already return the columns it needs. Because this extends removal to two more actions, it relies on the uuid guard from P1 1.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P2 3: The deviation from legacy, multiple versions, events and repeat runs have no test (implementation verified)

The PR's main risk is removing an LDDA's metadata while a live HDA shares its `Dataset`, and no test exercised it. Every new test also used one LDDA with one synthetic file not referenced from `_metadata`. Removing the events CTE or the `purged IS NOT TRUE` filter would have left the suite green.

<details><summary>Details</summary>

The review branch adds:

- File assertions in `test_delete_library_datasets_keeps_dataset_shared_with_history`: the LDDA's file is gone, and the HDA's is intact with its content.
- `test_delete_library_datasets_metadata_files_of_all_versions`: two files and two versions, a NULL `purged` row, one event per file, and a repeat `--force-retry` that neither logs nor records anything.
- Unchanged-state assertions after soft delete and after the retention step in `test_delete_library_datasets`.
- A real BAM with `metadata.bam_index`, through `test_purge_library_item_with_live_hda_copy`.
- A `store_by: id` run, since the driver defaults to `uuid`.

Nothing asserts on the HDA's file after that HDA is purged. `user_can_purge` stays false while the LDDA exists, and `purge_datasets` has no metadata handling, so the file stays. The description's table already says so.

</details>

Suggested fix: keep these tests. By reading, they pin behavior rather than catch a known failure in the PR's SQL.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 1: Metadata file addressing belongs on `MetadataFile` (implementation verified)

`Dataset._delete_metadata_files()` re-derives the `extra_dir`, `extra_dir_at_root` and `alt_name` values from `get_file_name()`, with a comment asking readers to keep them in sync, and it sets the row's flags from `Dataset`.

Suggested fix: add `MetadataFile._object_store_kwargs()` and `MetadataFile.purge()`, used by `get_file_name()` and `full_delete()`. P1 1 and P2 1 build on this.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: Showing a purged library dataset recreates its metadata file empty (implementation verified)

`MetadataFile.get_file_name()` creates a missing object. `LibraryDataset.to_dict` and `LDDA.to_dict` call it with no purge guard, so `GET /api/libraries/{id}/contents/{id}` writes a 0-byte file back after purge while the row stays `purged=true`. `--force-retry` then skips that row, so the stray file stays.

<details><summary>Evidence</summary>

`test_show_purged_library_item_does_not_recreate_metadata_file`, before the fix: the file was gone after the purge, then `{'deleted': True, 'purged': True, 'exists': True}` after the GET.

</details>

Suggested fix: skip `get_file_name()` for purged files in both `to_dict` methods, and for purged HDAs in `HDA.to_dict`, as `managers/datasets.py` already does. `HDA.to_dict` checks the HDA rather than the row, because with duplicate uuids the live dataset's metadata can resolve to another dataset's purged row. That branch needs `expose_dataset_path` and has no test.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 3: `full_delete()` re-deletes metadata files that are already purged (implementation verified)

The new query has no `purged` filter, although the pgcleanup CTE in this PR uses one. Files removed earlier get another object store call and flag write, which costs one round trip per file on remote stores.

Suggested fix: add `MetadataFile.purged.isnot(True)` to the query.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 4: Every job-cache hit runs the metadata query for nothing (implementation verified)

`HDA.copy_from` calls `full_delete()` on the replaced dataset, usually with no associations left. One `copy_from` went from 2 statements to 5 in the performance harness, and the early return on the review branch measures 4. Each statement is cheap, so this is a small saving.

Suggested fix: return before the `SELECT` when both association lists are empty. Keep the relationship-based lists. A `dataset_id` subquery would see the unflushed row under `autoflush=False` and purge the live output's files.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 5: `--force-retry` can't retry a library metadata file whose removal failed

pgcleanup commits `purged = true` before it touches the object store, and `remove_from_object_store` only logs a failure. The new `metadata_file.purged IS NOT TRUE` filter then excludes that row from every later run, so after a transient store error the file stays orphaned. Sibling actions drop their purged filter under `--force-retry`, so they do try again. The description's claim that the flag tells "already released" from "still to do" doesn't hold in this case. Rows skipped for user-defined object stores behave the same way, though no retry could reach those anyway.

Suggested fix: either apply the filter only without `--force-retry`, as the sibling actions do, or set `purged` only after a successful removal. The first gives up the no-op repeat runs the description calls out, so the branch doesn't change this; it's the author's call.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) via Opus 5.5 at low effort.

</details>

### P3 6: API tests reach into app internals (implementation verified)

`test_purge_purges_metadata_files` and `test_purge_library_item_purges_metadata_files` are the only tests in `lib/galaxy_test/api` that import `galaxy.model` or use `app.model.session`, so they skip against remote servers. `writing_tests.md` places that access in integration tests. The same fixture block was also copied three times.

Suggested fix: move them to `test/integration/test_metadata_file_purge.py`, which has no Postgres gate, and share one helper. The review branch does this with `test/integration/_metadata_files.py`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>
