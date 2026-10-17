# Normal review

No blockers. Acted on: an untested PickValueModule path (added a native `pick_value` rename step to the framework test) and the return type (narrowed to `dict[str, str]`). The reviewer's failure-path and readiness suggestions led to a finding: the readiness check was redundant. `SubWorkflowModule` already makes the subworkflow step wait for its parameter-input datasets, and fails if they errored (`_find_collections_to_match` → `replacement_for_input`, non-data). So I dropped `_check_dataset_ready`, which also removes one forward-merge conflict.

Not acted on:
- Failure-path API test: written, but it passes on base, because the subworkflow step fails before this code runs. Dropped as not testing the change.
- `dependent_workflow_step_id` for failures: moot after dropping the readiness check.
- HDCA value in a subworkflow text param still renders as a repr: predates this branch, separate issue.
- PickValueModule resolves before the null/skip check: ordering edge case, harmless.
- Forward merge to dev: `effective_replacement_dict` must stay before dev's `_capture_workflow_tool_request_state` in `ToolModule.execute`, or delayed iterations leave orphan ToolRequests. Recorded in index.md.

<details><summary>Full review</summary>

1. Medium: the forward merge to dev conflicts. In modules.py, dev's `_capture_workflow_tool_request_state` is at the same spot, and the resolve call must come before it. In run.py, `replacement_for_connection` gained `require_ready` and dependencies on dev; keep dev's block.
2. Low: the PickValueModule change has no test (both tests use the pick_value *tool*).
3. Low: the failure path (a failed expression dataset fails the invocation) is untested.
4. Low: the failure leaves `dependent_workflow_step_id=None`.
5. Low: `_check_dataset_ready` runs on any HDA, not only expression.json. An HDCA value still renders as a repr (predates the branch).
6. Low: PickValueModule resolves before `_is_null_or_skipped`.
7. Nit: the return type could be `dict[str, str]`.

Checked fine:
- The only replacement_dict consumer is `${k}` substitution in post.py, so filtering to referenced names doesn't change output. User params are still all passed and take precedence.
- There are no other `effective_replacement_dict` callers on 26.1 or dev.
- On recovery, `runtime_replacements` is refilled via `recover_mapping`.
- The delay is placed before `completed_jobs`/`execute`. PartialJobExecution and `max_num_jobs` re-entry are safe.
- Runtime PJAs are included through `_effective_post_job_actions`.
- DCE, JSON null, and bool values are handled.
- The extractions are clean, the tests are integration-level, and imports are at module top. No security concerns.
</details>
