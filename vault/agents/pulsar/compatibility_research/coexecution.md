# Coexecution compatibility (Galaxy client lib x in-pod Pulsar image)

Context: matrix for galaxyproject/pulsar#535. Coexecution = Galaxy runner (via `pulsar-galaxy-lib`) launches a K8s Job / TES task / GCP Batch job holding a Pulsar sidecar container plus the tool container. No long-running Pulsar server.

## TL;DR

- Second axis is real but **frozen**: in-pod Pulsar version = the `pulsar_container_image` tag, not the client lib version.
- Galaxy hardcodes `DEFAULT_PULSAR_CONTAINER = "galaxy/pulsar-pod-staging:0.15.0.2"` (Galaxy 5a3069d283e, 2022-10-06; unchanged 24.0 → dev). Not derived from lib version, not `latest`.
- `0.15.0.2` image pushed 2023-02-08, built from Pulsar 49bc5bc (`git describe`: `0.15.0.dev0-9-g49bc5bc`), i.e. *before* the 0.15.0 release. Every Galaxy release 24.0–26.1 (and dev) runs that pre-0.15.0 Pulsar in the pod by default.
- Lib's own fallback `PULSAR_CONTAINER_IMAGE = "galaxy/pulsar-pod-staging:0.15.0.0"` (client.py, all tags 0.15.6 → master) — **tag does not exist on Docker Hub** (tags: 0.10.0, 0.12.0, 0.13.0, 0.14.0, 0.14.15.0, 0.15.0.1, 0.15.0.2). Masked because Galaxy always supplies its own default. `docker/coexecutor/Makefile` builds `0.15.0.2`, so lib constant is stale vs its own Makefile.
- No Pulsar CI builds/tests the coexecutor image; Galaxy's `test/integration/test_coexecution.py` (minikube in `integration.yaml`) is the only exerciser, against the default 0.15.0.2 image.
- Sample job conf still shows `#pulsar_container_image: 'galaxy/pulsar-pod-staging:0.12.0'` (job_conf.sample.yml:979) - stale doc.

## Backends present per pin

| Galaxy | lib | K8s runner | TES runner | GCP Batch runner | AWS Batch |
|---|---|---|---|---|---|
| 24.0/24.1 | 0.15.6 | yes | yes | n/a | lib client only, no Galaxy runner |
| 24.2 | 0.15.7 | yes | yes | n/a | same |
| 25.0 | 0.15.9 | yes | yes | n/a | same |
| 25.1/26.0 | 0.15.14 | yes | yes | yes (lib GCP 328691d, first tag 0.15.10; Galaxy a2afb2ceef0) | same |
| 26.1 | 0.15.15 | yes | yes | yes | same |
| 26.2 | master/0.16 | yes | yes | yes | same |

## The contract (launcher -> sidecar -> back)

- **Sidecar invocation** (`CoexecutionLaunchMixin.launch`): `pulsar-submit [--manager M] --wait|--no-wait --base64 <setup msg> --app_conf_base64 <app conf>`; TES (SEQUENTIAL) appends `pulsar-finish` executor. All entry points/flags present in image commit 49bc5bc. Unchanged 0.15.6 → master.
- **Setup msg** = `_build_setup_message` dict (command_line, job_id, setup_params, remote_staging, env, dependencies_description, dynamic_file_sources, token_endpoint, [cvmfsexec]). Image-side `submit_job` uses `.get()` per key -> unknown keys silently dropped.
- **App conf** (`get_pulsar_app_config`): manager `type: coexecution`/`unqueued`, `monitor: background|none`, staging_directory `/pulsar_staging/`, persistence_directory, amqp_key_prefix, conda dependency_resolution. All understood by 49bc5bc (`CoexecutionManager`, `MonitorStyle`).
- **Tool<->sidecar** file protocol: tool container polls `<job_dir>/command_line`, runs it (`TOOL_EXECUTION_CONTAINER_COMMAND_TEMPLATE`). Identical 49bc5bc → master.
- **Status back**: two modes chosen by `build_client_manager`:
  - `amqp_url` set -> `MessageQueueClientManager`; sidecar publishes status to AMQP (`message_queue_consume=False`); consumer side unchanged 0.15.6 → master (only relay additions).
  - no amqp -> `PollingJobClientManager`; Galaxy polls K8s Job status / TES task state / GCP Batch state. Platform API only, no Pulsar involvement.
  - Relay (`relay_url`, lib >=0.15.12): `RelayClientManager.get_client` always returns `RelayJobClient` -> **coexecution unsupported over relay**; cell n/a.

## Contract changes 0.15.6 -> master (lib side unless noted)

| sha | first tag | change | direction | verdict vs 0.15.0.2 image |
|---|---|---|---|---|
| 39697ad (server) | 0.15.3 | `token_endpoint` consumed in `submit_job` | new lib -> old image | **degraded, silent**: image ignores token_endpoint; OIDC-token file sources unusable in pod. Applies to *every* Galaxy 24.0+ (Galaxy already sends it) |
| 00fa8c6 (server) | 0.15.0 | job vs tool stdio separation | old image -> Galaxy | graceful: no `job_stdout/job_stderr`; Galaxy uses `.get()`; tool stdout may include job wrapper noise |
| ae3de4f | 0.15.9 | move `get_pulsar_app_config` to base class; Galaxy 25.1 drops its own staging_directory injection | Galaxy<->lib internal | n/a (exact pin) |
| 328691d | 0.15.10 | GCP Batch client | lib only | launcher-side; same sidecar contract (PARALLEL, `--wait`) |
| e194624/bcd073e/3c90167 | 0.15.15 | GCP runnable ordering (tool bg, sidecar fg), extra volumes | lib only | launcher-side; GCP on 0.15.14 (25.1/26.0) has ordering bug fixed only in 0.15.15 |
| 245acdd (server) | 0.15.15 | conda auto-init/install off by default | only if image upgraded | graceful: coexec client sets `auto_init/auto_install: True` explicitly |
| 9ca39bb/8f77192/59b7bef | 0.15.12–15 | relay | - | n/a for coexecution |
| 6bfd120/227d2d5/1569745/e9d66ad/4b67601 | master | GCP VM sizing, custom VM image, GALAXY_SLOTS env, boot disk | lib only | launcher-side |
| c1e747f | master | TES poll/cancel by recorded external id | lib only | launcher-side; graceful (falls back to job_id) |
| 5ec0bc6 | master | `cvmfsexec` key in setup msg | new lib -> old image | silently ignored by image; only if destination sets `cvmfsexec` |
| 81be9db/f2091b6 (server) | master | `__PULSAR_JOB_DIRECTORY__` substitution | new lib -> old image | breaking only if cvmfsexec container rewriting used in coexec (unsubstituted token) - edge case |
| aefd720 (server) | master | `__PULSAR_JOBS_DIRECTORY__` removed, now raises | old Galaxy conf -> new image | breaking only if destination command lines use the token; Galaxy coexec defaults don't |
| 7b4e451 (server) | master | live stdout/stderr updates | new image -> Galaxy | graceful/absent with 0.15.0.2 image |

## Per-pair verdict (Galaxy release x default image 0.15.0.2)

- 24.0/24.1 (0.15.6): **works** K8s/TES; degraded: token_endpoint, stdio separation. GCP n/a.
- 24.2 (0.15.7): same as above.
- 25.0 (0.15.9): same.
- 25.1/26.0 (0.15.14): same + GCP **works with caveat** (runnable ordering bug pre-0.15.15).
- 26.1 (0.15.15): same, GCP fixed.
- 26.2 (master/0.16): same; cvmfsexec-in-coexec would not work against old image.
- Custom/newer image (operator override): contract is additive `.get()` both ways; any image >=0.15.3 removes the token_endpoint gap. No hard break found except aefd720 (operator-authored token) on a master-built image.

## Recommendation for matrix

- Don't model coexecution as "Galaxy x Pulsar server version". Model it as **Galaxy release -> default sidecar image tag**, one column: `galaxy/pulsar-pod-staging:0.15.0.2` (Pulsar ~0.15.0.dev, 2023-02) for all rows; footnote operator override via `pulsar_container_image`.
- Per-cell: backend availability (K8s/TES/GCP; relay = n/a; AWS Batch = no Galaxy runner).
- Flag as action items for the release-branch plan, not matrix cells:
  - Publish a sidecar image per Pulsar release (e.g. `pulsar-pod-staging:<lib version>`) and have Galaxy derive default from lib version, collapsing the axis.
  - Fix lib constant `0.15.0.0` (nonexistent tag) to match Galaxy/Makefile.
  - Add a coexecutor image build/smoke to Pulsar CI.
- Unresolved: whether real deployers (e.g. GalaxyKubeMan/helm) override `pulsar_container_image`; not checked here.
