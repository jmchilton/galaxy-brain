# Test challenges debrief — PR #24670 @ ff156cf34cd

Tests added: two integration tests in `TestMaximumWorkflowJobsPerSchedulingIteration` (cap = 1), plus test tool `output_filter_all_by_param.xml`. No unit tests to challenge.

- `test_cached_mapped_step_scheduled_once_per_element`: right layer, right class (cap forces multi-iteration). Asserts job count, `copied_from_job_id` set, and HDCA copy marker. Pre-fix it would loop/over-create jobs, so it should go red. Keep. HDCA copy check reads DB via `_app` because `copied_from_history_dataset_collection_association_id` isn't in the API — acceptable in an integration test.
- `test_mapped_step_without_outputs_scheduled_once_per_element`: covers the no-implicit-collections path (new `_implicit_collection_jobs` tracking + `update_time` bump). Keep. New tool is minimal and justified (no existing tool filters all outputs by default).
- Helpers: uses populators throughout; no repeated raw HTTP. Fine.
- E2E: not warranted (scheduler internals).

## Test plan gaps
1. Partial cache hit across capped iterations is untested: `completed_jobs.get(execution_slice.job_index)` index realignment and the `_copied_from_implicit_collections` negative branch (mixed cached/new jobs must NOT mark the HDCA as copied). Suggest: run on list:list, then re-run cached on a collection sharing some but not all elements (or with one element changed); assert job count, only matching jobs have `copied_from_job_id`, and HDCA copy marker is unset.
2. Second test only asserts final job count; could also assert each job's state ok and the invocation step reached `scheduled`, cheap strengthening.
