```yaml
documents:
  - path: vault/repositories/galaxy/branches/active/compare_runs/subagents/phase_2_implementation.md
    why: Design of the per-item access choke point (inaccessible items become Missing without name/hid), the dataset_id keying (copies share the restricted Dataset), the HDCA rule (history owned/importable/shared), and the admin bypass. Dev-only; `accessible_dataset_ids` does not exist on release_25.1.
    load_when: Choosing the access predicate for hda/hdca/dce inputs and whether to batch.
  - path: vault/repositories/galaxy/branches/active/compare_runs/subagents/phase_2_review_fixes.md
    why: Parity test showing `accessible_dataset_ids` agrees with `can_access_dataset`, `can_access_datasets` and `dataset_access_mapping`; mutation-red checks and why existing helpers were kept ("DO NOT TOUCH" on `dataset_access_mapping`).
    load_when: Writing red-to-green tests; deciding which existing helper to reuse on 25.1.
  - path: vault/repositories/galaxy/branches/active/compare_runs/initial_implementation_debrief.md
    why: Summary of the compare_runs access handling and the open admin and HDCA-rule questions, which apply here too.
    load_when: Settling admin behavior and the collection rule.
  - path: vault/repositories/galaxy/branches/active/compare_runs/design_questions.md
    why: Open questions on admin visibility and the HDCA rule (some marked resolved); align with the outcome.
    load_when: Settling the admin and HDCA decisions.
  - path: vault/projects/workflow_applications/RERUN_UX.md
    why: Lists the consumers of `parameters_display` rows (`JobParameters.vue` via `JobStep.vue`, invocation step params) and the row shape `{text, depth, value}`.
    load_when: Checking client consumers beyond `client/src/components/JobParameters/`.
  - path: vault/repositories/galaxy/branches/active/workflow_run_exposed_step_params/spike_debrief.md
    why: A dev spike that also edits `summarize_job_parameters` (adds `name` and `exposable` per row); expect textual conflicts if this fix is forward-ported to dev.
    load_when: Forward-porting or rebasing onto dev.
  - path: vault/research/Problem - YAML Tool Post-Hoc State Divergence.md
    why: Lists `summarize_job_parameters` as a reader of legacy JobParameter rows and suggests an API assertion on displayed params; relevant to test placement.
    load_when: Writing API tests for yaml-tool jobs.
  - path: vault/research/Component - Markdown Visualizations.md
    why: Context for the `job_parameters` galaxy directive (`markdown_util.handle_job_parameters`), which builds `hid: name` from the same rows and must cope with id-only items.
    load_when: Updating `markdown_util.py` and its unit test.
  - path: vault/research/Component - Collection Models.md
    why: HDCA / DatasetCollectionElement structure; what a `dce` input resolves to and how to reach its dataset or collection for the access check.
    load_when: Implementing the `dce` branch.
  - path: vault/research/Component - API Tests.md
    why: Populators and multi-user helpers (`_different_user`) for the API test with a second user's dataset.
    load_when: Writing the API test.
research_requests:
  - vault/agents/gx_research/todo/jobs_api_and_job_cache.md
  - vault/agents/gx_research/todo/dataset_collection_access_checks.md
```

Notes (no document covers these; from reading the code at base `1e2458c196c`):

- Producer: `summarize_job_parameters` in `lib/galaxy/managers/jobs.py` (data branch of `inputs_recursive`) emits `{src, id, hid, name}` for hda/hdca and `{src, id, name}` for dce. Response model: `JobParameter.value` as `EncodedJobParameterHistoryItem` in `lib/galaxy/schema/jobs.py`; it likely needs `hid`/`name` made optional (check the generated schema/api-client).
- Callers: `lib/galaxy/webapps/galaxy/api/jobs.py` (both routes, access of the job only) and `markdown_util.handle_job_parameters`, which formats `{hid}: {name}` unconditionally.
- Access helpers present on release_25.1: `GalaxyRBACAgent.can_access_dataset`, `can_access_datasets`, `can_access_collection`, `dataset_access_mapping` (RBAC agent module under lib/galaxy/model/), `HDAManager`/`HDCAManager` `is_accessible` via `datasets.py`/`sharable.py`. Not present: `accessible_dataset_ids`, `Missing(reason="inaccessible")` (compare_runs, dev only).
- Reference contract: `/api/jobs/{id}/inputs` (`JobsService.dictify_associations`) returns `{src, id}` only.
- Client: `JobParametersArrayValue.vue` renders `GenericHistoryItem` by `src`/`id` for hda/hdca/dce (fetches the item by id) and falls back to `{{ hid }}: {{ name }}`; `JobParameters.test.ts` and `JobStepJobs.test.ts` use fixtures with hid/name. An id-only item should render a placeholder rather than a failing fetch.
