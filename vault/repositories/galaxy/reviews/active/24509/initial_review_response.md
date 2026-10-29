

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Code-wise this is a two-way door (a new opt-in `pgcleanup.py` action nobody runs unless they ask for it), but running it is a one-way door for data: it irreversibly marks deleted library datasets purged, and chained with `delete_datasets`/`purge_datasets` it removes files from disk.

<details><summary>Risk Details</summary>

- `delete_library_datasets` sets `library_dataset.purged = true`; purged library datasets can no longer be undeleted, so any library-delete done more than `--days` ago becomes permanent on first run.
- On deployments with years of soft-deleted library datasets (e.g. the 2.7 TB in #19766), the first run will make a large backlog eligible for `delete_datasets` and then file removal at once.
- It sets `ldda.deleted = true` on every version of a target `LibraryDataset`; a dataset still shared by a live HDA or another live LDDA is protected only by `delete_datasets`' existing veto, not by this action.
- Retention keys on `library_dataset.update_time`, while `ldda.update_time` is intentionally left untouched so the chained run proceeds; any later code path that bumps `library_dataset.update_time` or relies on `ldda.update_time` changes when data becomes eligible.
- Adds a new action name to the admin CLI surface; renaming or changing its semantics later affects admins' cron jobs.

</details>

<details><summary>Risk Review Advice</summary>

Check that the semantics match the legacy `cleanup_datasets.py` `delete_datasets()` library half closely enough that admins migrating from it see no surprises, and that `delete_datasets` still vetoes datasets with any live HDA/LDDA after this action runs. The `update_time` interplay that allows chaining in one invocation is the subtle part and deserves a careful read.

Consider whether the PR or admin docs should warn that the first run on an old instance will make a large historical backlog permanently unrecoverable, and recommend a dry run first.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24509_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[`pr_24509_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24509_review_0) branches from the reviewed commit `7aa5ec64156` and adds tests for the PR's own claims. One test pins the unstamped `ldda.update_time` under a real retention window, another shows that a dataset shared with a history survives the chain, and a third checks the audit rows. Two small SQL fixes cover `--force-retry`: library datasets with a NULL `purged` now get purged, and the log reports only rows the run changed. A `LibraryPopulator.delete_library_dataset` helper replaces the duplicated delete calls. Every new or edited pgcleanup test ran individually against PostgreSQL 16 and passed. The two SQL fixes and the update-time pin were each confirmed red before the change and green after it.

- [`d3de4e3c7a0`](https://github.com/jmchilton/galaxy/commit/d3de4e3c7a0) Add LibraryPopulator.delete_library_dataset; use it in library tests: adds the populator method and replaces the two pgcleanup call sites and the private helper in `test_folder_contents.py`.
- [`2156802b9a5`](https://github.com/jmchilton/galaxy/commit/2156802b9a5) Test delete_library_datasets chain under a retention window: backdates the library dataset and its LDDA, runs the chain with `-o 1`, and asserts the dataset is deleted (not yet purged) and `ldda.update_time` is untouched. It goes red if the LDDA gets stamped.
- [`f94732633ca`](https://github.com/jmchilton/galaxy/commit/f94732633ca) Test library cleanup keeps a dataset still used by a history: imports the library dataset into a history, checks that the dataset survives the chain, then checks that it goes once the HDA is purged.
- [`3aa33d9fa40`](https://github.com/jmchilton/galaxy/commit/3aa33d9fa40) Assert delete_library_datasets writes its audit rows: one row each in `cleanup_event_library_dataset_association` and `cleanup_event_ldda_association`, under the same event.
- [`425d506d418`](https://github.com/jmchilton/galaxy/commit/425d506d418) Purge NULL-purged library datasets under --force-retry: changes `AND NOT ld.purged` to `ld.purged IS NOT TRUE`, with a red-to-green test.
- [`7c10754f4f9`](https://github.com/jmchilton/galaxy/commit/7c10754f4f9) Report only library datasets delete_library_datasets changed: filters the final select to rows that changed, with a log-file assertion in the force-retry test (red to green).

</details>

</details>

### P2 1: Nothing pins the "ldda.update_time is not stamped" design choice (implementation verified)

The PR's central detail is that `delete_library_datasets` leaves `ldda.update_time` alone so `delete_datasets` can act in the same run. Both tests only use `--older-than 0`. Each action commits separately, so `NOW()` moves forward between actions and `DeleteDatasets`' veto (`ldda.update_time >= NOW() - 0 days`) never fires even if the LDDA was just stamped. Adding `{update_time_sql}` to the LDDA `UPDATE` (a natural "consistency fix") would leave both tests green while breaking the chain for any real `-o N > 0`.

<details><summary>Evidence</summary>

With `{update_time_sql}` added to the LDDA `SET` clause, the new test fails with `{'dataset_deleted': False} != {'dataset_deleted': True}`; it passes on the PR's SQL.

</details>

Add a test that backdates `library_dataset.update_time` and `ldda.update_time` by two days, runs `-o 1 delete_library_datasets delete_datasets purge_datasets` in one invocation, and asserts the version and dataset are deleted (but not yet purged, since `delete_datasets` stamps `dataset.update_time`) and that `ldda.update_time` is unchanged.

Fixed on the review branch in [`2156802b9a5`](https://github.com/jmchilton/galaxy/commit/2156802b9a5).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P2 2: No test that a dataset still used by a history survives the chain (implementation verified)

This action is the first path that clears the LDDA half of `DeleteDatasets`' veto, so a library dataset that was imported into a history and then deleted from the library now relies only on the HDA half of the veto. That is the realistic data-loss case, and nothing asserts it.

<details><summary>Evidence</summary>

A new test imports the library dataset into a history (`POST histories/{id}/contents`, `source: library`), checks the HDA shares the LDDA's `dataset_id`, deletes the library dataset, and runs `-o 0 delete_library_datasets delete_datasets purge_datasets`. The library dataset is purged and its version deleted, while the dataset stays undeleted and the HDA unpurged. After purging the HDA, the same chain deletes and purges the dataset. It passes on the PR head, so the veto holds.

</details>

Add the test above.

Fixed on the review branch in [`f94732633ca`](https://github.com/jmchilton/galaxy/commit/f94732633ca).

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

Fixed on the review branch in [`425d506d418`](https://github.com/jmchilton/galaxy/commit/425d506d418).

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

Fixed on the review branch in [`7c10754f4f9`](https://github.com/jmchilton/galaxy/commit/7c10754f4f9).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 3: Audit rows untested (implementation verified)

This action is the first writer of `cleanup_event_library_dataset_association` and `cleanup_event_ldda_association`, but the tests never look at them.

Assert in `test_delete_library_datasets` that each table has exactly one row for the library dataset and its version, under the same cleanup event. The other untested claim, that expired versions are marked too, still has no test, because no test API creates a second LDDA version.

Fixed on the review branch in [`3aa33d9fa40`](https://github.com/jmchilton/galaxy/commit/3aa33d9fa40).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 4: Duplicated "delete library dataset" test code instead of a populator helper (implementation verified)

`self._delete(f"libraries/datasets/{id}")` followed by a status assertion now appears twice in this PR. `lib/galaxy_test/api/test_folder_contents.py` also has its own private `_delete_library_dataset` doing the same thing.

Add `LibraryPopulator.delete_library_dataset(library_dataset_id)` and use it at all of these call sites.

Fixed on the review branch in [`d3de4e3c7a0`](https://github.com/jmchilton/galaxy/commit/d3de4e3c7a0).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 5: The PR body's `--dry-run` "inspect first" recipe under-reports

`--dry-run` rolls back after each action (`Cleanup._update` → `_flush` → `rollback()`). In `--dry-run -o 0 delete_library_datasets delete_datasets purge_datasets`, the later actions never see the LDDA changes. So `delete_datasets` and `purge_datasets` report none of the library-only datasets that the real run will delete. The behaviour is pre-existing, but the PR suggests this exact command for the #19766 backlog, and admins will copy it.

Note in the PR body's Usage section, or in the action docstring, that a dry run only shows the `delete_library_datasets` step.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort.

</details>
