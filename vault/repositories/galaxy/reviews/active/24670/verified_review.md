### P2 1: No test for partial cache hits across capped iterations

The PR changes `execute()` to look up `completed_jobs` by `execution_slice.job_index` instead of loop position. It also adds a negative path to `_copied_from_implicit_collections`: when cached and new jobs are mixed, the HDCA must not be marked as a copy. Both new tests are either fully cached or uncached, so neither path is exercised. Before this PR, the positional lookup handed the wrong `completed_jobs` entry to any slice after a skipped one. Nothing pins that.

Add an integration test in `TestMaximumWorkflowJobsPerSchedulingIteration` (cap 1) that re-runs with `use_cached_job` on a list whose *first* element is uncached and whose remaining elements match a prior run. Assert the total job count, exactly which jobs were copied and from which source jobs, and that the output HDCA is not marked copied. `test_cached_mapped_step_partial_cache_hits` on the review branch does this. It was written but not run, because the worktree has no `.venv`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort.

</details>

### P3 1: Recorded order indexes queried twice per iteration, in two places with different gates (implementation verified)

`ToolModule.execute` (`lib/galaxy/workflow/modules.py`) calls `invocation_step.implicit_collection_jobs.recorded_order_indexes()` when `use_cached_job and collection_info and not invocation_step.is_new`. `WorkflowStepExecutionTracker.new_collection_execution_slices` (`lib/galaxy/tools/execute.py`) then runs the same query, unconditionally, for the same ICJ. Each resumed iteration therefore makes two identical queries of up to N rows. It also leaves two owners of the "skip what this step already recorded" rule, and the two are named differently: `skip_job_indexes` and `recorded_job_indexes`.

Compute the set once in `ToolModule.execute`, gated only on `collection_info and not invocation_step.is_new`. The cache gate must go, because output-less steps need the tracker skip without the cache. Pass the set through `execute(..., recorded_job_indexes=...)` into `WorkflowStepExecutionTracker`, and use one name end to end. `ToolModule.execute` is the only caller that passes `invocation_step` to `execute()`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: Copied-collection query now runs for every mapped step at finalize, cached or not (implementation verified)

The old check short-circuited unless `self.completed_jobs[0]` was a cache hit. `_copied_from_implicit_collections` now loads `copied_from_job_id` for all N jobs of every map-over completion, both workflow and tool API, through the base `ExecutionTracker`. It loads them only to find a `None` and bail. This is pure overhead when the job cache is off, and it scales with map-over size. The issue cites map-overs of 1,000+ elements.

Return early unless `self.mapping_params.param_template.get("__use_cached_job__")` is truthy. Both the workflow path and the tool API path set it.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 3: Copied-collection check ignores element order

`_copied_from_implicit_collections` marks the new HDCA as a copy when the *set* of `copied_from_job_id`s equals the source ICJ's job id set. It never checks that the job at `order_index` i was copied from the source job at `order_index` i. Suppose a re-run uses the same elements in a different order. Every element hits the cache, the sets match, and the output is marked as a copy of a collection with a different element order. That marker feeds `__original_hdca` in `workflow/extract.py` and the export `copied_from_..._id_chain`. Before this PR the marker was effectively never set: the old code compared a set of `Row`s against job ids. So this PR is what makes the weakness reachable. Different element identifiers are not a concern, because job search already requires identifier matches (`require_identifier_match`).

Compare `{order_index: copied_from_job_id}` against the source's `{order_index: id}`. A small `ImplicitCollectionJobs.job_attribute_by_order_index` helper next to `get_job_attributes` does this in one query per side, and it also covers the length and set checks.

<details><summary>Details</summary>

The review branch adds `test_cached_mapped_step_reordered_input_not_marked_copied`. It runs on a list built from existing HDAs, re-runs with the same HDAs and identifiers in reverse order with `use_cached_job`, and asserts that all 3 jobs are copies and that the output HDCA is not marked copied. It was written but not run, because the worktree has no `.venv`.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort.

</details>

### P3 4: Job cache still searched for every remaining slice on each capped iteration

`ToolModule.execute` → `Tool.completed_jobs(...)` runs `job_search.by_tool_input` for every unrecorded index. However, `execute` consumes at most `max_num_jobs` slices per iteration. For N elements and cap C that is about N²/(2C) searches instead of N. For the reported 1,912-element case that is roughly 2.8k searches vs 1.9k. For a 100k-element map-over at the default cap of 1000 it is roughly 5M vs 100k. This is not a regression: before the PR it was N searches per iteration, with no end. It is downgraded from P2 for that reason, and because the fix changes the shape of `completed_jobs` on the shared tool API path, which is a poor fit for a release branch.

As a `dev` follow-up, resolve the cached job lazily when `execute` is about to run a slice, passing a lookup instead of a precomputed dict, so searches total about N. Capping the search at the first `max_num_jobs` unrecorded indexes is simpler. It can under-fill an iteration, though, because the tracker still skips unrecorded slices whose elements are already populated.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Claude Opus 5.5 at medium effort.

</details>

### P3 5: Output-less map-over test checks only the job count

`test_mapped_step_without_outputs_scheduled_once_per_element` asserts only `len(jobs) == 3`. The step has no outputs, so `wait_for_history(assert_ok=True)` says nothing about its jobs. Nothing pins that they finished `ok` or that the step reached `scheduled` through the `update_time`-driven progress path.

Wait on each job with `assert_ok=True`, and assert that the `filtered` invocation step's state is `scheduled`. The review branch does this. It was not run, because the worktree has no `.venv`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort.

</details>
