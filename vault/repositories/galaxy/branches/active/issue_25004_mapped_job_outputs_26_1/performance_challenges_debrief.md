Run via claude-opus-5-5 at low effort.

# Performance challenges debrief: issue_25004_mapped_job_outputs_26_1

**Verdict: no performance problems found. No code changed.** This review comes from reading the code. Nothing was measured, and no postgres or production-size data was used.

## What changed
`summarize_job_outputs` now builds its list of HDCA outputs with `_own_output_dataset_collection_instances(job)`. This helper drops any collection whose `implicit_collection_jobs_id` matches the job's own map-over. The code path serves one job at a time, through `/api/jobs/{id}/parameters_display` and `/api/datasets/{id}/parameters_display`.

## Extra queries the change adds
- One lazy load of `job.implicit_collection_jobs_association`, at most one row.
- For a mapped job, one lazy load of `association.dataset_collection_instance` for each output collection association. Before the change, only the FK column `dataset_collection_id` was read, so the HDCA rows themselves were not loaded.

The number of these queries depends on how many output collections the tool declares, usually 1 to 3. It does not depend on the size of the map-over, the size of the history, or the number of jobs. Each mapped job carries one association per implicit output collection, not one per element of the map-over. Unmapped jobs return early and add only the first query.

## Checked against the past-lesson patterns
- Unbounded query or Python-side slicing: none. The filter is applied to a list that is already small and bounded by the tool's outputs.
- Shared list endpoint paying for an expensive field: no. This is a detail endpoint for a single job, and no list or polling endpoint calls it.
- Element iteration, fan-out joins, CTEs, flush/commit loops, sync code inside async handlers: none apply.

## Possible micro-optimization (not done)
The filter could compare the FK by selecting `HistoryDatasetCollectionAssociation.implicit_collection_jobs_id` in a single query, or by eager-loading `dataset_collection_instance`. That would save 1 to 3 primary-key lookups per request. It is not worth the extra complexity at this scale, and no query-count test was added because no fix was made.
