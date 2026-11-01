---
type: research
subtype: component
tags:
  - research/component
  - galaxy/lib
  - galaxy/api
  - galaxy/admin
  - galaxy/tools/runtime
  - galaxy/security
component: "Pulsar Input Staging"
galaxy_areas: [lib, api, admin, tools/runtime, security]
status: draft
created: 2026-10-28
revised: 2026-10-28
revision: 1
ai_generated: true
summary: "How Pulsar file actions, path rewriting and the job files API move job files between Galaxy and Pulsar, with credentials and suspected bugs"
sources: ["/Users/jxc755/projects/repositories/galaxy-brain/.ingest-dossiers/Component-Pulsar-Input-Staging.md"]
related_notes:
  - "[[Component - Galaxy Pulsar Runner Code Sharing]]"
  - "[[Component - Object Store Cache and Direct Access]]"
  - "[[Component - Private Object Stores]]"
  - "[[Component - YAML Tool Runtime]]"
  - "[[Component - API Tests]]"
  - "[[Component - Backend Dependency Management]]"
related_prs: [23933, 23856, 22781, 24484]
---

# Pulsar Input Staging

Verified against Galaxy `origin/dev` @ `7761eeb3256` and Pulsar tag `0.16.0` (`9c34a78b`). Galaxy pins `pulsar-galaxy-lib==0.16.0` (`lib/galaxy/dependencies/pinned-requirements.txt:209`). Pulsar `master` (`827ece21`) differs in `pulsar/client` only in `transport/tus.py` (#548, #549). Galaxy paths are relative to the Galaxy root; `pulsar.py` means `lib/galaxy/jobs/runners/pulsar.py`. Pulsar paths are relative to `pulsar/client/`.

**In scope:**
- the Galaxy Pulsar runner's path rewriting and `ClientInputs`;
- Pulsar's client-side `FileActionMapper`, `PathMapper`, `FileStager` and results collection;
- the job files API;
- which disks must be shared;
- what each credential authorizes.

**Out of scope:** AMQP/relay transport, coexecution (k8s/TES/GCP) and Pulsar's server-side managers. How `pulsar.client.*` reaches Galaxy's code is in [[Component - Galaxy Pulsar Runner Code Sharing]].

**Pending, not on dev:**
- #24484 adds identity-based staging.
- #22781 (draft) restricts the job files API further.

Both are summarized in [Pending](#pending-not-on-dev).

## Overview

Galaxy describes a job's files. Pulsar's client library, running inside the Galaxy **handler**, maps each file to an *action*. Then one of two parties moves the bytes:

- **Local actions** (`transfer`, `copy`, `message`): the handler moves files during `submit_job` and `finish_job`.
- **Remote actions** (`remote_transfer`, `remote_transfer_tus`, `remote_copy`, `remote_object_store_copy`, `remote_rsync_transfer`, `remote_scp_transfer`): the handler serializes the action into the launch payload, and the Pulsar server carries it out. `remote_transfer` and `remote_transfer_tus` call back into Galaxy's **job files API** (`/api/jobs/{job_id}/files`), authorized by a per-job `job_key`.

`rewrite_parameters` decides, independently, where paths are changed:
- `true` (REST, MQ, embedded and coexecution flavours): Galaxy renders the command with remote paths, through `PulsarComputeEnvironment`.
- `false` (legacy): Galaxy renders local paths, and Pulsar's `FileStager` rewrites the command line and config files with regexes and string replacement.

## Runner flavours and defaults

| Runner class | `default_file_action` | `rewrite_parameters` | `dependency_resolution` | Notes |
|---|---|---|---|---|
| `PulsarJobRunner` (base, `pulsar.py:272`) | unset, so the client default `transfer` (`client.py:66`) | unset, so false (1186-1187) | `remote` (1148) | |
| `PulsarLegacyJobRunner` (1282-1288) | `transfer` | `false` | `local` | |
| `PulsarMQJobRunner` (1291-1304) | `remote_transfer` | `true` | `remote` | `jobs_directory` required. `url` and `private_token` are ignored with a warning. |
| `PulsarRESTJobRunner` (1371-1379) | `transfer` | `true` | `remote` | `url` required |
| `PulsarEmbeddedJobRunner` (1382-1394) | `copy` | `true` | `remote` | in-process `PulsarApp` |
| Coexecution (1307-1368) | `remote_transfer` | `true` | | out of scope |

`_populate_parameter_defaults` (711-727) fills a default only when the destination leaves the key out.

## Galaxy side: describing the job

### Client and endpoints (`get_client`, 757-787)

- `files_endpoint`: `{galaxy_url}/api/jobs/{encoded_id}/files?job_key={job_key}`, where `job_key = security.encode_id(job_id, kind="jobs_files")`. With `nginx_upload_job_files_path` set, it becomes `galaxy_url + nginx_upload_job_files_path + "?job_id=…&job_key=…"` instead.
- `token_endpoint`: `/api/jobs/{id}/oidc-tokens`, using a **different** key `kind=job_secret_base` (default `"jobs_token"`).
- `galaxy_url`: the runner param, falling back to `galaxy_infrastructure_url` (286-291).
- `get_client_from_wrapper` (737-746) expands `$__user_*__` user properties in destination params. `get_client_from_state` (748-755), which finish, stop and recover use, does not (B9).

### `PulsarComputeEnvironment` (1401-1545)

When `rewrite_parameters` is true:
1. `__prepare_job` calls `client.setup()`. It returns `remote_job_config`: working, job, inputs, outputs, configs, tools, unstructured and metadata dirs, the separator, `pulsar_version`, and optional `tmp_dir`/`shared_home_dir`.
2. It builds `PulsarComputeEnvironment` (591-595), which wraps a `pulsar.client.path_mapper.PathMapper`. That `PathMapper` builds its own `FileActionMapper`, so the same rules decide both where a file will be and later how it moves.
3. The tool evaluator asks the compute environment for every path:

| Hook | Behaviour |
|---|---|
| `input_path_rewrite` (1430-1437) | local path (via `local_path_config` or `get_file_name()`), then `remote_input_path_rewrite`. A staging action gives `<inputs_directory>/<basename>`. A non-staging action gives `action.path_rewrite()`, which is **`None` for `none`**. The caller then falls back to the local path (`tools/runtime.py:91`). |
| `output_path_rewrite` (1439-1446) | same, but paths inside the local job working dir go to the remote working dir |
| `input_extra_files_rewrite` (1448-1452) | `dataset_path_to_extra_path(remote input path)`: strip `.dat`, append `_files` (`job_execution/compute_environment.py:15-17`). **Records** the dir in `path_rewrites_input_extra`. Only recorded dirs get staged. |
| `output_extra_files_rewrite` (1454-1457) | same, from the output path. Records nothing. |
| `input_metadata_rewrite` (1459-1471) | remote name `metadata_<basename>`. Records it in `path_rewrites_input_metadata`. Skips `local_path_config.input_metadata_rewrite`, as its own comment admits. |
| `unstructured_path_rewrite` (1473-1485) | `PathMapper.check_for_arbitrary_rewrite`. Broken when the rule stages files (B1). |
| `container_path_rewrite` (1487-1497) | `rewrite` actions only. Staging actions are warned about and ignored. |
| `working_directory`, `config_directory`, `tool_directory`, `version_path` | read from `remote_job_config` |
| `home_directory`, `tmp_directory` (1520-1539) | the `pwd` branch is missing its `return` (B6) |

Callers in the evaluator:
- `tools/runtime.py:70-91`: paths, and Directory-datatype extra files;
- `tools/wrappers.py:236-261`: select-option paths and data-manager bundles;
- `tools/wrappers.py:338-341`: metadata files;
- `tools/wrappers.py:550-558`: `$input.extra_files_path` and `files_path`;
- `tools/evaluation.py:680-693`: unstructured values.

### `ClientInputs` (`queue_job`, 452-493)

With a compute environment:
- `INPUT_PATH`: one `ClientInput` per `job_io.get_input_paths(...)`, carrying `object_store_ref={dataset_id, dataset_uuid, object_store_id}`;
- `INPUT_EXTRA_FILES_PATH`: one per recorded extra-files dir, with **no** `object_store_ref`;
- `INPUT_METADATA_PATH`: one per recorded metadata file, with **no** `object_store_ref`.

Without one (legacy):
- `ClientInputs.for_simple_input_paths` (`staging/inputs.py:35-46`) takes `get_input_files()`;
- it guesses `<path minus .dat>_files` beside each input when that directory exists on the handler;
- it describes **no metadata files** (G6).

`ClientJobDescription` (524-543) also carries:
- config files (`extra_filenames`, `tool_script.sh`, env files);
- the working dir;
- `metadata_directory`;
- the tool directory's required files;
- `arbitrary_files`;
- `rewrite_paths = not rewrite_parameters`;
- `touch_outputs`, `env`, `container`, `remote_pulsar_app_config` and `job_directory_files`.

### `remote_metadata`, `dependency_resolution`, outputs

**`dependency_resolution`** is `none`, `local` or `remote` (1147-1151). Only `remote` sends a `DependenciesDescription`.

**`remote_metadata`** (1154-1156):
- builds the command with metadata included;
- gives each output a remote `false_path` (`__build_metadata_configuration`, 1189-1252);
- ships `registry.xml` when `use_remote_datatypes` is false.

On finish, `handle_metadata_externally = not remote_metadata` (859).

**Outputs** (`__client_outputs`, 1021-1102):
- With `metadata_strategy == "extended"` **and** `remote_metadata`, only the extended-metadata model store pattern is collected.
- Otherwise: output files, work-dir outputs, dynamic discovery patterns, `galaxy.json` (path-guarded by `safe_path_from_directory`, 109-122), and the runtime-env warning file.
- `finish_job` rebuilds the description for the Pulsar version the job **was submitted to** (826-828).

## Pulsar client side

### `FileActionMapper` (`action_mapper.py:108-303`)

- **Config:**
  - `file_action_config` (a YAML or JSON path) or inline `file_actions` (`client.py:70-74`);
  - `default_file_action` (validated at `client.py:66-68`);
  - `files_endpoint`;
  - the `ssh_*` keys.
- **Path types** (58-87): `input`, `config`, `tool`, `workdir`, `jobdir`, `metadata`, `output`, `output_workdir`, `output_metadata`, `output_jobdir`, `unstructured`, `container`.
  - The default action applies to the first ten.
  - `unstructured` and `container` default to `none`.
  - The job-directory types turn `none` into `copy` (264-267), because Pulsar always relocates the job directory (G4).
- **Rule matchers** (702-846), each with optional `path_types` and `depth`:
  - `prefix` (default): bare `startswith` (B2);
  - `glob`;
  - `regex`;
  - path-type-only.
- `__inject_url` (284-293) sets each URL-based action's `url` to `files_endpoint&path=<path>&file_type=<type>`. Galaxy ignores `file_type`.

| Action | Moves bytes | Input | Output |
|---|---|---|---|
| `none` (381-397) | nobody | same path on both sides | same path |
| `rewrite` (400-434) | nobody | `source_directory` replaced by `destination_directory` | same |
| `transfer` (437-442) | handler, over Pulsar's REST API | `client.put_file` → `upload_file` | `download_output` |
| `copy` (445-450) | handler, through the filesystem | `put_file` → `_copy` into Pulsar's path | `_copy` back |
| `remote_copy` (453-476) | Pulsar server, through the filesystem | opens the Galaxy path | copies to the Galaxy path |
| `remote_transfer` (479-508) | Pulsar server, over HTTP to Galaxy | job files `GET` | multipart `POST` |
| `remote_transfer_tus` (511-517) | Pulsar server | `GET` | TUS upload to `/api/job_files/resumable_upload`, then `POST session_id` |
| `remote_object_store_copy` (520-545) | Pulsar server, through **its** object store | `get_filename(Bunch(id, uuid, object_store_id))` | `NotImplementedError` |
| `remote_rsync_transfer`, `remote_scp_transfer` (548-635) | Pulsar server, over SSH | rsync/scp get | rsync/scp put |
| `message` (638-669) | in-memory content | rewritten config files | n/a |

Remote actions go into `launch_kwds["remote_staging"]["setup"]` (`staging/up.py:64-72`), and the server rebuilds them with `from_dict`. The `ssh_key` isn't in each action's dict; the server puts it back from the mapper's settings. This is a known false positive, so don't file it.

### `FileStager` (`staging/up.py:91-363`)

Order of work:
1. Setup (or the supplied `job_config`).
2. Tool files: the `required_files` list, or a regex scan.
3. In legacy mode, unstructured files matched by the rule patterns.
4. Uploads: tool files, job-dir files, inputs, the working dir, the metadata dir, unstructured files.
5. In legacy mode, register output and config renames, then `str.replace` them through the command line and configs.
6. Ship rewritten configs as `message` contents.

How each input type is handled:

| `ClientInput` type | Handling | Remote name |
|---|---|---|
| `INPUT_PATH` | `handle_transfer_source(INPUT)` | basename |
| `INPUT_EXTRA_FILES_PATH` | walks the dir **on the handler** | `<basename(dir)>/<relpath>` |
| `INPUT_METADATA_PATH` | `INPUT` | `metadata_<basename>` |

- `handle_transfer_source` (522-557) calls `__action_for_transfer` first. That raises if the path is missing on the handler, **whatever the action** (575-579). So even `remote_*` jobs stat every input on the handler at submit (G3, B7).
- Local actions then upload. Remote actions only record a setup entry at `job_directory.calculate_path(name, type)`.

### Results collection (`staging/down.py`)

`ResultsCollector.collect` (72-79) walks, in order:
- work-dir outputs, including directories and globs;
- declared outputs plus their `_files` dirs;
- the version file;
- dynamic or `galaxy.json` files;
- the metadata dir.

Who runs it:
- For **local** actions, Galaxy's `finish_job` downloads or copies the files.
- For **remote** actions, the Pulsar server runs the same collector and pushes the files, and the client-side collector skips them.

Failure policy (226-311):
- **Every HTTP 403 is swallowed** as "output purged" (B4).
- Other failures fail the job through `collection_failure_exceptions` (`pulsar.py:839-842`).

## Job files API (dev)

The FastAPI CBV is `lib/galaxy/webapps/galaxy/api/job_files.py`. Its routes are `public=True`; `job_key` is the only auth. It came from #23933 (FastAPI migration), after #23856 (hardening).

| Route | Purpose |
|---|---|
| `GET`/`HEAD /api/jobs/{job_id}/files?path=&job_key=` (84-98) | read a file. Range is supported. |
| `POST /api/jobs/{job_id}/files` (100-169) | write a file: multipart part, TUS `session_id` or nginx `__file_path` |
| `POST /api/job_files/tus_hooks` (171-178) | tusd hooks |
| TUS `/api/job_files/resumable_upload` (`fast_app.py:271-279`) | resumable upload into `job_files_tus_upload_dir` |

`JobFilesManager` (`lib/galaxy/managers/job_files.py`):
- **`_authorize`** (109-127):
  - `path` and `job_key` are required (400);
  - the key must equal `encode_id(job_id, kind="jobs_files")` (403);
  - the job must exist (404);
  - the job must be in `Job.non_ready_states` (403, "already completed").
- **Reads** (`readable_path`, 47-58): any existing regular file. The docstring says this deliberately isn't limited to the job's own files, because tools read `.loc` files and similar. A missing input that was purged gives `ItemDeletionException`, which is a 400.
- **Writes** (`authorize_write`, 60-70): any path inside the job's directory, or equal to or inside an output file or its `extra_files_path`. The upload is staged in a `mkdtemp` beside the target and `shutil.move`d into place.
  - `tool_stdout` and `tool_stderr` are appended to, so Pulsar can stream output tails.
  - The body is parsed straight to disk.
  - Long uploads re-check that the job is still active.
- **Upload sources:**
  - nginx `__file_path` must be inside `nginx_upload_job_files_store`;
  - TUS `session_id` must match `^[\w-]+$` and exist in the TUS directory.

The `jobs_files` key also unlocks sibling endpoints:
- `POST /api/jobs/{id}/ports` (`job_execution/ports/view.py:26-40`): same key kind, but the job must be `running`. Interactive tools use it.
- `GET /api/jobs/{id}/oidc-tokens` (`api/job_tokens.py:36-69`) uses the `job_secret_base` key and answers 401, not 403, for a bad key (B13).

## Data flow by action

**`transfer`** (REST default):
1. The handler renders remote paths.
2. `FileStager` POSTs every input, extra file, metadata file, tool file, config file and the working/metadata dir contents to Pulsar's REST API with `private_token`.
3. Pulsar runs the job.
4. `finish_job` downloads the outputs.

Pulsar never contacts Galaxy.

**`copy`** (embedded default): like `transfer`, but the handler `cp`s into and out of Pulsar's staging dir, so the handler must see that dir.

**`remote_transfer` / `remote_transfer_tus`** (MQ default):
1. At submit, the handler stats each input and walks each extra-files dir. It emits setup entries with `url=files_endpoint&path=<galaxy path>`.
2. The Pulsar server `GET`s each URL. **Whichever web worker answers** opens that path on its own disk.
3. After the run, the Pulsar server's collector POSTs each output, work-dir file and metadata file to the same endpoint. A web worker authorizes the path and renames the upload into place.
4. Galaxy's own `finish_job` collects nothing for these actions.

On caching object stores, the handler must already have pulled inputs into the cache. #24484 exists to avoid that; see [[Component - Object Store Cache and Direct Access]].

**`remote_copy`, `none`, `rewrite`**: no bytes move. Pulsar opens Galaxy's paths directly (`remote_copy`), uses them unchanged (`none`), or uses them under another prefix (`rewrite`). All three assume shared storage.

**`remote_object_store_copy`**: the Pulsar server reads inputs through its own object store config, using `object_store_ref`. It works only for primary inputs, and outputs are unsupported (B5). Use it only in a per-rule `path_types: input` entry.

**`rewrite_parameters: false`** (legacy):
1. Galaxy renders local paths.
2. `FileStager` uploads everything in `input_files`.
3. It string-replaces local paths with remote ones in the command line and config files.

Input metadata files are not staged in this mode (G6).

## Shared-disk assumption

| Action | Handler ↔ Pulsar staging | Pulsar/compute ↔ Galaxy data | Web workers ↔ handler |
|---|---|---|---|
| `none` | no | **same paths** | no |
| `rewrite` | no | **same files, other prefix** | no |
| `copy` | **handler sees Pulsar staging** | no | no |
| `remote_copy` | no | **Pulsar sees Galaxy paths** | no |
| `transfer` | no (HTTP) | no | no |
| `remote_transfer` / `_tus` | no | no (HTTP back) | **yes** |
| `remote_object_store_copy` | no | Pulsar sees the same object store | no |
| `remote_rsync` / `_scp` | no | SSH to a host that sees Galaxy paths | no |

The `remote_transfer` row is the subtle one. Galaxy names every file by **handler-local path**: inputs (cache paths on caching stores), extra-files dirs, metadata files, the job working dir and outputs. Any web worker may answer the GET or POST. So web workers must mount the handler's job dirs, `file_path`, the object-store cache and the TUS/upload dirs. #24484's description says the same: in practice, NFS between Galaxy hosts.

Every action also requires the handler to read inputs at submit time.

## Credentials

| Credential | Minted by | Held by | Authorizes | Lifetime | Transport |
|---|---|---|---|---|---|
| `job_key` (`kind="jobs_files"`) | `security.encode_id(job_id, kind="jobs_files")` (`pulsar.py:769`; also `jobs/__init__.py:2949` for ports) | handler, the Pulsar server (inside action URLs and the launch payload), interactive-tool containers | **read** any regular file the web process can read; **write** under the job dir and to output files and their extra-files dirs; **ports** callback while running | Deterministic from `id_secret`, no expiry. Becomes useless once the job leaves `non_ready_states`. Revocable only by rotating `id_secret`. | query string, so it appears in access logs |
| OIDC token key (`kind=job_secret_base`, default `jobs_token`) | `pulsar.py:774-776` | Pulsar server (`token_endpoint`) | `GET /api/jobs/{id}/oidc-tokens` returns the job owner's fresh OIDC id token | same as `job_key` | query string |
| Pulsar `private_token` | admin (Pulsar `app.yml`, plus the destination's `private_token` or `https://TOKEN@host/`) | handler | every Pulsar REST call (`upload_file`, `download_output`, `launch`, `clean`, …) | static | query arg. Ignored for MQ. |
| `ssh_key` | admin (destination or per-rule) | handler, then the Pulsar server | SSH as `ssh_user` to `ssh_host`, with whatever that account can read and write | static | launch payload, then a temp key file |
| AMQP / relay credentials | admin | both | message transport | static | out of scope |
| Pulsar-side object store credentials | admin | Pulsar server | reading datasets for `remote_object_store_copy` | static | Pulsar config |
| #24484 staging URL (not on dev) | `StagingUrlSigner` (HMAC, with a key derived from `id_secret`) | Pulsar server | read one input of one job | expiry, plus the job's state | URL |

## Pending, not on dev

- **#24484** (open) adds `object_store_staging: stream|redirect`.
  - Inputs and their metadata files get HMAC-signed URLs at `GET|HEAD /api/jobs/{job_id}/staging/inputs/{dataset|metadata_file}/{id}`.
  - Those URLs are served by streaming from the store, by a 15-minute presigned redirect, or from disk.
  - It needs `ClientInput(url=...)`, which comes from galaxyproject/pulsar#553 and isn't in 0.16.0.
  - It defers composite extra files and leaves `api/job_files.py` unchanged.
- **#22781** (draft) would:
  - accept `Authorization: Bearer`;
  - limit job files reads to the job's own files;
  - add tenant-scoped key kinds and a tighter write allowlist for "bring your own compute";
  - reject symlinks;
  - add `galaxy.job_execution.job_security`.

  None of this exists on dev.

## Suspected bugs

Confidence:
- **H**: verified by reading the code and by a probe script against `pulsar-galaxy-lib==0.16.0`;
- **M**: verified by reading only;
- **L**: speculative.

Unless noted, the Pulsar items are unchanged on Pulsar `master`.

- **B1 (H) `unstructured` staging breaks when `rewrite_parameters` is true.** `path_mapper.py:71` calls `action.unstructured_map()` without the required `path_helper` argument (`action_mapper.py:323`), which raises a `TypeError`.
  - Pulsar's own documented sample (`docs/files/file_actions_sample_1.yaml`, a glob/unstructured/transfer rule with depth 1) triggers it on REST, MQ or embedded.
  - Even once fixed, `unstructured_path_rewrite` caches a name, not a remote path (`pulsar.py:1475-1481`).
- **B2 (H) Prefix rules ignore path boundaries.** `PrefixPathMapper._path_matches` is a bare `startswith` (`action_mapper.py:766-767`), while its `to_pattern` requires a separator. With the docs' own `/galaxy/data` → `/work/galaxy/data` rewrite, `/galaxy/database/files/x.dat` becomes `/work/galaxy/data/base/files/x.dat`.
- **B3 (H) `RewriteAction.path_rewrite` ignores its `path` argument** and rewrites `self.path` (`action_mapper.py:430-434`). Every sibling file found by an unstructured rule with depth ≥ 1 collapses onto one remote path.
- **B4 (M) Pulsar treats every 403 on output collection as "dataset purged".** See `staging/down.py:234-251`.
  - Galaxy also answers 403 for a bad `job_key` (`managers/job_files.py:116`) and for a path it won't authorize (70).
  - So a misconfiguration finishes green with empty outputs.
  - The behaviour is pinned by Pulsar's `test_collect_output_tolerates_403_without_failing_job`.
- **B5 (H) `remote_object_store_copy` crashes on extra-files and metadata inputs.**
  - Galaxy attaches `object_store_ref` only to primary inputs (`pulsar.py:467-486`), so `write_to_path` subscripts `None` (`action_mapper.py:533-539`).
  - As `default_file_action` it also catches config, tool and work-dir paths, and it can't handle outputs.
- **B6 (H, read) `pwd` home target returns `None` on Pulsar.** `pulsar.py:1536-1537` has no `return`.
  - `pwd` is the default `home_target` for every non-XML tool source (`tool_util/parser/interface.py:259-261`), so YAML/CWL tools on Pulsar get no `HOME`. The local runner handles it (`jobs/__init__.py:2790`).
  - Adding `return` alone probably yields `.../working/working`.
- **B7 (M) A missing input or extra-files dir aborts submission for every action.** `FileStager.__action_for_transfer` raises (`staging/up.py:575-579`), so its "log and skip" branch for local actions (528-533) is unreachable.
- **B8 (M) Sample config drift** in `lib/galaxy/config/sample/job_conf.sample.yml`:
  - line 925 lists an `http` action that doesn't exist, and omits `rewrite`, `remote_transfer_tus`, `remote_object_store_copy` and the rsync/scp actions;
  - lines 914-922 say `default_file_action: none` is commented out, but it isn't;
  - line 265 has the typo `galaxy_infrastructure_url1`.
- **B9 (M)** `get_client_from_state` skips user-property expansion and `env` (`pulsar.py:748-755` vs 737-746). Templated `jobs_directory`, `url` or `file_action_config` values can differ between submit and finish, stop or recover.
- **B10 (M)** `config_schema.yml:2215-2231` points to Galaxy nginx docs for job files, but nothing in `doc/source/admin/` covers them.
- **B11 (L)** `pulsar.py:1044` checks `metadata_strategy == "extended"`, while the rest of Galaxy checks `"extended" in ...`. So `extended_celery` plus `remote_metadata` returns all outputs.
- **B12 (L) Dead code:**
  - the `metadata_strategy == "legacy"` branch (`pulsar.py:494-498`);
  - the stdout/stderr fallback loop that never fires and leaks file handles (800-811);
  - `PathMapper.metadata_directory` reading `working_directory` (`path_mapper.py:42`);
  - `whole_directory_transfer_supported`, which is never true.
- **B13 (L) Sibling endpoints disagree.**
  - `job_tokens.py:56-58` dereferences a missing job, giving a 500, and answers 401 where job files answers 403.
  - `ports/view.py:26` copies the auth logic ("TODO: de-duplicate").
- **B14 (L) `.dat`-suffix assumption.** `dataset_path_to_extra_path`, `for_simple_input_paths` and `output_extras` slice off `.dat` blindly.
- **B15 (M-H) `default_file_action: none` crashes on extra files.**
  - `input_path_rewrite` returns `None` for non-staging actions.
  - `input_extra_files_rewrite` and `output_extra_files_rewrite` (`pulsar.py:1449-1450`, `1455-1456`) pass that `None` into `dataset_path_to_extra_path`, which slices it and raises a `TypeError`.
  - It hits any tool reading `$input.extra_files_path`, a Directory-datatype input, or a Directory-datatype output (`tools/runtime.py:74` calls the rewrite *before* its `or` fallback).
  - `test_pulsar_embedded_none.py` (from #21566) runs only `simple_constructs` and `job_properties`.

The research subagent also wrote a few possible security findings to a private report outside the repo; they are not recorded here.

## Tests

**Galaxy:**
- `test/integration/test_job_files.py`: about 30 tests covering states, purged inputs, ranges, writes, TUS, nginx, appendable streams and write protection.
- `test/unit/app/managers/test_JobFilesManager.py`: authorization.
- `test/integration/test_job_files_tus.py` and `test_job_files_remote_transfer.py`: embedded Pulsar with `remote_transfer_tus` and `remote_transfer`, running `simple_constructs` and `composite_output_tests`.
- `test/integration/test_pulsar_embedded*.py`: `copy`, `none`, `copy_working`, remote metadata, extended metadata, containers, and MQ purge-while-running. Configs live in `embedded_pulsar_*_job_conf.yml`.
- `test/unit/app/jobs/test_pulsar_runner.py` and `test_runner_pulsar.py`: unit tests for the runner.

**Pulsar 0.16.0:**
- `test/action_mapper_test.py`;
- `test/path_mapper_test.py` (nothing for unstructured paths);
- `test/transfer_action_test.py`;
- `test/client_staging_test.py`.

**Gaps:** B1, B2, B5, B6, B7, B15, and metadata-file staging in legacy mode.

## Gotchas

- **G1** A bare `PulsarJobRunner` destination uploads everything over REST (the default action is `transfer`). MQ needs a remote action and `jobs_directory`.
- **G2** Remote actions need a known remote job directory: `jobs_directory`, or the `job_directory` returned by setup (`staging/up.py:198-208`).
- **G3** Galaxy's handle on an input is a handler path. Every action stats it on the handler at submit. For `remote_transfer`, a web worker opens the same path later.
- **G4** `none` on job-directory path types quietly becomes `copy`.
- **G5** In `rewrite_parameters` mode, only extra-files dirs and metadata files that the template actually touched get staged. Legacy mode guesses `_files` beside each input instead.
- **G6** With `rewrite_parameters: false`, input metadata files (BAM indexes, etc.) are not staged. That's safe only on a shared file store.
- **G7** In legacy mode, `path_referenced` (`staging/up.py:437-444`) uses dataset paths as unescaped regexes.
- **G8** Because of B4, look for "Galaxy refused output" in Pulsar's logs when outputs come back empty.
- **G9** Interactive-tool callbacks reuse the `jobs_files` key, so every job's key also authorizes `/ports`.
