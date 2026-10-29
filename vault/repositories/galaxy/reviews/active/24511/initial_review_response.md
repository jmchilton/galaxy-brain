

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at low effort.
- Review profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/learning_galaxy.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) was run via Claude Opus 5.5 at medium effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile: gx_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: 46102a0d363

The main one-way risk is a quota policy change on a release branch. Copies of other users' datasets, cached-job outputs, and imported histories now count toward a user's quota as soon as they're added, so users on quota-enforcing servers may suddenly hit their limit after a point upgrade. Rolling the code back won't undo usage values already written.

<details><summary>Risk Details</summary>

- Policy change: users are now charged for copies of others' datasets (shared or published histories, workflow inputs, collection copies), cached-job outputs, and model store or archive imports. This matches what a recalculation already counted, but admins and users will see quota changes after a point upgrade.
- Job `finish()` and `fail()` now charge every user who holds an output, not just `job.user`. Failed jobs' partial outputs now count too. This is a new accounting rule that later code will build on.
- On Postgres, a recalculation now applies a delta (recalculated value minus the snapshot value) instead of overwriting the stored value. It is correct only if every adjustment uses the new atomic `coalesce(disk_usage,0)+delta` path. Any code that still assigns `disk_usage` directly, including plugins or downstream forks, could now drift without being corrected. SQLite keeps the overwrite, so the two backends now behave differently.
- `User.disk_usage` can now hold a pending SQL expression (`ClauseElement`) until the next flush. Code that reads `user.disk_usage` directly, rather than `get_disk_usage()`, can get an expression object instead of a number.
- Every non-default quota source adjustment now takes a new `SELECT ... FOR UPDATE` lock on the `galaxy_user` row, and job finish locks the holders' rows in id order. This adds lock contention on the user row for busy users and shared datasets.
- History purge now marks HDAs purged and adjusts usage synchronously in the request before the Celery tasks run. Purging a large history makes the request slower, and the purge ordering changes.
- The PR does not repair usage that is already wrong. Admins must run `scripts/set_user_disk_usage.py` or users must press Refresh. Usage written incorrectly by the old or new code stays in the database after any rollback.
- The PR is large (16 files, ~800 lines) for a `release_25.1` backport and touches job finish, purge, copy, import, and login paths together.

</details>

<details><summary>Risk Review Advice</summary>

Maintainers should confirm that charging recipients for copied, cached, and imported data is acceptable in a 25.1 point release rather than only on dev. If it is, it needs a release note telling quota-enforcing admins to recalculate usage. The PR body flags this behaviour change, but the release target is the real decision.

Technically, focus on the Postgres delta-style recalculation SQL and the new pending `disk_usage` expression in `User.adjust_total_disk_usage`. Look for any remaining direct reads or writes of `disk_usage`, and check the lock ordering (user row, then quota source rows; holders sorted by id) against job handlers running concurrently. `dataset_holders()` reads unflushed session state, so its correctness depends on the session not autoflushing. That assumption deserves a second look.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24511_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[`pr_24511_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24511_review_0) sits on the reviewed commit `46102a0d363`. It closes two charging gaps the review reproduced with red-to-green integration tests. Collection operation tools (filter, relabel, zip, ...) run on another user's public collection now charge the copies they make. A job-handler (late) cache hit in a map-over now charges only that job's own outputs. Before, it charged every element of the map-over's implicit collection, which overcharged cross-user and loaded N elements per job. The branch also reloads a purged history's HDAs by history id rather than one bound parameter per HDA, and drops a no-op `hda.purged` check in `HDAManager.copy`. The rest is test cleanup: a shared login helper, `DatasetPopulator.copy_dataset` and `recalculate_disk_usage`, and the second-copy dedupe check moved from an HDAManager unit test (now removed) into the integration test.

- [`cd9d403d57e`](https://github.com/jmchilton/galaxy/commit/cd9d403d57e) Charge collection operation outputs copied from another user's datasets: `ModelOperationToolAction.execute` charges `job.output_hdas()` after recording outputs; new `test_collection_operation_on_another_users_collection_is_counted` (red 0 != 50 on `46102a0d363`, green after).
- [`b3cc878cc1e`](https://github.com/jmchilton/galaxy/commit/b3cc878cc1e) Charge only a cached job's own outputs, not its map-over's collection: `Job.output_hdas()` skips output HDCAs with an `implicit_output_name`; new `test_late_cached_map_over_from_another_user_is_counted_once` (red 70 != 60, green after).
- [`9e317b82439`](https://github.com/jmchilton/galaxy/commit/9e317b82439) Reload the HDAs of a purged history by history id: `HistoryManager.purge` reloads with `HDA.history_id == item.id` and filters to the purged ids in Python.
- [`daeb462b467`](https://github.com/jmchilton/galaxy/commit/daeb462b467) Drop a no-op purged check before charging an HDA copy: `HDAManager.copy` charges when `hda.user is not history.user`.
- [`407841fc53d`](https://github.com/jmchilton/galaxy/commit/407841fc53d) Reuse a login helper in the anonymous history disk usage tests: `_log_in(session, email, password)` in `galaxy_test/base/api.py`, used by `_browser_session` and both anonymous-login tests.
- [`6484965e377`](https://github.com/jmchilton/galaxy/commit/6484965e377) Add DatasetPopulator.copy_dataset for the disk usage tests: replaces three inline `POST histories/{id}/contents` copies.
- [`8df1dbaed04`](https://github.com/jmchilton/galaxy/commit/8df1dbaed04) Check a second copy is charged once in the integration test: `test_copies_of_another_users_datasets_are_counted` copies the dataset twice; removes `test_copy_to_another_user_charges_them` from `test_HDAManager.py`.
- [`26ffc7a54a9`](https://github.com/jmchilton/galaxy/commit/26ffc7a54a9) Add DatasetPopulator.recalculate_disk_usage for the disk usage tests: used by the failed-job and copied-running-output test classes.

</details>

</details>

### P2 1: Collection operation outputs copied from another user's datasets aren't charged, but are refunded on purge (implementation verified)

Collection operation tools (`__FILTER_FAILED_DATASETS__`, relabel, zip, filter from file, ...) run in the request through `ModelOperationToolAction`. They copy their input HDAs into the user's history with `HDA.copy()` and `stage_addition()`, and no job `finish()` follows. When the input collection is another user's, for example a collection in a published history used directly as the tool input, the copies land in the user's history uncharged. A recalculation counts them, and purging them goes through `sole_dataset_sizes`, which finds no other HDA of the dataset for this user and refunds the size. That is the negative-usage drift this PR fixes on the sibling copy paths (`HDAManager.copy`, collection copy, history copy, workflow inputs, cached jobs, imports).

<details><summary>Evidence</summary>

New `test_collection_operation_on_another_users_collection_is_counted`: user A publishes a two-element list (20 + 30 bytes), and user B runs `__FILTER_FAILED_DATASETS__` on it in B's own history. On `46102a0d363` it fails `assert 0.0 == 50` on B's usage before any recalculation. With the fix, it passes, the recalculation agrees, and purging the two copies brings the usage back to 0.

</details>

Charge the job's outputs once in `ModelOperationToolAction.execute`, after `_record_outputs`: `history.charge_added_datasets(job.output_hdas())`. Copies of the user's own datasets cost one holder query and charge nothing. One call covers every model operation tool.

Fixed on the review branch in [`cd9d403d57e`](https://github.com/jmchilton/galaxy/commit/cd9d403d57e).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 2: A late-cached map-over charges every element of the implicit collection for each job, overcharging another user's outputs (implementation verified)

In the job handler's cache path (`jobs/__init__.py`, after `copy_from_job`), `job.history.charge_added_datasets(job.output_hdas())` runs for each mapped job. By then `MappingJobs.record_success` has linked every mapped job to the whole implicit output HDCA, so `Job.output_hdas()` returns all N elements for each of the N jobs. Each element is passed as `exclude`. When the cached outputs are another user's datasets, the elements of jobs already copied look "sole" again and are charged again. Element i is charged once by its own job and again by every job handled after it. The same walk loads N HDAs per job, which is O(N²) rows for a cached map-over.

<details><summary>Evidence</summary>

New `test_late_cached_map_over_from_another_user_is_counted_once`: A maps `cat` over a published list (10 + 20 bytes). B copies the list, renames the copied elements so the request-time cache search misses, and maps `cat` over it with `use_cached_job`. Both of B's jobs report `copied_from_job_id` among A's jobs, so the handler path ran. On `46102a0d363` B's usage is 70, not the expected 60 (inputs 30 + outputs 30): the first-copied 10-byte output was charged twice. With the fix it is 60, and a recalculation agrees.

</details>

Have `Job.output_hdas()` skip output HDCAs that carry an `implicit_output_name`. The job's own elements are still covered by `output_datasets`, and for collection outputs by `output_dataset_collections`. This fixes the overcharge and the O(N²) walk. It also keeps the helper safe for the request-time cache path and the model-operation path above.

Fixed on the review branch in [`b3cc878cc1e`](https://github.com/jmchilton/galaxy/commit/b3cc878cc1e).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 1: History purge reload binds one parameter per HDA

`HistoryManager.purge` reloads the HDAs that `mark_purged` expired with `HDA.id.in_(hda_ids)`, one bound parameter per non-purged HDA. SQLite (3.50.4 measured) rejects statements with 32767 or more bound parameters, so purging a history with more than about 32k datasets fails on SQLite. Postgres is unaffected.

Reload by `HDA.history_id == item.id` (indexed) and keep the purged ids in Python. The branch does this. The fix was not run against a large history. The reload itself exists only because `mark_purged` commits; letting the caller own the commit removes it, and the follow-up issue covers that.

Fixed on the review branch in [`9e317b82439`](https://github.com/jmchilton/galaxy/commit/9e317b82439).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Claude Opus 5.5 at medium effort and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at low effort.

</details>

### P3 2: `hda.purged or` clause in `HDAManager.copy` has no effect (implementation verified)

`if hda.purged or hda.user is not history.user: history.charge_added_datasets([copy])`. `HDA.copy()` sets `copy.purged = self.purged`, and `sole_dataset_sizes` drops purged HDAs and returns `{}` before querying, so the clause only adds a no-op call. Without it, the "a copy of the user's own dataset is free" comment tells the whole story.

Fixed on the review branch in [`daeb462b467`](https://github.com/jmchilton/galaxy/commit/daeb462b467).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 3: Test login flow duplicated instead of reusing `_browser_session`'s (implementation verified)

`test_anonymous_job_finishing_after_login_is_counted` and `test_anonymous_history_is_counted_once_per_dataset_at_login` each copy the CSRF scrape and `user/login` post from `_browser_session` in `lib/galaxy_test/base/api.py`. They can't use `_browser_session` itself, because they have to act anonymously before logging in. Extract `_log_in(session, email, password)` and use it in `_browser_session` and both tests.

Fixed on the review branch in [`407841fc53d`](https://github.com/jmchilton/galaxy/commit/407841fc53d).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 4: No populator helper for copying an HDA into a history (implementation verified)

`POST histories/{id}/contents {"source": "hda", ...}` plus a status assert is inlined three times in `test_recalculate_user_disk_usage.py`. `DatasetCollectionPopulator.copy_collection` already exists for collections. Add `DatasetPopulator.copy_dataset(history_id, hda_id)` next to `copy_history`.

Fixed on the review branch in [`6484965e377`](https://github.com/jmchilton/galaxy/commit/6484965e377).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 5: Recalculate-usage call inlined in two new test classes (implementation verified)

`TestFailedJobDiskUsageIntegration` and `TestCopiedRunningOutputDiskUsageIntegration` inline `_put("users/current/recalculate_disk_usage")` + `wait_on_task`, because they don't use the `RecalculateDiskUsage` mixin. Add `DatasetPopulator.recalculate_disk_usage()` and call it from both classes.

Fixed on the review branch in [`26ffc7a54a9`](https://github.com/jmchilton/galaxy/commit/26ffc7a54a9).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 6: `test_copy_to_another_user_charges_them` repeats the integration test (implementation verified)

The HDAManager unit test covers the same path as `test_copies_of_another_users_datasets_are_counted`. Its only extra check is that a second copy of the same dataset is charged once. Move that check into the integration test by copying the dataset twice and purging both copies, then remove the unit test.

Fixed on the review branch in [`8df1dbaed04`](https://github.com/jmchilton/galaxy/commit/8df1dbaed04).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 7: Two charging rules coexist, and charging is opt-in per call site

`User.sole_dataset_sizes()` / `dataset_holders()` is the new rule. `HDA.quota_amount()` / `purge_usage_from_quota()` still drive `History.add_dataset(quota=True)` (callers `HDAManager.create`, `materialize`, the workflow input copy in `workflow/modules.py`, `controllers/async.py`) and the legacy `controllers/history.py:purge_deleted_datasets`. The PR had to patch `quota_amount()` for `uncharged_states` to keep the two in step. `HDAStorageCleanerManager.cleanup` also re-implements `mark_purged`, and the `uncharged_states` filter is repeated in five places. Charging itself is a manual `charge_added_datasets()` call after each copy or import. P2 1 and P2 2 above are two more paths that call sites missed or got wrong.

These are structural changes, too large for a 25.1 bug fix. A follow-up issue for dev proposes them: one rule, charging at `add_pending_items()`, and the cleaner reusing `mark_purged`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at low effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Suggested Follow-Up Refactoring for dev</summary>

Here's draft text for a follow-up issue covering refactorings this review recommends that don't fit this PR or its target branch. When creating the issue, feel free to assign John (jmchilton).

```markdown
# Consolidate user disk usage accounting on one rule and one choke point

#24511 (25.1) fixed negative user disk usage. It added a set-based "sole holder" rule (`User.sole_dataset_sizes`, `dataset_holders`, `datasets_in_libraries`) and `History.charge_added_datasets`, and called that from each copy and import path. The old per-HDA rule (`HDA.quota_amount()`) stayed beside it, and charging remains a manual call at every site that adds HDAs. In review, two more paths turned up that the per-site calls missed or got wrong:

- Collection operation tools (`ModelOperationToolAction`) copied another user's datasets uncharged, then refunded them on purge.
- The job handler's cache path charged a map-over's whole implicit collection for each job.

Plan (dev):

1. Delete `HDA.quota_amount()` and `purge_usage_from_quota()`. Port the remaining callers (`History.add_dataset(quota=True)` from `HDAManager.create`, `materialize`, the `workflow/modules.py` input copy and `controllers/async.py`, plus `controllers/history.py:purge_deleted_datasets`) to `sole_dataset_sizes` and `HDAManager.mark_purged`. Drop the unused `quota` branch of `History.add_datasets`.
2. Charge at the choke point. `History.add_pending_items()` (or `stage_addition`) charges every staged HDA in one `sole_dataset_sizes` call. Drop the per-site `charge_added_datasets` calls (`hdas.py`, `collections.py`, `run_request.py`, `tools/actions`, `model_operations.py`, `jobs/__init__.py`, `model_stores.py`, `imp_exp`, `webapp.py`, `History.copy`) and the `quota=` flag on `add_dataset`. Audit the remaining `stage_addition` callers: the `controllers/dataset.py` copy, `dereference.py`, and the job cache paths.
3. Have `HDAStorageCleanerManager.cleanup` reuse `mark_purged`. First settle one difference: `mark_purged` skips outputs of unfinished jobs and leaves them to `purge()`, while the cleaner marks them purged. Have `mark_purged` return the freed sizes and let the caller own the commit, which removes the HDA reload in `HistoryManager.purge`.
4. Replace the `Dataset.uncharged_states` membership checks (five sites) with a `Dataset.is_charged` property.
5. Replace `User._pending_disk_usage_delta` and the `ClauseElement` sniffing on `disk_usage` with an explicit `UPDATE ... SET disk_usage = coalesce(disk_usage, 0) + :d` for persisted users.

Tests: keep the `test_recalculate_user_disk_usage.py` scenarios, which compare incremental usage with recalculated usage. Add one per previously uncharged `stage_addition` path.
```

</details>
