# Component - Jobs API and Job Cache

Document the job read path and job reuse: `JobManager.index_query` and `JobIndexQueryPayload` (filters, `tool_ids_like`, security scoping, ordering), `JobsService.index`, the job response models (`JobBaseModel`, `JobSummary`, `EncodedJobDetails`, `JobDetails`) and which fields each one serialises (`tool_version`, `copied_from_job_id`), the `/api/jobs/{id}/inputs`, `/outputs` and `/parameters_display` endpoints and their gaps for collections, and the job cache (`JobSearch`, `use_cached_job`, `Job.copy_from`, `copied_from_job_id`, name and element-identifier matching). Also note how `Job.tool_request_id` and `ImplicitCollectionJobs` group map-over jobs. Leave out scheduling and the job handler.

## Why

Compare-runs mode 3 lists past jobs of a tool and shows a reused flag; both depend on `index_query` internals, response-model gaps and cache semantics that exist only as scattered branch notes (`issue_24411_job_cache_identifier_25.1`, review of #24288). No `research/` note covers jobs.

## Requested by

- vault/repositories/galaxy/branches/active/compare_runs/brain_research.md: tool-runs resolver extends `index_query`, adds a version filter, and derives `reused` from `copied_from_job_id`.
