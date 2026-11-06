### P2 1: Collection operation outputs copied from another user's datasets aren't charged, but are refunded on purge (implementation verified)

Collection operation tools (`__FILTER_FAILED_DATASETS__`, relabel, zip, filter from file, ...) run in the request through `ModelOperationToolAction`. They copy their input HDAs into the user's history with `HDA.copy()` and `stage_addition()`, and no job `finish()` follows. When the input collection is another user's, for example a collection in a published history used directly as the tool input, the copies land in the user's history uncharged. A recalculation counts them, and purging them goes through `sole_dataset_sizes`, which finds no other HDA of the dataset for this user and refunds the size. That is the negative-usage drift this PR fixes on the sibling copy paths (`HDAManager.copy`, collection copy, history copy, workflow inputs, cached jobs, imports).

<details><summary>Evidence</summary>

New `test_collection_operation_on_another_users_collection_is_counted`: user A publishes a two-element list (20 + 30 bytes), and user B runs `__FILTER_FAILED_DATASETS__` on it in B's own history. On `46102a0d363` it fails `assert 0.0 == 50` on B's usage before any recalculation. With the fix, it passes, the recalculation agrees, and purging the two copies brings the usage back to 0.

</details>

Charge the job's outputs once in `ModelOperationToolAction.execute`, after `_record_outputs`: `history.charge_added_datasets(job.output_hdas())`. Copies of the user's own datasets cost one holder query and charge nothing. One call covers every model operation tool.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 2: A late-cached map-over charges every element of the implicit collection for each job, overcharging another user's outputs (implementation verified)

In the job handler's cache path (`jobs/__init__.py`, after `copy_from_job`), `job.history.charge_added_datasets(job.output_hdas())` runs for each mapped job. By then `MappingJobs.record_success` has linked every mapped job to the whole implicit output HDCA, so `Job.output_hdas()` returns all N elements for each of the N jobs. Each element is passed as `exclude`. When the cached outputs are another user's datasets, the elements of jobs already copied look "sole" again and are charged again. Element i is charged once by its own job and again by every job handled after it. The same walk loads N HDAs per job, which is O(N²) rows for a cached map-over.

<details><summary>Evidence</summary>

New `test_late_cached_map_over_from_another_user_is_counted_once`: A maps `cat` over a published list (10 + 20 bytes). B copies the list, renames the copied elements so the request-time cache search misses, and maps `cat` over it with `use_cached_job`. Both of B's jobs report `copied_from_job_id` among A's jobs, so the handler path ran. On `46102a0d363` B's usage is 70, not the expected 60 (inputs 30 + outputs 30): the first-copied 10-byte output was charged twice. With the fix it is 60, and a recalculation agrees.

</details>

Have `Job.output_hdas()` skip output HDCAs that carry an `implicit_output_name`. The job's own elements are still covered by `output_datasets`, and for collection outputs by `output_dataset_collections`. This fixes the overcharge and the O(N²) walk. It also keeps the helper safe for the request-time cache path and the model-operation path above.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 1: History purge reload binds one parameter per HDA

`HistoryManager.purge` reloads the HDAs that `mark_purged` expired with `HDA.id.in_(hda_ids)`, one bound parameter per non-purged HDA. SQLite (3.50.4 measured) rejects statements with 32767 or more bound parameters, so purging a history with more than about 32k datasets fails on SQLite. Postgres is unaffected.

Reload by `HDA.history_id == item.id` (indexed) and keep the purged ids in Python. The branch does this. The fix was not run against a large history. The reload itself exists only because `mark_purged` commits; letting the caller own the commit removes it, and the follow-up issue covers that.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Claude Opus 5.5 at medium effort and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at low effort.

</details>

### P3 2: `hda.purged or` clause in `HDAManager.copy` has no effect (implementation verified)

`if hda.purged or hda.user is not history.user: history.charge_added_datasets([copy])`. `HDA.copy()` sets `copy.purged = self.purged`, and `sole_dataset_sizes` drops purged HDAs and returns `{}` before querying, so the clause only adds a no-op call. Without it, the "a copy of the user's own dataset is free" comment tells the whole story.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 3: Test login flow duplicated instead of reusing `_browser_session`'s (implementation verified)

`test_anonymous_job_finishing_after_login_is_counted` and `test_anonymous_history_is_counted_once_per_dataset_at_login` each copy the CSRF scrape and `user/login` post from `_browser_session` in `lib/galaxy_test/base/api.py`. They can't use `_browser_session` itself, because they have to act anonymously before logging in. Extract `_log_in(session, email, password)` and use it in `_browser_session` and both tests.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 4: No populator helper for copying an HDA into a history (implementation verified)

`POST histories/{id}/contents {"source": "hda", ...}` plus a status assert is inlined three times in `test_recalculate_user_disk_usage.py`. `DatasetCollectionPopulator.copy_collection` already exists for collections. Add `DatasetPopulator.copy_dataset(history_id, hda_id)` next to `copy_history`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 5: Recalculate-usage call inlined in two new test classes (implementation verified)

`TestFailedJobDiskUsageIntegration` and `TestCopiedRunningOutputDiskUsageIntegration` inline `_put("users/current/recalculate_disk_usage")` + `wait_on_task`, because they don't use the `RecalculateDiskUsage` mixin. Add `DatasetPopulator.recalculate_disk_usage()` and call it from both classes.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 6: `test_copy_to_another_user_charges_them` repeats the integration test (implementation verified)

The HDAManager unit test covers the same path as `test_copies_of_another_users_datasets_are_counted`. Its only extra check is that a second copy of the same dataset is charged once. Move that check into the integration test by copying the dataset twice and purging both copies, then remove the unit test.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 7: Two charging rules coexist, and charging is opt-in per call site

`User.sole_dataset_sizes()` / `dataset_holders()` is the new rule. `HDA.quota_amount()` / `purge_usage_from_quota()` still drive `History.add_dataset(quota=True)` (callers `HDAManager.create`, `materialize`, the workflow input copy in `workflow/modules.py`, `controllers/async.py`) and the legacy `controllers/history.py:purge_deleted_datasets`. The PR had to patch `quota_amount()` for `uncharged_states` to keep the two in step. `HDAStorageCleanerManager.cleanup` also re-implements `mark_purged`, and the `uncharged_states` filter is repeated in five places. Charging itself is a manual `charge_added_datasets()` call after each copy or import. P2 1 and P2 2 above are two more paths that call sites missed or got wrong.

These are structural changes, too large for a 25.1 bug fix. A follow-up issue for dev proposes them: one rule, charging at `add_pending_items()`, and the cleaner reusing `mark_purged`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at low effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort.

</details>
