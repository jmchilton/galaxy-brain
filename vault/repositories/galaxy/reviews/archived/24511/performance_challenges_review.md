# Performance challenge review — PR #24511

Profile: [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: `46102a0d363`

Details and measurement plans: [performance_challenges_debrief.md](performance_challenges_debrief.md).

Overall the PR is a net performance win: per-HDA `quota_amount` walks of `dataset.history_associations` and per-HDA commits are replaced by indexed, chunked holder/library lookups and one usage UPDATE per quota source (login, history copy, history purge, storage cleaner). No P1s. Nothing below was measured on Postgres; P3 2 was measured on SQLite.

## P2 1: Cached map-over charges every element of the implicit collection once per job (O(N^2))

In the job-handler cache path (`jobs/__init__.py`, after `copy_from_job`), `job.history.charge_added_datasets(job.output_hdas())` runs per mapped job. By then `MappingJobs.record_success` (`tools/execute.py`) has linked every mapped job to the whole implicit output HDCA via `add_output_dataset_collection`, so `Job.output_hdas()` walks `dataset_collection_instance.dataset_instances` — all N elements — for each of N jobs. Each job loads N HDAs (+joined datasets) and runs `sole_dataset_sizes` over every already-finished element: N^2 rows and ~N^2/1000 holder/library queries for a cached map-over of N (10k elements: ~10^8 rows). This is the "iterating elements" pattern (#22361). (`tools/actions` call site runs before `record_success`, so it only sees the job's own outputs.)

Fix: charge only the job's own outputs — `job.output_datasets` HDAs (plus explicit, non-implicit output collections) — rather than `output_hdas()`, or skip `output_dataset_collection_instances` whose HDCA has `implicit_collection_jobs`.

Possible correctness side effect (not verified, for the bug reviewer): since every element is passed as `exclude`, elements of earlier cached jobs that were already charged look "sole" again and may be re-charged when the cached job's datasets belong to another user.

## P3 1: Job finish holds the `galaxy_user` row lock across tool post-processing

`_charge_outputs` flushes the user UPDATE (and, for labelled sources, `SELECT ... FOR UPDATE` on the user) before `exec_after_process`, `call_hook`, and `_fix_output_permissions` (chmod walk), committing only afterwards. In the base code the default-source change was written at commit (labelled sources already held the `user_quota_source_usage` row through this window); what's new is the `galaxy_user` row lock, which also blocks other finishing jobs of the user, purges, and recalculations. Magnitude unmeasured; usually ms.

Fix caution: simply moving `_charge_outputs` later breaks the invariant `fail()` relies on (`total_size is None` == not charged) if `exec_after_process` then fails — outputs would have sizes but no charge. Any reorder must move the `set_total_size()` loop together with the charge (checking nothing in between reads `total_size`), or accept the window.

## P3 2: History purge reload binds one parameter per HDA

`HistoryManager.purge` reloads with `HDA.id.in_(hda_ids)` over every non-purged HDA. Measured: stdlib SQLite 3.50.4 rejects 32767 bound params (`too many SQL variables`), so purging a >32k-dataset history fails on SQLite (Postgres/psycopg2 unaffected). Use `HDA.history_id == item.id` (indexed) and filter to the id set in Python, or `chunk_iterable` as `dataset_holders` does.

## P3 3: Building a collection from another user's datasets with `copy_elements` charges per element

Each `hda_manager.copy(..., flush=False)` in the element builder (`managers/collections.py`) runs `charge_added_datasets` -> 2 queries + 2 scans of the growing `session.new`: 2N queries and ~O(N^2) Python work for N elements. `DatasetCollectionManager.copy` in this PR already charges `new_hdca.dataset_instances` once; do the same here (opt-out flag on `HDAManager.copy`, charge the built collection once). Own datasets short-circuit, so only shared/published sources hit this. Not measured.
