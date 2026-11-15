---
type: research
subtype: pr
tags:
  - research/pr
  - galaxy/api
  - galaxy/workflows
github_pr: 21335
github_repo: galaxyproject/galaxy
component: GA4GH WES API
branch: wes_implementation
related_prs:
  - 20935
status: draft
created: 2026-06-06
revised: 2026-11-15
revision: 3
ai_generated: true
summary: "GA4GH WES API exposing Galaxy workflow runs with gxworkflow URI loading state mapping and keyset pagination"
related_notes:
  - "[[ga4gh_wes_tes]]"
  - "[[Component - Workflow API]]"
  - "[[Component - Workflow Import]]"
  - "[[Component - Tool Shed Search and Indexing]]"
  - "[[PR 20935 - Tool Request API]]"
  - "[[Component - Format2 Workflows (gxformat2)]]"
  - "[[Component - API Tests]]"
  - "[[Component - DRS Support]]"
sources:
  - "https://github.com/galaxyproject/galaxy/pull/21335"
---

# PR #21335: Implement GA4GH WES API

## Summary

Adds a GA4GH Workflow Execution Service (WES) v1.0.0 API to Galaxy so external clients can submit, monitor, cancel, and list Galaxy workflow runs over the standard WES wire protocol. WES "runs" map onto Galaxy `WorkflowInvocation`s and WES "tasks" map onto invocation steps/jobs. Pydantic models are code-generated from the GA4GH WES OpenAPI spec; a thin FastAPI CBV router delegates to a large service layer that loads workflows (URL, attachment, or `gxworkflow://` DB reference), creates a history, invokes the workflow, maps state, and decorates outputs with DRS URIs. The PR also factors shared GA4GH service-info construction out of DRS into a reusable utility, adds an opaque-token keyset-pagination helper, and adds plain-text job stdout/stderr endpoints that WES task logs link to.

Merged 2026-01-27 (author jmchilton, merge by mvdbeek). Labels: kind/enhancement, area/API, area/workflows. No parent issue referenced in the body; follow-up `4afff175ea` fixes issue #22347.

## Changes

### WES API router (new)

`lib/galaxy/webapps/galaxy/api/wes.py` — FastAPI CBV class `WesApi`, `router = Router(tags=["wes"])`. Auto-registered via `include_all_package_routers`. **8 route decorators** (the PR body's "6 endpoints" counts the 2 task-log routes separately):

- `GET  /ga4gh/wes/v1/service-info` (public) — `service_info`
- `POST /ga4gh/wes/v1/runs` (multipart/form-data) — `submit_run`
- `GET  /ga4gh/wes/v1/runs` — `list_runs`
- `GET  /ga4gh/wes/v1/runs/{run_id}` — `get_run`
- `GET  /ga4gh/wes/v1/runs/{run_id}/status` — `get_run_status`
- `POST /ga4gh/wes/v1/runs/{run_id}/cancel` — `cancel_run`
- `GET  /ga4gh/wes/v1/runs/{run_id}/tasks` — `get_run_tasks`
- `GET  /ga4gh/wes/v1/runs/{run_id}/tasks/{task_id}` — `get_run_task`

A WES `run_id` is an encoded Galaxy invocation ID (decoded via `DecodedDatabaseIdField`). A `task_id` is a string `order_index` or `order_index.job_index` (e.g. `"0"`, `"2.5"`).

### WES service layer (new)

`lib/galaxy/webapps/galaxy/services/wes.py` (~1170 lines) — `WesService(ServiceBase)` depends on `WorkflowsService`, app config, `IdEncodingHelper`, and instantiates `KeysetPagination`.

- **submit_run pipeline** — rejects anonymous + checks user activation; loads workflow content (`gxworkflow://` DB ref, or creates a workflow from raw description); parses engine params; gets/creates a history; builds `InvokeWorkflowPayload`; calls `WorkflowsService.invoke_workflow`; returns `RunId`. Batch invocations are rejected.
- **`gxworkflow://` parsing** — `_parse_gxworkflow_uri`, format `gxworkflow://<encoded_id>[?instance=true|false]`. Default `instance=False` loads the `StoredWorkflow`; `instance=True` loads a `Workflow` instance.
- **Workflow type detection** — `_determine_workflow_type`: `class == "GalaxyWorkflow"` → `gx_workflow_format2`; presence of `steps`/`workflow` key → `gx_workflow_ga`; else `MessageException`.
- **History** — `_get_or_create_history` reuses an engine-param `history_id` or creates one (default name `"WES Run"`). Includes an explicit `sa_session.commit()` flagged "Postgres tests in CI fail without this commit."
- **Task listing** — a UNION query over single-job steps, collection-mapping jobs (expanded via `ImplicitCollectionJobsJobAssociation`), and no-job steps, with composite `(step_order, job_index)` keyset pagination (`TaskKeysetToken`).
- **State mapping** — at merge, `GALAXY_TO_WES_STATE` was `new`→QUEUED, `ready`→INITIALIZING, `scheduled`→RUNNING, `failed`→EXECUTOR_ERROR, `cancelled`→CANCELED, `cancelling`→CANCELING, unmapped → `UNKNOWN`, so a finished run (`completed`) reported `UNKNOWN`. `685437ec66c` (v26.0.2) added `completed`→COMPLETE and `requires_materialization`→INITIALIZING (see Changes since PR). `completed` means every job reached a terminal state, so a run with failed or paused jobs still reports COMPLETE.
- **RunLog** — `_invocation_to_run_log` decorates HDA outputs with DRS URIs (`drs://drs.{netloc}/hda-{drs-encoded-id}`), builds `task_logs_url`, leaves deprecated `task_logs=None`, and cannot recover the original `RunRequest` (always `None`).

### Generated Pydantic models (new)

`lib/galaxy/schema/wes/__init__.py` — generated by `datamodel-codegen` (pydantic v2) from the ga4gh WES OpenAPI spec (develop branch); 18 classes (`State` enum, `RunRequest`, `RunLog`, `TaskLog`, `ServiceInfo`, etc.). `lib/galaxy/schema/wes/gen.sh` regenerates with **no Galaxy-specific post-processing** — hand edits are lost on regen, and upstream is a moving target.

### Shared GA4GH utility + DRS refactor

`lib/galaxy/webapps/galaxy/services/ga4gh.py` (new) — `build_service_info(config, request_url, artifact, service_name, service_description, artifact_version)` returns a `galaxy.schema.drs.Service`, computing the org id from the reversed hostname and honoring `ga4gh_service_id` / `organization_*` / `ga4gh_service_environment` config. `api/drs.py` (`DrsApi.service_info`) drops ~30 lines of inline org/service building and calls the shared helper (`artifact="drs"`, version `1.2.0`). WES is the second consumer.

### Job stdout/stderr endpoints (new)

`lib/galaxy/webapps/galaxy/api/jobs.py` — two `@router.get` handlers (`get_job_stdout` / `get_job_stderr`), `response_class=PlainTextResponse`, returning `job.stdout or ""` / `job.stderr or ""`. WES `TaskLog` stdout/stderr fields link to `/api/jobs/{job_id}/stdout` and `/stderr`.

### Keyset pagination helper (new)

`lib/galaxy/model/keyset_token_pagination.py` — `KeysetToken` Protocol, `SingleKeysetToken` dataclass, and `KeysetPagination` with `encode_token` (base64 of JSON values) / `decode_token` (raises `MessageException` on bad tokens). WES task pagination supplies its own `TaskKeysetToken` implementing the same protocol.

### Request URL abstraction

`lib/galaxy/work/context.py` adds an abstract `url` property to `GalaxyAbstractRequest` (returns a starlette `URL`); `api/__init__.py` implements `GalaxyASGIRequest.url`. Needed so services can build absolute service-info URLs.

### Docs

`doc/source/admin/ga4gh.md` (new, +189) added to `doc/source/admin/index.rst` — covers DRS + WES admin/config with a `service-info` curl example.

## Changes since PR

Verified against `origin/dev` `e7a3f2254c0` (2026-11-14). First release with WES: v26.0.0. Use v26.0.2 or later, which has the state fix.

- `afdbddf0ca` (mvdbeek, 2026-01-27, merge day) — "Fix newly failing WES test." A cancel test now waits via `wait_for_invocation_and_completion(...)` and asserts invocation state `"completed"` instead of `"scheduled"`.
- `4afff175ea` (mvdbeek, PR #22351, fixes #22347; v26.0.2) — "Require authentication for WES list_runs endpoint." Anonymous requests crashed with `AttributeError` on `trans.user.id`; adds an `AuthenticationRequired` guard at the top of `list_runs`. The run-scoped endpoints kept the same bug (see Unresolved Questions).
- `685437ec66c` (jmchilton, PR #22857, 2026-06-08; v26.0.2) — maps `completed` to `COMPLETE` and `requires_materialization` to `INITIALIZING`. Before it, a finished run reported `UNKNOWN`.
- `1981c78e845` (2026-06-08) — developer guide `doc/source/dev/ga4gh_wes.md` with curl examples. It links two demo clients, `jmchilton/gxy-wes` and `jmchilton/gxy-wes-bioblend`.
- `e4e29c74e18` (2026-07-21) — `gxworkflow://` accepts any workflow the caller can access (owned, shared or published), not only owned ones. `250c71cfcc4` tightens the docs wording.
- `90e17de3fe8` (2026-07-21) — `gxworkflow://<id>?instance=true` runs the referenced version; before it ran the latest.
- `240b124f3fc` (2026-09-24) — task names use the step's `effective_tool_id`.
- `a8f39f2ba5a` (2026-10-14) — test helper move only.

`api/jobs.py` and `work/context.py` were later touched by unrelated commits; this PR's stdout/stderr endpoints and `url` property are intact. No files touched by this PR have moved or been renamed since merge.

## Behavior seen in use (2026-11)

The [[ga4gh_wes_tes]] project drove WES on v26.1.2 with real IWC workflows through about 60 runs. Its findings, with evidence in that project's `PULSAR_TES_IMPROVEMENTS.md`, `WES_TES_VS_GALAXY_APIS.md` and the demo repository they describe:

- URL and CWL-style `File`/`Collection` inputs in `workflow_params` work, though no test covers them. Galaxy materializes them before scheduling, without a job, so an IWC test file's `job:` block works almost unchanged. The dev guide's "inputs must be pre-staged" is wrong.
- The submit body must be form data; a JSON body fails.
- A run reports `COMPLETE` even when its jobs failed or are paused, and when a tool silently lost its discovered outputs.
- Collection outputs have no elements and no DRS URIs. Every short-read QC run needed 5 calls to Galaxy's own API (6 for a larger workflow) to fetch its outputs.
- DRS URIs name an unresolvable `drs.<host>`. Each object returns `202` with a 60 s `Retry-After` on first access even with Celery running (202 forever without Celery), and objects are served only for public datasets.
- Bugs: `use_cached_job` as a JSON boolean gives 500; run-scoped endpoints give 500 instead of 401/403 without credentials; cancel turns a COMPLETE run into CANCELED; a rejected submission leaves a workflow and history behind; omitted optional parameters come back as `{"__class__": "NoReplacement"}`. Fix branches on the `jmchilton` fork, without PRs: `wes_api_fixes_26_0` (these five) and `wes_run_state_executor_error_26_0` (EXECUTOR_ERROR for completed runs with failed or paused jobs; waiting on a decision, because Galaxy's docs say a failed job doesn't fail a run).
- No third-party WES client submits to Galaxy unmodified (tested 2026-11-15): GA4GH `wes-client` 5.0 refuses `.ga`/`.yml` files and drops its auth header on submit; the Dockstore CLI 1.18 sends `workflow_type=gxformat2` (400) and can't parse Galaxy's service-info; sapporo-web and the ELIXIR Cloud WES components can't get past CORS, which is off by default (`allowed_origin_hostnames` fixes it). With small client-side workarounds all four completed a run, including a Dockstore TRS launch of an IWC workflow. Galaxy's responses break the WES 1.1.0 schema 455 times in 38 of 67 responses, mostly optional fields sent as `null` (`request`, `run_log`, `cmd`), which crashed two of the clients.
- On the same Galaxy and job runner, the native invocation API returned a workflow's outputs in 44–57 s with 9 HTTP calls; WES took 290–322 s and 21 calls, 240 s of it in DRS waits.

## Tests

- `lib/galaxy_test/api/test_wes.py` (new, +929) — 27 test functions at merge, 29 on `origin/dev` (32 cases): service-info, run submission via URL / attachment / `gxworkflow://`, status, cancel, list, task listing + detail, pagination. Not covered: URL or CWL-style inputs, `use_cached_job`, `preferred_object_store_id`, anonymous run reads, DRS resolution. `test_wes_get_run_outputs_drs_uris` asserts nothing in practice: it checks string outputs, but outputs are dicts.
- `test/unit/model/test_keyset_token_pagination.py` (new, +92) — unit coverage for the pagination helper; unchanged since PR.
- `lib/galaxy_test/base/populators.py` (+5/-2) — adds `new_dataset_from_test_data(...)` (refactors `new_bam_dataset` onto it) and widens `wait_for_invocation_and_jobs` `workflow_id` to `Optional[str]`.
- `lib/galaxy_test/api/test_workflows.py` (+11/-5) — hoists `_show_workflow` to `BaseWorkflowsApiTestCase` and adds a `_latest_instance_id(...)` helper.

## Notes

PR body cross-checks against live code (all verified unless noted):

- "6 WES API endpoints" — the router actually defines **8** routes (6 core + 2 task-log); the body splits the count across two feature lists.
- The body's "Files Added" list is **incomplete** — it omits `keyset_token_pagination.py`, `schema/wes/gen.sh`, and both new test files.
- `gxworkflow://` scheme, endpoint paths, `/api/jobs/{id}/stdout|stderr`, `gx_workflow_ga` + `gx_workflow_format2`, codegen models, CBV router, and shared GA4GH utility — all verified.

WES is Galaxy's second GA4GH surface; the first is the partial TRS implementation noted in [[Component - Tool Shed Search and Indexing]]. There is no dedicated DRS vault note — this note carries the GA4GH/DRS-URI context for now. WES sits on top of the same invocation machinery as [[Component - Workflow API]] and reuses the import/normalize path from [[Component - Workflow Import]]; its async submit-then-poll shape parallels [[PR 20935 - Tool Request API]].

## Unresolved Questions

- Resolved: the missing `COMPLETE` mapping was fixed in `685437ec66c` (v26.0.2). Still open: `COMPLETE` covers runs whose jobs failed or are paused, so a client must check task exit codes or output states. Whether WES should report `EXECUTOR_ERROR` for those is the open decision on `wes_run_state_executor_error_26_0`.
- `service-info` still ships `auth_instructions_url` hardcoded to `"TODO"` (v26.1.2, `services/wes.py:374`).
- `_get_or_create_history` falls back to treating a decode failure as an already-decoded raw id — does this let a caller bypass id encoding?
- Output asymmetry — HDA outputs get DRS URIs, but collection (HDCA) outputs get only id-encoded ids. Still true on v26.1.2; in practice it forces clients back onto the native API for collection outputs.
- Answered: `get_run` and the other run-scoped endpoints are not anonymous-safe. They return 500 without credentials on v26.1.2; `wes_api_fixes_26_0` makes them 401/403.
- `gen.sh` has no post-gen patching; regenerating against the upstream WES `develop` branch could silently change the shipped models.
