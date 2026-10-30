# Component - Jobs API and Job Cache

Document the job read path and job reuse: `JobManager.index_query` and `JobIndexQueryPayload` (filters, `tool_ids_like`, security scoping, ordering), `JobsService.index`, the job response models (`JobBaseModel`, `JobSummary`, `EncodedJobDetails`, `JobDetails`) and which fields each one serialises (`tool_version`, `copied_from_job_id`), the `/api/jobs/{id}/inputs`, `/outputs` and `/parameters_display` endpoints and their gaps for collections, and the job cache (`JobSearch`, `use_cached_job`, `Job.copy_from`, `copied_from_job_id`, name and element-identifier matching). Also note how `Job.tool_request_id` and `ImplicitCollectionJobs` group map-over jobs. Leave out scheduling and the job handler.

## Why

Compare-runs mode 3 lists past jobs of a tool and shows a reused flag; both depend on `index_query` internals, response-model gaps and cache semantics that exist only as scattered branch notes (`issue_24411_job_cache_identifier_25.1`, review of #24288). No `research/` note covers jobs.

## Requested by

- vault/repositories/galaxy/branches/active/compare_runs/brain_research.md: tool-runs resolver extends `index_query`, adds a version filter, and derives `reused` from `copied_from_job_id`.
- vault/repositories/galaxy/branches/active/job_parameters_input_access_25.1/brain_research.md: `parameters_display` (`summarize_job_parameters`) data-input values and the `/inputs` id-only contract; the note should say which job endpoints honor dataset access and which only check job access.

## Debrief

- Created `vault/research/Component - Jobs API and Job Cache.md`, verified against Galaxy `origin/dev` @ `65e6daff2334c8cfd4971682eecfb87f38a224be`.
- #24436 (job cache identifier/name fix) is merged and on `dev`, so the note describes the merged matching rules. The merged code differs from the branch's `pr_description.md`: reading `element_identifier` sets a separate `consumes_identifiers` flag, and the late search passes identifiers. #24288 (`(rows, total)` / `total_matches`) is still open and is labeled as proposed. The `compare_runs` changes (`tool_version` on `JobBaseModel`, `copied_from_job_id` on `JobSummary`, a `tool_versions` filter, `reused`) are labeled as branch proposals.
- The request named `Job.copy_from`; the method is `Job.copy_from_job` at this SHA.
- Key findings for requesters:
  - `tool_version` is dropped from every job response, because no Pydantic model declares it.
  - `copied_from_job_id` is on show/search but not on index rows.
  - `/inputs` ignores HDCA/DCE inputs.
  - `/outputs` ignores implicit `DatasetCollection` outputs.
  - All job sub-resources authorize at job level only (the deprecated dataset routes authorize at dataset level instead).
- Research issues:
  - `research_issues/icj-cached-hdca-copied-from-never-set.md`
  - `research_issues/jobs-inputs-endpoint-unset-optional-input.md`
  - `research_issues/job-response-models-drop-tool-version.md`
  - `research_issues/jobs-resume-endpoint-missing-raise.md`
  - `research_issues/jobs-search-files-loop-reads-annotations.md`
- Backlinks added to Dataset and Collection Access Checks, Collection Models, Job Completion Lifecycle, Workflow API, PR 20935 and PR 21842.
- Out of scope: scheduling, the job handler loop (apart from the cache-hit branch), runners, completion. Also out of scope: client consumers beyond the `JobInformation.vue` `tool_version` cast, and the line-by-line internals of the HDCA/DCE signature CTEs (summarized only).
