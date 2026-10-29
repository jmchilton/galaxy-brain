# Follow-up: consolidate user disk-usage accounting on one rule and one choke point

Context: #24511 (25.1) fixed negative usage by adding a set-based "sole holder" rule (`User.sole_dataset_sizes`, `dataset_holders`, `datasets_in_libraries`) and `History.charge_added_datasets`, called from each copy/import path.

Plan (dev):
1. Delete `HDA.quota_amount()` / `purge_usage_from_quota()`; port remaining callers (`History.add_dataset(quota=True)`, `controllers/history.py:purge_deleted_datasets`) to `sole_dataset_sizes` / `HDAManager.mark_purged`.
2. Charge at the choke point: have `History.add_pending_items()` (or `stage_addition`) charge all staged HDAs in one `sole_dataset_sizes` call; drop the per-site `charge_added_datasets` calls and the `quota=` flag on `add_dataset`. Audit remaining `stage_addition` callers (dataset controller copy, dereference, collection copy) are covered.
3. `HDAStorageCleanerManager.cleanup` reuses `mark_purged`; `mark_purged` returns freed sizes and lets the caller own the commit (removes the reload in `HistoryManager.purge`).
4. Replace `Dataset.uncharged_states` membership checks with a `Dataset.is_charged` property.
5. Replace `User._pending_disk_usage_delta` / ClauseElement sniffing with explicit `UPDATE ... SET disk_usage = coalesce(disk_usage,0)+:d` for persisted users.
Tests: existing `test_recalculate_user_disk_usage.py` scenarios plus one per previously uncharged `stage_addition` path asserting usage == recalculated usage.
