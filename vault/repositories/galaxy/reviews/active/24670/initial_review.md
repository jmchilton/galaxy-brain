# Initial review — #24670 (default profile)

- Profile: `_shared/reviewers/default.md`
- Model: Claude Opus 5.5, effort medium (agent setting)
- Reviewed commit: `ff156cf34cd` (diff vs `origin/release_25.1`)
- Tests: not run (integration layer; reviewed by reading).

## Verdict

Approve-leaning. The core fix (skip slices already recorded in the step's `ImplicitCollectionJobs`, look up cached jobs by `job_index`) is correct and targeted. The integration test exercises both the progress bug and the `job_index` lookup (it asserts every cached job was copied from a different first-run job). The follow-ups are sound: keeping the ICJ on the tracker for output-less steps, bumping step `update_time`, and rewriting the copied-HDCA check. I found no P1s. The P3s below cover duplication and how strict the new copied-collection check is.

Things checked and found fine:
- `execute()` now uses `completed_jobs.get(execution_slice.job_index)`. The old `completed_jobs[i]` was already wrong before this PR whenever the tracker skipped populated, uncached slices. The new lookup fixes that too.
- `update_time` bump vs `WorkflowRequestMonitor.ready_to_schedule_more`. `update_time_tracking_dict[id] = now()` is set *before* `schedule()`, so a step `update_time` written during scheduling compares later and wakes the invocation. Subworkflow progress doesn't inherit `jobs_per_scheduling_iteration`, so the bump never fires on subworkflow invocation steps, which the top-level wake check couldn't see.
- In-flight invocations at deploy time: output-less steps have no `invocation_step.implicit_collection_jobs`, so they behave as before. This is not a regression.
- `job_index`/`order_index` stays stable across iterations because `param_combinations` and `walk_implicit_collections()` are rebuilt deterministically.
- Job search (`_build_stmt_for_hdca`) matches HDCAs structurally, not through `copied_from_history_dataset_collection_association_id`. So the marker now being set affects workflow extraction (`__original_hdca`) and export chains, not cache matching. The deleted comment claiming otherwise was stale, and removing it was correct.

## Findings

### P3 1: Recorded order indexes computed in two places, gated differently

`ToolModule.execute` (`lib/galaxy/workflow/modules.py`) queries `invocation_step.implicit_collection_jobs.recorded_order_indexes()` when `use_cached_job and collection_info and not invocation_step.is_new`. `WorkflowStepExecutionTracker.new_collection_execution_slices` (`lib/galaxy/tools/execute.py`) then runs the same query again, unconditionally. Each resumed cached iteration therefore makes two identical queries, and two sites each own the rule "skip what this step already recorded".

Suggested fix: compute the set once, either in `ToolModule.execute` or as a tracker method/property, and pass it through. For example, `execute(..., recorded_job_indexes=...)` could feed both `tool.completed_jobs(skip_job_indexes=...)` and the tracker. The skip rule then lives in one place.

### P3 2: Copied-collection check ignores element correspondence

`ExecutionTracker._copied_from_implicit_collections` sets `copied_from_history_dataset_collection_association_id` when the *set* of `copied_from_job_id`s equals the source ICJ's job id set. It never checks that the job at `order_index` i was copied from the source job at `order_index` i. Suppose the input collection holds the same datasets in a different order, or under different element identifiers. Every per-element cache hit still succeeds, the sets match, and the new HDCA is marked as a copy of a collection with a different order or different identifiers. Before this PR the marker was effectively never set, so this weakness only now matters. It feeds `__original_hdca` in `workflow/extract.py` and the export `copied_from_..._id_chain`.

Suggested fix: compare `(order_index, copied_from_job_id)` pairs against the source's `(order_index, job_id)` pairs, using one join over `ImplicitCollectionJobsJobAssociation` for each side. Alternatively, document that order isn't checked.

### P3 3: Copied-collection query now runs for every mapped step finalize

The old check short-circuited unless `self.completed_jobs[0]` was a cache hit. `_copied_from_implicit_collections` now selects `copied_from_job_id` for every job of every mapped step at finalize, including runs without the job cache. That query returns N rows, and only after loading them does the code bail on `None in copied_from_job_ids`. This is cheap per step but scales with map-over size (the issue cites 1,000+ element map-overs) and is pure overhead when caching is off.

Suggested fix: gate the call on caching having been requested (`mapping_params.param_template.get("__use_cached_job__")`, or a flag recorded on the tracker). Alternatively, use an `EXISTS ... copied_from_job_id IS NULL` probe before loading all ids.
