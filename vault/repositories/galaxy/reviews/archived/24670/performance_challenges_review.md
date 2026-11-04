# Performance challenges review — #24670

- Profile: [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md)
- Model: Claude Opus 5.5, effort: medium
- Reviewed commit: `ff156cf34cd` (diff vs `origin/release_25.1`)
- Detail and measurement plan: [performance_challenges_debrief.md](performance_challenges_debrief.md)

Verdict: net large performance win (ends unbounded job re-creation). Findings below are code-reading only, not measured.

### P2 1: Job cache still searched for every remaining slice on each capped iteration

`ToolModule.execute` → `Tool.completed_jobs(..., skip_job_indexes=recorded)` runs `job_search.by_tool_input` for every unrecorded index, but `execute` only consumes up to `max_num_jobs` slices per iteration. For N elements and cap C that is ≈N²/(2C) searches instead of N — ~2.8k vs 1.9k for the reported 1,912-element case, but ~5M vs 100k for a 100k-element map-over at the default cap of 1000. Not a regression (pre-PR was N per iteration, forever), but the PR's "N searches per iteration" fix covers only the recorded portion.

Suggested fix: resolve the cached job lazily when `execute` is about to run a slice (pass a lazy lookup instead of a precomputed dict), so searches total ≈N. Limiting to the first `max_num_jobs` unrecorded indexes is simpler but can under-fill an iteration because `new_collection_execution_slices` still skips unrecorded slices whose element is populated. Reasonable to defer to a `dev` follow-up given the release target.

### P3 1: `recorded_order_indexes()` queried twice per iteration

Called in `workflow/modules.py` to build `skip_job_indexes` and again in `WorkflowStepExecutionTracker.new_collection_execution_slices` for the same ICJ. Indexed, single-column, but up to N rows each time. Compute once and pass it to the tracker (or have the module read it from the tracker).

### P3 2: `_copied_from_implicit_collections` queries every map-over at finalize, cached or not

The old check short-circuited on `self.completed_jobs[0]`, so non-cached map-overs did no copied-from query. Now every map-over completion — workflow and tool API, via the base `ExecutionTracker` — loads `copied_from_job_id` for all N jobs just to see a `None`. Gate on `self.mapping_params.param_template.get("__use_cached_job__")` (set on both paths); optionally make the all-copied check an SQL aggregate/EXISTS instead of materialising N ids twice.
