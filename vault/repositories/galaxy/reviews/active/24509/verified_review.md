### P2 1: Nothing pins the "ldda.update_time is not stamped" design choice (implementation verified)

The PR's central detail is that `delete_library_datasets` leaves `ldda.update_time` alone so `delete_datasets` can act in the same run. Both tests only use `--older-than 0`. Each action commits separately, so `NOW()` moves forward between actions and `DeleteDatasets`' veto (`ldda.update_time >= NOW() - 0 days`) never fires even if the LDDA was just stamped. Adding `{update_time_sql}` to the LDDA `UPDATE` (a natural "consistency fix") would leave both tests green while breaking the chain for any real `-o N > 0`.

<details><summary>Evidence</summary>

With `{update_time_sql}` added to the LDDA `SET` clause, the new test fails with `{'dataset_deleted': False} != {'dataset_deleted': True}`; it passes on the PR's SQL.

</details>

Add a test that backdates `library_dataset.update_time` and `ldda.update_time` by two days, runs `-o 1 delete_library_datasets delete_datasets purge_datasets` in one invocation, and asserts the version and dataset are deleted (but not yet purged, since `delete_datasets` stamps `dataset.update_time`) and that `ldda.update_time` is unchanged.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P2 2: No test that a dataset still used by a history survives the chain (implementation verified)

This action is the first path that clears the LDDA half of `DeleteDatasets`' veto, so a library dataset that was imported into a history and then deleted from the library now relies only on the HDA half of the veto. That is the realistic data-loss case, and nothing asserts it.

<details><summary>Evidence</summary>

A new test imports the library dataset into a history (`POST histories/{id}/contents`, `source: library`), checks the HDA shares the LDDA's `dataset_id`, deletes the library dataset, and runs `-o 0 delete_library_datasets delete_datasets purge_datasets`. The library dataset is purged and its version deleted, while the dataset stays undeleted and the HDA unpurged. After purging the HDA, the same chain deletes and purges the dataset. It passes on the PR head, so the veto holds.

</details>

Add the test above.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 1: `--force-retry` leaves `library_dataset.purged IS NULL` rows unpurged (implementation verified)

`library_dataset.purged` is nullable. With `--force-retry`, `target_lds` selects deleted rows whose `purged` is NULL, and their LDDAs are marked deleted. But `purged_lds` filters on `AND NOT ld.purged`, which is NULL for those rows, so the library dataset is never marked purged. That contradicts the PR's table. The LDDA side already uses `IS NOT TRUE`.

<details><summary>Evidence</summary>

A test that sets `ld.purged = None` on a deleted library dataset and runs `--force-retry delete_library_datasets` fails on the PR (`library_dataset_purged` stays False) and passes with the fix.

</details>

```diff
-                          AND NOT ld.purged
+                          AND ld.purged IS NOT TRUE
```

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: Under `--force-retry`, the log reports library datasets the run didn't change (implementation verified)

The final `SELECT` returns every `target_lds` row through `LEFT OUTER JOIN`s, whether or not either `UPDATE` touched it. Under `--force-retry`, `target_lds` includes every deleted library dataset past the cutoff, including ones purged and reconciled on earlier runs. `Action._log_results` logs `library_dataset_id: X` for each of them. Sibling actions re-update the rows they report; here the reported set and the changed set diverge. On a synthetic 2M-row database, about a third of the 97k library datasets reported by a first force-retry run were untouched, and a repeat run reported all of them.

<details><summary>Evidence</summary>

A second `--force-retry` run in `test_delete_library_datasets_force_retry` (with `--log-dir` pointed at a temp dir) still logged `library_dataset_id: 1` on the PR; with the filter it logs nothing.

</details>

Filter the final select to rows that changed. A default run is unaffected, since every target is purged there. Apply this with P3 1: on its own, the filter would hide NULL-purged rows that are still left unpurged.

```sql
             LEFT OUTER JOIN purged_lds ON t.id = purged_lds.id
       WHERE deleted_ldda_ids.id IS NOT NULL OR purged_lds.id IS NOT NULL
    ORDER BY t.id
```

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 3: Audit rows untested (implementation verified)

This action is the first writer of `cleanup_event_library_dataset_association` and `cleanup_event_ldda_association`, but the tests never look at them.

Assert in `test_delete_library_datasets` that each table has exactly one row for the library dataset and its version, under the same cleanup event. The other untested claim, that expired versions are marked too, still has no test, because no test API creates a second LDDA version.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 4: Duplicated "delete library dataset" test code instead of a populator helper (implementation verified)

`self._delete(f"libraries/datasets/{id}")` followed by a status assertion now appears twice in this PR. `lib/galaxy_test/api/test_folder_contents.py` also has its own private `_delete_library_dataset` doing the same thing.

Add `LibraryPopulator.delete_library_dataset(library_dataset_id)` and use it at all of these call sites.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 5: The PR body's `--dry-run` "inspect first" recipe under-reports

`--dry-run` rolls back after each action (`Cleanup._update` → `_flush` → `rollback()`). In `--dry-run -o 0 delete_library_datasets delete_datasets purge_datasets`, the later actions never see the LDDA changes. So `delete_datasets` and `purge_datasets` report none of the library-only datasets that the real run will delete. The behaviour is pre-existing, but the PR suggests this exact command for the #19766 backlog, and admins will copy it.

Note in the PR body's Usage section, or in the action docstring, that a dry run only shows the `delete_library_datasets` step.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort.

</details>
