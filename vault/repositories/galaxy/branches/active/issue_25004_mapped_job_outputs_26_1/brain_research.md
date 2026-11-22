```yaml
documents:
  - path: vault/research/Component - Jobs API and Job Cache.md
    why: Documents `summarize_job_outputs` and `parameters_display` (HDA/LDDA/HDCA output associations, labels, the datasets route that skips the job-level check) and the sibling `/api/jobs/{id}/outputs`, which reads the same `output_dataset_collection_instances` and likely has the same duplicate. Also describes `ImplicitCollectionJobs` and the job cache that relies on the association. Silent on the implicit HDCA being listed (a gap this fix closes), so update it if the behavior changes.
  - path: vault/research/Component - Collection Models.md
    why: Section 9 and the table list describe implicit collections, `HDCA.implicit_collection_jobs_id` and the ICJ job association, and `job_to_output_dataset_collection` pointing at the HDCA (many jobs to one HDCA when mapping). That is the key to the skip condition.
    load_when: Writing the skip predicate and reasoning about which HDCAs a mapped job should legitimately list.
  - path: vault/research/Component - Collection Tool Execution Semantics.md
    why: Explains how a mapped execution creates one implicit output collection and one job per element, to choose the test tool and structure.
    load_when: Designing the API test (list map-over, expected outputs per element job).
  - path: vault/research/Component - Dataset and Collection Access Checks.md
    why: Job access (`_user_can_access_job`) iterates `job.output_dataset_collection_instances`; this is one of the consumers that is why the association itself must stay.
    load_when: Reviewing that the fix does not alter the association or access results.
  - path: vault/research/Component - API Tests.md
    why: Populators and conventions for the API test in `lib/galaxy_test/api/test_jobs.py`.
    load_when: Writing the parameters_display map-over test.
  - path: vault/repositories/galaxy/branches/active/job_parameters_input_access_25.1/index.md
    why: Sibling branch editing `summarize_job_parameters` in the same file and its `parameters_display` tests on release_25.1; look for textual or test overlap.
    load_when: Rebasing, forward-porting or placing the new test beside existing `test_parameters_display`.
  - path: vault/repositories/galaxy/branches/active/workflow_run_exposed_step_params/spike_debrief.md
    why: Dev spike that also edits `summarize_job_parameters`; possible conflicts when forward-porting to dev.
    load_when: Forward-porting.
  - path: vault/research/Component - Workflow Extraction Models.md
    why: Another reader of `output_dataset_collection_instances` (workflow extraction maps ICJ output HDCAs back to steps); confirms the over-broad association is relied on elsewhere.
    load_when: Checking that the fix is confined to display.
research_requests:
  - vault/agents/gx_research/todo/job_output_associations.md
```

Notes (no document covers these; from reading the code at `ae0530e3934` on `release_26.1`):

- `ExecutionTracker.record_success` (`lib/galaxy/tools/execute.py`, around line 867-870) adds every implicit HDCA to every element job with `job.add_output_dataset_collection`, in addition to the job's own HDA outputs.
- Other readers of `job.output_dataset_collection_instances` that the fix must leave untouched: `managers/jobs.py` `_user_can_access_job` (line ~376), `managers/collections.py:216`, `workflow/extract.py:257,740`, `job_execution/actions/post.py`, `model/store/__init__.py:2268`, `tools/actions/__init__.py:925`, and the `/outputs` service at `webapps/galaxy/services/jobs.py:236`.
- `Job.implicit_collection_jobs_association` (`model/__init__.py:1747`) and `HDCA.implicit_collection_jobs_id` give the skip condition; a job outside a map-over has a null association and must still list its own HDCA outputs.
- Existing parameters_display API test is `test_parameters_display` (`lib/galaxy_test/api/test_jobs.py:1430`); it covers `/api/jobs/{id}/` and `/api/datasets/{id}/` variants, both of which go through `summarize_job_outputs`.
