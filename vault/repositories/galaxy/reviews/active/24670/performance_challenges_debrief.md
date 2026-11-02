# Performance challenge debrief — #24670 @ ff156cf34cd

Process: [GX_PROCESS_CHALLENGE_PERFORMANCE](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_PERFORMANCE.md), REVIEW_DIRECTORY mode (recommendations only, PR not edited).

**All points below are from code reading, not measurement.** No Galaxy/Postgres was spun up for this round; a measurement plan is at the end.

## Summary

The PR is a net large performance win: it removes the unbounded job creation loop (318k jobs for 1,912 inputs) and stops re-searching the job cache for slices already recorded. New per-iteration DB work is small and indexed. Residual concerns are about how much job-cache searching still happens per capped iteration and two cheap redundant queries.

## What the PR adds per scheduling iteration (capped, cached, resumed map-over step)

| Work | Where | Cost |
|---|---|---|
| `recorded_order_indexes()` | `workflow/modules.py` (only with `use_cached_job`, resumed step) | 1 query, N_recorded ints, uses `ix_implicit_collection_jobs_job_association_implicit_collection_jobs_id` |
| `recorded_order_indexes()` again | `WorkflowStepExecutionTracker.new_collection_execution_slices` (always, when ICJ exists) | same query again |
| `job_search.by_tool_input` | `Tool.completed_jobs` | one heavy search per **unrecorded** slice, not just per slice to be executed this iteration |
| `update_time = now()` | `workflow/run.py` | one UPDATE per capped iteration that created jobs; fine |
| `_copied_from_implicit_collections` | `ExecutionTracker.finalize_dataset_collections` (once per map-over completion, workflow and tool API) | 1 query N rows (`copied_from_job_id`), and only if all non-null: 1 source job get, lazy loads of its HDCA assocs + ICJ, 1 query N rows (`id`) |

## Challenges

### 1. Job cache still searched for every remaining slice each capped iteration (recommend P2, may be a dev follow-up)

`Tool.completed_jobs` now skips recorded indexes, but still calls `job_search.by_tool_input` for every unrecorded index, while `execute` only consumes up to `max_num_jobs` (`progress.maximum_jobs_to_schedule_or_none`, default cap 1000) of them. Total searches for an N-element map-over with cap C is about N + (N−C) + (N−2C) + … ≈ N²/(2C) instead of N.

- Motivating case (1,912 elements, C=1000): 1,912 + 912 = 2,824 searches vs 1,912. Small.
- 100k-element map-over, C=1000: ≈ 5M searches vs 100k. `by_tool_input` is one of Galaxy's heavier queries (see #23429 for the fan-out history of the job cache query), so this dominates scheduling time for large cached map-overs.

Pre-PR behaviour was strictly worse (N per iteration, forever), so this is not a regression; the PR description's "N searches per scheduling iteration" claim is fixed only for the already-recorded part.

Recommendation: search lazily — compute the cached job for a slice when `execute` is about to run it (e.g. pass a callable / lazy mapping as `completed_jobs`, or have `ToolModule` limit the searched indexes to the first `max_num_jobs` unrecorded ones). Lazy is more robust because `new_collection_execution_slices` can still skip unrecorded slices whose element is already populated, so "first C unrecorded" can under-fill an iteration. Given the `release_25.1` target, fine to defer to a dev follow-up.

### 2. `recorded_order_indexes()` issued twice per iteration (recommend P3)

`ToolModule.execute` queries it to build `skip_job_indexes`, then `new_collection_execution_slices` queries the same ICJ again. Each returns N_recorded rows (up to N−C for a 100k map-over). Cheap-ish (indexed, single int column), but pass the set into `execute`/the tracker (or let the tracker own it and have the module read it from there) so one query per iteration suffices.

### 3. `_copied_from_implicit_collections` runs on every map-over finalize, not only cached ones (recommend P3)

Old code short-circuited on `self.completed_jobs[0]` being truthy, so non-cached map-overs did no copied-from query. The new check always loads `copied_from_job_id` for all N jobs of the ICJ, for every map-over completion, including tool-form/API map-overs via the base `ExecutionTracker`. For non-cached runs it's always `None` and returns. The existing `completed_jobs` short-circuit is no longer valid across iterations (recorded indexes are `None` in the final iteration), but `self.mapping_params.param_template.get("__use_cached_job__")` is set on both the workflow (`workflow/modules.py`) and tool (`tools/__init__.py`) paths and can't be truthy without copies being possible. Gate on it. Optionally push the check into SQL (`EXISTS ... copied_from_job_id IS NULL`, or `count(DISTINCT copied_from_job_id)` vs `count(*)`) instead of materialising N rows twice.

## Non-findings (checked)

- `recorded_order_indexes` query is bounded to one ICJ and hits the `implicit_collection_jobs_id` index; selects one column — no unbounded load.
- `update_time` bump: one row write per capped iteration that created jobs; it makes the scheduler revisit promptly, which is the intent; doesn't increase scheduling frequency beyond uncapped behaviour.
- `trans.sa_session.add(implicit_collection_jobs)` before the existing commit — no extra flush/commit.
- Pre-existing (not raised as findings): `ToolModule.execute` rebuilds all N `param_combinations` and `new_collection_execution_slices` walks all N slices every iteration, so per-iteration Python cost stays O(N) regardless of cap.

## Measurement plan (if John wants data)

1. Galaxy on a free port against a Postgres container; `maximum_workflow_jobs_per_scheduling_iteration: 100`, job cache on.
2. Seed a `list` of 2,000 small datasets; run `cat1` map-over once, wait, then invoke with `use_cached_job: true`.
3. Enable SQL logging/`pg_stat_statements`; count calls to the job-search query and the `implicit_collection_jobs_job_association` order_index query per iteration. Expect 2,000+1,900+…≈21k searches and 2 order_index queries/iteration on ff156cf34cd; expect ≈2,000 and 1/iteration after challenges 1–2.
4. Time per scheduling iteration (`log.debug` from `all_jobs_timer` / workflow scheduler timing) before/after.
5. For challenge 3, run a non-cached 10k map-over via the tool API and confirm the extra `copied_from_job_id` query disappears with the gate.
