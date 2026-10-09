# REST compatibility (Galaxy `PulsarRESTJobRunner` / `JobClient` <-> pulsar-app web server)

Scope: `ClientManager` -> `JobClient` -> `HttpPulsarInterface` (`pulsar/client/server_interface.py`) over the urllib/pycurl transport <-> `pulsar/web/{wsgi,framework,routes}.py` -> `pulsar/manager_endpoint_util.py`. Range 0.15.6 .. `origin/master` (aa6e4b6). Read-only `git show`/`git diff`.

## Contract surface

- **Routes** (`pulsar/web/routes.py`; same 0.15.6 -> master except `/healthz`):
  - `POST /jobs` `setup(job_id, tool_id, tool_version, use_metadata)` -> json job_config (`setup_handler.build_job_config`: `job_directory, working_directory, metadata_directory, outputs_directory, configs_directory, tools_directory, inputs_directory, unstructured_files_directory, path_separator, job_id, system_properties, pulsar_version, preserve_galaxy_python_environment, tool_id, tool_version`). Keys unchanged.
  - `POST /jobs/{id}/submit` `command_line, params, dependencies_description, setup_params, remote_staging, env, submit_extras, dynamic_file_sources` (+ `cvmfsexec` on master). All JSON strings in the query string.
  - `GET /jobs/{id}/status` -> `full_status`; `PUT /jobs/{id}/cancel`; `DELETE /jobs/{id}`.
  - `POST /jobs/{id}/files` (`type, name, cache_token`, raw body); `GET /jobs/{id}/files/path`; `GET /jobs/{id}/files` (download); `/cache*`, `/objects/*` (unchanged).
  - `GET /healthz` -> `{"version"}` (02bbaaf, 0.15.7). The client never calls it.
- **Arg binding is lenient both ways**: `framework.build_func_args` copies only query args that the function declares (`framework.py` `build_func_args` / `__build_args`). So **unknown params are dropped silently** and missing ones take their defaults. Example: the client has sent `token_endpoint` to REST `submit` since before 0.15.6 (`client.py:216`), and `submit` has never declared it, so it's a no-op on every version.
- **Status payload** (`manager_endpoint_util.full_status`): running = `{complete:"false", status, job_id}`. Terminal = `job_id, complete, status, returncode, stdout, stderr, job_stdout, job_stderr, working/metadata/job_directory, *_directory_contents, system_properties, pulsar_version, realized_dynamic_file_sources`. Same field set 0.15.6 -> master.
- **remote_staging** (when actions are `remote_*`): `{setup: [ {name,type,action:{action_type,...}} ], action_mapper: FileActionMapper.to_dict(), client_outputs: ClientOutputs.to_dict(), ssh_key?}`. The server rebuilds actions with `action_mapper.from_dict` (pre.py) and `FileActionMapper(config=...)` + `ClientOutputs.from_dict` (post.py). Action type set is unchanged 0.15.6 -> master (`ACTION_CLASSES`). The server's `BasePathMapper` doesn't validate `path_types`, so a new `container` type in the mapper dict is harmless to old servers.
- **Galaxy side** (`lib/galaxy/jobs/runners/pulsar.py`): reads `remote_job_config["working_directory"|"metadata_directory"|"configs_directory"|"tools_directory"|"system_properties"]["separator"]` in every release, plus `["job_directory"]` on dev (all present since well before 0.15.6). `finish_job` reads `stdout/stderr/job_stdout/job_stderr/returncode/metadata_directory` + `PulsarOutputs.from_status_response`.

## Changes 0.15.6 -> master that touch the contract

| sha | first tag | side | change | mixed-version effect |
|---|---|---|---|---|
| cabcb39, 2e18a8a | 0.15.7, 0.15.8 | client | tool files uploaded with nested `name` (relpath) and whole referenced dirs (`up.py __upload_tool_files`) | old servers already allow nested `tool` names (`job_directory.py` `allow_nested_files` includes `tool`) and skip dirs in `_check_execution` (23adfd2, pre-0.15.6). **Compatible** |
| 7410c9e | 0.15.7 | server | skip pre/post-process staging if cancelled | server-internal |
| 234d821, 194a2d4 | 0.15.11 | client | `from_work_dir` directories collected via `working_directory_contents` (`down.py`) | uses status fields that 0.15.6 servers already return. Compatible |
| 2e28241 | 0.15.13 | client+server | `ClientOutputs.dataset_collector_descriptions` in `remote_staging.client_outputs`; `dynamic_match` uses them | Galaxy 26.0+ gates sending on `MINIMUM_PULSAR_VERSIONS["dataset_collector_descriptions"]=0.15.13.dev0` using `remote_job_config["pulsar_version"]`. For default REST (`RemoteSetupHandler`) that's the **server** version -> **graceful**. **Edge**: if the destination sets `jobs_directory`, `LocalSetupHandler` is used (`setup_handler.build`), so `pulsar_version` is the *client's*. Galaxy then drops `output_discover_patterns` from `dynamic_outputs` and sends collectors that an old (< 0.15.13) server ignores (`ClientOutputs.from_dict`). With remote staging, **discovered outputs aren't staged back** (same failure the MQ note calls a break) |
| 6c03806 | 0.15.14 | server | `write_from_path` no-op for non-staging actions | server-internal |
| 95fd6e9, 95e3058, faaeb11, 28fa4ed | 0.15.15 | client/transport | HTTP errors raised as structured `PulsarClientTransportError`; permanent 4xx not retried | local to whichever side does the transfer. No wire change |
| 8bff105 | 0.15.15 | client (+server post.py) | HTTP 403 on an output upload no longer fails the job | local policy |
| 0aa50d8 | 0.15.15 | client | `metadata` inputs force-copied when `default_file_action: none` | the server has always accepted `type=metadata` uploads. Compatible |
| 37e0ad5 | 0.15.15 | server | `submit_job` silently ignores `submit` for a job_id whose dir has `final_status` or is active (`_is_duplicate_setup`, `manager_endpoint_util.py:76` @0.15.15) | written for MQ redelivery, but REST `submit` uses the same function. Default `assign_ids: galaxy` + a leftover job dir (`cleanup_job` != always, failed job, then Galaxy resubmits the same id to the same Pulsar) -> new submit dropped, the old terminal status is returned. Affects **every client** against >= 0.15.15. Not version skew, but worth a test |
| 08d9f02 | 0.15.15 | client transport | poster dropped; requests fallback | multipart field name `file` unchanged. No wire change |
| 6eb8dae | master | server | terminal `stdout`/`stderr` capped at 64 KiB (`MAXIMUM_STATUS_STREAM_SIZE`, `manager_endpoint_util.py:25`) | any Galaxy gets a truncated tool stdout/stderr. Schema unchanged. **Graceful**, but stdio regexes past 64 KiB are no longer seen |
| 7b4e451, 6de4dbb, c7e7786 | master | server | `send_stdout_update` (default `False`, `stateful.py:91`): POSTs chunks to Galaxy `files_endpoint?path=.../outputs/tool_stdout`. Once delivered, terminal status sends `stdout=None` (`manager_endpoint_util.py:38`). Needs remote staging (`live_output_target`) | Galaxy >= 24.2 appends to `tool_stdout/stderr` (`job_files.py` `"ab"`) and falls back to the file on `None` (d336cadddba). **Galaxy 24.0/24.1 have neither**: each chunk overwrites, and `None` goes into `job_wrapper.finish`. stdout/stderr lost or garbled. Only if the server opts in |
| 1f7eb9a, 9f19f90 | master | server | `RemoteTransferTusAction.from_dict` now really returns a TUS action (it used to return `RemoteTransferAction`) | old servers: `remote_transfer_tus` outputs silently go via multipart POST (works, feature-degraded). Master server: TUS is now actually used for **any** client, so the server needs `tuspy` and Galaxy needs `tus_upload_store[_job_files]`. Deployments that "worked" only because of the bug break at stage-out after a server upgrade |
| bf3e3ad, bb67e45 | master | server transport | curl follows redirects (max 5); restarts unresumable downloads | Galaxy `job_files` doesn't redirect on any branch through dev, so latent. If Galaxy ever redirects, servers < master break on remote_transfer downloads |
| 5ec0bc6 | master | client+server | `submit` param `cvmfsexec` (`client.py:218`, `routes.py` `submit(... cvmfsexec='null')`) merged into `setup_params` | old server drops the unknown param -> per-job cvmfsexec override silently ignored (**feature-degraded**). Old client never sends it -> default `None` |
| 81be9db, db8d370 (+ Galaxy dev `_rewrite_container_for_compute_environment`) | master | client+server | server substitutes `__PULSAR_JOB_DIRECTORY__` in the command line (`manager_endpoint_util.py:136`). Client `container` path type + `PathMapper.check_for_container_rewrite` | dev Galaxy with a `path_types: container` rule using the token -> an old server leaves the literal token in the image path, so the **job fails**. Opt-in only. 26.1 Galaxy lacks the Galaxy-side hook (no `container_path_rewrite` in `release_26.1`) |
| aefd720, 1f5be1f | master | server | `__PULSAR_JOBS_DIRECTORY__` no longer substituted; submit raises if the command line still contains it (`manager_endpoint_util.py:139`) | **any client -> master server: break** for destinations with `jobs_directory: __PULSAR_JOBS_DIRECTORY__`. Per the commit message it never produced a working command line anyway. Fails loudly. Fix: set the real path |
| 53787d9, b896e34 | master | server | defer monitor until after recovery | server-internal |

Not REST-relevant (skipped): relay (`RelayClientManager`/`RelayJobClient`), GCP/TES/K8s/AWS coexecution clients, AMQP exchange changes, `external_id` (Galaxy dev passes it; `JobClient` stores it and never uses it).

## Per-pair verdicts

**Old client -> new server**

| Galaxy (client) | -> 0.15.15 server | -> master (0.16) server |
|---|---|---|
| 24.0/24.1 (0.15.6) | expected-compatible | expected-compatible by default. **likely-broken stdout** if the server enables `send_stdout_update` (no append / `None` fallback before 24.2). Breaks if destination uses `__PULSAR_JOBS_DIRECTORY__` |
| 24.2 (0.15.7) | expected-compatible | expected-compatible (64 KiB stdout cap; `__PULSAR_JOBS_DIRECTORY__` caveat; TUS now real) |
| 25.0 (0.15.9) | expected-compatible | expected-compatible (same caveats) |
| 25.1/26.0 (0.15.14) | expected-compatible | expected-compatible (same caveats) |
| 26.1 (0.15.15) | expected-compatible (same lib) | expected-compatible (same caveats) |

Cross-cutting for >= 0.15.15 servers: duplicate-submit suppression on reused job ids (37e0ad5). Needs a check before it's called safe.

**New client -> old server**

| Galaxy (client) | -> 0.15.6 .. 0.15.12 | -> 0.15.13 / 0.15.14 |
|---|---|---|
| 26.1 (0.15.15) | expected-compatible with default `RemoteSetupHandler`. **feature-degraded / likely-broken outputs** with `jobs_directory` + remote staging + `discover_datasets` tools (2e28241 gate uses client version) | expected-compatible |
| dev/26.2 (master) | as 26.1, plus `cvmfsexec` ignored (feature-degraded) and container rewrite with `__PULSAR_JOB_DIRECTORY__` -> job fails (opt-in) | expected-compatible except the two opt-in cvmfsexec/container items (also true vs 0.15.15) |

Bottom line: the REST wire schema itself didn't change incompatibly 0.15.6 -> master. The only added param is `cvmfsexec`, ignored by old servers, and there are no removed params or status fields. The risks are semantic: version-gating via the wrong version (LocalSetupHandler), master-only server behavior changes (stdout cap, live stdout vs 24.0/24.1, real TUS, removed JOBS token), and opt-in features that need a master server.

## Suggested tests for the matrix
- REST + `jobs_directory` + `remote_transfer` + discover_datasets tool: Galaxy 26.1 lib vs server 0.15.12.
- Master server with `send_stdout_update: true` + remote staging vs Galaxy 24.1.
- Resubmit (same Galaxy job id) after failure with `cleanup_job: never` against a 0.15.15 server.
- `remote_transfer_tus` stage-out against a master server without `tuspy`.
