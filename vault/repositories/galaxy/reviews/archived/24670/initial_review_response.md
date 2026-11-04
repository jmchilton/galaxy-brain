P3 3 below seemed pedantic but the test case makes sense - a corner case for sure but probably worth getting it correct. -John

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_reviews/reviewers/learning_galaxy.md) was run via Claude Opus 5.5 at medium effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile: gx_risk_assessment · Model: claude-opus-5-5 · Effort: low · Reviewed commit: ff156cf34cd

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). No API, schema, migration, or tool/workflow format changes; the new `output_filter_all_by_param` tool is test-only.

<details><summary>Risk Review Advice</summary>

The runtime behavior is the part worth human attention on a release branch: map-over slices already recorded in `ImplicitCollectionJobsJobAssociation` are now skipped on later scheduling iterations, `ImplicitCollectionJobs` is tracked even when every output is filtered, and the "HDCA was copied" test now compares all recorded jobs against one source map-over rather than the jobs from the current iteration. That last check decides which collections the job cache treats as valid cached inputs downstream, so confirm it isn't stricter or looser than before for partially cached map-overs. Bumping `update_time` on a capped step changes how often the scheduler revisits the invocation; check that can't cause busy-looping. All of this can be reverted without data cleanup.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24670_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_24670_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24670_review_0) (in `~/projects/worktrees/galaxy/pr/24670`, based on reviewed head `ff156cf34cd`) tightens the PR's skip-recorded-slices and copied-collection logic. Recorded map-over job indexes are now queried once per scheduling iteration in `ToolModule.execute` and passed through `execute()` to `WorkflowStepExecutionTracker`, under the single name `recorded_job_indexes`. The copied-collection check is skipped for runs without the job cache. It also now requires each copied job to sit at the same order index as its source job. The integration tests gain a partial-cache-hit case, a reordered-input case, and stricter assertions on the output-less map-over test. No `.venv` was available in the worktree, so the integration tests were written but not run. Ruff, flake8, black 25.9.0 and `py_compile` pass on all touched files.

- [`b3371622d8b`](https://github.com/jmchilton/galaxy/commit/b3371622d8b7a688b6326c952355a3240aee50ae) Query recorded map-over job indexes once per scheduling iteration: computes the set once in the module, regardless of job cache, and hands it to the tracker instead of re-querying there.
- [`171fea100b7`](https://github.com/jmchilton/galaxy/commit/171fea100b739d28f9197996ec13db8a66941755) Skip copied-collection check for map-overs run without the job cache: gates `_copied_from_implicit_collections` on `__use_cached_job__`, so uncached map-overs no longer load `copied_from_job_id` for every job at finalize.
- [`f360119b5da`](https://github.com/jmchilton/galaxy/commit/f360119b5dab38b3d22a00536766e69ff1efb4c9) Require copied map-over jobs to match source jobs by order index: adds `ImplicitCollectionJobs.job_attribute_by_order_index` and compares `{order_index: copied_from_job_id}` with the source's `{order_index: id}`, plus an integration test with a reversed input list.
- [`79f214626f8`](https://github.com/jmchilton/galaxy/commit/79f214626f8b336962d548132e18e2be7b73883b) Assert output-less mapped step jobs are ok and step is scheduled: strengthens `test_mapped_step_without_outputs_scheduled_once_per_element`.
- [`accd995ace4`](https://github.com/jmchilton/galaxy/commit/accd995ace4ef051b325d214bc00bfd2aeab1a7c) Test partial job cache hits across capped scheduling iterations: new integration test that puts an uncached element first and asserts 3 jobs, exactly the 2 expected copies, and no copied-HDCA marker.

</details>

</details>

### P2 1: No test for partial cache hits across capped iterations

The PR changes `execute()` to look up `completed_jobs` by `execution_slice.job_index` instead of loop position. It also adds a negative path to `_copied_from_implicit_collections`: when cached and new jobs are mixed, the HDCA must not be marked as a copy. Both new tests are either fully cached or uncached, so neither path is exercised. Before this PR, the positional lookup handed the wrong `completed_jobs` entry to any slice after a skipped one. Nothing pins that.

Add an integration test in `TestMaximumWorkflowJobsPerSchedulingIteration` (cap 1) that re-runs with `use_cached_job` on a list whose *first* element is uncached and whose remaining elements match a prior run. Assert the total job count, exactly which jobs were copied and from which source jobs, and that the output HDCA is not marked copied. `test_cached_mapped_step_partial_cache_hits` on the review branch does this. It was written but not run, because the worktree has no `.venv`.

Fixed on the review branch in [`accd995ace4`](https://github.com/jmchilton/galaxy/commit/accd995ace4ef051b325d214bc00bfd2aeab1a7c).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort.

</details>

### P3 1: Recorded order indexes queried twice per iteration, in two places with different gates (implementation verified)

`ToolModule.execute` (`lib/galaxy/workflow/modules.py`) calls `invocation_step.implicit_collection_jobs.recorded_order_indexes()` when `use_cached_job and collection_info and not invocation_step.is_new`. `WorkflowStepExecutionTracker.new_collection_execution_slices` (`lib/galaxy/tools/execute.py`) then runs the same query, unconditionally, for the same ICJ. Each resumed iteration therefore makes two identical queries of up to N rows. It also leaves two owners of the "skip what this step already recorded" rule, and the two are named differently: `skip_job_indexes` and `recorded_job_indexes`.

Compute the set once in `ToolModule.execute`, gated only on `collection_info and not invocation_step.is_new`. The cache gate must go, because output-less steps need the tracker skip without the cache. Pass the set through `execute(..., recorded_job_indexes=...)` into `WorkflowStepExecutionTracker`, and use one name end to end. `ToolModule.execute` is the only caller that passes `invocation_step` to `execute()`.

Fixed on the review branch in [`b3371622d8b`](https://github.com/jmchilton/galaxy/commit/b3371622d8b7a688b6326c952355a3240aee50ae).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: Copied-collection query now runs for every mapped step at finalize, cached or not (implementation verified)

The old check short-circuited unless `self.completed_jobs[0]` was a cache hit. `_copied_from_implicit_collections` now loads `copied_from_job_id` for all N jobs of every map-over completion, both workflow and tool API, through the base `ExecutionTracker`. It loads them only to find a `None` and bail. This is pure overhead when the job cache is off, and it scales with map-over size. The issue cites map-overs of 1,000+ elements.

Return early unless `self.mapping_params.param_template.get("__use_cached_job__")` is truthy. Both the workflow path and the tool API path set it.

Fixed on the review branch in [`171fea100b7`](https://github.com/jmchilton/galaxy/commit/171fea100b739d28f9197996ec13db8a66941755).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 3: Copied-collection check ignores element order

`_copied_from_implicit_collections` marks the new HDCA as a copy when the *set* of `copied_from_job_id`s equals the source ICJ's job id set. It never checks that the job at `order_index` i was copied from the source job at `order_index` i. Suppose a re-run uses the same elements in a different order. Every element hits the cache, the sets match, and the output is marked as a copy of a collection with a different element order. That marker feeds `__original_hdca` in `workflow/extract.py` and the export `copied_from_..._id_chain`. Before this PR the marker was effectively never set: the old code compared a set of `Row`s against job ids. So this PR is what makes the weakness reachable. Different element identifiers are not a concern, because job search already requires identifier matches (`require_identifier_match`).

Compare `{order_index: copied_from_job_id}` against the source's `{order_index: id}`. A small `ImplicitCollectionJobs.job_attribute_by_order_index` helper next to `get_job_attributes` does this in one query per side, and it also covers the length and set checks.

<details><summary>Details</summary>

The review branch adds `test_cached_mapped_step_reordered_input_not_marked_copied`. It runs on a list built from existing HDAs, re-runs with the same HDAs and identifiers in reverse order with `use_cached_job`, and asserts that all 3 jobs are copies and that the output HDCA is not marked copied. It was written but not run, because the worktree has no `.venv`.

</details>

Fixed on the review branch in [`f360119b5da`](https://github.com/jmchilton/galaxy/commit/f360119b5dab38b3d22a00536766e69ff1efb4c9).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort.

</details>

### P3 5: Output-less map-over test checks only the job count

`test_mapped_step_without_outputs_scheduled_once_per_element` asserts only `len(jobs) == 3`. The step has no outputs, so `wait_for_history(assert_ok=True)` says nothing about its jobs. Nothing pins that they finished `ok` or that the step reached `scheduled` through the `update_time`-driven progress path.

Wait on each job with `assert_ok=True`, and assert that the `filtered` invocation step's state is `scheduled`. The review branch does this. It was not run, because the worktree has no `.venv`.

Fixed on the review branch in [`79f214626f8`](https://github.com/jmchilton/galaxy/commit/79f214626f8b336962d548132e18e2be7b73883b).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort.

</details>
