# Research: Galaxy WES, Pulsar TES, tesp-api

Stage 1 of the [GA4GH WES and TES project](index.md). Researched 2026-11-14. This is a reference for building the demo (stage 2) and planning Galaxy WES → tesp-api (stage 4). It is concrete on purpose: routes, config keys, file:line references, versions.

"Verified" means read in code, or run where stated. "Inferred" means reasoned from code but not run. Except where marked, no Galaxy, Pulsar, TES or WES service was started. The only things run were `docker manifest inspect` checks, a pull and inspection of the Pulsar staging image, Galaxy's mulled container resolver, and `urljoin` checks.

## Sources and versions

| Thing | Location | Version / SHA |
| --- | --- | --- |
| Galaxy (read only) | `~/projects/repositories/galaxy` | HEAD `65e6daff2334c8cfd4971682eecfb87f38a224be` (dev, 2026-10-30). `origin/dev` fetched at `a6ed8bfdf9d512ddaa5f4a13853dca98a4ebe5c2` (2026-11-14). |
| Pulsar (read only) | `~/projects/repositories/pulsar` | `08dedcb9bc951a073e173ae6ddb0ef8e9ec9e275` (`0.16.0-69-g08dedcb`, master 2026-11-13) |
| tesp-api (cloned this stage) | `~/projects/repositories/tesp-api` | upstream `main` `3d470f76d4289abf15ae4b047ad8e267f2a944a9` (2026-02-13), release `0.2.0`. Remote `mirelaminkova` fetched: fork `main` `c3a9f2376df7a634ad6c33959800d169219b7560` (2026-10-26). |
| CESNET Galaxy playbook (cloned) | `~/projects/repositories/cesnet-usegalaxy` | `1b87ceb6` (2026-11-12) |
| IWC (shallow clone) | `~/projects/repositories/iwc` | `c07557fbb01b5bf0b7d18a5d2473c1f1ef838f60` (2026-11-12) |
| Galaxy's Pulsar pins | `lib/galaxy/dependencies/pinned-requirements.txt` | `pulsar-galaxy-lib==0.16.0` (line 209), `pydantic-tes==0.4.0` (230), `kombu==5.6.2` (141). Same at `origin/dev`. |
| Pulsar staging image (pulled, inspected) | Docker Hub `galaxy/pulsar-pod-staging:0.15.0.2` | digest `sha256:2ccdf1d3b44814a6e11a3db6f33c6d13b047f5c728c7094330c62a044b1cff2c`, built 2023-02-08 |
| Funnel | github.com/calypr/funnel | v0.12.3 (2026-11-09), image `quay.io/ohsu-comp-bio/funnel:v0.12.3` |
| TESK | github.com/elixir-cloud-aai/TESK | chart v0.3.0 (2026-11-12): tesk-api 1.2.0, tesk-core 0.11.0 |

Short paths used below: `api/wes.py` = `lib/galaxy/webapps/galaxy/api/wes.py`; `svc/wes.py` = `lib/galaxy/webapps/galaxy/services/wes.py`; `runners/pulsar.py` = `lib/galaxy/jobs/runners/pulsar.py`; `test_wes.py` = `lib/galaxy_test/api/test_wes.py`. Galaxy line numbers are at HEAD `65e6daff`.

## 1. Galaxy's WES implementation

### History and releases

- PR #21335 "Implement GA4GH WES API" (jmchilton), merged 2026-01-27 by mvdbeek, milestone 26.0. Main commits: `9271e56062c`, `32b7ceee070` (keyset pagination), `81e21d4d638` (review fixes). First release with WES: `v26.0.0`.
- Follow-ups (all in `v26.0.2`, `v26.1.x`, `release_26.2`):
  - `4afff175ead` (PR #22351, fixes #22347): `list_runs` returns 403 for anonymous callers instead of crashing.
  - `685437ec66c` (PR #22857, 2026-06-08): maps `completed` to `COMPLETE` and `requires_materialization` to `INITIALIZING`. Before this a finished run reported `UNKNOWN`. **Use `v26.0.2` or later.**
  - `1981c78e845` (2026-06-08): developer guide `doc/source/dev/ga4gh_wes.md`, with curl examples. Admin docs are in `doc/source/admin/ga4gh.md`.
  - `e4e29c74e18` (2026-07-21): `gxworkflow://` accepts any workflow the caller can access (owned, shared, published), not only owned ones.
  - `90e17de3fe8` (2026-07-21): `gxworkflow://<id>?instance=true` runs that exact version.
  - `240b124f3fc` (2026-09-24): task names use `effective_tool_id`.
- No commit between HEAD and `origin/dev` touches the WES files. A few invocation-path changes affect it indirectly (section 1.10).
- Implementation plan issue #21315 is still open.
- Existing demo clients by jmchilton, linked from the dev guide: https://github.com/jmchilton/gxy-wes (requests-only CLI, `uvx gxy-wes demo --galaxy-url ...`; last updated 2026-06-08) and https://github.com/jmchilton/gxy-wes-bioblend. Both stage inputs through Galaxy's native API and pass `{"src": "hda", "id": ...}`. Stage 2 should start from these.
- The vault note [[PR 21335 - GA4GH WES API]] (revision 2) is out of date. It says there is no `COMPLETE` mapping (fixed in `685437ec66c`), lists no follow-ups beyond #22347, counts 27 tests (there are 29), and omits the dev guide.

### 1.1 Routes

All routes are on the class-based view `WesApi` (api/wes.py:60-162), `router = Router(tags=["wes"])` (api/wes.py:37). They are registered automatically by `include_all_package_routers` (`lib/galaxy/webapps/galaxy/fast_app.py:244`). **There is no config switch; WES is always on.** The paths are not under `/api/`.

| Method | Path | Handler (line) |
| --- | --- | --- |
| GET | `/ga4gh/wes/v1/service-info` (public) | `service_info` (64) |
| POST | `/ga4gh/wes/v1/runs` | `submit_run` (69) |
| GET | `/ga4gh/wes/v1/runs` | `list_runs` (100) |
| GET | `/ga4gh/wes/v1/runs/{run_id}` | `get_run` (110) |
| GET | `/ga4gh/wes/v1/runs/{run_id}/status` | `get_run_status` (120) |
| POST | `/ga4gh/wes/v1/runs/{run_id}/cancel` | `cancel_run` (129) |
| GET | `/ga4gh/wes/v1/runs/{run_id}/tasks` | `get_run_tasks` (138) |
| GET | `/ga4gh/wes/v1/runs/{run_id}/tasks/{task_id}` | `get_run_task` (150) |

- `run_id` is the encoded `WorkflowInvocation` id (a `DecodedDatabaseIdField`, api/wes.py:39-44). It also works with `/api/invocations/{id}`. A malformed id gives 400.
- `page_size` defaults to 10, range 1 to 100. `page_token` is opaque (api/wes.py:53-54).
- The same PR added `GET /api/jobs/{job_id}/stdout` and `/stderr` as plain text (`api/jobs.py:622`, `:637`). Task logs link to them.

### 1.2 Submitting a run (`POST /runs`)

The handler takes FastAPI `Form(...)`/`File(...)` parameters (api/wes.py:69-82). **The body must be `multipart/form-data`, or urlencoded when there is no file. A JSON body fails** (missing required `workflow_type`). Tests send urlencoded data for `workflow_url` (test_wes.py:67-88) and multipart for attachments (test_wes.py:862-866).

| Field | Required | Galaxy's handling |
| --- | --- | --- |
| `workflow_type` | yes | For inline or fetched workflows it must equal the detected type, `gx_workflow_ga` or `gx_workflow_format2`, else 400 (svc/wes.py:505-509). Ignored for `gxworkflow://`. `CWL`, `WDL` etc. always fail. |
| `workflow_type_version` | yes | Ignored. Tests send `v1`. |
| `workflow_url` | url or attachment | See below. Ignored when an attachment is present (svc/wes.py:187-198). |
| `workflow_attachment` | url or attachment | One `UploadFile` (api/wes.py:81), read as UTF-8. The spec allows an array; Galaxy reads one. |
| `workflow_params` | no | JSON string, passed unchanged as invocation `inputs` (svc/wes.py:549-554). |
| `workflow_engine_parameters` | no | JSON string (svc/wes.py:533-538); keys in 1.4. |
| `tags`, `workflow_engine`, `workflow_engine_version` | no | Accepted and ignored. |

Workflow sources (`_load_workflow_content`, svc/wes.py:159-224):

1. `workflow_attachment`: the file content.
2. `gxworkflow://<encoded_id>[?instance=true|false]` (parser svc/wes.py:110-156): a workflow already in Galaxy. `instance=false` (default) means a StoredWorkflow id and its latest version. `instance=true` means a Workflow version id. No new workflow is created. Inaccessible gives 403 (test_wes.py:563-579).
3. Any other `workflow_url`: fetched by `stream_url_to_str(workflow_url, trans.app.file_sources)` (svc/wes.py:209). Out of the box that resolves `http(s)://` (subject to `fetch_url_allowlist`'s local-IP check, `lib/galaxy/files/sources/http.py:104`), `base64://<b64>` (used in tests), and `drs://`. `file://`, `s3://` and `gs://` need an admin-configured file source, although service-info advertises them. Relative URLs pointing into an attachment are not supported ("Invalid uri", 400). There is no TRS handling. A raw descriptor URL such as a raw GitHub `.ga` or a TRS `PLAIN_GALAXY/descriptor` URL returns plain text and should work. A TRS JSON-wrapped descriptor would fail type detection (inferred).

Parsing uses `gxformat2.yaml.ordered_load` (YAML or JSON). `_determine_workflow_type` (svc/wes.py:227-253): `class: GalaxyWorkflow` gives `gx_workflow_format2`; a top-level `steps` or `workflow` key gives `gx_workflow_ga`; anything else gives 400.

Import (svc/wes.py:513-529): `normalize_workflow_format`, then `build_workflow_from_raw_description(..., WorkflowCreateOptions(archive_source="wes_api", fill_defaults=True), source="WES API")`. **Every inline submission creates a new, visible StoredWorkflow in the caller's account** (`hidden` defaults to False, `lib/galaxy/managers/workflows.py:902`). WES does not install tools. Missing tools fail the invocation, so the demo Galaxy must have the exact tool versions installed beforehand.

Invocation (svc/wes.py:543-576): an `InvokeWorkflowPayload` with `history_id`, `inputs_by="name"`, optional `inputs`, `preferred_object_store_id`, `use_cached_job`. It goes to `WorkflowsService.invoke_workflow`. The response is `{"run_id": "<encoded invocation id>"}`.

Smallest request, from `test_wes_submit_run_with_workflow_url` (test_wes.py:67-88):

```python
data = {
    "workflow_type": "gx_workflow_format2",
    "workflow_type_version": "v1",
    "workflow_params": json.dumps({"input1": {"src": "hda", "id": hda_id}}),
    "workflow_url": "base64://" + base64.b64encode(WORKFLOW_SIMPLE.encode()).decode(),
}
requests.post(f"{galaxy}/ga4gh/wes/v1/runs", data=data, headers={"x-api-key": key})
```

### 1.3 `workflow_params`

Keys are **workflow input labels**: `inputs_by="name"` matches each input step's `effective_label` (`lib/galaxy/workflow/run_request.py:129-172`). Step indexes and UUIDs are not accepted. A required input with no value and no default gives 400.

Value forms (verified in `run_request.py:448-530` and `lib/galaxy/tool_util_models/parameters.py:567-745`):

- Existing data: `{"src": "hda"|"hdca"|"ldda"|"ld"|"dce", "id": "<encoded>"}`. Access is checked. This is the only form the tests and Galaxy's docs use.
- URL dataset (`DataRequestUri`): `{"src": "url", "url": "https://...", "ext": "fasta"}`. `location` is an alias for `url`; `filetype`/`extension` are aliases for `ext`. Optional: `name`, `dbkey`, `deferred`, `hashes`, `tags`, `info`, `space_to_tab`, `to_posix_lines`.
- CWL-style file (`FileRequestUri`): `{"class": "File", "location": "https://...", "filetype": "fasta"}`.
- CWL-style collection (`DataRequestCollectionUri`): `{"class": "Collection", "collection_type": "list:paired", "elements": [...]}`. Elements carry `identifier`; nested `Collection` elements are allowed.
- Parameter inputs: plain JSON values under the label. A dict value gives 400.

URL forms are dereferenced into the target history (`dereference_input_to_hda`/`_hdca`, run_request.py:490-507). Unless `deferred: true`, the invocation starts in `requires_materialization` (`lib/galaxy/workflow/run.py:152-153`), reported as WES `INITIALIZING`. The workflow scheduler materializes the data in-process before scheduling (`lib/galaxy/workflow/scheduling_manager.py:553-557`); no job is created, so this never reaches a job runner or TES. With `deferred: true` the dataset stays deferred until a job needs it.

**This contradicts the "inputs must be pre-staged" statement in Galaxy's dev guide and in gxy-wes.** It is not covered by any WES test. It means an IWC test file's `job:` block can be used almost unchanged as `workflow_params` (only `path:` entries need rewriting to `location:` URLs). Verifying it live is the most useful thing stage 2 can check.

Worked example from tests (`test_wes_workflow_with_inputs_and_outputs`, test_wes.py:405-453): a format2 workflow with inputs `input1`, `input2` (data), one `cat` step and output `output1`; form fields `workflow_type=gx_workflow_format2`, `workflow_type_version=v1`, `workflow_params={"input1": {"src": "hda", "id": "<hda1>"}, "input2": {"src": "hda", "id": "<hda2>"}}`, `workflow_engine_parameters={"history_id": "<history>"}`, and the YAML as `workflow_attachment`.

### 1.4 `workflow_engine_parameters`

| Key | Effect | Code |
| --- | --- | --- |
| `history_id` | Run in an existing history owned by the caller. Not found or not owned gives 404. | svc/wes.py:300-312 |
| `history_name` | Name of the new history. Default `"WES Run"`; one new history per run. | svc/wes.py:314-337 |
| `preferred_object_store_id` | Passed to the invocation. | svc/wes.py:557-558 |
| `use_cached_job` | **Must be the string `"true"`/`"false"`.** Galaxy calls `.lower()`, so a JSON boolean probably gives a 500 (inferred). | svc/wes.py:559-560 |

Other keys are ignored. Native-API invocation options that WES can't reach: `parameters`/step parameters, `replacement_params`, `resource_params`, `require_exact_tool_versions`, `effective_outputs`, `no_add_to_history`.

### 1.5 State mapping and cancel

`GALAXY_TO_WES_STATE` (svc/wes.py:74-83), covering every `InvocationState` (`lib/galaxy/schema/states.py:81-89`):

| Galaxy invocation | WES |
| --- | --- |
| `new` | QUEUED |
| `requires_materialization`, `ready` | INITIALIZING |
| `scheduled` | RUNNING |
| `completed` | COMPLETE |
| `failed` | EXECUTOR_ERROR |
| `cancelling` | CANCELING |
| `cancelled` | CANCELED |
| other or null | UNKNOWN |

- `completed` means "all jobs have reached terminal states (ok, error, deleted, skipped, paused, stopped)" (states.py:89). **A run whose jobs failed still reports COMPLETE.** `EXECUTOR_ERROR` means only a scheduling failure. A client must check task `exit_code`s or output dataset states to judge success.
- `completed` is set by the `WorkflowCompletionMonitor` thread on the workflow-handler process, every `workflow_completion_monitor_sleep` seconds (default 5.0, `config_schema.yml:3917`; `lib/galaxy/app/__init__.py:1143-1156`; `lib/galaxy/managers/workflow_completion.py:80`). It needs no Celery. A run reads RUNNING for a few seconds after its last job ends.
- Cancel (svc/wes.py:667-687) calls `request_invocation_cancellation`. Cancelling a completed run moves it to `cancelling` and then `cancelled` (inferred from `WorkflowInvocation.cancel()`, `lib/galaxy/model/__init__.py:10188-10194`).

### 1.6 Run log, tasks, outputs

- **ListRuns** (svc/wes.py:578-627): the caller's invocations (including ones not started through WES), newest first, keyset-paginated. `next_page_token` is `null` at the end (the spec says `""`). Times use Python `isoformat()` without `Z`.
- **GetRunLog** (svc/wes.py:1111-1175): `request: null`, `run_log: null`, `task_logs: null`, `task_logs_url` relative (`/ga4gh/wes/v1/runs/<id>/tasks`), and `outputs` keyed by workflow output label (unlabeled: `"<output_name> (Step N)"`):
  - dataset: `{"src": "hda", "id": "<encoded>", "workflow_step_id": <int>, "drs_uri": "drs://drs.<host:port>/hda-<id>"}`;
  - collection: `{"src": "hdca", "id": "<encoded>", "workflow_step_id": <int>}` with no DRS URI;
  - parameter outputs: raw values.
- **Tasks** (svc/wes.py:689-1041): a UNION over single-job steps, mapped-over steps (one row per job), and no-job steps (inputs and subworkflow steps). Task id is `"<order_index>"`, or `"<order_index>.<job_index>"` for mapped jobs. `stdout`/`stderr` are relative URLs `/api/jobs/<id>/stdout|stderr` that need the API key. `cmd`, `system_logs` and `tes_uri` are never set. **Jobs inside subworkflows are not listed.** The mapped-collection test asserts task ids `{"0", "1.0", "1.1", "1.2"}` (test_wes.py:714-771).
- **Downloading outputs.** The simple route is `GET /api/datasets/{id}/display?to_ext=<ext>` with `x-api-key`; collections via `/api/dataset_collections/{id}` and their elements. DRS has limits: the `drs.<host>` hostname won't resolve without DNS, so a client must strip `drs.` and call `<galaxy>/ga4gh/drs/v1/objects/hda-<id>`; the DRS object endpoint serves only public datasets; and the first request returns 202 with `Retry-After: 60` while a Celery checksum task runs (`lib/galaxy/webapps/galaxy/services/datasets.py:571-603`).

### 1.7 service-info and config

`WesService.service_info` (svc/wes.py:356-442) on top of `build_service_info` (`services/ga4gh.py:14-77`):

- `id` `<ga4gh_service_id or reversed hostname>.wes`; `type` `{"group": "org.ga4gh", "artifact": "wes", "version": "1.0.0"}`; `version` = Galaxy version.
- `workflow_type_versions`: `{"gx_workflow_ga": ["1.0.0"], "gx_workflow_format2": ["1.0.0"]}`. `supported_wes_versions`: `["1.0.0"]`. `workflow_engine_versions`: `{"galaxy": ["1.0.0"]}`.
- `supported_filesystem_protocols`: hard-coded `["http", "https", "file", "s3", "gs"]`, partly wrong (see 1.2).
- `default_workflow_engine_parameters`: `history_name`, `history_id`, `preferred_object_store_id`, `use_cached_job`.
- `system_state_counts`: hard-coded zeros. `auth_instructions_url`: `"TODO"`.
- Config keys (optional, shared with DRS) in `lib/galaxy/config/schemas/config_schema.yml`: `organization_name` (3462), `organization_url` (3478), `ga4gh_service_id` (3492), `ga4gh_service_environment` (3509). Which URL schemes work depends on `file_sources_config_file`/`file_sources` and `fetch_url_allowlist`.
- Error bodies are Galaxy's `{"err_msg", "err_code"}`, not WES `ErrorResponse`.

### 1.8 Auth and visibility

- Galaxy's usual credentials (`lib/galaxy/webapps/galaxy/api/__init__.py:165-190`): `x-api-key` header or `?key=`; session cookie; `Authorization: Bearer <token>` accepted as an OIDC access token when an OIDC provider is configured (`lib/galaxy/managers/users.py:447-464`). The dev guide's "bearer not used" is true only without OIDC.
- service-info is public. `submit_run` and `list_runs` reject anonymous callers with 403. Run-scoped reads look up `trans.user.id` without an anonymous guard and probably give 500 for anonymous callers (inferred, same bug class as #22347).
- Visibility is owner-only, by the invocation's history owner. Admins can't read other users' runs through WES.

### 1.9 Spec conformance and limitations

- Models were generated from the WES spec `develop` branch on 2025-11-18 (`lib/galaxy/schema/wes/gen.sh`, no post-processing). They include 1.1.0 features (tasks endpoints, `task_logs_url`, `PREEMPTED`). service-info still says `1.0.0`.
- Only Galaxy workflow languages. No CWL, WDL or Nextflow.
- Single attachment; no relative attachment URLs; attachments are not staged as inputs.
- Ignored fields: `tags`, `workflow_type_version`, `workflow_engine*`. Always-null fields: `request`, `run_log`, `cmd`, `system_logs`, `tes_uri`.
- Relative URLs for `task_logs_url`, `stdout`, `stderr`.
- Invocation-level state only (failed jobs give COMPLETE). Subworkflow jobs not listed as tasks.
- `test_wes_get_run_outputs_drs_uris` (test_wes.py:272-292) asserts nothing in practice (it checks string outputs, but outputs are dicts).

### 1.10 Tests

All WES tests are in `test_wes.py`, class `TestWesApi(BaseWorkflowsApiTestCase)` (line 29): 29 functions, 32 cases. Templates for a demo client: `test_wes_workflow_with_inputs_and_outputs` (405), `test_wes_run_workflow_with_mapped_output_and_validate_output_content` (714), `test_wes_submit_run_with_workflow_url` (67). The request builder is `_submit_wes_workflow` (816-866). Not covered: URL or CWL-style inputs, `preferred_object_store_id`, `use_cached_job`, `tags`, http(s) `workflow_url`, anonymous reads, DRS resolution.

Indirect changes on `origin/dev` in the invocation path WES uses: disconnected required subworkflow inputs rejected with 400 (`4ff20afd574`, `14f1310fe20`); copied inputs charged to quota (`766931f5588`); exact-version tool lookups accept unversioned shed ids (`8c4e7457e12`); invalid stored parameter defaults give 400 instead of 500 (`3f65dd5a1f2`). The WES contract above holds at `origin/dev`.

### 1.11 PR discussion relevant to John's view

- jmchilton (2026-01-28): "I would not give this API a second thought though. I have a hard time believing native Galaxy APIs aren't going to produce a better experience."
- mvdbeek (2026-01-27): "This might be a nice target for end to end workflow runs via brc, where we likely don't need or want all of the galaxy-isms".
- mvdbeek (2025-11-20): subworkflow steps are not tracked, "so those will just be ignored in the logs".

## 2. Galaxy's Pulsar TES runner and Pulsar's TES client

### 2.1 Runner and parameters

`galaxy.jobs.runners.pulsar:PulsarTesJobRunner` (runners/pulsar.py:1344-1348):

```python
class PulsarTesJobRunner(PulsarCoexecutionJobRunner):
    destination_defaults = TES_DESTINATION_DEFAULTS      # tes_url required + coexecution defaults
    client_manager_kwargs = TES_CLIENT_MANAGER_KWARGS   # {"tes_enabled": True}
    use_mq = True
    poll = False
```

Hierarchy: `PulsarTesJobRunner` → `PulsarCoexecutionJobRunner` (`runs_job_script_in_container = True`, 1318-1321) → `PulsarJobRunner` → `AsynchronousJobRunner`.

Destination defaults (runners/pulsar.py:1307-1316, 1336-1339), injected by `_populate_parameter_defaults` (713-728):

| Param | Default | Notes |
| --- | --- | --- |
| `tes_url` | required | Missing gives "Pulsar destination does not define required parameter tes_url". |
| `default_file_action` | `remote_transfer` | Pulsar in the task pulls inputs from and pushes outputs to Galaxy over HTTP. |
| `rewrite_parameters` | `"true"` | Paths rewritten to `/pulsar_staging/<job_id>/...`. |
| `pulsar_container_image` | `galaxy/pulsar-pod-staging:0.15.0.2` | Galaxy's `DEFAULT_PULSAR_CONTAINER` (1307). Pulsar's own default `0.15.0.0` (`pulsar/client/coexecution.py:17`) **does not exist on Docker Hub.** |
| `remote_container_handling` | `True` | Galaxy resolves the container and passes the image id to Pulsar instead of wrapping the command in `docker run`. |
| `url`, `private_token` | ignored | Warns if set. |

TES destination parameters (`pulsar/client/tes_job_config.py:22-56`; `TesJobParams` subclasses pydantic-tes `TesResources`):

- `tes_url` (required).
- `authorization`: `none` (default) or `basic`. `basic_auth: {username, password}`. **The header is sent only when `authorization: basic` is also set** (tes_job_config.py:62-73). Galaxy's `job_conf.sample.yml:993-995` shows `basic_auth` without `authorization`, which silently sends no auth. There is no Bearer option.
- Resources: `cpu_cores`, `ram_gb`, `disk_gb`, `preemptible`, `zones`, `backend_parameters`, `backend_parameters_strict` (legacy `tes_` prefixed names also mapped, 35-44).
- `galaxy_instance_id`: only the task name `pulsar-<instance_id>-<galaxy_job_id>` (`pulsar/client/tes.py:127-131`).
- **`tes_url` with a path needs a trailing slash.** pydantic-tes builds `urljoin(tes_url, "v1/<path>")` (verified): `http://h:8000` → `http://h:8000/v1/tasks` (right for Funnel); `http://h/ga4gh/tes` → `http://h/ga4gh/v1/tasks` (wrong); `http://h/ga4gh/tes/` → `http://h/ga4gh/tes/v1/tasks`.

Runner plugin parameters (`PULSAR_PARAM_SPECS`, runners/pulsar.py:127-247): `amqp_url` (required in practice, 2.4), `galaxy_url` (falls back to `galaxy_infrastructure_url`, default `http://localhost:8080`; runners/pulsar.py:285-292), `amqp_key_prefix`, `amqp_acknowledge`, `amqp_consumer_timeout`, `amqp_publish_*`, `amqp_connect_ssl_*`. `relay_*` exists but does not work for TES.

Other destination parameters that matter: `pulsar_app_config` (dict) or `pulsar_app_config_path` (YAML on the Galaxy host, 497-501), which configures the Pulsar inside the task and must hold `message_queue_url`; `docker_enabled: true` (required for any container resolution); `docker_default_container_id`, `container_override`; `dependency_resolution` (`remote` default, `local`, `none`); `remote_metadata` (default false); `env`. `remote_pulsar_version` is not supported by pulsar-galaxy-lib 0.16.0 (only on Pulsar HEAD, `setup_handler.py:126-135`).

### 2.2 Container choice

With `remote_container_handling`, `__prepare_job` calls `self._find_container(job_wrapper)` (runners/pulsar.py:582-587), the normal finder (`lib/galaxy/tool_util/deps/containers.py:115-197`):

- With no container type enabled (`docker_enabled`/`singularity_enabled`) it returns `None` (containers.py:118-122).
- Order: `container_override` → `docker_container_id_override` → resolvers → the tool's `<container>` → `docker_default_container_id`.
- Default resolvers (containers.py:314-340) include explicit, cached_mulled, mulled (docker, biocontainers) and mulled_singularity when `enable_mulled_containers` is true (default). The mulled resolver returns `quay.io/biocontainers/<name>` without pulling (`container_resolvers/mulled.py:648-705`). **The Galaxy host needs HTTPS to quay.io but no Docker.**
- Tools with `requires_galaxy_python_environment` get no container (mulled.py:657).

With no container, the task has one executor: `pulsar-submit --wait` in the staging image, which installs dependencies with conda into `/pulsar_dependencies/conda` (`pulsar/client/client.py:393-416`) using the 2023 image's conda (Debian 9.8, Python 3.7.3). Expect that to be slow or broken. **Every tool sent to TES should resolve to a container.**

At HEAD, Galaxy still sends a `dependencies_description` for containerized jobs. `origin/dev` and `release_26.2` fix this (`19f8286868d`, "Skip Pulsar dependency resolution for containerized jobs"). On HEAD set `dependency_resolution: none`.

Tools that must not go to TES: upload (`__DATA_FETCH__`, `upload1`) and anything needing Galaxy's Python. The job conf `tools:` section supports `class: local` and `class: requires_galaxy` (`lib/galaxy/tools/__init__.py:1600-1611`); route both to a local runner. Galaxy's tests route `__DATA_FETCH__` only.

Galaxy runs the tool script with `default_job_shell` (default `/bin/bash`). Galaxy's TES tests set `/bin/sh` because their default container is `busybox:1.36.1-glibc`. Biocontainers include bash (from memory, unchecked).

### 2.3 What runs inside the TES task

`CoexecutionLaunchMixin.launch` (`pulsar/client/coexecution.py:43-123`) and `LaunchesTesContainersMixin._launch_containers` (`pulsar/client/tes.py:84-120`) build:

- `TesTask(name, executors, volumes=["/pulsar_staging/"], resources=...)`. **No TES `inputs`, `outputs`, `env` or `tags`.** The TES server needs no storage backend.
- With a tool container, three sequential executors, all `workdir="/"`:
  1. staging image: `pulsar-submit --no-wait --base64 <launch message> --app_conf_base64 <app conf>`. Stages inputs in and writes `/pulsar_staging/<id>/command_line`. Manager type `coexecution`, `monitor: none` (client.py:352-386).
  2. tool image: `sh -c` loop waiting for `/pulsar_staging/<id>/command_line`, then `sh $path` (coexecution.py:18-25, 98-111).
  3. staging image: `pulsar-finish --base64 ... --app_conf_base64 ...`. Stages outputs out and publishes the final status (`pulsar/scripts/submit_util.py:47-63`).
- With no tool container: one executor, `pulsar-submit --wait`, manager `unqueued`.
- Ports can't be exposed (`exposing container ports not possible via TES`, tes.py:113-115). **Interactive tools are impossible.**

The staging image (pulled and run): `galaxy/pulsar-pod-staging:0.15.0.2`, about 537 MB, amd64 only, `pulsar-app 0.15.0.dev1`, Python 3.7.3, Debian 9.8, kombu 5.2.4, galaxy-* 22.1 libraries, `pulsar-submit`/`pulsar-finish` in `/usr/local/bin`, CMD `bash`. It is the newest tag on Docker Hub (others: 0.15.0.1, 0.14.15.0, 0.14.0, 0.13.0, 0.12.0, 0.10.0). It is built from Pulsar's `docker/coexecutor/Dockerfile` (FROM `conda/miniconda3` plus a locally built Pulsar wheel).

Failure mode (inferred): `run_server_for_job` and `run_server_for_job_finish` catch `BaseException`, log it and exit 0. If stage-in fails before `command_line` is written, executor 1 exits 0 and executor 2 waits forever.

### 2.4 Status updates: an AMQP broker is mandatory

- `_init_client_manager` calls `pulsar.client.coexecution_manager.build_client_manager(tes_enabled=True, amqp_*...)` (runners/pulsar.py:305-327). `build_client_manager` (`pulsar/client/manager.py:530-565`) picks:
  - `relay_url` → `RelayClientManager`, which always returns a `RelayJobClient` (manager.py:510-516). **Relay doesn't work with TES.**
  - `amqp_url` → `CoexecutionMessageQueueClientManager`, whose `get_client` returns `TesMessageCoexecutionJobClient` when `tes_url` is set.
  - otherwise `CoexecutionPollingJobClientManager`. Galaxy's `_monitor` (runners/pulsar.py:293-303) then calls `ensure_has_status_update_callback`, which `PollingJobClientManager` lacks (manager.py:528-565). **Without `amqp_url` the runner probably fails at startup with AttributeError** (inferred). The polling TES client also lacks `full_status()`/`get_status()` (tes.py:161-166), and the two TES client docstrings are swapped (tes.py:162, 170).
- The Pulsar app inside the task (`message_queue_consume=False`, `submit_util.py:85-96`) publishes `full_status` messages on every state change to queue `<prefix>_status_update` on exchange `pulsar` (`pulsar/messaging/bind_amqp.py:73-103`; prefix rules `pulsar/client/amqp_exchange.py:357-370`). Default queue: `pulsar__status_update`.
- **The broker must be reachable from the TES executor containers** (`pulsar_app_config.message_queue_url`) **and from Galaxy** (runner `amqp_url`): one broker, possibly under two hostnames.
- Galaxy's `__async_update` (runners/pulsar.py:1254-1281) maps `running` → RUNNING, `complete`/`cancelled` → finish, `failed`/`lost` → fail. `finish_job` reads the final message from an in-memory status cache (client.py:447-452), so a Galaxy restart between message and finish probably fails the job.
- **No polling fallback.** `poll=False`; `check_watched_item` returns `None` for MQ jobs (runners/pulsar.py:360-389). Galaxy never calls TES `GET /tasks/{id}`. If the in-task Pulsar can't reach the broker or crashes, the Galaxy job stays queued or running forever.
- Pulsar's TES state map (tes.py:38-73) is used only by polling paths. It lacks `QUEUED` (logged as unknown, reported failed). pydantic-tes 0.4.0's `TesState` has no `PREEMPTED`.
- Task id: `create_task` returns the TES id; Galaxy stores it as `job_runner_external_id` (runners/pulsar.py:544-549). Galaxy PR #23367 (`abe22ca6281`, release_26.2) passes `external_id` alongside the Galaxy job id; Pulsar side PR #491 (0.15.16).
- Cancel: `stop_job` → `client.kill()` → `POST v1/tasks/{id}:cancel` (runners/pulsar.py:984-990; tes.py:141-142).

### 2.5 Staging model

- Inputs: `remote_transfer` makes the in-task Pulsar GET each file from Galaxy's job files API, `GET/POST {galaxy_url}/api/jobs/{encoded_id}/files?job_key=...` (runners/pulsar.py:772-778). The key is derived from `id_secret` (`encode_id(job_id, kind="jobs_files")`) and only accepted while the job is active (`lib/galaxy/managers/job_files.py:111-130`). The API is always on; no extra config.
- Outputs: POSTed back to the same API; writes are allowed only inside the job working directory or output dataset paths (job_files.py:60-71).
- Paths are Galaxy-side, so Galaxy needs a disk-backed object store. No shared filesystem between Galaxy and the TES worker. Executors share the TES volume `/pulsar_staging/`.
- Metadata: `remote_metadata` false by default, so Galaxy sets metadata locally after stage-out (`_complete_staged_job`, runners/pulsar.py:860-874).
- **Discovered outputs are silently lost with the default image.** Galaxy 26.0+ sends `dataset_collector_descriptions` instead of raw `discover_datasets` patterns once `pulsar_version >= 0.15.13.dev0` (runners/pulsar.py:93, 1033-1083). For coexecution the setup is built Galaxy-side, so `pulsar_version` is the client library's `0.16.0`, not the image's `0.15.0.dev1`. The old image ignores the new key, and tools with `discover_datasets` outputs finish green with those outputs missing. Pulsar's `docs/compatibility.rst` (lines 129-161, issue `collector-descriptions-version-gate` at 441-444) marks Galaxy 26.0, 26.1 and 26.2 with Pulsar `<0.15.13` as `broken`. Pulsar HEAD (commit `bbf4a54`, after 0.16.0) maps the `0.15.0.2` image to `0.15.0.dev1` (`setup_handler.py:16-24, 65-75`) so Galaxy falls back to legacy patterns. Fixes: install Pulsar HEAD into Galaxy's venv, or build a new staging image from `docker/coexecutor` and set `pulsar_container_image`.
- Other limitations of the old image (from `docs/compatibility.rst`): OIDC token endpoint ignored, job and tool stdio not separated, 26.2 features needing a 0.16 server unavailable.

### 2.6 Existing test setups

Neither project runs TES in CI.

- **Galaxy** `test/integration/test_coexecution.py`: `TestTesCoexecutionContainerIntegration` (351-362), `TestTesCoexecutionCustomAmqpKeyContainerIntegration` (365-376), `TestTesDependencyResolutionIntegration` (379-396). They inherit `@skip_unless_amqp()` (needs `GALAXY_TEST_AMQP_URL`) and `@skip_if_github_workflow()` (249-251), and read `tes_url` from `FUNNEL_SERVER_TARGET` (235). The infrastructure host is `172.17.0.1` on Linux, `host.docker.internal` on Mac (405-427). They set `galaxy_infrastructure_url = http://<host>:$GALAXY_WEB_PORT`, `default_job_shell: /bin/sh`, `tool_dependency_dir: none`, and temp `jobs_directory`/`file_path` (353-362, 399-402).

  `TES_CONTAINERIZED_TEMPLATE` (141-168):

  ```yaml
  runners:
    local:
      load: galaxy.jobs.runners.local:LocalJobRunner
      workers: 1
    pulsar_tes:
      load: galaxy.jobs.runners.pulsar:PulsarTesJobRunner
      amqp_url: ${amqp_url}
  execution:
    default: pulsar_tes_environment
    environments:
      pulsar_tes_environment:
        runner: pulsar_tes
        tes_url: ${tes_url}
        docker_enabled: true
        docker_default_container_id: busybox:1.36.1-glibc
        pulsar_app_config:
          message_queue_url: '${container_amqp_url}'
        env:
          - name: SOME_ENV_VAR
            value: '42'
      local_environment:
        runner: local
  tools:
    - id: __DATA_FETCH__
      environment: local_environment
  ```

  `${container_amqp_url}` is `GALAXY_TEST_AMQP_URL` with `localhost`/`127.0.0.1`/`0.0.0.0` replaced by the infrastructure host. The dependency-resolution template (171-196) drops the `docker_*` keys; the custom-key template (199-227) adds `amqp_key_prefix: pulsar_foobar34_`.
- **Pulsar** `test/integration_test.py`: `test_tes_polling_integration`, `test_coexecution_tes_polling_integration` (241-273), `test_coexecution_integration_tes_mq` (needs `PULSAR_RABBIT_MQ_CONNECTION`), `test_integration_tes_mq` (needs `PULSAR_TES_SERVER_TARGET`). Fixture `pydantictes.funnelfixture.funnel_client` reads `FUNNEL_SERVER_TARGET` (default `http://localhost:8000`); `DEPLOY` git-clones Funnel and runs `go build` (that now pulls calypr `develop` and needs Go 1.27.3). Tox `funnel` factor selects TES tests (`tox.ini:34-38`); GitHub Actions runs only `test-ci` (excludes `test_requires_tes`) and `test-unit` (`.github/workflows/pulsar.yaml:47-60`). A commented-out `test-funnel` job was deleted in `021a67a` (2026-09-15); it ran `PULSAR_TEST_INFRASTRUCTURE_HOST="_PLATFORM_AUTO_" FUNNEL_SERVER_TARGET=DEPLOY PULSAR_TES_SERVER_TARGET=http://localhost:8000/ tox -e test-funnel`. The polling tests probably can't pass (`pulsar/client/test/check.py:533-537` passes `tes_url`, not `tes_enabled`; inferred).
- pydantic-tes CI runs against Funnel `DEPLOY` and the public TESK `https://csc-tesk-noauth.rahtiapp.fi`; its last run (2026-04-13) failed.

### 2.7 Other known issues

- pydantic-tes posts `model_dump_json()` without `exclude_none`, so the task JSON carries `"id": null`, `"state": null`, `"inputs": null` (verified by running it). Funnel tolerated this in the past; a strict server may reject it (untested). pydantic-tes also has Funnel-specific response workarounds (`_hack_*_around_funnel`).
- TODOs near TES code: runners/pulsar.py:477, 483; `pulsar/client/manager.py:525`; `client.py:397`.

### 2.8 Version history

- Galaxy: PR #14777 (`5a3069d283e`, merged 2022-10-16) first shipped TES in **Galaxy 23.0**; PR #20862 (25.1) improved it; PR #23367 (release_26.2, no 26.2 tag yet; latest tag v26.1.2) persisted task ids.
- Pulsar: PR #302 (0.15.0, pydantic-tes based TES), basic auth (`29d0c83`, 2025-04, first in 0.15.9; see also PR #391), PR #491 (task ids, 0.15.16), PR #537 (0.16.0, split into `pulsar.client.tes` and `coexecution_manager`). All TES files are unchanged since tag 0.16.0. Galaxy HEAD imports `pulsar.client.coexecution_manager`, which first appears in 0.16.0.
- pydantic-tes 0.4.0 needs Python ≥3.10 and pydantic 2. Its models are TES 1.0 plus the 1.1 `backend_parameters` fields; no `PREEMPTED`, `ignore_error` or `streamable`. Pulsar requires `pydantic-tes>=0.1.5`.

### 2.9 Starting job_conf.yml for Galaxy → Pulsar TES → Funnel (not yet run)

Assumes Galaxy, RabbitMQ and Funnel on one Linux host, with task containers reaching the host at the Docker bridge gateway `172.17.0.1`.

```yaml
runners:
  local:
    load: galaxy.jobs.runners.local:LocalJobRunner
    workers: 2
  pulsar_tes:
    load: galaxy.jobs.runners.pulsar:PulsarTesJobRunner
    amqp_url: amqp://guest:guest@localhost:18672//      # broker as seen from Galaxy; required
    galaxy_url: http://172.17.0.1:18080                 # Galaxy as seen from task containers
    # amqp_key_prefix: pulsar_wes_tes_                  # isolates queues on a shared broker

execution:
  default: pulsar_tes
  environments:
    local:
      runner: local
    pulsar_tes:
      runner: pulsar_tes
      tes_url: http://localhost:18000/
      docker_enabled: true
      dependency_resolution: none                       # Galaxy HEAD only; not needed on release_26.2/dev
      # pulsar_container_image: <newer staging image>   # see 2.5
      cpu_cores: 1
      ram_gb: 2
      pulsar_app_config:
        message_queue_url: amqp://guest:guest@172.17.0.1:18672//   # broker as seen from task containers

tools:
  - class: local
    environment: local
  - class: requires_galaxy
    environment: local
```

Pair it with `galaxy.yml`: `galaxy_infrastructure_url: http://172.17.0.1:18080`, Galaxy bound to `0.0.0.0:18080`, the default disk object store, `tool_dependency_dir: none`.

## 3. tesp-api

### 3.1 Identity and status

- Source: https://github.com/CESNET/tesp-api. News post https://galaxyproject.org/news/2025-10-06-tesp-api/ (Boris Jurič, CESNET, 2025-10-06); e-INFRA blog https://blog.e-infra.cz/blog/tesp-api/ (2025-10-08).
- Only release: `0.2.0` (2026-02-12). `pyproject.toml:3` still says `0.0.1`; the service version comes from `CHANGELOG.md` via `ci/version.sh`.
- 244 commits, 2021-10-25 to 2026-02-13. Started as `ndopj/tesp-api` (Norbert Dopjera, FI MUNI). Main contributors: Josef Handl, Viktor Valkovský, Boris Jurič, micoleaoo, Jan Krystof, Martin Cech. Since February 2026 only bot PRs upstream. 5 stars, 6 forks.
- Active third-party fork: https://github.com/mirelaminkova/tesp-api, `main` `c3a9f23` (2026-10-26), 13 commits ahead, its own 69-issue audit and about 40 fix branches (quoting, S3, outputs, poll cap, stdio, conformance CI). Nothing merged upstream.
- November 2026: upstream issues #61 to #63 by uniqueg (ELIXIR Cloud & AAI) mention a planned ELIXIR Node NL (SURF) TESP deployment with LS Login.
- Open upstream issues: #22 S3, #28 more TES clients (Nextflow, Snakemake, cwl-tes, Cromwell; nothing ticked), #46 Galaxy never shows RUNNING, #48 PBS job names, #52 privileged compose, #62 configurable service-info, #63 access rules. Open PRs: #53 OAuth fix (WIP), #60 dependabot.
- The GA4GH TES README lists "TESP API" under **Client** implementations, not Server, and it is not in the compatibility matrix. Not on the GA4GH TES product page. CERIT-SC's TES/WES docs (https://docs.cerit-sc.cz/en/docs/workflows/teswes) offer TESK, not TESP. No talk or paper specifically about TESP was found.
- README says development only, not for production (README:118-120). The code agrees: dev Dockerfile, `uvicorn --reload`, source bind mount, DEBUG logging.

### 3.2 Architecture (verified at `3d470f7`)

- Python 3.10+, FastAPI 0.75 with pydantic v1, motor (MongoDB), aiohttp, aio_pika, dynaconf, PyMonad (pyproject.toml:11-28).
- Components: API process, MongoDB (db `tesp`, collection `tasks`), one Pulsar server.
- Processing is an in-process asyncio event chain: `queued_task` → `queued_task_rest` → `initialize_task` → `run_task` (task_endpoints.py:48-57; event_actions.py:35-315). No queue and no recovery: a restart strands in-flight tasks.
- Talks to the **Pulsar REST API** with its own aiohttp code (pulsar_operations.py:60-133), not pulsar-galaxy-lib:
  - `POST /jobs?job_id=<task id>` (setup), `POST /jobs/{id}/files?type=input&name=input_file_<i>` (inline content), `POST /jobs/{id}/submit?command_line=<shell string>` (the whole command line travels in the query string), `GET /jobs/{id}/status` polled every 4 s up to 400 times (settings.toml:4-5), `PUT /jobs/{id}/cancel` and `DELETE /jobs/{id}` on cleanup.
  - It never sends Pulsar's `private_token`, so the Pulsar server must run without one.
  - **Hard limit: 4 s × 400 polls ≈ 27 minutes.** After that the task is cancelled and marked SYSTEM_ERROR (event_actions.py:296-308). Configurable via `pulsar.status.max_polls`.
- Pulsar version: not pinned. The bundled image runs `pip install 'pulsar-app[web]'` (latest) on `python:3.9-slim-bullseye` (docker/pulsar_rest/Dockerfile:5,21). Its `app.yml` is two lines (no token, no MQ, default manager).
- **AMQP mode cannot work** (verified): `PulsarAmqpOperations._send_message` publishes to the default exchange with routing key `pulsar.queue` (pulsar_operations.py:152-157), while Pulsar consumes on exchange `pulsar` with queues `<prefix>_setup`/`<prefix>_kill` and expects one setup message holding the whole job. Use REST.

One TES task becomes **one Pulsar job** whose command is one shell string (event_actions.py:207-252):

```
set -xe && <stage-in container> && <executor 1 container> && ... && <stage-out container>
```

- Stage-in/out run in hard-coded `willdockerhub/curl-wget:latest` (event_actions.py:207; last pushed 2020-08-29).
- Each executor becomes `docker run ...` or `singularity exec ...` (container.py:164-228), chosen by the `CONTAINER_TYPE` env var of the tesp-api process (default `docker`, event_actions.py:32). **The compose file sets `CONTAINER_TYPE=singularity`** (docker-compose.yaml:9).
- Pulsar runs a shell command; the Pulsar host needs a docker CLI with daemon access, or apptainer. The bundled Pulsar image installs docker-ce and Apptainer 1.3.6 and mounts the host's `/var/run/docker.sock` (Docker-outside-of-Docker).
- `docker run` without `--rm` (container.py:216-220): exited containers pile up. Volumes become named Docker volumes `vol-<taskid>-<path without slashes>` (container.py:368-399), never removed.
- Inputs are bind-mounted per file from Pulsar's inputs directory, so the staging directory must exist at the same path on the Docker host (compose mounts `/opt/pysetup/files/staging/` into both containers).
- Executors run in sequence and stop at the first failure. TES 1.1 `ignore_error` is unsupported. `stdin`/`stdout`/`stderr` become shell redirections (container.py:77-147); their tests are commented out. `env` → `-e k=v`, `workdir` → `-w`. Resources: only `cpu_cores` and `ram_gb`.
- Because the outer Pulsar can use any manager, jobs can go to a batch system (issue #48 shows PBS at CESNET).

### 3.3 TES coverage

- service-info reports `org.ga4gh/tes/1.0.0`; every field is hard-coded (Masaryk University, `environment: dev`) (task_endpoints.py:126-146).
- Endpoints under `/v1` at the server root (api/api.py:7): `POST /tasks`, `GET /tasks`, `GET /tasks/{id}`, `POST /tasks/{id}:cancel`, `GET /service-info`. Not under `/ga4gh/tes/v1`. For pydantic-tes use `tes_url: http://host:8080/`.
- Views MINIMAL/BASIC/FULL are correct (endpoint_utils.py:91-97). List supports `name_prefix`, `page_size`, `page_token`; not the 1.1 `state`/`tag` filters. `next_page_token` is the string `"None"` on an empty page.
- States: QUEUED → INITIALIZING → RUNNING → COMPLETE / EXECUTOR_ERROR / SYSTEM_ERROR / CANCELED. Staging failures end as EXECUTOR_ERROR.
- Logs: one `TesTaskLog` with one `ExecutorLog` for the whole Pulsar job, holding Pulsar's combined output including the `set -x` trace. `logs[].outputs` never filled.
- **Cancel only sets CANCELED in MongoDB**; no Pulsar call, the container keeps running (task_endpoints.py:103-118; event_actions.py:263-268). A `kill_job` call (event_actions.py:292) refers to a method no class defines.
- `type` required on outputs (1.1 makes it optional). TES 1.1 fields are silently dropped (pydantic v1 ignores unknown fields).
- No conformance suite upstream. The fork added `ga4gh/openapi-test-runner` to its CI and filed failures as fork issues #19-#24, #28, #29, #31.

### 3.4 Storage and staging

- Inputs: `curl -f -o` (no `-L`, so no redirects) for http(s) and ftp; `wget --mirror` for directories; inline `content` via Pulsar's file API. `s3://` is accepted by the model but curl can't fetch it.
- Outputs: only HTTP multipart `POST -F file=@<path>` to an upload endpoint (container.py:319-366), like `tests/upload_server.py`. FTP and S3 outputs fail. The "HTTP, FTP, S3" claim is only partly true.
- An unused `FileTransferService` (S3, FTP, HTTP clients) is imported but never called.
- Data goes straight between storage and the Pulsar job directory, not through tesp-api.
- `docker/dts/docker-compose.yaml` (tests only): MinIO, an FTP server, a Flask HTTP server.

### 3.5 Deployment

- Compose services (docker-compose.yaml): `tesp-api` (dev target, privileged, host port 8080, source mounted at `/app`, staging dir mounted), `tesp-db` (`mongo:latest`, host port 8081, no auth), `pulsar_rest` (profile `pulsar`, built locally, privileged, port 8913, host docker.sock). Fixed container names and host ports clash on a shared host; use an override file.
- Config: dynaconf `settings.toml`, profile by `FASTAPI_PROFILE` (image sets `dev-docker`), env prefix `TESP_API_` (nested keys likely `TESP_API_PULSAR__URL`; untested). Keys: `db.mongodb_uri`, `pulsar.url`, `pulsar.status.poll_interval`, `pulsar.status.max_polls`, `pulsar.client_timeout`, `pulsar.amqp_url`, `logging.level`, `logging.output_json`, `oauth.enable`, `basic_auth.enable/username/password`.
- Published image `cerit.io/tesp-api/tesp-api:0.2.0` (exists; dev target). No Pulsar image is published. The Dockerfile copies `pyproject.toml` but not `poetry.lock`, so builds aren't reproducible; the fork reports bullseye apt 404s (fork issue #9, fixed in fork `ef287b2`; not checked).
- Minimum run from the README: `mkdir -p /opt/pysetup/files/staging`; `docker compose --profile pulsar up -d --build`; POST to `http://localhost:8080/v1/tasks`. Set `CONTAINER_TYPE=docker` for Docker executors.
- Auth: none by default (every task visible and cancellable by everyone). Basic auth: one static user from settings (missing credentials give 500). OAuth2 bearer mode exists; upstream PR #53 (WIP) is reworking its token validation, so don't rely on it. Pulsar's TES client supports only basic auth (added by Boris Jurič in 2025-04, commit `29d0c83`, first released in Pulsar 0.15.9).

### 3.6 How Galaxy uses it

- Since tesp-api PR #31 (merged 2025-03-14), Galaxy uses its **stock `PulsarTesJobRunner`** with `tes_url` pointing at tesp-api. The same PR deleted tesp-api's own prototype runner `tes-runner/tes.py` (derived from Galaxy PR #14462; view with `git show 3383391^:tes-runner/job_config.yaml`).
- Evidence: CESNET/usegalaxy issue #153 (2025-04-11; logs from a `pulsar_tes` runner, cancel traceback through pydantic-tes, fixed by tesp-api PR #43) and #240 (2025-10-30, open; several GTN workflows passing on `galaxy-qa2.galaxy.cloud.e-infra.cz`, some intermittent failures). The TESP job config is not in the public playbook.
- What tesp-api runs is the coexecution task from 2.3: three executors sharing `/pulsar_staging/` (a per-task named volume), no TES inputs/outputs, so its curl staging is skipped. Executor containers need outbound network to Galaxy and RabbitMQ.
- **Two Pulsars:** the outer Pulsar REST server is a remote shell runner (PBS at CESNET); the inner `pulsar-submit`/`pulsar-finish` does Galaxy staging. Galaxy could talk to the outer Pulsar directly with `PulsarRESTJobRunner`; tesp-api adds the TES interface, not capability Galaxy lacks.
- Caveats for Galaxy use: the ~27-minute poll cap; leftover containers and volumes; cancel doesn't stop containers; issue #46 (Galaxy never shows RUNNING); CESNET's `pulsar_container_image` and `max_polls` settings are unknown.

## 4. TES servers for the demo

| Server | Latest (date) | TES | Single host? | Executors | Notes |
| --- | --- | --- | --- | --- | --- |
| **Funnel** (calypr/funnel; ohsu-comp-bio/funnel is a redirect) | v0.12.3 (2026-11-09) | 1.1.0 | Yes: static Go binary | `docker run` on the host | Recommended. Very active. |
| TESK (elixir-cloud-aai/TESK) | chart v0.3.0 (2026-11-12) | 1.0.0 | Needs Kubernetes (chart CI uses kind) | K8s Jobs + filer pod + PVC | No kind/k3d/kubectl/helm installed here. Images `elixircloud/tesk-api:1.2.0`, `elixircloud/tesk-core-taskmaster:0.11.0` exist. Public `https://csc-tesk-noauth.rahtiapp.fi`. |
| tesp-api | 0.2.0 (2026-02-12) | 1.0.0 | docker compose | Pulsar REST → docker/singularity | Section 3. |
| PoiesisD | no release (2026-04) | 1.1 | `docker compose up`, :8080 | local Docker | Dev-only, S3-only filer. |
| Poiesis, Planetary | v0.2.0 each | 1.1 | Kubernetes only | K8s | Small. |
| proTES | v0.6.0 | — | — | proxy to other TES | Not an executor. |
| Microsoft ga4gh-tes, CromwellOnAzure | 6.1.0-beta (2025-03) | — | Azure | — | Archived. |

No GA4GH starter-kit TES, "pytes" or "TES-Gateway" exists. The GA4GH TES README compatibility matrix (tested August 2026) marks only Funnel compatible with Cromwell, Snakemake, Sprocket, Nextflow and py-tes; TESK "Unknown" everywhere; Pulsar column "Unknown"; Toil incompatible with every server.

**What Pulsar needs from a TES server:** run executors in order, share one TES volume between them, and allow outbound network from containers to Galaxy and the AMQP broker. Storage URL schemes don't matter.

### 4.1 Funnel details (sources: release notes, `internal/config/examples/default-config.yaml` and docs at v0.12.3)

- Routes are bound at `/tasks`, `/v1/tasks` and `/ga4gh/tes/v1/tasks` (same for service-info and cancel). Defaults: HTTP 8000 (API and dashboard), RPC 9090, boltdb, `Compute: local`, `Worker.WorkDir: ./funnel-work-dir`.
- Install: `curl -fsSL https://raw.githubusercontent.com/calypr/funnel/v0.12.3/install.sh | bash -s -- v0.12.3` (into `$HOME/.local/bin`), or release asset `funnel-linux-amd64-v0.12.3.tar.gz`.
- **Run the binary on the host.** `quay.io/ohsu-comp-bio/funnel:v0.12.3` ships nerdctl for containerd, not the docker CLI, while the worker's default `DriverCommand` is `docker`. Docker Hub `ohsucompbio/funnel` is stale (0.10.1, 2020). If containerized anyway, `Worker.WorkDir` must be mounted at the same absolute path inside and outside.
- Default run template: `run -i --read-only ... {{if .NeedsTmpfs}}--tmpfs /tmp{{end}} {{if .RemoveContainer}}--rm{{end}} ... --volume "{{.HostPath}}:{{.ContainerPath}}:rw" ... {{.Image}} {{.Command}}`. **No `--network`** (task containers on the default bridge) and **`--read-only` root filesystem**.
- v0.12.3 is a large upgrade (scheduler overhaul, Elasticsearch removed, config changes); the maintainer says TES API support is unchanged.

Candidate config (assembled from default config keys, not run; ports per the brief):

```yaml
Database: boltdb
Compute: local
EventWriters: [boltdb, log]
Logger: {Level: info}
Server:
  HostName: localhost
  HTTPPort: "18000"
  RPCPort: "19090"
  TaskAccess: All
RPCClient:
  ServerAddress: localhost:19090   # local worker talks RPC to the server (from memory)
BoltDB:
  Path: /srv/wes-tes/funnel/funnel.db
Worker:
  WorkDir: /srv/wes-tes/funnel/work
  LeaveWorkDir: true
  Container:
    DriverCommand: docker
    RunCommand: |
      run -i --read-only
      --add-host host.docker.internal:host-gateway
      {{.GPUArgs}}
      {{if and .EnforceResources .Resources}}{{if gt .Resources.CpuCores 0}}--cpus {{.Resources.CpuCores}}{{end}} {{if .MemoryMB}}--memory {{.MemoryMB}}m --memory-swap {{.MemoryMB}}m{{end}}{{end}}
      {{if .NeedsTmpfs}}--tmpfs /tmp{{end}}
      {{if .RemoveContainer}}--rm{{end}}
      {{.GetEnvArgs}}
      {{.GetTagArgs}}
      {{if .Name}}--name "{{.Name}}"{{end}}
      {{if .Workdir}}--workdir "{{.Workdir}}"{{end}}
      {{range .Volumes}}--volume "{{.HostPath}}:{{.ContainerPath}}:{{if .Readonly}}ro{{else}}rw{{end}}" {{end}}
      {{.Image}} {{.Command}}
LocalStorage:
  AllowedDirs: [/srv/wes-tes/data]
```

Run: `funnel server run --config funnel.yml` (or `FUNNEL_CONFIG`). CLI: `FUNNEL_SERVER=http://localhost:18000 funnel task list`. On the shared machine, cap `Node.Resources.Cpus`/`RamGb` and consider `Worker.Container.EnforceResources: true`. Remove `--read-only` if staging or tool containers need to write outside their volumes and `/tmp`. Root-owned files in the work dir are a known unsolved Funnel issue.

## 5. Interop facts

### 5.1 WES servers

| Server | `workflow_type` | WES | Status |
| --- | --- | --- | --- |
| Galaxy | `gx_workflow_ga`, `gx_workflow_format2` | 1.0.0 advertised | Merged 2026-01 |
| Cromwell | WDL only (CWL dropped after v79); WES routes `/api/ga4gh/wes/v1` built in since v80 | 1.0 | Active, release 92 (2026-01-30) |
| Toil (`toil server`) | CWL, WDL, py | v1 | Active, 9.6.0 (2026-10-20) |
| Sapporo (sapporo-service) | CWL, WDL, NFL, SMK, StreamFlow (engines cwltool, nextflow, toil, cromwell, snakemake, ep3, streamflow) | 1.1.0 | Active, 2.4.2 (2026-10-30) |
| WESkit | Snakemake, Nextflow | — | Active (v1.0.0, 2026-03) |
| cwl-WES (ELIXIR) | CWL via cwl-tes (archived) | 1.0 | Last release 2020 |
| workflow-service (`wes-service`) | CWL (cwl-runner, Arvados, Toil backends) | 1.0.0 | Low activity, v5.0 (2025-05) |
| Seqera Platform | NFL | — | Commercial |
| DNAstack cromwell-wes-service | WDL | — | Active |
| proWES (ELIXIR) | gateway | — | Active, no releases |
| Amazon Genomics CLI, CromwellOnAzure | — | — | Archived |
| Arvados, Terra/AnVIL | no native public WES found | — | — |

The GA4GH WES README lists workflow-service, cwl-WES, proWES, sapporo and weskit as known implementations. The spec says `workflow_type` "must be 'CWL', 'WDL', 'Nextflow', or 'Snakemake' currently (or another alternative supported by this WES instance, see service-info)". Galaxy's `gx_workflow_*` values are allowed but recognized by nobody else.

**No non-Galaxy WES runs Galaxy workflows.** Sapporo's `run.sh` dispatches to `run_${engine}` functions with none for Galaxy (one could be added, for example a `planemo run` wrapper; nothing exists).

### 5.2 WES clients against Galaxy

| Client | Would it work? |
| --- | --- |
| `wes-client` (pip `wes-service` 5.0) | **No.** `wf_info()` accepts only `.py`, `.wdl`, `.cwl` and raises otherwise (`wes_client/util.py`). |
| Dockstore CLI 1.18.0 `dockstore workflow wes launch` | **Probably not.** It sends Dockstore's descriptor type (Galaxy entries are `gxformat2` in `DescriptorLanguage.java`) and a TRS `PLAIN_<type>/descriptor` URL. Galaxy rejects a type that doesn't match its own names (svc/wes.py:505-509). Inferred, not reproduced. Accepting `gxformat2`/`GALAXY` as aliases would be a small Galaxy-side fix. |
| Dockstore "Launch with Galaxy" | Uses TRS import into Galaxy, not WES. |
| ELIXIR Cloud Components `ecc-client-ga4gh-wes` | **Plausibly yes.** Reads workflow types from service-info and posts standard multipart fields. |
| sapporo-web | Stale (2022). |
| proWES | Could front Galaxy in a federation (inferred). |

### 5.3 TES consumers and tesp-api

| Consumer | Needs from the server | tesp-api? |
| --- | --- | --- |
| Galaxy (Pulsar TES runner) | shared volume across executors, outbound network | Yes (CESNET QA). Circular: tesp-api is itself a Pulsar front end. |
| Cromwell TES backend | local or shared filesystem only | Only with a filesystem shared with the Pulsar host (inferred). |
| Nextflow `nf-ga4gh` 1.5.0 (2026-07) | shared work directory reachable by both (S3, Azure Blob...) | tesp-api's S3 doesn't work; HTTP-only outputs. Unlikely without work. |
| Snakemake `snakemake-executor-plugin-tes` 0.1.3 (2024, stale) | S3-style default storage, no shared FS | Needs S3 staging tesp-api lacks. |
| Toil (external plugin) | shared job store | Matrix: incompatible everywhere. |
| Sprocket (St. Jude, WDL) | TES 1.1 | Compatible with Funnel and Planetary per matrix; tesp-api untested. |
| py-tes 1.1.4 | — | Generic SDK. |

### 5.4 Registries

The ELIXIR On-Cloud registry API (`https://elixir-on.cloud/ga4gh/registry/v1/services`, v1.0.0rc2, freshly relaunched) listed on 2026-11-14 only itself and one Funnel TES at Berlin Institute of Health. No WES entries.

### 5.5 Summary against John's view

Supports it:

- Galaxy's WES accepts only Galaxy workflows, and no other WES server runs them.
- Common WES clients hardcode CWL/WDL (wes-client) or send type names Galaxy rejects (Dockstore CLI). Dockstore's Galaxy integration uses TRS import.
- Many WES fields are ignored or placeholders; native-API invocation options are unreachable; run state can't express job failure; subworkflow jobs are invisible.
- The WES ecosystem is thin: of five GA4GH-listed implementations two are low-activity, and AGC and CromwellOnAzure are archived.
- The PR author wrote that native APIs will give a better experience.
- On TES: neither Galaxy nor Pulsar tests TES in CI, and tesp-api's only demonstrated consumer is Galaxy's own Pulsar client.

Cuts the other way, modestly:

- URL and CWL-style File/Collection inputs mean a WES client may need no Galaxy-specific staging (untested).
- Service-info-driven portals (ELIXIR Cloud Components) and gateways (proWES) could include Galaxy beside other engines.
- IWC workflows are on Dockstore and WorkflowHub; with a type-alias fix, a TRS-aware launcher could run them headless.
- TES works for Galaxy without TES storage features, and tesp-api reached QA use at CESNET with real GTN workflows.

## 6. Likely gaps

### 6.1 Chain A: WES → Galaxy → PulsarTesJobRunner → Funnel

1. **Old staging image loses discovered outputs** (2.5). The top IWC pick avoids it (MultiQC's discovered collections `plots`/`png_plot` are off in the workflow: `export: False`, `png_plots: False`; fastp's paired output has fixed elements). QUAST in the runner-up has discovered collections (`metrics_tabular`, `metrics_pdf`). The real fix, for stage 3, is a new staging image built from Pulsar HEAD, or Pulsar HEAD in Galaxy's venv.
2. **Networking.** Funnel task containers sit on `docker0` and must reach Galaxy (`galaxy_url`) and RabbitMQ (`message_queue_url`). Bind Galaxy and RabbitMQ to `0.0.0.0` or the bridge IP, use `172.17.0.1`, and check that no host firewall blocks the bridge. `fetch_url_allowlist` doesn't matter for this direction.
3. **AMQP is mandatory, and there's no polling fallback** (2.4). Any lost message or crashed in-task Pulsar leaves a job stuck. The demo client needs timeouts. Use a dedicated `amqp_key_prefix` on a shared broker.
4. **Swallowed stage-in exceptions** can leave the tool executor waiting forever (2.3).
5. **Funnel `--read-only` root filesystem** may break the 2023 staging image (Python, conda caches) or tool containers writing outside volumes. Be ready to drop `--read-only`.
6. **Galaxy HEAD sends dependency descriptions for containerized jobs.** Use `dependency_resolution: none`, or run `release_26.2`/`origin/dev`.
7. **Tools must be preinstalled at the exact pinned revisions;** WES doesn't install them. Upload and data-fetch tools must route to a local runner. URL inputs are materialized by the workflow scheduler, not by a job (1.3), so they don't touch TES.
8. **WES reports COMPLETE even if tool jobs failed.** The demo client must check job states or task exit codes.
9. **Untested Funnel v0.12.3 config** and pydantic-tes's null fields against the reworked server.
10. **Shell:** Galaxy's default job shell is bash; biocontainers include it, but `docker_default_container_id` must also have bash, or use `default_job_shell: /bin/sh`.
11. **Galaxy version:** use `v26.0.2`+ for WES `COMPLETE`. `release_26.2`/`origin/dev` also has the dependency fix and persisted TES task ids. The local HEAD checkout lacks `19f8286868d`.

### 6.2 Chain B: WES → Galaxy → PulsarTesJobRunner → tesp-api → Pulsar REST → Docker

All of chain A's Galaxy- and image-side gaps apply, plus:

1. **The launch message travels in a URL query string twice.** Galaxy's `pulsar-submit --base64 <launch message>` is embedded in the shell string tesp-api sends to `POST /jobs/{id}/submit?command_line=...`. Real jobs can produce long messages. URL length limits in aiohttp, the Pulsar web server or a proxy are a likely failure point (untested).
2. **Shell quoting.** tesp-api builds `docker run ... <image> <command>` strings from executor fields without full quoting. Galaxy's tool executor is `sh -c` with a multi-line script containing `$path` and quotes. Expansion by the outer shell could break it (inferred). CESNET got it working after PR #31, so check the actual generated command early.
3. **`CONTAINER_TYPE=singularity` in compose;** set `docker`.
4. **Executor containers start from inside the `pulsar_rest` container via the host Docker socket.** They land on the host's default bridge and must reach Galaxy and RabbitMQ at `172.17.0.1`. The staging path must exist at the same host path.
5. **~27-minute cap** (`max_polls`); raise it.
6. **Fixed names and ports** (`tesp-api`, `tesp-db`, `pulsar-rest`, 8080, 8081) clash on the shared machine; write a compose override with `wes-tes-` names and 18xxx ports.
7. **Unpinned Pulsar and non-reproducible builds;** the bullseye base may fail to build (fork issue #9). Pin Pulsar and build locally.
8. **Leftover containers and volumes;** cancel doesn't stop containers; Galaxy never shows RUNNING (issue #46).
9. **Basic auth** needs `authorization: basic` on the Galaxy destination.
10. **AMQP mode is broken**; use REST between tesp-api and Pulsar. (The Galaxy ↔ in-task-Pulsar AMQP link is separate and still required.)
11. The mirelaminkova fork has fixes for several of these; evaluating it is a cheaper path than re-fixing upstream.

### 6.3 Candidate IWC workflows

All images were resolved with Galaxy's own `find_remote_mulled_name(..., "biocontainers", "v2")` and confirmed with `docker manifest inspect`. Requirements came from the Tool Shed install-info API for the exact changesets in each `.ga`. IWC CI already tests every workflow with `--biocontainers`; no workflow has a `.tt_biocontainer_skip` marker.

**Top pick: `workflows/read-preprocessing/short-read-qc-trimming/short-read-quality-control-and-trimming.ga`** (release 0.7; tests `short-read-quality-control-and-trimming-tests.yml`). Verified against the clone.

| Step | Label | Type |
| --- | --- | --- |
| 0 | `Raw reads` | `list:paired` collection, required |
| 1 | `Adapter to remove on forward reads` | text, optional |
| 2 | `Adapter to remove on reverse reads` | text, optional |
| 3 | `Qualified quality score` | integer, optional, default 15 |
| 4 | `Minimal read length` | integer, optional, default 15 |
| 5 | fastp | `toolshed.g2.bx.psu.edu/repos/iuc/fastp/fastp/1.4.0+galaxy0` (iuc/fastp@4990e6f1348f), `quay.io/biocontainers/fastp:1.4.0--h43da1c4_0` (21 MB) |
| 6 | MultiQC | `toolshed.g2.bx.psu.edu/repos/iuc/multiqc/multiqc/1.35+galaxy5` (iuc/multiqc@94b6bea727ae), requirements multiqc=1.35, python=3.13, grep=3.12, `quay.io/biocontainers/mulled-v2-8374e50c663bfd36021a9219b02d97e9c4baaad5:783e4c36591c28e0c25d1c1084e0a4a5ca32fd17-0` (395 MB) |

- Test data (Zenodo record 11484215): `https://zenodo.org/records/11484215/files/paired_r1.fastq.gz` (20,980,051 B) and `.../paired_r2.fastq.gz` (23,127,980 B), `fastqsanger.gz`, 2 × 301 cycles, 300,000 reads.
- Assertions: `MultiQC HTML report` has_text "Filtered Reads", "pair"; `fastp JSON report` element `pair` has_text "paired end (301 cycles + 301 cycles)", "300000", "295680", "59230948". Also output `fastp trimmed reads` (`list:paired`).
- Why: two tools, no `$__tool_directory__` scripts, no Galaxy built-ins, no discovered outputs in use, and a collection input that exercises WES collection mapping and mapped-over tasks.
- Risks: optional text params are `null` in the tests file (planemo sends that; whether WES accepts `null` or needs the key omitted is to be checked); MultiQC has an unconnected optional `image_content_input` saved as a RuntimeValue (passes IWC CI).

Candidate `workflow_params`:

```json
{
  "Raw reads": {
    "class": "Collection", "collection_type": "list:paired",
    "elements": [
      {"class": "Collection", "collection_type": "paired", "identifier": "pair",
       "elements": [
         {"class": "File", "identifier": "forward", "filetype": "fastqsanger.gz",
          "location": "https://zenodo.org/records/11484215/files/paired_r1.fastq.gz"},
         {"class": "File", "identifier": "reverse", "filetype": "fastqsanger.gz",
          "location": "https://zenodo.org/records/11484215/files/paired_r2.fastq.gz"}
       ]}
    ]
  },
  "Qualified quality score": 15,
  "Minimal read length": 15
}
```

**Runner-up: `workflows/genome-assembly/assembly-with-flye/Genome-assembly-with-Flye.ga`** (release 0.5). One dataset input, `Input sequence reads`.

| Step | Tool | Image |
| --- | --- | --- |
| 1 | `bgruening/flye/flye/2.9.6+galaxy0` (@643e0ff70be5) | `quay.io/biocontainers/flye:2.9.6--py313h7fbb527_1` (137 MB) |
| 2 | `iuc/quast/quast/5.3.0+galaxy2` (@cbc516cee202) | `quay.io/biocontainers/mulled-v2-754a47f7005ac2c33e46ba3a97ef68abb6ef71f8:aac2489b1179db17f28c2868c3a8e41d4474683a-0` (754 MB) |
| 3 | `iuc/fasta_stats/fasta-stats/2.0` (@0dbb995c7d35) | `quay.io/biocontainers/mulled-v2-d06ddf0327bc580784d87b349a635b5fc6d1dfdb:2b74db8f123b62f925b2a8cac2f5fcce87bd055f-0` (91 MB) |
| 4 | `iuc/bandage/bandage_image/2022.09+galaxy4` (@86ec2f06de3c) | `quay.io/biocontainers/bandage_ng:2022.09--h60d1f2b_4` (351 MB) |

- Test data: `https://raw.githubusercontent.com/galaxyproject/iwc/c07557fbb01b5bf0b7d18a5d2473c1f1ef838f60/workflows/genome-assembly/assembly-with-flye/test-data/Input_reads.fastqsanger.gz` (916,066 B, SHA-1 `18f30f2a901e027bb3b8e9d99a102b15c2648477`).
- Assertions on 7 outputs (`has_text`, `has_size`, `has_n_lines` ranges).
- Risks: `fasta-stats` runs `${__tool_directory__}/fasta-stats.py`, which depends on Pulsar staging tool files to the worker (`pulsar/client/staging/up.py`; unproven on TES); QUAST has discovered collections (gap 6.1.1); about 1.3 GB of images.

**Third option: `workflows/text-manipulation/filter-matrix-by-highly-variable-features`.** Five steps, a 57 KB input, required integer `number of features to keep` (500). Shows Galaxy core tools in TES containers: `join1` resolves to `quay.io/biocontainers/galaxy-util:25.0.2` (and runs `join.py` from the tool directory) and `Show beginning1` to `coreutils:8.31--h14c3975_0`.

Not recommended first: the imaging nuclei-segmentation workflow (7 steps, ~1.8 GB images, six tool-directory scripts; a good later stress test) and average-bigwig (outputs ~140 MB each).

## Open questions for later stages

- Do URL/CWL-style `workflow_params` work end to end through WES (1.3)?
- Is `null` accepted for optional parameter inputs?
- Does the Funnel config in 4.1 work as written, including `--read-only` with the 2023 staging image?
- Does a staging image built from Pulsar HEAD work with Galaxy's 0.16.0 client and fix discovered outputs?
- For tesp-api: how long are real launch messages, and do they survive the `command_line` query string and the shell quoting?
