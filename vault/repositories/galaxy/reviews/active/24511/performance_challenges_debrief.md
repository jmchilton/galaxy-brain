# Performance challenge debrief — PR #24511

Profile: gx_performance_challenger · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: `46102a0d363`

Scope: every new query/lock the disk-usage accounting adds to hot paths (job finish/fail, HDA copy, history copy/purge, login, imports, storage cleaner) against the N.O.T. M.A.R.I.U.S. patterns. No Galaxy/Postgres instance was spun up; points are code-reading unless marked measured.

## Net assessment

Mostly a performance improvement. Old paths that called `hda.quota_amount(user)` per HDA walked `dataset.history_associations` (one HDA + history load per copy of the dataset — huge for popular/shared datasets) and committed per HDA. The PR replaces those with `dataset_holders()` / `datasets_in_libraries()`: one indexed query per 1000 datasets (`hda.dataset_id`, `ldda.dataset_id`, `history.user_id` are indexed), and one usage UPDATE per quota source.

- Login with anonymous history: N x `quota_amount` -> 2 chunked queries. Better.
- History copy (`applies_to_quota`): per-HDA `add_dataset(quota=True)` -> one batched charge. Better.
- History purge: per-HDA quota lookup + commit-induced per-HDA refresh -> one select + one batch adjust + one reload. Better (but see P3 1).
- Storage cleaner HDAs: per-item `get_owned` -> one select with `selectinload`. Better.
- Job finish: +1 small query (`dataset_holders` on brand-new outputs). Negligible, but lock scope changed (P3 2).
- Postgres recalculation: adds one scalar PK subquery per statement. Negligible.
- Default-source adjustment is now `coalesce(disk_usage,0)+delta` in SQL; multiple adjustments before flush collapse into one UPDATE. Good.

## Challenges

### 0. Cached map-over: each mapped job charges the whole implicit collection (O(N^2)) — review P2 1

Job-handler cache path (`jobs/__init__.py` after `copy_from_job`) calls `job.history.charge_added_datasets(job.output_hdas())`. `MappingJobs.record_success` (`tools/execute.py`) links every mapped job to the whole implicit HDCA via `add_output_dataset_collection`, so `output_hdas()` returns all N elements per job (`HDA.dataset` is `lazy="joined"`, so one N-row load, plus `sole_dataset_sizes` holder/library chunks over the finished elements). N jobs -> N^2 rows. The `tools/actions` call site runs before `record_success` and is unaffected. Fix: charge only the job's own outputs (`output_datasets`, explicit non-implicit collections). Side note for bug review (unverified): all elements are passed as `exclude`, so earlier jobs' already-charged elements may be re-charged when the cached datasets belong to another user.

Measurement plan: cached map-over of a 1000-element list on Postgres; count statements/rows per handler job with a `before_cursor_execute` listener; compare with charging only `job.output_datasets`.

### 1. History purge reload uses an unbounded `IN` of every HDA id (measured: SQLite limit)

`HistoryManager.purge` re-selects with `HDA.id.in_(hda_ids)` where `hda_ids` is every non-purged HDA in the history. SQLAlchemy expands that into one bound parameter per id. Local SQLite 3.50.4 (stdlib `sqlite3`) rejects 32767 parameters with `too many SQL variables` (32766 ok). Postgres via psycopg2 interpolates client-side so is unaffected, but a >32k-dataset history on SQLite cannot be purged, and the code sidesteps the `chunk_iterable` pattern the PR itself uses in `dataset_holders`. The reload is also unnecessary as an id list: `HDA.history_id == item.id` (indexed) plus a Python filter to the `hda_ids` set gives the same rows with one parameter.

Measurement: `IN (?*32767)` on stdlib sqlite3 -> `too many SQL variables`.

### 2. Job finish now holds the user row lock across `exec_after_process` and `_fix_output_permissions`

Before: the default-source usage change was a Python attribute written at the final `commit()`, so the `galaxy_user` row lock was held only for the commit (labelled sources already ran an immediate upsert, holding the `user_quota_source_usage` row through the same window; the new part is the `galaxy_user` lock). Now `_charge_outputs` does `flush([user])` (deliberately, for id-ordered locking) and, for labelled sources, `SELECT ... FOR UPDATE` on the user row — then `finish()` runs `tool.exec_after_process`, `call_hook`, and `_fix_output_permissions` (a filesystem walk with chmod over outputs) before committing. Every other job of the same user finishing on another handler, every purge, and the recalculation UPDATE wait on that row for that window. With large map-over workflows (thousands of jobs of one user finishing across handlers) this serializes finish on the slowest post-processing. Speculative magnitude — usually ms, but `_fix_output_permissions` on large extra-files outputs or slow shared FS can be seconds.

Caution (review P3 1): moving `_charge_outputs` alone later breaks `fail()`'s invariant (`total_size is None` == uncharged) if `exec_after_process` fails afterwards. Any reorder must move the `set_total_size()` loop with it, after checking nothing in between reads `total_size`; otherwise accept the window.

Measurement plan: Postgres, one user, a collection map-over of ~500 jobs across 2+ handlers; log `pg_locks` waits on `galaxy_user` (or `log_lock_waits=on`, `deadlock_timeout=100ms`) and compare total finish wall time before/after moving the call.

### 3. Collection build with `copy_elements` charges each copied element separately (O(N^2) `session.new` scans)

`DatasetCollectionManager` element building calls `hda_manager.copy(..., flush=False)` per element; for another user's HDA (shared/published history), each copy runs `charge_added_datasets` -> `sole_dataset_sizes` -> `dataset_holders` + `datasets_in_libraries`: 2 queries and 2 full scans of `session.new`, which grows by every pending HDA/DCE/tag in the same unflushed transaction. For N elements that's 2N queries and ~O(N^2) Python iteration. `DatasetCollectionManager.copy` in this same PR already does the right thing (one `charge_added_datasets(new_hdca.dataset_instances)`). Own-dataset copies short-circuit (`hda.user is not history.user`), so this only hits building collections from others' datasets. Speculative magnitude; not measured.

Recommendation: let `HDAManager.copy` take a `charge=False`-style opt-out (or have the element builder skip it) and charge the built collection's `dataset_instances` once, mirroring `DatasetCollectionManager.copy`.

Measurement plan: unit/integration test creating a list from 2000 HDAs of another user's published history with `copy_elements=True`; count statements with a SQLAlchemy `before_cursor_execute` listener and time it, before/after batching.

## Non-findings checked

- `dataset_holders` per-chunk query: filters `HDA.dataset_id IN (...)` then joins history; selective from the requested side, no fan-out from popular datasets beyond the actual copies (needed for correctness).
- `session.new` scans in history copy/purge are single passes per batch — fine.
- History purge still flushes/commits per HDA in the file-removal loop; pre-existing behavior, unchanged by the PR.
- Storage cleaner `HDA.id.in_(item_ids)` is bounded by the request payload; same SQLite caveat in theory, not realistic.
- `set_total_size()` fallback for datasets lacking `total_size` may touch the object store inside the transaction; the old `quota_amount` -> `get_total_size` path did the same.
