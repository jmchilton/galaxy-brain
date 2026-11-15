# Architecture and configuration: Galaxy WES on tesp-api

A WES client submits a Galaxy workflow to Galaxy's GA4GH WES API. Galaxy schedules the workflow as an ordinary invocation and sends each tool job to a GA4GH TES server through its stock `PulsarTesJobRunner`. The TES server here is tesp-api, CESNET's TES implementation, which runs each TES task as a shell script on a Pulsar REST server. That chain ran both IWC test workflows with outputs byte-identical to the Funnel backend, once tesp-api, Pulsar and Galaxy got the fixes listed below. The umbrella project calls it design A+C: Galaxy's stock runner and staging image (A), plus fixes where the chain was weakest (C).

This page is for a Galaxy developer who wants to understand the chain or set it up again. It explains why each piece exists, follows one tool job through it, and then gives the configuration of every component as the demo runs it, with what a real deployment would change.

The demo repository is `/home/ubuntu/projects/repositories/galaxy-wes-tes` (local git only). Paths written `demo:docs/tesp-api.md` are relative to it. `demo:docs/tesp-api.md` is the detailed operator page for this backend, and `demo:docs/networking.md`, `demo:docs/pulsar-tes-runner.md` and `demo:docs/pulsar-staging-image.md` cover the shared parts. Every value below was checked against the demo's config templates and scripts and, where noted, against Galaxy, Pulsar or tesp-api source.

## The chain

```text
WES client
  │  POST /ga4gh/wes/v1/runs (multipart form, x-api-key)
  v
Galaxy v26.1.2 ── WES request becomes a workflow invocation
  │  workflow scheduler creates tool jobs
  │  PulsarTesJobRunner: POST /v1/tasks, POST /v1/tasks/{id}:cancel (basic auth)
  v
tesp-api (FastAPI + MongoDB) ── turns the TES task into one shell script
  │  Pulsar REST: create job, upload tesp_job.sh, submit, poll, cancel, delete
  v
outer Pulsar (queued_python manager) ── runs the script
  │  docker run ... through the host's Docker socket
  v
Docker on the host, one task = three sibling containers sharing one volume:
  1. staging image: pulsar-submit --no-wait ─┬─ GET inputs from Galaxy's job files API
  │                                          └─ publish "running" to RabbitMQ
  2. tool biocontainer: runs the tool against /pulsar_staging/ only
  3. staging image: pulsar-finish ───────────┬─ POST outputs to the job files API
                                             └─ publish "complete" or "failed" to RabbitMQ
RabbitMQ ──status messages──> Galaxy's Pulsar runner (job state, then finish_job)
```

Two Pulsars take part in every job. The outer Pulsar is only a shell runner for tesp-api. The in-task Pulsar, inside the staging image, moves files and reports status. They don't talk to each other.

## Why each piece exists

| Piece | What it does in this chain | Why it is there |
| --- | --- | --- |
| WES client | Submits the workflow, polls the run, cancels, fetches outputs through DRS | The point of the exercise: drive Galaxy with a GA4GH standard API. The demo uses its own client, `demo:scripts/wes_client.py`, described in `demo:docs/wes-client.md`. |
| Galaxy WES API | Accepts a Galaxy workflow (`gx_workflow_ga` or `gx_workflow_format2`) plus `workflow_params`, creates an invocation, maps invocation state to WES state | Galaxy's WES routes are always on, under `/ga4gh/wes/v1/`. No configuration. It accepts only Galaxy workflow types. |
| Galaxy workflow scheduler and job handler | Creates the tool jobs and routes them with the job conf | Unchanged Galaxy. WES adds nothing here. |
| `PulsarTesJobRunner` | Builds the Pulsar launch message for the job, creates one TES task, waits for AMQP status messages, finishes the job | Galaxy's stock way to send a job to a TES server. Galaxy resolves the tool container itself and puts its name into the task. |
| tesp-api | Stores TES tasks in MongoDB, turns each into a shell script of `docker run` lines, runs it as a Pulsar job, polls it, reports the TES state | The TES server under test. Its value to Galaxy is one TES endpoint that other TES clients (Nextflow, Cromwell, Snakemake) can share. |
| MongoDB | tesp-api's task store, including leases for restart recovery | Required by tesp-api. |
| Outer Pulsar | Runs tesp-api's job script in a job directory, enforces `num_concurrent_jobs` | tesp-api has no executor of its own. It always runs tasks through Pulsar. |
| Docker socket | Lets the outer Pulsar start task containers | tesp-api writes `docker run` lines. The containers are siblings on the host's default bridge, not children of the Pulsar container. |
| Staging image (in-task Pulsar) | Executor 0 stages inputs and publishes `running`. Executor 2 stages outputs and publishes the final status. | The Pulsar TES runner's design: Galaxy never talks to the task, Pulsar inside the task does. |
| Galaxy job files API | Serves inputs to and accepts outputs from the in-task Pulsar, authenticated by a per-job key | How files cross from Galaxy's disk to the task and back (`default_file_action: remote_transfer`). |
| RabbitMQ | Carries the in-task Pulsar's status messages to Galaxy. Also Galaxy's internal broker for control messages and Celery. | Stock Galaxy never asks TES about a task. All job state arrives as AMQP messages. |
| Celery worker | Computes dataset checksums for DRS | Galaxy's DRS object endpoint answers 202 until a checksum exists, and only a Celery task computes it. Without a worker it answers 202 forever. |

## One tool job, step by step

From the stage 5 acceptance run (`demo:runs/tesp-acceptance/2026-11-15/01-iwc-qc-fixes/`) and `demo:docs/tesp-api.md#architecture`:

1. The WES client posts the workflow and its inputs. Galaxy imports the workflow, creates a history, downloads URL inputs while the run is `INITIALIZING` (no job for that), and starts scheduling. WES reports `RUNNING`.
2. The scheduler creates a fastp job. The job conf routes it to the `pulsar_tesp` environment on the `pulsar_tes` runner. Galaxy resolves the container (`explicit`, then `mulled` against quay.io's biocontainers namespace) to `quay.io/biocontainers/fastp:1.4.0--h43da1c4_0`.
3. Galaxy builds the Pulsar launch message: input paths, file actions (`remote_transfer`), job files API URLs with the job's `job_key`, the rewritten command line under `/pulsar_staging/<job id>/`, and the Pulsar app config with the broker URL. It base64-encodes the message into the arguments of executors 0 and 2.
4. Galaxy creates the TES task `pulsar-<job id>`: three executors, one volume `/pulsar_staging/`, no TES inputs or outputs, `resources` from `cpu_cores` and `ram_gb`. tesp-api stores it and returns a 24-hex-character id, which Galaxy stores as the job's `job_runner_external_id`. The fastp task was 17,512 bytes.
5. tesp-api writes the job script: a watchdog line, then one `docker run --rm --label=tesp-api.task=<id> --cpus=2 --memory=4096m --volume=vol-<id>-pulsar_staging:/pulsar_staging ...` (flag order illustrative) per executor, in order. It creates a Pulsar job named after the task id, uploads the script as `tesp_job.sh` and submits `command_line=sh <path>` (120 bytes in the access log).
6. The outer Pulsar runs the script in `var/tesp/pulsar/staging/<task id>/`. Executor 0, `pulsar-submit --no-wait`, downloads inputs from `http://172.17.0.1:18080/api/jobs/<id>/files?job_key=...&path=...`, writes the tool's `command_line` into the shared volume and publishes `running`. Galaxy marks the job `running` 5 to 8 s after the task was created.
7. Executor 1, the biocontainer, waits for `command_line` and runs it. It touches only `/pulsar_staging/`.
8. Executor 2, `pulsar-finish`, posts outputs, `tool_stdout`, `tool_stderr` and metrics files to the job files API and publishes `complete`.
9. Galaxy receives `complete`, collects the outputs, runs `set_meta` on its own host (the destination doesn't set `remote_metadata`) and sets the job `ok`. fastp took 23 s from `queued` to `ok`, MultiQC 28 s.
10. Independently, tesp-api polls the outer Pulsar (first after 4 s, then each wait 1.25 times longer, up to 10 s in the demo). When the job ends, it reads each executor's log tail, redacts secrets, stores one `ExecutorLog` per executor, sets the task `COMPLETE`, deletes the Pulsar job and runs a cleanup job that removes leftover containers and the `vol-<id>-*` volume.
11. The WES run becomes `COMPLETE` when the invocation is `completed`. The client fetches outputs through DRS, which needs one 60 s `Retry-After` per object while Celery computes the checksum.

The TES state never drives Galaxy in stock v26.1.2. If the task dies before the in-task Pulsar publishes anything (a bad staging image, an image pull failure, `Argument list too long`), stock Galaxy leaves the job `queued` forever. The Galaxy polling branches below close that gap.

## Configuration

### Galaxy: `galaxy.yml`

Template: `demo:config/galaxy/galaxy.yml.in`, rendered into `var/galaxy/galaxy.yml` by `scripts/galaxy-common.sh`. The settings that matter for this chain:

| Setting | Demo value | Why |
| --- | --- | --- |
| `galaxy_infrastructure_url` | `http://172.17.0.1:18080` | How the in-task Pulsar reaches Galaxy's job files API. The runner's `galaxy_url` falls back to it. Must be reachable from task containers. |
| `job_config_file` | `var/galaxy/job_conf.yml` | The rendered job conf (mode 0600, holds credentials). |
| `enable_celery_tasks` | `true` | DRS needs a Celery worker. |
| `celery_conf` | `broker_url: null`, `result_backend: null`, Galaxy's default `task_routes`, plus `worker_enable_remote_control: false` | `broker_url: null` makes Celery use `amqp_internal_connection`. RabbitMQ 4.3 refuses Celery's transient non-exclusive remote-control queue, so remote control is off. |
| `amqp_internal_connection` | from `GALAXY_CONFIG_AMQP_INTERNAL_CONNECTION`: `amqp://<RABBITMQ_USER>:<RABBITMQ_PASS>@127.0.0.1:18672//` | Galaxy's control messages and the Celery broker. Kept out of the file so the password isn't in git. |
| `container_resolvers` | `explicit`, then `mulled` with `namespace: biocontainers`, and `enable_mulled_containers: true` | Galaxy picks the tool container and hands its name to Pulsar (`remote_container_handling` defaults to true for coexecution). |
| `tool_dependency_dir` | `none`, with `conda_auto_init: false` and `conda_auto_install: false` | Every TES job runs in a container. |
| `ga4gh_service_id`, `organization_name`, `ga4gh_service_environment` | `org.example.wes-tes-demo`, `galaxy-wes-tes demo`, `test` | Without an id, WES service-info derives it from the request host reversed (`1.0.0.127.wes`). |
| `cleanup_job` | `onsuccess` | Keeps failed job directories for debugging. |
| `outputs_to_working_directory` | not set | Not needed for design A. Design B requires it ([DESIGN_B.md](DESIGN_B.md)). |

The Celery worker runs as (from `start_galaxy_celery` in `demo:scripts/galaxy-common.sh`):

```sh
celery --app galaxy.celery worker --concurrency 1 --pool threads --loglevel INFO \
  --without-mingle --without-gossip --queues celery,galaxy.internal,galaxy.external
```

`--without-mingle --without-gossip` avoids the other transient queues RabbitMQ 4.3 refuses.

Galaxy itself runs as one gunicorn worker with two binds, `-b 127.0.0.1:18080 -b 172.17.0.1:18080` (`demo:scripts/galaxy-up.sh`). The single worker is also the job handler and workflow scheduler, so the job conf has no `handling:` section. The database is SQLite. A real deployment would use PostgreSQL, gravity or systemd, and its normal handler layout. Nothing in this chain depends on those choices.

### Galaxy: job configuration

Template: `demo:config/galaxy/job_conf.yml.in`, rendered by `scripts/galaxy-up.sh` with `envsubst`. The parts for tesp-api, as rendered:

```yaml
runners:
  local:
    load: galaxy.jobs.runners.local:LocalJobRunner
    workers: 2
  pulsar_tes:
    load: galaxy.jobs.runners.pulsar:PulsarTesJobRunner
    # Broker as Galaxy sees it. Required: all job state comes back as AMQP messages.
    amqp_url: amqp://<RABBITMQ_USER>:<RABBITMQ_PASS>@127.0.0.1:18672//
    # Galaxy as the task containers see it.
    galaxy_url: http://172.17.0.1:18080
    amqp_key_prefix: pulsar_wes_tes_

execution:
  default: pulsar_tesp
  environments:
    local:
      runner: local
    pulsar_tesp:
      runner: pulsar_tes
      tes_url: http://127.0.0.1:18200/      # tesp-api serves /v1/... at its root; keep the trailing slash
      authorization: basic                  # without it, basic_auth sends nothing
      basic_auth:
        username: <TESP_USER>
        password: <TESP_PASS>
      pulsar_container_image: wes-tes/pulsar-pod-staging:0.16.1.dev0-20b6460
      docker_enabled: true                  # required for any container resolution
      dependency_resolution: none           # v26.1.x lacks 19f8286868d
      cpu_cores: 2                          # tesp-api passes these to every docker run
      ram_gb: 4                             # as --cpus=2 and --memory=4096m
      pulsar_app_config:
        # Broker as the task containers see it.
        message_queue_url: amqp://<RABBITMQ_USER>:<RABBITMQ_PASS>@172.17.0.1:18672//

limits:
  - type: destination_total_concurrent_jobs
    id: pulsar_tesp
    value: 2

tools:
  - class: local            # upload1, __DATA_FETCH__
    environment: local
  - class: requires_galaxy  # tools that need Galaxy's Python
    environment: local
```

Notes on each choice:

- `amqp_url` and `message_queue_url` name the same broker from two sides. Galaxy connects over loopback. The task containers connect over the bridge gateway. Both use the same RabbitMQ user, because the in-task Pulsar has no credentials of its own.
- `amqp_key_prefix` keeps Pulsar's queues (`pulsar_wes_tes__status_update`, `__setup_ack`, `__kill_ack`) apart from anything else on the broker. The client passes the prefix to the in-task Pulsar.
- `tes_url` needs the trailing slash whenever it has a path, because pydantic-tes joins `v1/tasks` with `urljoin`. tesp-api serves at the root, so `http://host:port/` is enough.
- `authorization: basic` is easy to miss. `basic_auth` alone sends no header, and Galaxy's `job_conf.sample.yml` shows exactly that mistake.
- `pulsar_container_image` must name a current staging image. Galaxy's default, `galaxy/pulsar-pod-staging:0.15.0.2`, silently drops `discover_datasets` outputs with Galaxy 26.x, never publishes `running`, and exits 0 when staging fails ([The staging image](#the-staging-image)).
- `dependency_resolution: none` is needed on 26.1.x only. Galaxy `19f8286868d` ("Skip Pulsar dependency resolution for containerized jobs", 26.2 and `dev`) makes it unnecessary.
- `cpu_cores` does not reach the tool as `GALAXY_SLOTS`. Under the Pulsar TES runner every job runs with one slot, which design B's 1-core and 2-core runs confirmed ([DESIGN_B.md](DESIGN_B.md)).
- The limit of 2 matches the outer Pulsar's `num_concurrent_jobs`. Galaxy's limit applies whether or not the outer Pulsar enforces its own.
- Coexecution defaults apply without being named: `default_file_action: remote_transfer`, `rewrite_parameters: true`, `remote_container_handling: true` (`COEXECUTION_DESTINATION_DEFAULTS` in `lib/galaxy/jobs/runners/pulsar.py`).

Stock Galaxy v26.1.2 runs this destination unchanged. Both IWC workflows passed on it in stage 4, and acceptance item 9 repeated the QC workflow on stock v26.1.2 in stage 5.

### Galaxy: TES polling options and the branches that provide them

Stock Galaxy has `poll = False` on `PulsarTesJobRunner`. The branches below add a monitor that reads each task's state and fails jobs that the in-task Pulsar never reported. The options are **runner** options, set under `runners: pulsar_tes:`, not on the destination (checked in `lib/galaxy/jobs/runners/pulsar.py` on `tes_task_state_polling_unreachable`, `PULSAR_TES_PARAM_SPECS`, read from `self.runner_params`):

```yaml
runners:
  pulsar_tes:
    load: galaxy.jobs.runners.pulsar:PulsarTesJobRunner
    # ... as above, plus, on a polling branch:
    tes_status_check_interval: 60   # seconds between checks of each task; 0 turns polling off
    tes_status_grace_period: 120    # wait this long after the task ends for Pulsar's final status
    tes_unreachable_timeout: 3600   # fail the job after the TES server is unreachable this long; 0 = never
    tes_cancel_retry_timeout: 86400 # keep retrying a cancel the TES server didn't receive this long; 0 = try once
```

| Option | Default | Branch | Behavior |
| --- | --- | --- | --- |
| `tes_status_check_interval` | 60 s | `tes_task_state_polling` | Each job's task is read with `view=BASIC`. |
| `tes_status_grace_period` | 120 s | `tes_task_state_polling` | A task that is `COMPLETE`, `EXECUTOR_ERROR`, `SYSTEM_ERROR`, `CANCELED`, `PREEMPTED` or 404 for this long without a final Pulsar status fails the job, with the failing executor's redacted stderr. |
| `tes_unreachable_timeout` | 3600 s | `tes_task_state_polling_unreachable` | Connection errors, timeouts or 5xx at every check for this long fail the job with `job.info` "Galaxy could not reach the TES server to check task <id> for <N> seconds, and Pulsar never reported a final job status. Last error: ...". A 4xx other than 404 counts as an answer. |
| `tes_cancel_retry_timeout` | 86400 s | `tes_task_state_polling_unreachable` (since `bd710f3b8da`) | A cancel that fails because the TES server is unreachable is retried by the monitor thread, 10 s later and then with a doubling wait of at most 120 s, until it succeeds, the task has ended, is `CANCELING` or 404, the server answers 400, 401 or 403, or this cap passes. `0` tries once, the opposite of `tes_unreachable_timeout`'s `0`. The retries live in memory: a Galaxy restart drops them and shutdown logs the tasks left uncancelled. |

The polling branch also makes a cancel of an already-ended task a no-op (TESK answers such a cancel with 400, which looped Galaxy's stop queue). tesp-api answers 200 there, so it never triggered that bug.

A stock v26.1.2 Galaxy rejects these options. On a polling branch they apply with their defaults even when the job conf doesn't name them. The demo sets them only in `demo:config/galaxy/job_conf_gaps.yml.in` (through `GAP_TES_RUNNER_EXTRA`), and acceptance item 8 used `tes_status_check_interval: 15`, `tes_status_grace_period: 30` and `tes_unreachable_timeout: 60`.

| Branch (jmchilton/galaxy) | Commit | Base | Use |
| --- | --- | --- | --- |
| `tes_task_state_polling` | `e3c0cc44649` | `dev` (`61ec05da7b6`) | Upstream candidate: polling, grace period, cancel of an ended task |
| `tes_task_state_polling_unreachable` | `025f1256ec3` | `tes_task_state_polling` | Upstream candidate, three commits: `f71ca18704d` `tes_unreachable_timeout` (and a single whole-task log reported as "The task exited with code N" instead of being pinned on executor 0), `bd710f3b8da` the cancel retry, `025f1256ec3` the SYSTEM_ERROR job info |
| `tes_task_polling_v26.1.2` | `1f7cae33d5f` | tag `v26.1.2` | Demo port of both (`a1b53d59234` was the stage 5 head). Imports pulsar-galaxy-lib 0.15.15's `container_job_config`. |
| `wes_tes_demo_fixes_v26.1.2` | `b317bc12545` | tag `v26.1.2` | Demo only: the polling port merged with the five WES API fixes (`wes_api_fixes_v26.1.2`, `2aad3a3e80c`). Stage 5 acceptance ran `3585089e925`. `8b3166c80fb` has the cancel retry without the SYSTEM_ERROR info. |

None has a pull request.

Since `025f1256ec3`, a job whose task ended `SYSTEM_ERROR` gets the TES server's own reason in `job.info`, as "... System log: <reason>" (Funnel's `error=` line, TESK's `ERROR:` line, tesp-api's reason line), and the message never claims exit code 0. Before it, Funnel's `SYSTEM_ERROR` for an over-long argument read "The task exited with code 0" (`demo:runs/stage6/h2a-cancel-retry/system-error-real-tasks-before.txt` and `-after.txt`).

The stage 6 commits are unit tested (`demo:runs/stage6/h2a-cancel-retry/`). The cancel retry's tests went from 16 failed and 44 passed to 60 passed, and the SYSTEM_ERROR info's from 7 failed to 67 passed. The live check of the cancel retry is `demo:scripts/tesp/acceptance/unreachable-cancel.sh`, also the follow-up hook of `make acceptance`'s `unreachable` scenario. Live, on tesp-api, the hook passed twice (`demo:runs/acceptance/20261115T030823Z-tesp/`, `20261115T045850Z-tesp/`): the orphaned task was `CANCELED` 37.9 s after tesp-api answered again, on Galaxy's fourth attempt, and no `pulsar-finish` ran. On Funnel (`20261115T033208Z-funnel/`) Galaxy's fourth attempt also succeeded and Funnel marked the task `CANCELED` 39.4 s after it came back, but Funnel 0.12.3 left the container started before its restart running (bug list item 49).

### tesp-api

The demo runs tesp-api in a container built only from its Python dependencies. The source is bind-mounted read-only at `/app` from a worktree, so one image serves every ref. Files: `demo:config/tesp/tesp.env` (settings and pins), `demo:config/tesp/compose.yaml`, `demo:config/tesp/tesp-api.Dockerfile`, rendered state in `var/tesp/`.

Source:

- Default: `TESP_REF=patched`. `scripts/tesp/lib.sh` (`tesp_resolve_patched`) builds the source from the 17 committed patch files on any host. It makes a detached worktree `vendor/tesp-api-patched` at the mirelaminkova fork's `main` `c3a9f2376df7a634ad6c33959800d169219b7560` (`TESP_PATCH_BASE`) and applies `patches/tesp-api/*.patch` with `git am` under a fixed committer (`TESP_PATCH_COMMITTER_NAME`/`_EMAIL`) and `--committer-date-is-author-date`. The result must have tree `c3cc3dad70965578503a92ba18958238316e4c65` (`TESP_PATCHED_TREE`), or the build stops. It then is commit `c5ca66a2b9096086df79f40487a4da905bee75da` (`TESP_PATCHED_COMMIT`) on every host (git 2.25, 2.45 and 2.53 gave the same commit for the 16-patch series). Another git version that formats commits differently only gets a warning.
- When `TESP_REPO` lacks the base commit, the script clones `https://github.com/mirelaminkova/tesp-api.git` into `vendor/tesp-api-src`. `vendor/tesp-api-patched.stamp` records the series, base and tree, and the worktree is rebuilt when any of them changes or it has local changes.
- The development branch is `galaxy-wes-tes` in `~/projects/repositories/tesp-api`, head `d72420fd3ffe` (same tree, other commit metadata). When `TESP_REF=patched` landed the series had 16 patches (tree `df703fc5`, commit `82c57ebf`, branch head `01bbf9bb7da4`). Patch 0017 moved the pins to the values above (demo commit `3fa10a9`). The stage 5 pin `TESP_REF=stage5` (`4bc9b5d`, 15 patches) was a commit in one clone only and is gone. `TESP_REF=4bc9b5d` still works where that commit exists.
- A fresh clone of the demo, with `TESP_REPO` pointing nowhere, built the 16-patch tree and commit and passed the `basics` and `cancel` probes (`demo:runs/stage6/tesp-reproducible/`, demo commits `02b094d`, `ff3c3a4`, `2ad9cd6`, `5d949be`). The full `make acceptance` run on tesp-api also ran from a fresh clone ([OPERATIONS.md](OPERATIONS.md#regression-run-make-acceptance)).
- The same by hand, without the demo scripts:

  ```sh
  git clone https://github.com/mirelaminkova/tesp-api.git
  cd tesp-api
  git checkout --detach c3a9f2376df7a634ad6c33959800d169219b7560
  GIT_COMMITTER_NAME="galaxy-wes-tes patches" GIT_COMMITTER_EMAIL=patches@galaxy-wes-tes.invalid \
    git am --committer-date-is-author-date /home/ubuntu/projects/repositories/galaxy-wes-tes/patches/tesp-api/*.patch
  git rev-parse 'HEAD^{tree}'   # c3cc3dad70965578503a92ba18958238316e4c65
  ```

- The series does not apply to CESNET upstream `3d470f76` (release 0.2.0). Only the 401 patch does. The fork is about 4,600 lines and 65 files ahead.

Container environment, from `compose.yaml` and the `api.env` that `scripts/tesp/up.sh` renders (mode 0600):

| Variable | Demo value | Meaning |
| --- | --- | --- |
| `TESP_API_DB__MONGODB_URI` | `mongodb://db:27017` | MongoDB on the compose network, no auth |
| `TESP_API_PULSAR__URL` | `http://pulsar:8913` | The outer Pulsar on the compose network, no token |
| `TESP_API_PULSAR__STATUS__POLL_INTERVAL` | `4` | Seconds before the first status poll of a Pulsar job |
| `TESP_API_PULSAR__STATUS__MAX_POLL_INTERVAL` | `10` | Longest wait between polls. Each wait is 1.25 times the last. The fork refuses a maximum below the base, so `up.sh` raises it to the base if needed. |
| `TESP_API_PULSAR__STATUS__MAX_POLLS` | `400` | Upstream only: the poll cap (4 s × 400, about 27 minutes). The fork and the patched tesp-api ignore it. |
| `TESP_API_BASIC_AUTH__ENABLE` | `true` | Basic auth on every route except `GET /v1/service-info` |
| `TESP_API_BASIC_AUTH__USERNAME`, `__PASSWORD` | `<TESP_USER>` (default `galaxy`), `<TESP_PASS>` (random) | Generated into `.env.local` on first use |
| `TESP_API_LOGGING__LEVEL` | `DEBUG` | Task events, Pulsar requests and errors, cleanup |
| `CONTAINER_TYPE` | `docker` | What the job script uses. `singularity` does not work with Galaxy's local-only staging image. |
| `FASTAPI_PROFILE` | `default` | The `[default]` section of `settings.toml` |

`TESP_API_X__Y` maps to `x.y` in `settings.toml` (dynaconf). Defaults the demo relies on without setting them, from `settings.toml` in the patched tesp-api:

| Setting | Default | Effect |
| --- | --- | --- |
| `pulsar.status.max_wait_seconds` | `0` | No limit on how long a Pulsar job may queue and run. A positive value cancels the job and sets `SYSTEM_ERROR` past it. |
| `pulsar.status.error_retry_seconds` | `600` | Connection errors, timeouts and 5xx or 429 from Pulsar are retried this long without a good answer in between |
| `pulsar.client_timeout` | `30` | aiohttp total timeout per Pulsar request, in seconds |
| `container.resource_limits` | `auto` | `--cpus`/`--memory` on docker lines from TES `resources` |
| `oauth.enable` | `false` | |

Restart recovery (patch 0005) has fixed timings in `tesp_api/service/task_recovery.py`: each process renews its task leases every 45 s (`SWEEP_SECONDS`), and a lease expires 180 s after its last renewal (`LEASE_SECONDS`), or at once on a clean shutdown.

tesp-api listens on container port 8080 (uvicorn, `tesp_api.tesp_api:app`), published on `127.0.0.1:18200`. Image: `wes-tes/tesp-api-deps:py3.10-poetry1.8.5-e2ce6ef`, Python dependencies from the fork's lock fix `e2ce6ef9f054676a72f73d351f98d9a9f797bce3` (FastAPI 0.75.2, uvicorn 0.17.6, aiohttp 3.13.3) on `python:3.10-slim-bookworm`. Upstream's own `poetry.lock` pairs typing-extensions 4.2.0 with aiosignal 1.4.0, and tesp-api then fails to import with a `TypeVarTuple` error.

### The outer Pulsar

`scripts/tesp/up.sh` renders two files into `var/tesp/pulsar/` and mounts them into the container.

`app.yml`:

```yaml
staging_directory: /home/ubuntu/projects/repositories/galaxy-wes-tes/var/tesp/pulsar/staging
conda_auto_init: false
conda_auto_install: false
managers:
  _default_:
    type: queued_python
    num_concurrent_jobs: 2
```

`server.ini`:

```ini
[server:main]
host = 0.0.0.0
port = 8913

[app:main]
paste.app_factory = pulsar.web.wsgi:app_factory
app_config = /opt/pulsar/app.yml
```

The container (`compose.yaml`, service `pulsar`):

- runs `pulsar-serve --log-file - /opt/pulsar/server.ini`, so `docker logs wes-tes-tesp-pulsar` shows gunicorn's access log.
- mounts `/var/run/docker.sock`, so the `docker` CLI inside starts sibling containers on the host's daemon.
- mounts the staging directory **at the same absolute path** inside and on the host. tesp-api's `docker run` lines bind-mount the Pulsar job's inputs directory into task containers (comment in `compose.yaml`), and the host's daemon resolves that path on the host.
- is not published. Only tesp-api reaches it, on the compose network. tesp-api has no setting for a Pulsar `private_token`, so `app.yml` sets none (checked: no `private_token` anywhere in tesp-api's source).

Why these values:

- `queued_python` with `num_concurrent_jobs: 2` queues tasks beyond two. That needs the Pulsar fix `queued_manager_monitor_kwarg`: from 0.15.0 (`8fd077b`) through 0.16.0 and master `08dedcb`, `pulsar/managers/unqueued.py` passed the keyword `montior`, so the manager never waited and ran every job at once. With PyPI 0.16.0 four `sleep 20` tasks ran together, with the fix two at a time (`demo:runs/tesp-stage5/pulsar-concurrency/`).
- No `message_queue_url`. tesp-api's AMQP mode is broken on every ref, and REST works. Galaxy's AMQP link goes to the in-task Pulsar and is unrelated.
- Conda off. The outer Pulsar only runs shell scripts.

Image: `wes-tes/tesp-pulsar-rest:git-b476ccd3dfa8-docker29.1.3` (id `sha256:409202ba312cb8911cff04eaea402a146249c7946a6d8dcf5ac5e460fbeb2f5d`), from `demo:config/tesp/pulsar-rest.Dockerfile`: `python:3.12-slim-bookworm` pinned by digest, the static docker CLI 29.1.3 and Apptainer 1.3.6 (both sha256-checked), and `pulsar-app[web] @ git+https://github.com/jmchilton/pulsar.git@b476ccd3dfa8d8f13083cf0c094c4a2fa9fbb112` with dependencies pinned by `demo:config/tesp/pulsar-constraints.txt`. The image needs `setsid` (util-linux, present in Debian bookworm) for tesp-api's cancel watchdog. `TESP_PULSAR_SOURCE=pypi` builds 0.16.0 from PyPI instead.

Concurrency (`TESP_PULSAR_CONCURRENCY`), the source (`TESP_PULSAR_SOURCE`) and the instance name (`TESP_INSTANCE`) are the demo settings for this container.

### The staging image

The staging image runs executors 0 and 2 of every task: `pulsar-submit --no-wait --base64 <launch message> --app_conf_base64 <app config>` and `pulsar-finish` with the same arguments. Galaxy's TES runner names it with `pulsar_container_image`.

The demo builds `wes-tes/pulsar-pod-staging:0.16.1.dev0-20b6460` (id `sha256:7cfaea00701f0006e83d2a6a4d8f98db1fb2a76110c9417cb535502e623320df`, local only) from the jmchilton/pulsar branch `coexecution_stage_out_failures` at `20b6460bd69878d718cb15284c7699cc96ac0900`. That branch is the tip of a linear stack on master `08dedcb9bc951a073e173ae6ddb0ef8e9ec9e275`:

| Branch | Head | What it adds |
| --- | --- | --- |
| `coexecutor_image_modern_base` | `c4ae861` | `docker/coexecutor` rebuilt on `python:3.12-slim` with pycurl. The old `FROM conda/miniconda3` (Python 3.7) can't build current Pulsar. |
| `coexecution_publish_running` | `5e3de24` | `pulsar-submit --no-wait` publishes `running`. Without it Galaxy shows TES jobs `queued` until they finish. |
| `coexecution_stage_failures` | `954ab40` | `pulsar-submit --no-wait` and `pulsar-finish` exit non-zero when staging fails, and stage-in errors reach the job's stderr |
| `coexecution_dependency_dir_default` | `ef7caea` | No `dependencies/` directory under `/`, so the image starts on a read-only root |
| `coexecution_client_fixes` | `b31602a` | Client side only (default image tag that exists, TES `QUEUED` mapped). No effect while Galaxy uses pulsar-galaxy-lib 0.15.15. |
| `coexecution_stage_out_failures` | `20b6460` | Stage-out errors reach the job's stderr, an output written as a directory fails the job, a terminal status is published before shutdown |

Why not Galaxy's default `galaxy/pulsar-pod-staging:0.15.0.2` (2023, Pulsar 0.15.0.dev1, Python 3.7): Galaxy 26.x takes the remote Pulsar version from its own client library (0.15.15) and so describes discovered outputs only with `dataset_collector_descriptions`. Pulsar 0.15.0.dev1 doesn't know that key. Tools with `discover_datasets` outputs finish `ok` with those outputs missing (`demo:runs/gaps/discovered-outputs/`). Pulsar's `docs/compatibility.rst` marks the pair broken. No newer image is published.

Build it without the demo scripts (what `demo:scripts/build-staging-image.sh` runs):

```sh
git clone --branch coexecution_stage_out_failures https://github.com/jmchilton/pulsar.git pulsar-staging
cd pulsar-staging
git checkout 20b6460bd69878d718cb15284c7699cc96ac0900
uv venv .venv --python 3.12 && uv pip install --python .venv/bin/python build==1.6.1
make -C docker/coexecutor all IMAGE=wes-tes/pulsar-pod-staging:0.16.1.dev0-20b6460 \
  DOCKER_BUILD_ARGS="--build-arg PYTHON_IMAGE=python:3.12-slim-trixie@sha256:5e2bdb1b0d542d5039cffb8181c65930093949194a65c365dfb1b0fe13a4fa5b"
```

The base is pinned, but pip and Conda dependencies inside the image resolve at build time. A rebuild gives a working image with a different id. The image is local only, so with Docker the TES host must have it in its local store (`docker load` on another host). Apptainer can't use it at all without a registry.

For jobs with many inputs, the Pulsar branch `coexecution_compact_launch` (`9036ff3`, two commits on `20b6460`, pushed to jmchilton) changes how the launch message travels. A message longer than 131,071 bytes goes as `--base64_zlib`, URL-safe base64 of zlib-compressed JSON. URL-safe matters, because tesp-api collapses `//` in executor arguments (bug list item 21). Smaller messages stay plain `--base64`, so older images keep working for every job that worked before. `pulsar-finish` now gets only `{"job_id": ...}`, which halves the task JSON. The client half runs inside Galaxy, so Galaxy v26.1.2 (pulsar-galaxy-lib 0.15.15) needs the demo port `coexecution_compact_launch_0.15.15` (`f826997`) in its venv, and the task needs the image `wes-tes/pulsar-pod-staging:0.16.1.dev0-9036ff3`. An older image given `--base64_zlib` exits 2. No Galaxy code change is needed. It raises the ceiling from 108 to 1,244 inputs ([OPERATIONS.md](OPERATIONS.md#limits)). It is not the demo default. At the Galaxy level (`demo:runs/stage6/argv/galaxy/tesp-2026-11-15T0339Z/`) the fixed client and image ran jobs with 109, 110 and 600 inputs on tesp-api (compressed arguments of 12.8, 12.9 and 65 KB, task JSON at 110 inputs 15 KB instead of 266 KB), where the stock client failed at 110.

### Networking

Single host. Host processes use `127.0.0.1`. Containers reach host services at the default bridge's gateway, `172.17.0.1` (`DOCKER_HOST_IP`, checked by `demo:scripts/preflight.sh` against `docker network inspect bridge`).

| Port | Service | Bound to | Reached by |
| --- | --- | --- | --- |
| 18080 | Galaxy: WES, DRS, native API, job files API | `127.0.0.1` and `172.17.0.1` | WES client (loopback), executors 0 and 2 (bridge) |
| 18672 | RabbitMQ AMQP | `127.0.0.1` and `172.17.0.1` | Galaxy and Celery (loopback), executors 0 and 2 (bridge) |
| 18673 | RabbitMQ management | `127.0.0.1` | an operator |
| 18200 | tesp-api (container port 8080) | `127.0.0.1` | Galaxy |
| 8913 | outer Pulsar | compose network `wes-tes-tesp` only | tesp-api |
| 27017 | MongoDB | compose network only | tesp-api |

What must reach what:

| From | To | Why |
| --- | --- | --- |
| WES client | Galaxy | WES, DRS, DRS access URLs |
| Galaxy | tesp-api | Create, read and cancel tasks |
| Galaxy | RabbitMQ | Consume Pulsar status messages, Celery, control |
| tesp-api | outer Pulsar, MongoDB | Run jobs, store tasks |
| Outer Pulsar | Docker daemon | Start and remove task containers |
| Executors 0 and 2 | Galaxy job files API | Download inputs, upload outputs |
| Executors 0 and 2 | RabbitMQ | Publish job status |
| Executor 1 (tool) | nothing | Reads and writes the shared volume only |
| Docker daemon | quay.io | Pull biocontainers before each tool executor |
| Galaxy | quay.io | Container resolution |

The demo binds Galaxy and publishes RabbitMQ twice instead of on `0.0.0.0`, so neither is reachable from the LAN. A host firewall with a restrictive INPUT policy must accept 18080 and 18672 from `172.17.0.0/16`, or jobs stay `queued` forever. `demo:scripts/check-reachability.sh` checks both from a container.

### Auth and secrets

| Link | Mechanism | Where the secret lives |
| --- | --- | --- |
| WES client → Galaxy | Galaxy API key in `x-api-key` | `.env.local` (`GALAXY_API_KEY`) |
| Galaxy → tesp-api | HTTP basic auth, cleartext on loopback. `GET /v1/service-info` is public. Missing, wrong or non-ASCII credentials get 401 on the patched tesp-api (500 on upstream and the fork). | `.env.local`, `var/tesp/api.env` (0600), `var/galaxy/job_conf.yml` (0600) |
| tesp-api → outer Pulsar | none | (network isolation only) |
| tesp-api → MongoDB | none | (network isolation only) |
| In-task Pulsar → Galaxy job files API | per-job `job_key` in the URL query. Galaxy refuses it (403) once the job is no longer running. | Galaxy's launch message in the task |
| In-task Pulsar → RabbitMQ, Galaxy → RabbitMQ | one RabbitMQ user (`RABBITMQ_USER`, default `pulsar`, random hex password). The image's `guest` user is not created, because `guest` logs in only from loopback. | `.env.local`, the job conf, the launch message in every task, `docker inspect wes-tes-rabbitmq` |

The weak point is the launch message. Galaxy base64-encodes the Pulsar app config (broker URL with password) and the job's job files URLs (with `job_key`) into the arguments of executors 0 and 2. tesp-api stores those arguments in MongoDB, returns them in the `BASIC` and `FULL` task views, and writes them into `tesp_job.sh` in the outer Pulsar's job directory until the job is deleted. They are also visible as arguments of the running containers. Anyone with tesp-api's credentials can read the broker password. [OPERATIONS.md](OPERATIONS.md#logs-and-redaction) lists what tesp-api redacts and what it doesn't.

## Minimum versions and branches

What the demo pins after stage 6, with the stage 5 acceptance pins (`demo:runs/tesp-acceptance/2026-11-15/pins.txt`) where they differ, and what is the minimum for each part.

| Component | Version or branch | SHA, tag or image id | Required or recommended |
| --- | --- | --- | --- |
| Galaxy | `v26.1.2` | `391641a4e121216de4764ffd12b8c666859460ea` | Required minimum for this setup as tested. Use v26.0.2 or later for WES at all: before it a finished run reported `UNKNOWN`. |
| Galaxy fixes (demo) | `wes_tes_demo_fixes_v26.1.2` | `b317bc12545` (stage 5 acceptance: `3585089e925f27f27152399a53908973e41beaad`) | Recommended: TES polling, unreachable timeout, cancel retry, SYSTEM_ERROR job info, five WES API fixes. Stock v26.1.2 passes the happy path. |
| Galaxy polling (upstream candidates) | `tes_task_state_polling` → `tes_task_state_polling_unreachable` | `e3c0cc44649` → `025f1256ec3` on `dev` `61ec05da7b6` | Recommended |
| Galaxy WES fixes (upstream candidate) | `wes_api_fixes_26_0` | `85f9b2b42be` on `release_26.0` | Recommended for WES clients |
| Galaxy WES state (needs a decision) | `wes_run_state_executor_error_26_0` | `d83962aa811` | Not in the demo ([BUGS_AND_ENHANCEMENTS.md](BUGS_AND_ENHANCEMENTS.md#needs-johns-decision)) |
| Galaxy client libraries | pulsar-galaxy-lib 0.15.15, pydantic-tes 0.4.0, kombu 5.6.2 | Galaxy v26.1.2 pins | As pinned |
| Staging image | jmchilton/pulsar `coexecution_stage_out_failures` | `20b6460bd69878d718cb15284c7699cc96ac0900`, image `wes-tes/pulsar-pod-staging:0.16.1.dev0-20b6460`, id `sha256:7cfaea00701f…` | Required (Galaxy's default image loses discovered outputs) |
| Staging image, compact launch (optional) | jmchilton/pulsar `coexecution_compact_launch` on `20b6460`, plus the client port `coexecution_compact_launch_0.15.15` in Galaxy's venv | `9036ff3`, image `wes-tes/pulsar-pod-staging:0.16.1.dev0-9036ff3` (id `sha256:988a080e450a…`), client `f826997` | Needed for jobs with more than 108 inputs ([OPERATIONS.md](OPERATIONS.md#limits)). Not the demo default. |
| Outer Pulsar | jmchilton/pulsar `queued_manager_monitor_kwarg` | `b476ccd3dfa8d8f13083cf0c094c4a2fa9fbb112` on master `08dedcb`, image `wes-tes/tesp-pulsar-rest:git-b476ccd3dfa8-docker29.1.3`, id `sha256:409202ba312c…` | Recommended. PyPI 0.16.0 works but ignores `num_concurrent_jobs`. `clean_job_directory_retry` `ffbe6987cd84` (on `b476ccd`, image `wes-tes/tesp-pulsar-rest:git-ffbe6987cd84-docker29.1.3`) also fixes the job directory race of bug list item 50. Not the demo default, because tesp-api patch 0017 fixes it too. |
| tesp-api | `TESP_REF=patched` = mirelaminkova `main` + 17 patches | commit `c5ca66a2b9096086df79f40487a4da905bee75da`, tree `c3cc3dad70965578503a92ba18958238316e4c65`, on `c3a9f2376df7a634ad6c33959800d169219b7560` (stage 5 acceptance: `4bc9b5d`, 15 patches) | Recommended. Upstream `3d470f76` and fork `c3a9f237` pass the happy path, but cancel, cleanup, restart and logs don't work. |
| tesp-api dependencies | fork commit `e2ce6ef` lock | image `wes-tes/tesp-api-deps:py3.10-poetry1.8.5-e2ce6ef`, id `sha256:cb93b4ea5710…` | Required (upstream's lock doesn't import) |
| MongoDB | 7.0.25 | `mongo:7.0.25@sha256:82db6c6c8103eee46ca820c190742b7c280d02d6f993903a603cec9d56be374b` | As tested |
| RabbitMQ | 4.3.7 | `rabbitmq:4.3.7-management@sha256:8e913a7748f808be4ce117c3df11817935775bcd83934d4de92441a7e93e9899` | As tested. 4.3 needs the Celery settings above. |
| docker CLI in the outer Pulsar | 29.1.3 | sha256 `c019c608…` | As tested |
| Tool images | fastp `quay.io/biocontainers/fastp:1.4.0--h43da1c4_0`, MultiQC `mulled-v2-8374e50c…:783e4c36…-0` | fastp id `sha256:7dcc9e12…` | From IWC `c07557fb`, resolved by Galaxy |

## Demo choices versus a real deployment

| Topic | Demo | A real deployment |
| --- | --- | --- |
| Hosts | Everything on one host. Task containers reach Galaxy and RabbitMQ at `172.17.0.1`. | Galaxy, RabbitMQ and the TES host on separate machines. `galaxy_url`/`galaxy_infrastructure_url` and `message_queue_url` must name addresses the task containers can route to. This is the main deployment constraint of design A. |
| Transport | Plain HTTP and AMQP on loopback and the bridge | HTTPS for Galaxy and tesp-api, AMQPS for RabbitMQ, a reverse proxy in front of tesp-api |
| tesp-api | One instance, source built from the committed patch files (`TESP_REF=patched`) and mounted read-only, DEBUG logging | A published image or package built from a pushed ref. No such artifact exists yet. |
| Outer Pulsar | Container with the Docker socket and a same-path staging mount | Same pattern, or Pulsar on the host itself, which removes the same-path requirement. Keep it on a private network, because tesp-api can't send a Pulsar token. |
| MongoDB | No auth, compose network only, named volume `wes-tes-tesp-mongo` | Auth, backups |
| RabbitMQ | One user shared by Galaxy and every task, ephemeral state (`--rm`) | Durable broker state, and per-job or topic-limited credentials if the TES host is shared (not supported by Pulsar today) |
| Galaxy | SQLite, one gunicorn worker as handler, plain `gunicorn` | PostgreSQL, gravity or systemd, separate handlers |
| Staging image | Built locally, `docker load`-able only | Pushed to a registry the TES host can pull from |
| Concurrency | 2 jobs in Galaxy, 2 in the outer Pulsar | Match the outer Pulsar's slots to the host's cores and memory, and keep Galaxy's limit at or below it |
| Container type | Docker only | Singularity/Apptainer needs a registry for the staging image ([BUGS_AND_ENHANCEMENTS.md](BUGS_AND_ENHANCEMENTS.md)) |

A site that runs only Galaxy gains nothing from tesp-api. The demo's comparison backend, `make up TES=pulsar`, sends the same jobs from Galaxy's own `PulsarRESTJobRunner` to the same Pulsar image, with identical outputs and no TES server, broker link from the task, staging image or credentials in task arguments (`demo:docs/tesp-api.md#comparison-backend-tespulsar`). tesp-api is for a site that wants one TES endpoint for Galaxy and other TES clients.
