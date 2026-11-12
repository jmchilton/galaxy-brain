# Performance review — PR #24835

- Profile: gx_performance_challenger (`_shared/reviewers/gx_performance_challenger.md`)
- Model: Claude Opus 5.5
- Effort: low (as run)
- Reviewed commit: `f207f12dd5e528573a50cabca345d31fac34f76e`
- Details and measurements: [performance_challenges_debrief.md](performance_challenges_debrief.md)

All new cost sits behind `ActionBox.has_after_commit_actions`, so only jobs with an `EmailAction` pay it. Net effect on SMTP is positive: a map-over of N jobs now sends about 1 email instead of N. The numbers below come from a synthetic Postgres 16 DB (2.1M jobs, map-overs of 10k and 100k). The production plan was not measured.

## P2 1 — Per-job ICJ-wide settled check can flip to a job-table scan; quadratic over a map-over

Every mapped-over job with an email PJA runs `ImplicitCollectionJobs.has_job_not_in_states` after its settling commit (`lib/galaxy/model/__init__.py`, called from `EmailAction._map_over_completed`).

- For a 10k-job ICJ the planner walks the icjja index into the job pkey, at about 11 ms per check.
- For a 100k-job ICJ it switches to a **Seq Scan on `job`**: the whole job table, filtered by `state NOT IN (...)`, then probes icjja. That took 200–470 ms per check on a 2.1M-job table, and it grows with the server's job table, not the map-over.
- `job_state_counts` gets the same hash join over a full `job` seq scan, but it runs only about once per map-over.
- Even with the good plan, each check scans the settled prefix, so total work over a map-over is O(N²).

Suggested fix: pin the plan to the ICJ side, for example `Job.id == any_(array(select(icjja.job_id).where(icjja.implicit_collection_jobs_id == self.id).scalar_subquery()))`, combined with the state filter. On the same data that ran in about 105 ms at 100k and about 1.4 ms at 10k, independent of job-table size. Optionally, move the settled check and send into one deduplicated celery task per ICJ. That removes the per-job scan and the duplicate-email race the PR documents. Please confirm with `EXPLAIN (ANALYZE, BUFFERS)` on a production-sized replica.

## P3 1 — Handler reloads every settled job's PJAs after commit before deduping by ICJ

In `JobHandlerQueue.__monitor_step`, `ActionBox.execute_after_commit(settled_jobs)` runs after `sa_session.commit()` has expired everything. It then reloads each job, its `post_job_actions`, each `post_job_action` and its `implicit_collection_jobs_association`, all before skipping duplicates by `implicit_collection_jobs_id`.

When a whole map-over pauses in one pass (`__filter_jobs_with_invalid_input_states`), that's about 3–4 lazy loads per job inside the handler loop for a single email. Suggested fix: record `(job_id, icj_id)` before the commit, dedupe by ICJ, then load only one job per ICJ. Optional; the cost is only paid with an email PJA.

## P3 2 — `job_state_counts` duplicates `summarize_jobs_to_dict`'s ICJ query

`ImplicitCollectionJobs.job_state_counts` is the same `select(Job.state, func.count())` join and `GROUP BY` as the ICJ branch of `lib/galaxy/managers/jobs.py::summarize_jobs_to_dict`. Have the manager call the new model method so there is one statement to tune (see P2 1).
