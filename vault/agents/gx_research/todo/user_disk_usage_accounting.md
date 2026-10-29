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
