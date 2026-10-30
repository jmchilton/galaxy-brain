---
type: research
subtype: component
tags:
  - research/component
  - galaxy/lib
  - galaxy/api
  - galaxy/admin
  - galaxy/tools/runtime
component: "Pulsar Input Staging"
galaxy_areas:
  - lib
  - api
  - admin
  - tools/runtime
status: draft
created: 2026-10-30
revised: 2026-10-30
revision: 2
ai_generated: true
summary: "How Pulsar job files move between Galaxy and Pulsar: path rewrites, file actions, FileStager, the job files API, job_key, and the shared-disk assumption"
sources:
  - "vault/agents/gx_research/archive/pulsar_input_staging.md"
  - "https://github.com/galaxyproject/galaxy/pull/24484"
  - "https://github.com/galaxyproject/galaxy/pull/22781"
related_prs:
  - 24484
  - 22781
  - 23856
  - 23933
  - 24564
  - 23850
related_notes:
  - "[[Component - Galaxy Pulsar Runner Code Sharing]]"
  - "[[Component - Job Completion Lifecycle]]"
  - "[[Component - Jobs API and Job Cache]]"
  - "[[Component - Tool Data Tables]]"
---

# Pulsar Input Staging

How a Pulsar job's files get from Galaxy to the compute side, and its outputs back, when the destination uses `rewrite_parameters` and a remote action such as `remote_transfer`.

Verified against:

- Galaxy `origin/dev` @ `65e6daff2334c8cfd4971682eecfb87f38a224be`. Paths are under `lib/galaxy/` unless noted.
- Pulsar client library `pulsar-galaxy-lib==0.16.0`, the version Galaxy pins (`lib/galaxy/dependencies/pinned-requirements.txt:209`). It was read from the PyPI wheel. Paths are under `pulsar/client/`.

## Scope

In scope: the Galaxy-side `PulsarComputeEnvironment` path rewrites, `ClientInput`/`ClientInputs`, Pulsar's `FileActionMapper`, `PathMapper` and `FileStager`, the job files API (`webapps/galaxy/api/job_files.py`, `managers/job_files.py`), the `job_key` credential, the shared-disk assumption, and the Pulsar version gates.

Out of scope: AMQP messaging, coexecution (Kubernetes, TES, GCP Batch), and Pulsar's server-side managers. Server-side staging is covered only as far as the `remote_staging` payload Galaxy hands over.

Two open PRs touch this area. Neither had merged at the cited SHA, so they're described separately under [Proposed changes](#proposed-changes-unmerged):

- #24484 adds identity-based input staging.
- #22781 hardens the job files API for user-controlled compute.

The restrictions the job files API has on `dev` came from #23856, #23933 and #24564, not from #22781.

## The two modes

`rewrite_parameters` is a destination parameter, read by `PulsarJobRunner.__rewrite_parameters` (`jobs/runners/pulsar.py:1186`). Galaxy then passes `rewrite_paths = not rewrite_parameters` to Pulsar (`:454`, `:632`). The two names mean opposite things:

| | `rewrite_parameters: true` | `rewrite_parameters: false` (legacy LWR) |
|---|---|---|
| Who chooses remote paths | Galaxy, while it evaluates the tool, through `PulsarComputeEnvironment` | Pulsar's `FileStager`, after the command line is built |
| Command line and config files | Already contain remote paths | Galaxy paths are rewritten by text find-and-replace (`staging/up.py` `JobInputs.rewrite_paths`) |
| Inputs Galaxy hands Pulsar | `ClientInputs` with types (input, extra files, metadata) and an `object_store_ref` | A flat path list, turned into `ClientInputs.for_simple_input_paths` (`staging/inputs.py:35`), which guesses the `_files` directory from the `.dat` name |
| Which inputs are staged | All of them (`FileStager.__stage_input` returns `True` when `rewrite_paths` is false, `up.py:356-362`) | Only those whose path appears in the command line or config files, matched by regex |

Every flavor except `PulsarLegacyJobRunner` defaults `rewrite_parameters` to true (`pulsar.py:1282-1399`). Default file actions by runner:

| Runner | `default_file_action` | Notes |
|---|---|---|
| `PulsarRESTJobRunner` | `transfer` | Galaxy pushes inputs to Pulsar's HTTP API |
| `PulsarMQJobRunner` | `remote_transfer` | `jobs_directory` required, `url` and `private_token` ignored |
| coexecution flavors | `remote_transfer` | out of scope |
| `PulsarEmbeddedJobRunner` | `copy` | Pulsar app in-process; `staging_directory` defaults to `<data_dir>/pulsar_staging` (`:348-349`) |
| `PulsarLegacyJobRunner` | (Pulsar default `transfer`) | `rewrite_parameters: false` |

## Submission flow (`rewrite_parameters: true`)

1. **Setup.** `__prepare_job` (`pulsar.py:568`) calls `client.setup(...)` and gets a `remote_job_config` back. That config holds the remote `inputs_directory`, `outputs_directory`, `working_directory`, `configs_directory`, `tools_directory`, `unstructured_files_directory`, the path separator, and `pulsar_version`. When the destination sets `jobs_directory`, as every MQ destination must, the setup runs locally. `LocalSetupHandler` derives the layout from `jobs_directory` without contacting Pulsar (`setup_handler.py`, `build_job_config`).
2. **Compute environment.** With `rewrite_parameters`, Galaxy builds `PulsarComputeEnvironment(client, job_wrapper, remote_job_config)` (`:594`, class at `:1401`). It wraps a Pulsar `PathMapper` built from the same client, so it sees the same `FileActionMapper` rules. `job_wrapper.prepare(compute_environment=...)` then evaluates the tool against the remote paths.
3. **Path rewrites during evaluation.** Tool wrappers call the compute environment lazily:
   - `input_path_rewrite` applies Galaxy's local rewrite (a false path) first, then `PathMapper.remote_input_path_rewrite` (`path_mapper.py:55`).
   - `input_extra_files_rewrite` is called when a template reads `extra_files_path`/`files_path` (`tools/wrappers.py:558`, `tools/runtime.py:84`). It derives `<remote input>_files` and records the local path → remote path pair in `path_rewrites_input_extra`.
   - `input_metadata_rewrite` is called for metadata files (`tools/wrappers.py:339`). It maps them to `inputs/metadata_<basename>` and records the pair in `path_rewrites_input_metadata`.
   - `unstructured_path_rewrite` handles `.loc`/data-table paths from select parameters (`tools/wrappers.py:242`). It goes through `PathMapper.check_for_arbitrary_rewrite`.
   - Output paths go to `outputs/<basename>`, or to the remote working directory for outputs under the local working directory (`path_mapper.py:48`).
4. **Client inputs.** In `queue_job` (`pulsar.py:433`), Galaxy builds one `ClientInput(path, INPUT_PATH, object_store_ref={dataset_id, dataset_uuid, object_store_id})` per input from `job_io.get_input_paths(materialized_objects)` (`:462-474`). It then adds `INPUT_EXTRA_FILES_PATH` entries from `path_rewrites_input_extra` and `INPUT_METADATA_PATH` entries from `path_rewrites_input_metadata`, with no `object_store_ref` (both are TODOs, `:477`, `:483`). Deferred inputs are already materialized here, because `get_input_paths` substitutes `materialized_objects` (`job_execution/setup.py:224-247`).
5. **Describe and submit.** `ClientJobDescription` (`:524-543`) bundles the command line, client inputs, `ClientOutputs`, config files, `tool_script.sh`, tool-required files, `arbitrary_files` (the unstructured rewrites), and `rewrite_paths`. `pulsar_submit_job` (`:544`, `staging/up.py:42`) builds a `FileStager`, then calls `client.launch(...)` with a `remote_staging` dict. That dict has three keys: `setup` (the list of actions Pulsar must perform), `action_mapper` (`FileActionMapper.to_dict()`, which includes `files_endpoint`), and `client_outputs`.

## File actions

`FileActionMapper` (`action_mapper.py:108`) decides an action per `(path, path_type)`. The first matching configured rule wins: `prefix` (the default), `glob`, `regex`, or `path_type_only`, limited by `path_types` (`*defaults*`, `*any*`, or a list). Without a rule, the action is `default_file_action` for the default path types and `none` for `unstructured`/`container` (`:260-273`). Work-directory, job-directory and metadata types are promoted from `none` to `copy`, because the working directory always moves.

Rules come from the `file_actions` destination parameter, or from a file named by `file_action_config` (`client.py:66-74`).

Each action's `staging` attribute decides who moves the bytes:

| Action | `staging` | Who moves bytes | How |
|---|---|---|---|
| `none` | none | nobody | path used as-is; assumes the same path on both sides |
| `rewrite` | none | nobody | prefix swapped (`source_directory` → `destination_directory`) |
| `transfer` | local | Galaxy handler | `client.put_file` uploads to Pulsar's HTTP API |
| `copy` | local | Galaxy handler | asks Pulsar for the path, then a filesystem copy |
| `remote_copy` | remote | Pulsar | filesystem copy of the Galaxy path |
| `remote_transfer` | remote | Pulsar | HTTP GET from the job files API; POST for outputs |
| `remote_transfer_tus` | remote | Pulsar | GET for inputs; TUS upload and then a POST of `session_id` for outputs |
| `remote_object_store_copy` | remote | Pulsar | reads from Pulsar's own object store by `object_store_ref`; inputs only |
| `remote_rsync_transfer` / `remote_scp_transfer` | remote | Pulsar | rsync/scp with `ssh_key`/`ssh_user`/`ssh_host` |

Classes at `action_mapper.py:381-635`.

For `inject_url` actions (the `remote_transfer` family), Galaxy mints the URL when it creates the action. `__inject_url` (`:284-293`) appends `path=<Galaxy-side path>&file_type=<path_type>` to `files_endpoint`. The URLs Pulsar later fetches therefore name **Galaxy filesystem paths**.

`remote_object_store_copy` is the only identity-based channel on `dev`. It uses the `object_store_ref` Galaxy already sends and needs Pulsar configured with access to the same object store. Pulsar's `preprocess` injects that store (`pulsar/managers/staging/pre.py:38-39`).

## `FileStager` on the Galaxy handler

`FileStager.__init__` (`staging/up.py:104-165`) runs in the job handler thread during `queue_job` and does the following:

- Reads every config file into memory (`JobInputs`), and finds tool files referenced under the tool directory.
- With `rewrite_paths` on, finds unstructured references by each unstructured mapper's pattern.
- Uploads, or registers remote actions for, tool files, job-directory files, inputs, the working directory, the metadata directory and arbitrary files.
- Uploads config files, rewritten when `rewrite_paths` is on, as `MessageAction`s (their contents travel in the message).

Inputs (`up.py:263-301`), deduplicated by path:

- `INPUT_PATH` becomes `TransferTracker.handle_transfer_source(source, "input")`.
- `INPUT_EXTRA_FILES_PATH` becomes `handle_transfer_directory(..., WHOLE_DIRECTORY)`. It walks the directory **on the Galaxy side** and stages each file as `inputs/dataset_N_files/<rel>`.
- `INPUT_METADATA_PATH` is staged as `metadata_<basename>`. The name must match `PathMapper.remote_input_path_rewrite`.

`handle_transfer_source` (`up.py:522-559`) works per file:

- A **local** action uploads now.
- A **remote** action appends `{name, type, action.to_dict()}` to `remote_staging_actions` and asserts that a job directory is known. This is why MQ destinations require `jobs_directory`.

Before any of that, `__action_for_transfer` (`:569-581`) **raises if the path does not exist on the handler**, whatever the action. Pulsar later replays `setup` server-side: `from_dict` → `write_to_path(job_directory.calculate_path(name, type))`.

## The job files API

`FastAPIJobFiles` (`webapps/galaxy/api/job_files.py:80`) is the Galaxy side of `remote_transfer`. It is documented as runner-only and not a stable API (`:51-54`). The routes are `public=True`, so there is no user session; authorization is the `job_key` alone. It was migrated from the legacy controller to FastAPI with `JobFilesManager` in #23933.

| Route | Purpose | Handler |
|---|---|---|
| `GET`/`HEAD /api/jobs/{job_id}/files?path=&job_key=` | stage an input, tool file, `.loc`, etc. | `JobFilesManager.readable_path` → `GalaxyFileResponse` (Range supported) |
| `POST /api/jobs/{job_id}/files` | write an output, working-directory or metadata file | `_start_upload` → body streamed to a staging directory → `_finish_upload` → `JobFilesManager.write` |
| `POST /api/job_files/tus_hooks` | accept every tusd hook | no-op; authorization happens when the session is consumed (`:171-178`) |
| `/api/job_files/resumable_upload` | TUS server for `remote_transfer_tus` | `tuspyserver` router into `job_files_tus_upload_dir` (`webapps/galaxy/fast_app.py:270-275`) |

`JobFilesManager` (`managers/job_files.py:25`) behaves as follows:

- **`_authorize`** (`:111-119`) needs both `path` and `job_key`. It compares `job_key` to `encode_id(job_id, kind="jobs_files")` with `safe_str_cmp`, then requires the job to be in `Job.non_ready_states`: new, resubmitted, upload, waiting, queued, running or finishing (`model/__init__.py:1823`). A finished job's files can't be read or written.
- **Reads** (`readable_path`, `:47-58`) are **not limited to the job's own files**. The class docstring says this is on purpose, because tools read unstructured inputs such as `.loc` files (`:26-29`). It returns 404 for a missing file and 400 for a directory. A `dataset_*.dat` path whose job has a purged input returns `ItemDeletionException`, which Pulsar handles (#22436).
- **Writes** (`authorize_write`, `:60-72`) must be absolute paths (#24564). The path must be inside the job's resolved working directory (`JobWorkingDirectory(job, object_store).resolve()`), or be an output dataset's file or lie under its `extra_files_path` (`_output_dataset_path`, `:131-146`). Anything else gets `ItemAccessibilityException`.
- **`write`** (`:101-109`) moves the staged file into place. It appends instead when the target already exists and ends in `tool_stdout`/`tool_stderr`.

Upload sources in `_finish_upload` (`api/job_files.py:151-169`), checked in this order:

1. nginx `__file_path`, which must lie under `nginx_upload_job_files_store` (#23856).
2. TUS `session_id`, which must match `^[\w-]+$` and exist in the TUS upload directory.
3. A multipart `file`/`__file` part.

When `path` and `job_key` are both in the query string (the shape Pulsar's `remote_transfer` uses), Galaxy authorizes **before** reading the body. It streams the body into a temporary directory next to the target, on the same filesystem, so the final step is a rename. For long uploads (≥ 1 MiB or ≥ 1 s), it rechecks only that the job is still active (`:121-138`, `:188-190`). Form-field authentication stages the body into `new_file_path` first.

## Credentials

| Credential | How it's made | Where it travels | What it authorizes |
|---|---|---|---|
| `job_key` (`kind="jobs_files"`) | `security.encode_id(job_id, kind="jobs_files")` (`jobs/runners/pulsar.py:769`). Deterministic, from the per-kind id secret; no expiry | In `files_endpoint`, so in every injected action URL and in `remote_staging.action_mapper`. Pulsar holds it for the job's life | `/api/jobs/{id}/files` reads of **any** handler-visible file and writes into the job's working directory and outputs, while the job is non-terminal. Also `POST /api/jobs/{id}/ports`, only while the job is `running` (`job_execution/ports/view.py:27-43`) |
| Token key (`kind=job_secret_base`, default `jobs_token`) | `pulsar.py:774-776` | `token_endpoint`, passed to `launch` | `GET /api/jobs/{id}/oidc-tokens`: the job owner's OIDC id token, while the job is non-terminal (`webapps/galaxy/api/job_tokens.py:54-70`) |
| `ssh_key` | destination param | `remote_staging.ssh_key` in the launch message (`client.py:331-332`) | Pulsar's rsync/scp against the configured host |
| TUS session id | random, from tusd | POST body | nothing alone: consumed only through a `job_key`-authorized POST |

`nginx_upload_job_files_path` swaps the files endpoint for an nginx upload location that takes `job_id`/`job_key` query parameters (`pulsar.py:771-772`).

## The shared-disk assumption

Several components need to see the same filesystem paths even under `remote_transfer`:

- **Handler ↔ datasets.** `FileStager` runs on the handler. It raises on any input path missing on the handler (`up.py:576-579`), walks extra-files directories locally, and reads config and tool files. On a caching object store, job preparation's `get_file_name()` pulls every input into the handler's cache first.
- **Web worker ↔ handler.** The job files API resolves the `path` query parameter on whichever web worker answers. Reads are `os.path.isfile(path)` on Galaxy-side paths minted by the handler. Writes resolve the handler's job working directory and the outputs' `get_file_name()`. Web workers therefore need the handler's job directories and dataset paths (or object store cache) mounted at the same paths. The read path never asks the object store for the bytes.
- **Pulsar ↔ Galaxy (only for `none`/`rewrite`/`remote_copy`).** These actions need a shared filesystem, or a known prefix mapping, between Galaxy and the compute side. `remote_transfer` removes this requirement, but the two above remain.

## Outputs, briefly

`__client_outputs` (`pulsar.py:1021`) describes outputs, working-directory outputs, the metadata directory and dynamic-discovery patterns. With `metadata_strategy: extended` and remote metadata, it asks only for the final model store. For `remote_*` actions, Pulsar posts files back to `files_endpoint?path=<Galaxy path>` (`RemoteTransferAction.write_from_path` → `post_file`). For local actions, Galaxy's `finish_job` pulls them through `pulsar_finish_job` (`staging/down.py:21`). Completion then follows [[Component - Job Completion Lifecycle]].

## Pulsar version gates

- `MINIMUM_PULSAR_VERSIONS` (`pulsar.py:89-94`) sets the floors: `_default_` 0.7.0.dev3, `remote_metadata` 0.8.0, `remote_container_handling` 0.9.1.dev0, and `dataset_collector_descriptions` 0.15.13.dev0. `check_job_config` (`:1119`) fails the job with `UnsupportedPulsarException` below the highest floor any requested feature needs.
- Version-dependent behavior at `dev`:
  - Older than 0.14.999 with `rewrite_paths`: `disable_commands_in_new_shell` (`:632-634`).
  - Collector descriptions are sent only from 0.15.13.dev0.
- **The version is whatever `remote_job_config["pulsar_version"]` says.** With local setup (any destination with `jobs_directory`, so all MQ destinations), that is `pulsar.__version__` of the **Galaxy-side client library** (`setup_handler.py` `build_job_config`), not the remote server's. Only REST setups ask the server. A gate on these destinations therefore tests Galaxy's pin.
- `queue_job` records the client and target versions as a job metric (`:445-450`, #23850). It also reads `remote_job_config["pulsar_version_source"]`, which `pulsar-galaxy-lib` 0.16.0 never sets, so the recorded source is always `unreported`.

## Proposed changes (unmerged)

### #24484: identity-based input staging (open, head `5913d07d`)

Read from the PR description only; no code from the branch is cited here.

- Adds the destination parameter `object_store_staging` (`stream` or `redirect`). For each input dataset and input metadata file, the runner hands Pulsar a signed URL, `GET|HEAD /api/jobs/{job_id}/staging/inputs/{dataset|metadata_file}/{id}`, instead of a job files URL. The handler stops pulling those inputs into its cache.
- The endpoint (`JobObjectStagingManager`) checks the signature, that the job is active, that the object is one of the job's inputs, and that it's present in the store. In `redirect` mode, a store with `enable_direct_download` returns a 15-minute presigned URL. Otherwise Galaxy streams from the store without filling the cache, or serves the file for disk stores.
- `StagingUrlSigner` signs with HMAC-SHA256 over job, kind, object, path and expiry, using a key derived from `id_secret` for this purpose only. The credential reads one input of one job until the job leaves `non_ready_states`, which is much narrower than `job_key`.
- Redirects are requested only from Pulsar 0.15.16 or later, because that version's curl transport follows them; older versions get streams. Given the version-source issue above, on MQ destinations this gate checks Galaxy's pinned client library, not the remote Pulsar.
- Inputs with no stored copy (deferred, materialized), tool files and outputs stay on the job files API. The web worker still needs the handler's job directory, so the shared-disk assumption narrows but doesn't go away. The PR needs galaxyproject/pulsar#553 and a pin above 0.16.0 for `ClientInput(url=...)`.

### #22781: Bring Your Own Compute for Pulsar (open)

Adds user-registered Pulsar compute behind a relay. It also hardens `job_files`/`job_ports`/`job_tokens` for untrusted holders of `job_key`: `Authorization: Bearer` instead of the query string, and least-privilege reads and writes through a new `job_execution/job_security.py`. Some job files hardening has already reached `dev` separately (#23856, #23933, #24564); the read restriction has not.

## Tests

- `test/unit/app/managers/test_JobFilesManager.py`: authorization (working directory, outside paths, wrong or other job's key, unknown or completed job, missing parameters).
- `test/integration/test_job_files.py`: read and write by state, purged inputs, Range, TUS, nginx, relative-path and invalid-source rejection, streaming, recheck, disconnect.
- `test/integration/test_job_files_remote_transfer.py` and `test_job_files_tus.py`: embedded Pulsar with `remote_transfer`/`remote_transfer_tus` over `simple_constructs` and `composite_output_tests`.
- `test/integration/test_pulsar_embedded*.py`: runner flavors and metadata modes.
- Nothing in Galaxy or Pulsar exercises `PathMapper.check_for_arbitrary_rewrite` with a staging action (see below).

## Issues found

- `PulsarComputeEnvironment._target_to_directory` drops the `pwd` result (`pulsar.py:1536-1537`): the branch computes `os.path.join(...)` without `return`. Tools whose source defaults `home_target` to `pwd` (non-XML sources, `tool_util/parser/interface.py:266-268`) get no `HOME` under `rewrite_parameters`. Recorded as `research_issues/pulsar-compute-env-pwd-home-target-dropped.md`.
- Pulsar's `PathMapper.check_for_arbitrary_rewrite` calls `action.unstructured_map()` without the required `path_helper` (`path_mapper.py:71` vs `action_mapper.py:323`). With `rewrite_parameters` and a staging rule for `unstructured` paths, data-table path rewrites would raise `TypeError`. The bug is still present on Pulsar `master` @ `827ece21`. Recorded as `research_issues/pulsar-arbitrary-rewrite-missing-path-helper.md`.
- `JobPortsView` and `FastAPIJobTokens` still hand-copy the `job_key` check that `JobFilesManager` centralized, and they drift from it in which job states count as active and in how an unknown job is handled. Recorded as `research_issues/job-ports-tokens-auth-drift.md`.

## Related

- [[Component - Galaxy Pulsar Runner Code Sharing]]: how Galaxy depends on `pulsar-galaxy-lib`; that note scopes staging out.
- [[Component - Job Completion Lifecycle]]: what happens after outputs land and `finish_job` runs.
- [[Component - Jobs API and Job Cache]]: the user-facing `/api/jobs` surface next to these runner-only routes.
