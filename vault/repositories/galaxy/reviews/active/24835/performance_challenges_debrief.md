# Performance challenge debrief — PR #24835

Reviewed commit: `f207f12dd5e528573a50cabca345d31fac34f76e` (diff vs `origin/release_26.0`).
Profile: gx_performance_challenger. Model: Claude Opus 5.5. Effort: low (as run).

## Scope

New per-job work only happens for jobs carrying an `EmailAction` PJA (`ActionBox.has_after_commit_actions` gates everything), so the blast radius is opt-in. Within that, the new costs are:

1. `ImplicitCollectionJobs.has_job_not_in_states` — an ICJ-wide `EXISTS` run after every mapped-over job with an email PJA settles (finish, fail, cached copy, pause).
2. `ImplicitCollectionJobs.job_state_counts` — one grouped count when the map-over looks settled (about once per map-over).
3. Handler monitor loop: `execute_after_commit` after the pass commit, reloading expired jobs/PJAs.

Net positive: a map-over of N jobs used to call `send_mail` N times (SMTP round trips in runner threads, and in the handler loop for cached copies). It now sends about one. That's a real win on SMTP and thread time.

## Measurement (synthetic Postgres 16, data-based)

Throwaway `postgres:16` container. Tables mirror `job` (pk, `state` indexed, 200-byte pad) and `implicit_collection_jobs_job_association` (indexes on `implicit_collection_jobs_id` and `job_id`, as in the model). 2.11M jobs, 40k of them non-settled background jobs (running/queued). Map-overs: ICJ 1 = 10k jobs, ICJ 2 = 100k jobs, plus 100k small ICJs. Query is the SQL `has_job_not_in_states` emits.

| case | ICJ size | plan | time |
|---|---|---|---|
| all settled (final check) | 10k | nested loop: icjja index → job pkey | ~11 ms |
| last-ordered job unsettled | 10k | same, scans almost all rows | ~11 ms |
| all settled | 100k | **Seq Scan on job** (2.1M rows) filtered by `state NOT IN`, probe icjja | 200–470 ms |
| last-ordered unsettled | 100k | Seq Scan on job | ~210 ms |
| `enable_seqscan=off` | 100k | job pkey full index scan → icjja | ~370–395 ms |
| `job_state_counts` | 100k | hash join, **Seq Scan on job** | ~370–460 ms |
| rewrite: `job.id = ANY(ARRAY(SELECT job_id FROM icjja WHERE icj_id=…))` | 100k | icjja index → job pkey | ~105 ms |
| same rewrite | 10k | same | ~1.4 ms |

Findings from the data:

- Once the ICJ row estimate is large, the planner drives from `job` and filters non-settled states over the whole job table. That cost grows with the size of the server's job table, not the map-over. On a server with tens of millions of jobs it would be a multi-second scan per finishing job. That's speculative for production: the crossover point and plan there are unmeasured.
- Even with the good plan, each check is O(N) when jobs settle roughly in order (the settled prefix is scanned before an unsettled row is found). Over a map-over that's O(N²) row visits. 10k jobs is about 10k × ~11 ms ≈ 2 min of DB time per map-over, which is acceptable. At 100k it's hours.
- The `ANY(ARRAY(...))` form pins the plan to the ICJ side: about 4× faster at 100k, and independent of job-table size. It doesn't remove the quadratic total.

## Recommendations (REVIEW_DIRECTORY mode — not applied)

1. Pin the settled check to the ICJ side (the `ANY(ARRAY(...))` / scalar-subquery form, or a materialized id list) so the plan can't flip to a job-table scan. Reuse the same statement for the counts.
2. Optionally, avoid the per-job ICJ scan altogether. Enqueue one deduplicated celery task per ICJ (countdown/debounce) that does the settled check and sends the email. This also closes the duplicate-email race the PR documents in `_map_over_completed`.
3. Handler: capture `(job.id, icj_id)` for settled jobs before the pass commit, and dedupe by ICJ before touching `job.post_job_actions`. This avoids about 3–4 lazy loads per job after commit expiry when a whole map-over pauses in one pass.
4. `job_state_counts` duplicates the ICJ branch of `managers/jobs.summarize_jobs_to_dict` (same join plus `GROUP BY job.state`). Have the manager call the model method instead of keeping two copies.

## Measurement plan for a production-sized DB

- `EXPLAIN (ANALYZE, BUFFERS)` the `has_job_not_in_states` SQL on a usegalaxy.* replica for ICJs of about 1k, 10k and 100k jobs. Note whether the plan drives from `job` (seq or pkey scan) or from the icjja index.
- Run the same with the `ANY(ARRAY(...))` rewrite.
- Integration/benchmark: count queries in `ActionBox.execute_after_commit` for a handler pass that pauses N mapped jobs with an email PJA. The count should be O(#ICJs), not O(N), after recommendation 3.

## Not perf (left to the bug reviewer)

- The duplicate-summary race is acknowledged in the docstring.
- Paused map-overs now get a summary email. That's a behavior change, not a perf one.
