# Test challenges review — PR #24670

Profile: gx_test_challenger (`_shared/reviewers/gx_test_challenger.md`). Model: Claude Opus 5.5. Effort: low. Reviewed commit: ff156cf34cd.

Debrief: [test_challenges_debrief.md](test_challenges_debrief.md)

Verdict: tests are at the right layer (integration, cap=1 config) and both regressions are covered. No unit tests to drop. One coverage gap.

### P2 1: No test for partial cache hits across capped iterations
The PR changes `execute()` to look up `completed_jobs` by `execution_slice.job_index` instead of loop position, and adds a negative path in `_copied_from_implicit_collections` (mixed cached/new jobs must not mark the HDCA as a copy). Both tests are all-cached or no-cache, so neither path is exercised. Add an integration test in `TestMaximumWorkflowJobsPerSchedulingIteration` that re-runs with `use_cached_job` on an input where only some elements match a prior run; assert total job count, which jobs have `copied_from_job_id`, and that the output HDCA is not marked copied.

### P3 1: Strengthen filtered-output test assertions
`test_mapped_step_without_outputs_scheduled_once_per_element` checks only `len(jobs) == 3`. Also assert jobs are `ok` and the step is `scheduled` to pin the `update_time`-driven progress path.
