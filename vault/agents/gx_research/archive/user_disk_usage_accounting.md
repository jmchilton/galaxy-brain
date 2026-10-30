# Component - User Disk Usage Accounting

Cover how Galaxy tracks per-user disk usage and quota-source usage. Include:

- Storage: `galaxy_user.disk_usage` and `user_quota_source_usage`.
- Incremental adjustments: `User.adjust_total_disk_usage`, `adjust_disk_usage_for_datasets`, and pending SQL-expression writes.
- The charging rule: `sole_dataset_sizes`, `dataset_holders`, `datasets_in_libraries`, and `Dataset.uncharged_states`.
- Who charges: job `finish()`/`fail()`, `History.charge_added_datasets` for copies, cached jobs, imports, and anonymous-history login, and legacy `add_dataset(quota=True)`/`quota_amount()`.
- Who frees: `HDAManager.mark_purged`/`purge`, `HistoryManager.purge`, and the Storage Dashboard cleaners.
- Recalculation SQL: `calculate_user_disk_usage_statements` with its Postgres difference-apply versus SQLite overwrite, the celery task, and `scripts/set_user_disk_usage.py`.
- Lock ordering and known races.
- How quota sources and BYOS exemption plug in. Link `Component - Private Object Stores` rather than repeating it.

Leave out quota *enforcement* UI and admin quota CRUD beyond a pointer. If #24511 has not merged, describe the `release_25.1` baseline and label its changes separately; refresh against the merged implementation (and its forward-merge into dev, where `HistoryManager.purge` differs per #22180) afterward.

## Why

#24511 reshapes who is charged for a dataset and how usage writes interact with recalculation, and no note covers disk usage accounting. The only nearby coverage is the BYOS quota section of `Component - Private Object Stores`.

## Requested by

- vault/repositories/galaxy/reviews/active/24511/: charging rule, purge two-phase, recalc concurrency for the negative-usage fix

## Debrief

- Created `vault/research/Component - User Disk Usage Accounting.md`, verified against Galaxy `origin/dev` @ `65e6daff2334c8cfd4971682eecfb87f38a224be`. #24511 is still open on `release_25.1` (head `46102a0d363`), so per this request the note describes the baseline and puts the PR's changes in a separate "Proposed by #24511" section, read from the PR diff. The baseline is `dev`, which matches `release_25.1` for accounting except `HistoryManager.purge` (#22180's batch `purge_history_datasets` task recalculates instead of subtracting). Both versions are described.
- Most named symbols (`sole_dataset_sizes`, `dataset_holders`, `datasets_in_libraries`, `adjust_disk_usage_for_datasets`, `charge_added_datasets`, `uncharged_states`, `mark_purged`, pending SQL-expression writes, Postgres difference-apply) exist only in #24511. The note says so up front.
- Added backlinks in Job Completion Lifecycle (its "queued note" pointer now links here), Private Object Stores (quota section pointer) and Jobs API and Job Cache. Disk charging inside `finish()` is linked, not repeated.
- Research issues: created `research_issues/history-cleaner-reports-zero-freed-bytes.md`, `research_issues/cleanup-datasets-adjust-usage-missing-label.md` and `research_issues/set-user-disk-usage-script-global-user.md`. Linked the existing `finish-purged-output-resets-collected-bytes.md` back to the note.
- Refresh needed: once #24511 merges and is forward-merged to `dev`, rewrite the baseline sections against the merged code, including how `mark_purged` fits #22180's batch task.
- Out of scope: quota enforcement and UI, admin quota CRUD, and storage-move internals beyond the `relabel_quota_for_dataset` hook.
