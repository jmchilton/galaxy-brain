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
