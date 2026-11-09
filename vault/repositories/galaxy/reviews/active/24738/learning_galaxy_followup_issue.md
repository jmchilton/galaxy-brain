# Follow-up: research updates from #24738 review

## Stale documentation (conflicts with the current `dev` baseline)

`vault/research/Component - User Disk Usage Accounting.md` (verified at `65e6daff2334`) describes #24511 as open and not on `dev`. #24511 merged on 2026-11-05, and `dev` at `fc2a8be4887` has its code. Point by point:

1. **Intro and "Proposed by #24511 (open, `[25.1]`)":** the section is no longer a proposal. On `dev`, `sole_dataset_sizes`, `dataset_holders`, `_pending_disk_usage_delta` / `_has_pending_disk_usage_adjustment` (`model/__init__.py`) and `HDAManager.mark_purged` (`managers/hdas.py`) all exist. Fold it into the baseline and drop "None of them exist at this SHA".
2. **"Baseline: Incremental writes":** the default-source normal path now writes a pending SQL-expression delta (`func.coalesce(User.disk_usage, 0) + delta`), not a Python read-modify-write. The "Lost default-source updates" race should be rewritten or retired.
3. **"Recalculation":** "At this SHA both backends overwrite" is stale. Postgres now applies the difference against a snapshot subselect (`COALESCE(disk_usage, 0) + (<scan> - snapshot)`). SQLite still overwrites.
4. **"Who frees", `HistoryManager.purge` (dev, after #22180):** the non-Celery branch now calls `hda_manager.mark_purged` on all unpurged HDAs before removing files. The Celery branch still queues `purge_history_datasets`, which recalculates.
5. **"Who charges":** the copy, cache-hit, import and login rows now charge through `charge_added_datasets` / `_charge_outputs`, so the list of paths "that add datasets to a history without charging" is out of date.
6. **"Locking and known races":** the `_purge` double-commit and the lock-order items describe pre-#24511 behavior. Re-verify them against `dev`.

## Post-merge activities (if #24738 merges)

- **`Component - User Disk Usage Accounting`:**
  - Add a "Change notification" section. It covers `queue_user_quota_update` in `adjust_total_disk_usage` (persisted users only), `calculate_and_set_disk_usage` (queued before its internal commit) and `relabel_quota_for_dataset`.
  - Note that a write only announces itself if it goes through these primitives in an `app.model.session` session. Direct SQL and scripts announce nothing.
  - Record that `set_entity_quota_associations` now flushes instead of committing mid-update.
  - Widen the scope line, since admin quota CRUD and group membership now have side effects there.
- **Queued `Component - SSE Live Updates` note** (`vault/agents/gx_research/todo/sse_live_updates.md`): once it is written, make sure it covers the `user_quota_update` event, its payload, broadcast versus per-user routing, `UserQuotaUpdateBatcher`, and the shutdown ordering in `haltables`. Cross-link it with the disk usage note through `related_notes`.
- **`Component - Job Completion Lifecycle`:** where it covers `finish()`'s disk accounting, add one line saying the charge now also queues a `user_quota_update` that is sent after the job's commit.
