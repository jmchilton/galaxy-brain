# Bugs and enhancements: Galaxy WES on tesp-api

A prioritised list of the bugs and missing features that affect the Galaxy WES → Galaxy → tesp-api line, across Galaxy, Pulsar, tesp-api and pydantic-tes, with the TES-server items that matter for design B. Each item says what is wrong, where the evidence is, what it costs, how to fix it, how big the fix is, whether it is fixed and where, and which upstream it belongs to. The last section lists the decisions that are John's.

It updates the umbrella project's `vault/projects/ga4gh_wes_tes/PULSAR_TES_IMPROVEMENTS.md` (32 items, written at the end of stage 3) with stages 4 and 5. Items from that list keep their number as "PTI n". Items that only concern Funnel or TESK under design A are left there.

Evidence paths written `demo:` are in the demo repository `/home/ubuntu/projects/repositories/galaxy-wes-tes`. Branch records are in galaxy-brain under `vault/repositories/galaxy/branches/active/<branch>/` and `vault/repositories/pulsar/branches/active/<branch>/`. No pull requests or issues were opened anywhere.

**Priority.** P1: jobs hang, results are silently wrong, or the setup can't work. P2: a real failure mode or a lot of friction, with a workaround. P3: polish, spec gaps, documentation.

**Size.** S: under a day with tests. M: a few days. L: needs design or touches several projects.

**Status.** "Fixed on X at SHA" means a branch with a test that fails without the fix. Galaxy and Pulsar branches are pushed to the `jmchilton` forks. tesp-api fixes are on the local branch `galaxy-wes-tes` (head `d72420fd3ffe`, 17 commits on mirelaminkova `main` `c3a9f237`. Stage 5 ended at `4bc9b5d` with 15.), exported as `demo:patches/tesp-api/00NN-*.patch`, and pushed nowhere. The demo builds them on any host as `TESP_REF=patched` (commit `c5ca66a2`, tree `c3cc3dad`).

## Summary

| # | Pri | Project | Item | Size | Status | Upstream |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P1 | Galaxy | Stock Galaxy never polls TES, so a task that dies early hangs the job | M | fixed on `tes_task_state_polling` `e3c0cc44649` | galaxyproject/galaxy |
| 2 | P1 | tesp-api | Cancel never stops the task's containers | M | fixed on `galaxy-wes-tes` (0002, 0004) | mirelaminkova/tesp-api, CESNET/tesp-api |
| 3 | P1 | tesp-api | Every task leaves its containers and volume behind | S–M | fixed on `galaxy-wes-tes` (0001) | mirelaminkova, CESNET |
| 4 | P1 | tesp-api | A tesp-api restart strands running tasks | M | fixed on `galaxy-wes-tes` (0005, fork #52) | mirelaminkova, CESNET |
| 5 | P1 | Pulsar, Galaxy | Galaxy's default staging image silently drops discovered outputs | M | open | galaxyproject/pulsar, galaxyproject/galaxy |
| 6 | P1 | Pulsar | The staging image can't be built from current Pulsar | S | fixed on `coexecutor_image_modern_base` `c4ae861` | galaxyproject/pulsar |
| 7 | P1 | Pulsar | `pulsar-submit --no-wait`/`pulsar-finish` exit 0 when staging fails | S | fixed on `coexecution_stage_failures` `954ab40` | galaxyproject/pulsar |
| 8 | P1 | Pulsar | An output written as a directory gives a green job | S | fixed on `coexecution_stage_out_failures` `20b6460` | galaxyproject/pulsar |
| 9 | P1 | Galaxy, Pulsar | Jobs with 109+ inputs can't start (`MAX_ARG_STRLEN`) | M | fixed on `coexecution_compact_launch` `9036ff3` (limit 1,244, a 600-input Galaxy job passed) | galaxyproject/pulsar |
| 10 | P1 | Galaxy WES | `COMPLETE` for runs with failed or paused jobs | S | branch `wes_run_state_executor_error_26_0` `d83962aa811`, needs decision | galaxyproject/galaxy |
| 11 | P2 | Galaxy, Pulsar | Broker password and job key in TES executor arguments | L | open | galaxyproject/pulsar, galaxyproject/galaxy |
| 12 | P2 | Galaxy | The polling branch retries an unreachable TES server forever | S | fixed on `tes_task_state_polling_unreachable` `f71ca18704d` | galaxyproject/galaxy |
| 13 | P2 | Galaxy | A cancel sent while TES was unreachable is never retried | S | fixed on `tes_task_state_polling_unreachable` `bd710f3b8da`, passes live on tesp-api | galaxyproject/galaxy |
| 14 | P2 | Pulsar | Pulsar's kill leaves socket-started containers running | M | open, needs decision | galaxyproject/pulsar |
| 15 | P2 | Pulsar | `queued_python` ignores `num_concurrent_jobs` | S | fixed on `queued_manager_monitor_kwarg` `b476ccd` | galaxyproject/pulsar |
| 16 | P2 | tesp-api | The job script travels in the URL query string | S–M | fixed on `galaxy-wes-tes` (0003) | mirelaminkova, CESNET |
| 17 | P2 | tesp-api | Cancel acts only at the next status poll | S | fixed on `galaxy-wes-tes` (0002) | mirelaminkova |
| 18 | P2 | tesp-api | Executor logs empty (upstream) or full of Galaxy secrets (fork) | S–M | fixed on `galaxy-wes-tes` (0006, 0007, 0013, 0015) | mirelaminkova, CESNET |
| 19 | P2 | tesp-api | Upstream fails tasks after 27 minutes and leaves the container running | S | fixed on mirelaminkova `main`, open upstream | CESNET |
| 20 | P2 | tesp-api | Upstream's `poetry.lock` doesn't import | S | fixed on mirelaminkova `e2ce6ef`, open upstream | CESNET |
| 21 | P2 | tesp-api | Executor arguments are rewritten as paths (`List[Path]`) | S | open, needs decision | mirelaminkova, CESNET |
| 22 | P2 | tesp-api | No token for the outer Pulsar | S–M | open | mirelaminkova, CESNET |
| 23 | P2 | tesp-api | Singularity can't run Galaxy's local staging image | M | open | mirelaminkova, CESNET (and a registry) |
| 24 | P2 | Galaxy | Job files API returns 200 with an empty body for a missing input (26.x) | S | open (fixed on `dev`) | galaxyproject/galaxy |
| 25 | P2 | pydantic-tes | No HTTP timeout (a hung server blocks Galaxy's monitor and cancelling thread), MINIMAL view unparseable, TES 1.1 states missing | S | open | galaxyproject/pydantic-tes |
| 26 | P2 | Galaxy, Pulsar | TES auth is basic only, and `basic_auth` alone sends nothing | M | open | galaxyproject/galaxy, galaxyproject/pulsar |
| 27 | P2 | Galaxy, Pulsar | No CI runs any TES path, and no current staging image is published | M | open upstream. The demo has a regression run, `make acceptance`. | galaxyproject/pulsar, galaxyproject/galaxy |
| 28 | P2 | Pulsar | `running` never published from `pulsar-submit --no-wait` | S | fixed on `coexecution_publish_running` `5e3de24` | galaxyproject/pulsar |
| 29 | P2 | Pulsar | Stage-out errors never reach Galaxy, and a terminal status can be lost at shutdown | S | fixed on `coexecution_stage_out_failures` `20b6460` | galaxyproject/pulsar |
| 30 | P2 | Galaxy WES | Five request-handling bugs (500s, cancel of a COMPLETE run, leftovers) | S | fixed on `wes_api_fixes_26_0` `85f9b2b42be` | galaxyproject/galaxy |
| 31 | P2 | Galaxy WES/DRS | Collection outputs have no elements or DRS URIs | M | open | galaxyproject/galaxy |
| 32 | P2 | Galaxy DRS | 60 s `Retry-After` per object, 202 forever without Celery | M | open | galaxyproject/galaxy |
| 33 | P2 | Galaxy DRS | DRS URIs name an unresolvable host, objects only for public datasets | S–M | open | galaxyproject/galaxy |
| 34 | P2 | Galaxy | v26.1.x sends dependency resolution for containerized TES jobs | S | fixed upstream `19f8286868d` (26.2) | galaxyproject/galaxy |
| 35 | P2 | demo, tesp-api | The tesp-api pin is a local-only commit | S | fixed in the demo (`TESP_REF=patched`, deterministic commit `c5ca66a2`) | (distribution) |
| 36 | P3 | tesp-api | 500 instead of 401 without credentials | S | fixed on `galaxy-wes-tes` (0008, fork branch) | mirelaminkova, CESNET |
| 37 | P3 | tesp-api | A cancel erases the task twice | S | fixed on `galaxy-wes-tes` (0016, with 0017 for the race it uncovered) | mirelaminkova |
| 38 | P3 | tesp-api | AMQP mode fails every task | M | open | mirelaminkova, CESNET |
| 39 | P3 | tesp-api | TES 1.1 fields dropped, `ignore_error` not honoured, `state` filter ignored | S–M | open | mirelaminkova, CESNET |
| 40 | P3 | tesp-api | HTTP inputs don't follow redirects | S | open | mirelaminkova, CESNET |
| 41 | P3 | tesp-api | No wildcard outputs, and directory outputs lose relative paths upstream | M | open | mirelaminkova, CESNET |
| 42 | P3 | Galaxy, Pulsar | Every job runs with `GALAXY_SLOTS=1` under the Pulsar TES runner | S | open | galaxyproject/galaxy or galaxyproject/pulsar |
| 43 | P3 | Galaxy | 25 to 32 s of container resolution after each Galaxy start | S | open | galaxyproject/galaxy |
| 44 | P3 | Pulsar | Client: default coexecution image tag never pushed, TES `QUEUED` maps to failed | S | fixed on `coexecution_client_fixes` `b31602a` | galaxyproject/pulsar |
| 45 | P3 | Galaxy WES | Tasks carry no job state, validation and spec gaps, no setup through WES | S–L | open | galaxyproject/galaxy |
| 46 | P2 | Galaxy | A `SYSTEM_ERROR` task's job info says "exited with code 0" and hides the reason | S | fixed on `tes_task_state_polling_unreachable` `025f1256ec3` | galaxyproject/galaxy |
| 47 | P3 | Pulsar | `pulsar-finish` publishes `complete` after every output upload got 403 | S | open, needs decision | galaxyproject/pulsar |
| 48 | P3 | Funnel | A running executor reports `exitCode: 0` before it ends | S | worked around in the demo (`executor_done`), open upstream | ohsu-comp-bio/funnel |
| 49 | P2 | Funnel | After a server restart, cancelling a task from before it leaves its container running | M | open | ohsu-comp-bio/funnel |
| 50 | P2 | Pulsar, tesp-api | Pulsar's `clean()` races a cancelled job and leaves its directory | S | fixed on Pulsar `clean_job_directory_retry` `ffbe6987cd84` and tesp-api patch 0017 | galaxyproject/pulsar, mirelaminkova |

## P1

### 1. Stock Galaxy never polls TES (PTI 1)

- **Problem.** `PulsarTesJobRunner` has `poll = False` in v26.1.2. Job state arrives only as AMQP messages from the Pulsar inside the task. A task that dies before that Pulsar publishes (bad staging image, image pull failure, `Argument list too long`, unreachable broker) leaves the Galaxy job `queued` forever, and the WES run `RUNNING`.
- **Evidence.** `demo:runs/gaps/tes-dies-early/` (stock), `demo:runs/gaps/tes-dies-early-polling/` (fixed), on tesp-api `demo:runs/tesp-probes/galaxy/07-*` and acceptance item 5, `demo:runs/tesp-acceptance/2026-11-15/04-05-cancel-dies-early-fixes/dies-early/`.
- **Impact.** The worst failure in the chain: nothing tells the user or admin, and a WES client polls forever.
- **Fix.** A monitor in the TES runner reads each task every `tes_status_check_interval` and fails the job after `tes_status_grace_period` once the task is final or gone without a Pulsar final status, with a redacted stderr tail. Cancel of an ended task becomes a no-op.
- **Size.** M.
- **Status.** Fixed on `tes_task_state_polling` at `e3c0cc44649` (base `dev`). Demo port `tes_task_polling_v26.1.2` `a1b53d59234`. On tesp-api, the dies-early job was `error` 42.5 s after the task's `EXECUTOR_ERROR`. Still open inside it: tasks stuck in TES `QUEUED` forever, and hung servers (item 25).
- **Upstream.** galaxyproject/galaxy.

### 2. tesp-api cancel never stops the task's containers

- **Problem.** CESNET upstream only marks the task `CANCELED` in MongoDB. The fork also cancels the Pulsar job, but Pulsar's SIGKILL kills only the `docker run` client, and the container belongs to the Docker daemon (item 14). The tool keeps running to its end. On upstream, `pulsar-finish` then runs, gets 403 from Galaxy and publishes `complete`.
- **Evidence.** `demo:runs/tesp-probes/galaxy/04-wes-cancel-stock-upstream/`, `09-*` (fork), `demo:runs/tesp-probes/tes-level/*/cancel.json`. Fixed: acceptance item 4 (containers gone 1.4 s after the WES cancel), `demo:runs/tesp-stage5/tes-level/final/` (4 s, 3 s with every slot busy).
- **Impact.** Cancelled jobs keep using CPU and memory, and Galaxy's concurrency limit no longer reflects what runs.
- **Fix.** Containers run with `--rm --label=tesp-api.task=<id>`. The cancel endpoint dispatches a `cancel_task` event at once. The job script starts a double-forked `setsid` watchdog outside Pulsar's process tree that runs `docker rm -f` on the labelled containers when the job's shell dies. A cleanup Pulsar job is the backstop.
- **Size.** M.
- **Status.** Fixed on `galaxy-wes-tes` (0001, 0002, 0004). The watchdog needs `setsid` on the Pulsar host.
- **Upstream.** mirelaminkova/tesp-api (the patches apply there), CESNET/tesp-api only after taking the fork's `main`.

### 3. tesp-api leaves every container and volume behind

- **Problem.** Upstream and fork run executor, stage-in and stage-out containers without `--rm` and never remove the `vol-<task id>-*` volumes: 3 containers and 1 volume per Galaxy task, plus the outer Pulsar's job directory after a cancel.
- **Evidence.** `demo:runs/tesp-probes/tes-level/*/leftovers.json`, stage 4 cleaned 67 containers and 23 volumes. Fixed: acceptance item 6 (nothing left after 66 tasks).
- **Impact.** Disk fills with staged data (each volume holds the job's inputs and outputs).
- **Fix.** `--rm` and the cleanup job on every final state (`erase_job`).
- **Size.** S–M.
- **Status.** Fixed on `galaxy-wes-tes` (0001). `demo:scripts/tesp/clean-tasks.sh` cleans up after upstream and fork.
- **Upstream.** mirelaminkova, CESNET.

### 4. A tesp-api restart strands running tasks

- **Problem.** Upstream and fork forget a task's Pulsar job when tesp-api restarts. The task stays `RUNNING` forever, and its volume and job directory remain. Galaxy still finishes the job through AMQP.
- **Evidence.** `demo:runs/tesp-probes/tes-level/*/restart.json`. Fixed: acceptance item 7, `demo:runs/tesp-stage5/tes-level/final/restart.json`.
- **Impact.** TES state is wrong for every client, and leftovers accumulate after each deploy.
- **Fix.** Task leases in MongoDB (renewed every 45 s, expiring after 180 s or at once on a clean stop) and a sweep that resumes or fails orphaned tasks.
- **Size.** M.
- **Status.** Fixed on `galaxy-wes-tes` (0005, a cherry-pick of the fork's unmerged branch `fix/issue-52-resume-pulsar-jobs`, `333b8ff`).
- **Upstream.** mirelaminkova (merge their own branch), CESNET.

### 5. Galaxy's default staging image silently drops discovered outputs (PTI 2)

- **Problem.** `DEFAULT_PULSAR_CONTAINER` is `galaxy/pulsar-pod-staging:0.15.0.2` (2023, Pulsar 0.15.0.dev1). Galaxy 26.x describes discovered outputs with `dataset_collector_descriptions`, which that Pulsar ignores. Jobs end `ok` with empty collections and missing datasets.
- **Evidence.** `demo:runs/gaps/discovered-outputs/`, Pulsar `docs/compatibility.rst`.
- **Impact.** Silent data loss on every Galaxy 26.x TES, Kubernetes or GCP Batch coexecution deployment that uses the default image, whatever the TES server.
- **Fix.** Land the staging image stack (items 6, 7, 8, 28, 29), publish an image, bump `DEFAULT_PULSAR_CONTAINER`. In Galaxy, derive the coexecution Pulsar version from the configured image (`KNOWN_PULSAR_CONTAINER_VERSIONS`, needs a pulsar-galaxy-lib bump) and fail loudly when finish sees a Pulsar too old for what submit sent.
- **Size.** M.
- **Status.** Open. The demo builds `wes-tes/pulsar-pod-staging:0.16.1.dev0-20b6460` locally.
- **Upstream.** galaxyproject/pulsar (image), galaxyproject/galaxy (default and version check).

### 6. The staging image can't be built from current Pulsar (PTI 4)

- **Problem.** `docker/coexecutor/Dockerfile` starts from `conda/miniconda3` (Python 3.7) and copies a `py2.py3` wheel name. Current Pulsar needs Python 3.10 or later and builds a `py3` wheel.
- **Evidence.** `demo:docs/pulsar-staging-image.md`, record `coexecutor_image_modern_base` and its `review.md`.
- **Impact.** Nobody can produce a current staging image, which is why item 5 persists.
- **Fix.** Rebuild on a digest-pinned `python:3.12-slim`, install the wheel with `[amqp,galaxy_extended_metadata]` plus pycurl, keep Conda behind a build arg, drop CVMFS and Slurm/DRMAA.
- **Size.** S.
- **Status.** Fixed on `coexecutor_image_modern_base` at `c4ae861` (pycurl folded in from `coexecutor_image_pycurl` in the restack). Pip and Conda dependencies still float at build time.
- **Upstream.** galaxyproject/pulsar.

### 7. Staging failures exit 0 (PTI 3)

- **Problem.** `pulsar-submit --no-wait` and `pulsar-finish` caught every exception and exited 0. A failed stage-in let the tool executor wait for a `command_line` that never came, and a failed stage-out ended the task `COMPLETE`.
- **Evidence.** `demo:runs/gaps/stage-in-failure/`, record `coexecution_stage_failures`.
- **Impact.** Hangs when the `failed` message or Galaxy's cancel is lost, and no reason in the job's stderr.
- **Fix.** Exit non-zero on failure (keeping `--wait` at 0 for Kubernetes Jobs) and put the stage-in error into the `failed` status's stderr.
- **Size.** S.
- **Status.** Fixed on `coexecution_stage_failures` at `954ab40`.
- **Upstream.** galaxyproject/pulsar.

### 8. An output written as a directory gives a green job (PTI 6)

- **Problem.** Pulsar's results collection matched only files. A directory at an output path was skipped, and the job ended `ok` with an empty dataset. A local Galaxy runner fails the same job.
- **Evidence.** `demo:runs/gaps/stage-out-failure-53f91f1/`.
- **Impact.** Silently wrong results.
- **Fix.** Report `Output <name> is a directory, not a file`, exit 1 from `pulsar-finish`, fail the job.
- **Size.** S.
- **Status.** Fixed on `coexecution_stage_out_failures` at `20b6460`. An empty directory is still not noticed. A missing output stays green, as on a local runner.
- **Upstream.** galaxyproject/pulsar.

### 9. Jobs with 109 or more inputs can't start (PTI 32)

- **Problem.** Galaxy's base64 Pulsar launch message is one argument of executors 0 and 2, about 877 bytes of JSON (1,169 bytes of base64) per input in the demo. `execve` refuses an argument of 131,072 bytes or more (`MAX_ARG_STRLEN`), so the message can hold at most 131,068 bytes of base64, 98,301 bytes of JSON. A Galaxy job with 108 inputs starts and one with 109 doesn't. On tesp-api the task ends `EXECUTOR_ERROR`, exit 126, `docker: Argument list too long`. On Funnel it ends `SYSTEM_ERROR` in about 1 s with `fork/exec /usr/bin/docker: argument list too long`. TESK's 256 KiB annotation holds two copies, which gives about the same limit (computed, not run).
- **Evidence.** `demo:runs/stage6/argv/` (`tes-level/*/launch.json`: 108 inputs `COMPLETE`, 109 fail on both servers, with Galaxy's task shape and Pulsar's own decoder), `demo:docs/pulsar-tes-runner.md#argument-size-ceiling`, stage 4's `demo:runs/tesp-probes/tes-level/{upstream,fork}/argmax.json`.
- **Impact.** A whole class of jobs (large collection reductions such as `collapse_dataset`, MultiQC over many samples) can't run on design A at all. Stock Galaxy then leaves them `queued` (item 1).
- **Fix.** A message over 131,071 bytes goes as `--base64_zlib`, URL-safe base64 of zlib-compressed JSON (URL-safe because tesp-api collapses `//`, item 21). Smaller messages stay plain, so older images keep working for every job that worked. `pulsar-finish` gets only `{"job_id": ...}`, which halves the task JSON. Hyphy's 39-input message shrinks from 49,264 to 4,948 bytes. Fetching the message from Galaxy by job key would remove the ceiling entirely and help item 11 (L). Design B has no such ceiling.
- **Size.** M.
- **Status.** Fixed on Pulsar `coexecution_compact_launch` at `9036ff3` (on `20b6460`, pushed). The new limit is 1,244 inputs: 1,244 pass and 1,245 fail on tesp-api and Funnel. Pulsar's tests went from 6 failed and 2 passed to 23 passed (`demo:runs/stage6/argv/pulsar-tests/`). Galaxy v26.1.2 needs the client port `coexecution_compact_launch_0.15.15` (`f826997`) and the image `wes-tes/pulsar-pod-staging:0.16.1.dev0-9036ff3`. No Galaxy change. An older image given `--base64_zlib` exits 2. At the Galaxy level (`demo:runs/stage6/argv/galaxy/`), the stock client failed at 110 inputs on tesp-api (exit 126) and at 109 on Funnel. The fixed client and image ran 109, 110 and 600 inputs on tesp-api (compressed arguments 12.8 to 65 KB, task JSON at 110 inputs 15 KB instead of 266 KB) and 109 and 110 on Funnel. The fixed client with the old image fails at 110 with exit 2 (`unrecognized arguments: --base64_zlib`) and works at 20.
- **Upstream.** galaxyproject/pulsar.

### 10. WES reports `COMPLETE` for runs with failed or paused jobs (PTI 5)

- **Problem.** Galaxy maps invocation `completed` to WES `COMPLETE`, and an invocation completes once every job is terminal, failed ones included. The spec defines `COMPLETE` as executors exited without error and `EXECUTOR_ERROR` for an executor failure.
- **Evidence.** `demo:runs/setup/wes-probes/probe-I-iwc-submit-cancel/` (COMPLETE with fastp `error` and MultiQC `paused`), `demo:runs/gaps/stage-in-failure/`.
- **Impact.** A WES client that trusts the state reports success for a failed analysis. The demo's client judges success from task exit codes instead.
- **Fix.** Map `completed` with jobs in `error`, `failed` or `paused` to `EXECUTOR_ERROR` (or a narrower rule, see the decision).
- **Size.** S.
- **Status.** Branch `wes_run_state_executor_error_26_0` at `d83962aa811` (on `wes_api_fixes_26_0`), in `branches_need_decision`, because it reverses a documented choice.
- **Upstream.** galaxyproject/galaxy.

## P2

### 11. Broker password and job key in TES executor arguments (PTI 17)

- **Problem.** The Pulsar app config (broker URL with its password) and the launch message (job files URLs with `job_key`) are base64 in executors 0 and 2 of every task. tesp-api stores them in MongoDB, returns them in the `BASIC` and `FULL` views, writes them into `tesp_job.sh` until the job is deleted, and shows them in the running containers' arguments.
- **Evidence.** `run_checks.py` "not judged" counts in every tesp-api run (typically 8 `job_key` values and the RabbitMQ password twice per task), `demo:docs/pulsar-tes-runner.md` "Credentials in executor arguments".
- **Impact.** Anyone who can read tasks on a shared TES server can publish fake job statuses to Galaxy's broker or read its queues. The job keys expire with the job, the broker password doesn't.
- **Fix.** Per-job broker credentials or topic permissions, a short-lived token instead of the broker password, or fetching the app config and launch message from Galaxy by job key (item 9). Design B removes the broker from the task.
- **Size.** L.
- **Status.** Open (design).
- **Upstream.** galaxyproject/pulsar, galaxyproject/galaxy.

### 12. The polling branch retries an unreachable TES server forever

- **Problem.** `tes_task_state_polling` retried every connection error and 5xx without limit. Stage 3's TESK jobs were retried every 15 s for a day after the cluster was deleted.
- **Evidence.** `demo:runs/tesp-probes/galaxy/NOTES.md`, acceptance item 8 (`08-g1-unreachable-fixes/`).
- **Impact.** Jobs on a TES server that is gone never fail.
- **Fix.** Runner option `tes_unreachable_timeout` (default 3600 s, 0 retries forever). The same commit stops pinning tesp-api's single whole-task log on "Executor 0 (pulsar-submit)".
- **Size.** S.
- **Status.** Fixed on `tes_task_state_polling_unreachable` at `f71ca18704d`. Checked live in acceptance item 8: the job was `error` 61.9 s after tesp-api stopped, with the timeout at 60 s. `make acceptance` on Funnel repeated it (`error` 61.6 s after the stop, `demo:runs/acceptance/20261115T022857Z-funnel/`).
- **Upstream.** galaxyproject/galaxy.

### 13. A cancel sent while TES was unreachable is never retried

- **Problem.** When Galaxy fails a job after `tes_unreachable_timeout`, `fail_job` tries to cancel the task once, while the server is still down, and never again. When tesp-api returns, it resumes the task, which runs to its end.
- **Evidence.** Acceptance item 8: the task ran to `COMPLETE`, its `pulsar-finish` got 403 on every upload and published `complete`, and Galaxy kept the job in `error`. In `make acceptance` on Funnel the task stayed `RUNNING` after the outage.
- **Impact.** Wasted compute after an outage. Galaxy's state stays right.
- **Fix.** The monitor thread retries the cancel, 10 s later and then with a doubling wait of at most 120 s. It stops on success, an ended, `CANCELING` or 404 task, a 400, 401 or 403 answer, or after the new runner option `tes_cancel_retry_timeout` (default 86,400 s, `0` tries once). Retries live in memory, and a Galaxy restart drops them (shutdown logs them).
- **Size.** S.
- **Status.** Fixed on `tes_task_state_polling_unreachable` at `bd710f3b8da`, demo ports `tes_task_polling_v26.1.2` `1f7cae33d5f` and `wes_tes_demo_fixes_v26.1.2` `b317bc12545` (`8b3166c80fb` has only this commit). Unit tests went from 16 failed and 44 passed to 60 passed (`demo:runs/stage6/h2a-cancel-retry/`). Live on tesp-api, `demo:scripts/tesp/acceptance/unreachable-cancel.sh` passed twice (`demo:runs/acceptance/20261115T030823Z-tesp/`, `20261115T045850Z-tesp/`): the orphaned task was `CANCELED` 37.9 s after tesp-api answered again, on Galaxy's fourth attempt, with no `pulsar-finish`. On Funnel Galaxy's fourth attempt succeeded too, and Funnel marked the task `CANCELED` 39.4 s after it came back, but left the container running (item 49).
- **Upstream.** galaxyproject/galaxy.

### 14. Pulsar's kill leaves socket-started containers running

- **Problem.** Pulsar cancels a job by SIGKILLing its process tree (`pulsar/managers/util/kill.py`). When the job script starts a container through a Docker socket, that kills the `docker run` client and not the container.
- **Evidence.** Fork tesp-api cancel `demo:runs/tesp-probes/galaxy/09-*`, Galaxy → Pulsar directly `demo:runs/tesp-probes/direct-pulsar/` (container ran its full 120 s after a WES cancel).
- **Impact.** Every Pulsar deployment that starts containers through a socket, with or without tesp-api, keeps cancelled tools running. tesp-api's watchdog (item 2) works around it for tesp-api only.
- **Fix.** Options in the decision section: TERM first with a grace period (`docker run` forwards signals to the container by default, inferred), or a recorded container label removed on kill.
- **Size.** M.
- **Status.** Open, needs a decision.
- **Upstream.** galaxyproject/pulsar.

### 15. `queued_python` ignores `num_concurrent_jobs`

- **Problem.** `pulsar/managers/unqueued.py` passed the keyword `montior`, so `_start_monitor` always monitored in a background thread and worker threads never waited. Since 0.15.0 (`8fd077b`), in every release through 0.16.0.
- **Evidence.** `demo:runs/tesp-stage5/pulsar-concurrency/`: 4 tasks at once on 0.16.0, 2 at a time with the fix.
- **Impact.** tesp-api's outer Pulsar has no concurrency limit. Galaxy's own limit is the only brake.
- **Fix.** Spell the keyword right and make `monitor` keyword-only, so a misspelling raises `TypeError`.
- **Size.** S.
- **Status.** Fixed on `queued_manager_monitor_kwarg` at `b476ccd3dfa8` (master `08dedcb`). The demo's default outer Pulsar.
- **Upstream.** galaxyproject/pulsar.

### 16. tesp-api sends the job script in the URL query string

- **Problem.** tesp-api submitted the whole job script, Galaxy's launch message included, as Pulsar's `command_line` query parameter: 17.4 KB for fastp, 100 KB for the 39-input hyphy job.
- **Evidence.** `demo:runs/tesp-probes/galaxy/03-*`. Fixed: acceptance items 1 and 2 (120-byte `command_line=`).
- **Impact.** Worked only because Pulsar 0.16's `pulsar-serve` disables gunicorn's request line limit. Any proxy with default limits fails at 4 to 8 KB (inferred). The script also landed in access logs.
- **Fix.** Upload it as `tesp_job.sh` through Pulsar's file route and submit `sh <path>`.
- **Size.** S–M.
- **Status.** Fixed on `galaxy-wes-tes` (0003).
- **Upstream.** mirelaminkova, CESNET.

### 17. tesp-api acts on a cancel only at the next status poll

- **Problem.** The fork's cancel endpoint only marked the task. The poll loop noticed up to 60 s later.
- **Evidence.** `demo:runs/tesp-probes/tes-level/fork/cancel.json`.
- **Fix.** Dispatch a `cancel_task` event from the endpoint.
- **Size.** S.
- **Status.** Fixed on `galaxy-wes-tes` (0002).
- **Upstream.** mirelaminkova.

### 18. Executor logs empty upstream, full of Galaxy secrets on the fork

- **Problem.** Upstream reads Pulsar's `stdout` key, which is empty in Pulsar 0.16 (the right key is `job_stdout`), so task logs are always empty. The fork stores up to 64 KiB of the in-task Pulsar's log, which contains Galaxy job files URLs with `job_key` values. Both store one log for the whole task.
- **Evidence.** `demo:runs/tesp-probes/galaxy/08-*`, probe `redaction` in `demo:runs/tesp-stage5/tes-level/final/`.
- **Impact.** No diagnostics upstream. Secrets in a store every TES user can read on the fork.
- **Fix.** Redact `job_key` values, URL passwords (also after a collapsed `//`), presigned URL secrets and long mixed-case base64 before storing. One `ExecutorLog` per executor.
- **Size.** S–M.
- **Status.** Fixed on `galaxy-wes-tes` (0006, 0007, 0013, 0015, of which 0006 and 0013 are fork branches). The launch message in executor commands stays unredacted (item 11).
- **Upstream.** mirelaminkova, CESNET.

### 19. Upstream tesp-api fails tasks after 27 minutes

- **Problem.** Upstream polls a Pulsar job at most 400 times, 4 s apart, then sets `SYSTEM_ERROR` while the container keeps running.
- **Evidence.** `demo:runs/tesp-probes/tes-level/upstream/pollcap.json`.
- **Impact.** Any tool running longer than about 27 minutes fails on upstream, and Galaxy, which hears from the in-task Pulsar, may still finish it `ok`.
- **Fix.** The fork's backoff (× 1.25 up to `max_poll_interval`) and an explicit, default-off `max_wait_seconds`.
- **Size.** S.
- **Status.** Fixed on mirelaminkova `main`. Open upstream.
- **Upstream.** CESNET/tesp-api.

### 20. Upstream tesp-api's `poetry.lock` doesn't import

- **Problem.** The lock pairs typing-extensions 4.2.0 with aiosignal 1.4.0, and tesp-api fails with a `TypeVarTuple` error. Its dynaconf 3.1.8 also ignores nested `TESP_API_X__Y` settings. Upstream's Dockerfile avoids the lock and resolves fresh, so its builds aren't reproducible.
- **Evidence.** `demo:docs/tesp-api.md` P3.
- **Fix.** The fork's lock fix `e2ce6ef9f054`.
- **Size.** S.
- **Status.** Fixed on mirelaminkova. Open upstream.
- **Upstream.** CESNET/tesp-api.

### 21. tesp-api rewrites executor arguments as paths

- **Problem.** `executor.command` is a pydantic `List[Path]`, so `a//b`, `c/` and `http://h/p` arrive as `a/b`, `c` and `http:/h/p`.
- **Evidence.** probe `basics` in `demo:runs/tesp-probes/tes-level/`.
- **Impact.** Galaxy is unaffected (base64 of ASCII JSON never contains `//`). Every other client passing URLs or paths with trailing slashes as arguments gets corrupted commands.
- **Fix.** `List[str]`. It changes the stored model, so stored tasks need a compatibility check.
- **Size.** S.
- **Status.** Open, needs a decision.
- **Upstream.** mirelaminkova, CESNET.

### 22. tesp-api can't authenticate to the outer Pulsar

- **Problem.** tesp-api has no setting for a Pulsar `private_token` (no `private_token` anywhere in its source at `4bc9b5d` or the patched `82c57ebf`, and patch 0017 adds none). The outer Pulsar must therefore run without one.
- **Evidence.** `demo:scripts/tesp/up.sh` (the rendered `app.yml` has no token), source search.
- **Impact.** Anyone who can reach the outer Pulsar can run arbitrary commands with the Docker socket, which is root on the host. Deployments must keep it on a private network.
- **Fix.** A `pulsar.private_token` setting sent with every Pulsar request.
- **Size.** S–M.
- **Status.** Open.
- **Upstream.** mirelaminkova, CESNET.

### 23. Singularity can't run Galaxy's local staging image

- **Problem.** With `CONTAINER_TYPE=singularity`, Apptainer pulls every image from a registry, and the staging image exists only locally. The task fails in 8 s with exit 255. The fork refuses host-path images (commit `2d8496a`, a security fix), and upstream mangles `docker-daemon://`.
- **Evidence.** `demo:runs/tesp-probes/galaxy/12-*`.
- **Impact.** Sites without Docker on the TES host can't use this line, unless the staging image is in a registry (item 5).
- **Fix.** Publish the staging image. Optionally allow `docker-daemon://` for named, configured images.
- **Size.** M.
- **Status.** Open.
- **Upstream.** mirelaminkova, CESNET.

### 24. Job files API returns 200 with an empty body for a missing input (26.x)

- **Problem.** On v26.1.2, `GET /api/jobs/{id}/files?path=` for an input file that is missing on disk returns 200 with an empty body. `dev` returns 404.
- **Evidence.** `demo:runs/tesp-probes/design-b/`, `demo:runs/design-b/README.md` "Not done".
- **Impact.** The client gets an empty file instead of an error. That applies to design B's TES inputs and, by the same route, to the in-task Pulsar's stage-in in design A (inferred, not reproduced).
- **Fix.** Backport `dev`'s 404 to `release_26.0` and `release_26.1`.
- **Size.** S.
- **Status.** Open on 26.x.
- **Upstream.** galaxyproject/galaxy.

### 25. pydantic-tes gaps (PTI 20)

- **Problem.** pydantic-tes 0.4.0 calls `requests` without a timeout, can't parse the `MINIMAL` view, lacks TES 1.1 `PREEMPTED` and `CANCELING`, and posts explicit nulls.
- **Impact.** A TES server that accepts connections and never answers blocks Galaxy's TES monitor thread, before `tes_unreachable_timeout` can count anything. Since the cancel retry (item 13) runs in that thread, a hung server also blocks cancelling, and a cancel from `stop_job` blocks its caller.
- **Fix.** Default timeout, view-dependent optional fields, 1.1 states, `exclude_none`.
- **Size.** S.
- **Status.** Open.
- **Upstream.** galaxyproject/pydantic-tes.

### 26. TES auth is basic only, and easy to misconfigure (PTI 18)

- **Problem.** Pulsar's TES config supports `authorization: none|basic`. `basic_auth` without `authorization: basic` silently sends nothing, and Galaxy's `job_conf.sample.yml` shows exactly that. No bearer or OIDC option exists, while TESK accepts only OIDC bearer tokens.
- **Impact.** Unprotected TES servers in practice, which item 11 makes worse.
- **Fix.** Turn basic auth on when `basic_auth` is present (or reject the half config), fix the sample, add `authorization: bearer`.
- **Size.** M.
- **Status.** Open.
- **Upstream.** galaxyproject/galaxy, galaxyproject/pulsar.

### 27. No TES CI, no current published image (PTI 19)

- **Problem.** Neither Galaxy nor Pulsar runs a TES test in CI. Galaxy's TES integration classes skip on GitHub. No staging image newer than 2023 is published.
- **Impact.** Items 5 to 8, 28 and 29 went unnoticed for years.
- **Fix.** A GitHub job with Funnel (one static binary) and RabbitMQ (service container), running Pulsar's TES tests and Galaxy's TES integration classes. Build and smoke-test the staging image in Pulsar CI and publish it on release. The demo's `run_checks.py` and acceptance checks could seed a tesp-api job.
- **Size.** M.
- **Status.** Open upstream. The demo now has a CI-style regression run, `make acceptance [TES=funnel|tesk|tesp] [TES_MODE=pulsar|native] [SCENARIOS=...]`, with scenarios `iwc-qc`, `iwc-hyphy`, `cancel`, `dies-early`, `tes-restart`, `unreachable` and `leftovers`, `result.json` and `SUMMARY.txt` per run, and a non-zero exit on FAIL. It passed on Funnel (6 PASS, `tes-restart` SKIP, `demo:runs/acceptance/20261115T022857Z-funnel/`). On tesp-api from a fresh clone, 5 scenarios passed and `cancel` and `leftovers` failed on item 50's race (`20261115T030823Z-tesp/`). On the final pins they pass (`20261115T045850Z-tesp/`). Design B passed on TESK and Funnel ([DESIGN_B.md](DESIGN_B.md#live-runs-stage-6)). It needs a stack and minutes per scenario, so it is a nightly job at best, not a PR check.
- **Upstream.** galaxyproject/pulsar, galaxyproject/galaxy.

### 28. `running` never published (PTI 7)

- **Problem.** `pulsar-submit --no-wait` shut down before anything published `running`. Galaxy showed TES jobs `queued` until they finished (tesp-api issue #46 is this).
- **Fix.** Poll `get_status` until the job leaves `preprocessing`.
- **Size.** S.
- **Status.** Fixed on `coexecution_publish_running` at `5e3de24`. On tesp-api Galaxy shows `running` 5 to 8 s after task creation.
- **Upstream.** galaxyproject/pulsar.

### 29. Stage-out errors lost, terminal status lost at shutdown (PTI 8, 31)

- **Problem.** A failed stage-out published `failed` without the error, so Galaxy showed "Remote job server indicated a problem". Separately, `pulsar-finish` could shut down before the staging thread published the terminal status.
- **Evidence.** `demo:runs/gaps/stage-out-failure-53f91f1/`.
- **Fix.** Carry the postprocessing error into the `failed` status's stderr. Wait for reported terminal statuses before stopping the outbox.
- **Size.** S.
- **Status.** Fixed on `coexecution_stage_out_failures` at `20b6460`.
- **Upstream.** galaxyproject/pulsar.

### 30. Galaxy WES request-handling bugs (PTI 10–13, 22)

- **Problem.** A JSON boolean `use_cached_job` gives 500. Run-scoped endpoints give 500 without credentials. Cancel turns a `COMPLETE` run `CANCELED`. Rejected submissions leave a workflow and history behind. Omitted optional parameters appear as `{"__class__": "NoReplacement"}`.
- **Evidence.** `demo:docs/troubleshooting.md` "Galaxy WES bugs" 1–4 and 6, `demo:runs/gaps/wes-fixes/`.
- **Size.** S each.
- **Status.** Fixed on `wes_api_fixes_26_0` at `85f9b2b42be` (base `release_26.0`), demo port `wes_api_fixes_v26.1.2` `2aad3a3e80c`, included in `wes_tes_demo_fixes_v26.1.2`.
- **Upstream.** galaxyproject/galaxy.

### 31. Collection outputs have no elements or DRS URIs (PTI 14)

- **Problem.** The WES run log gives collection outputs as `{src: hdca, id}` only, and element DRS ids use a separate encoding. A WES client can't fetch collection outputs without Galaxy's native API.
- **Evidence.** `demo:runs/2026-11-14-46e59ec8766b06a0/galaxy-native-calls.json` (5 native calls per run, all for collections).
- **Fix.** Expand collections in the run log's outputs, or give collections a DRS bundle.
- **Size.** M.
- **Status.** Open.
- **Upstream.** galaxyproject/galaxy.

### 32. DRS waits and the Celery dependency (PTI 15)

- **Problem.** DRS answers 202 with `Retry-After: 60` until a Celery task stores the checksum, and 202 forever without a worker, with nothing logged.
- **Impact.** Four of the demo's roughly six minutes per run were DRS waits until the client primed every object first.
- **Fix.** Compute checksums when jobs finish, return a short `Retry-After`, warn when DRS needs Celery and none is configured.
- **Size.** M.
- **Status.** Open.
- **Upstream.** galaxyproject/galaxy.

### 33. DRS URIs and visibility (PTI 16)

- **Problem.** `self_uri` is `drs://drs.<request host>/<id>`, which doesn't resolve for `127.0.0.1` and drops path prefixes. DRS objects are served only for public datasets, even to the owner.
- **Fix.** Use `galaxy_infrastructure_url`'s host or a `drs_hostname` option. Authorize DRS objects like the access URL.
- **Size.** S–M.
- **Status.** Open.
- **Upstream.** galaxyproject/galaxy.

### 34. Dependency resolution sent for containerized TES jobs (PTI 21)

- **Problem.** Galaxy before 26.2 sends a dependency description for TES jobs that already have a container, so the staging image tries Conda.
- **Fix.** Galaxy `19f8286868d`, in `release_26.2` and `dev`. On 26.1: `dependency_resolution: none` on the destination.
- **Size.** S.
- **Status.** Fixed upstream.
- **Upstream.** galaxyproject/galaxy.

### 35. The tesp-api pin is a local-only commit

- **Problem.** The demo's default `TESP_REF=stage5` names `4bc9b5d`, which exists only in one clone. A fresh host gets `fatal: Needed a single revision`.
- **Evidence.** `demo:docs/tesp-api.md` P1.
- **Impact.** The demo isn't reproducible elsewhere without applying the patches by hand, and there is no artifact a site could deploy.
- **Fix.** `TESP_REF=patched`: apply the committed patches with `git am` onto fork `c3a9f237` under a fixed committer and with committer date = author date, check the tree, and clone the fork into `vendor/tesp-api-src` when `TESP_REPO` lacks the base.
- **Size.** S.
- **Status.** Fixed in the demo (commits `02b094d`, `ff3c3a4`, `2ad9cd6`, `5d949be`). With 17 patches the tree must be `c3cc3dad70965578503a92ba18958238316e4c65`, and the commit is `c5ca66a2b9096086df79f40487a4da905bee75da` on every host (16-patch pins, when it landed: `df703fc5`, `82c57ebf`). A fresh clone built it and passed the `basics` and `cancel` probes (`demo:runs/stage6/tesp-reproducible/`), and the tesp-api `make acceptance` run used a fresh clone too. There is still no deployable artifact (image or pushed ref) for a site (decision D1).
- **Upstream.** distribution of the patch series.

## P3

### 36. tesp-api answers 500 without credentials

- **Problem.** Missing credentials give 500 on upstream and fork (wrong ones give 401).
- **Fix.** 401 with `WWW-Authenticate: Basic`.
- **Size.** S.
- **Status.** Fixed on `galaxy-wes-tes` (0008, 0009, cherry-picks of the fork's unmerged `fix/basic-auth-401`). 0008 is the only patch that also applies to CESNET upstream.
- **Upstream.** mirelaminkova, CESNET.

### 37. A tesp-api cancel erases the task twice

- **Problem.** The cancel handler and the polling loop both send cancel, DELETE and the cleanup job for a cancelled task. The second pass finds nothing.
- **Evidence.** Acceptance run notes, `demo:docs/tesp-api.md#results`.
- **Impact.** Harmless extra requests and log lines.
- **Fix.** A per-process record of jobs erased successfully. The second erase is skipped and logged as `was erased already`. A failed erase is retried, and a job whose set-up request was in flight when an erase started is erased again, because tesp-api can't tell whether Pulsar took the submit before or after the DELETE.
- **Size.** S.
- **Status.** Fixed on `galaxy-wes-tes` by patch 0016 (`01bbf9bb7da4`). A cancelled task now costs 1 cancel, 1 DELETE and 1 cleanup job, or 2 of each when the cancel crosses the submit (`demo:runs/stage6/tesp-reproducible/08-erase-counts.txt`). The new tests went from 8 failed to passing, and the suite from 856 to 869 passing (`demo:runs/stage6/tesp-erase-once/`). The single erase uncovered item 50, which patch 0017 (`d72420fd3ffe`) handles by deleting again until Pulsar reports the job `lost`.
- **Upstream.** mirelaminkova.

### 38. tesp-api's AMQP mode fails every task

- **Problem.** With a Pulsar AMQP URL set, every task becomes `SYSTEM_ERROR` 1 s after creation from a `TypeError`. The messages also don't match what Pulsar consumes.
- **Impact.** None for Galaxy, which needs only REST between tesp-api and Pulsar.
- **Fix.** Rewrite against Pulsar's message shapes, or remove the mode.
- **Size.** M.
- **Status.** Open.
- **Upstream.** mirelaminkova, CESNET.

### 39. TES 1.1 fields dropped

- **Problem.** `ignore_error`, `streamable`, `backend_parameters` and unknown fields are accepted and ignored. The `state` filter on task lists is ignored. `service-info` says TES 1.0.0.
- **Impact.** Other TES clients relying on `ignore_error` get wrong behavior. Galaxy doesn't use these.
- **Size.** S–M.
- **Status.** Open.
- **Upstream.** mirelaminkova, CESNET.

### 40. HTTP inputs don't follow redirects

- **Problem.** tesp-api fetches inputs with `curl -f` without `-L`. A 302 saves the redirect body as the input, and the task ends `COMPLETE`.
- **Impact.** Silent wrong input for any client whose input URLs redirect. Design B on a Galaxy that redirects job file downloads (for example to presigned object store URLs) would hit it.
- **Fix.** `curl -fL`.
- **Size.** S.
- **Status.** Open.
- **Upstream.** mirelaminkova, CESNET.

### 41. No wildcard outputs, and directory outputs lose relative paths upstream

- **Problem.** `*` in an output path is rejected with 400, and `path_prefix` is dropped. Upstream also loses relative paths in directory outputs (the fork sends them as the multipart filename).
- **Impact.** Design B's discovered outputs and `extra_files` need DIRECTORY outputs. tesp-api sends one multipart POST per file to the same URL, with the relative path only in the multipart filename, which Galaxy's POST ignores. So the stage 6 design B prototype leaves `tes_directory_outputs` off on tesp-api ([DESIGN_B.md](DESIGN_B.md#stage-6-additions)). It would be P2 if design B goes ahead.
- **Size.** M.
- **Status.** Open.
- **Upstream.** mirelaminkova, CESNET.

### 42. Every job runs with `GALAXY_SLOTS=1` under the Pulsar TES runner

- **Problem.** The destination's `cpu_cores: 2` reaches tesp-api as `--cpus=2`, but the tool sees one slot. Design B, which sets `GALAXY_SLOTS` from `cpu_cores`, made fastp run two threads and change its gzip output, which is how this showed.
- **Evidence.** `demo:runs/design-b/README.md` "2 cores versus 1".
- **Impact.** Multi-threaded tools use one thread on design A.
- **Fix.** Pass `cpu_cores` through as `GALAXY_SLOTS` in the coexecution job setup. Where it is dropped (Galaxy's job script setup or Pulsar's coexecution launch) was not traced.
- **Size.** S.
- **Status.** Open.
- **Upstream.** galaxyproject/galaxy or galaxyproject/pulsar.

### 43. Container resolution delay after each Galaxy start (PTI 27)

- **Problem.** The first TES jobs after a restart wait 25 to 32 s in `queued`, because the `mulled` resolver lists the whole biocontainers namespace on quay.io while its cache is cold.
- **Fix.** Query one repository's tags, or warm the cache at startup.
- **Size.** S.
- **Status.** Open. Not TES-specific.
- **Upstream.** galaxyproject/galaxy.

### 44. Coexecution client defaults (PTI 26)

- **Problem.** Pulsar's default coexecution image tag `0.15.0.0` was never pushed. Its TES state map lacks `QUEUED`.
- **Status.** Fixed on `coexecution_client_fixes` at `b31602a`. No effect while Galaxy pins pulsar-galaxy-lib 0.15.15.
- **Size.** S.
- **Upstream.** galaxyproject/pulsar.

### 45. Galaxy WES detail, validation and setup (PTI 23–25)

- **Problem.** WES tasks carry no job state (paused jobs look running), failed jobs' stderr URLs return empty bodies, runs are `INITIALIZING` while jobs run, integer inputs aren't validated, `auth_instructions_url` is `"TODO"`, and WES can't install tools or create users.
- **Evidence.** `demo:docs/troubleshooting.md` "Galaxy WES bugs" 7, 10 and Minor.
- **Size.** S each, L for setup through WES (out of WES's scope).
- **Status.** Open.
- **Upstream.** galaxyproject/galaxy.

### 46. A `SYSTEM_ERROR` task's job info hides the reason (found in stage 6)

- **Problem.** When a task ended `SYSTEM_ERROR` before Pulsar reported, the polling branch's job info said "The task exited with code 0." on Funnel, which reports exit code 0 for an executor that never started. The real reason (for example `fork/exec /usr/bin/docker: argument list too long`) was only in the task's system logs.
- **Evidence.** `demo:runs/stage6/h2a-cancel-retry/system-error-real-tasks-before.txt` and `-after.txt` (real Funnel tasks), `demo:runs/stage6/argv/tes-level/funnel/galaxy_view.json`.
- **Impact.** An admin reads a successful exit code on a failed job.
- **Fix.** For `SYSTEM_ERROR`, append "System log: <reason>" from the server's system logs (Funnel's `error=`, TESK's `ERROR:`, tesp-api's reason line), and never claim exit code 0.
- **Size.** S.
- **Status.** Fixed on `tes_task_state_polling_unreachable` at `025f1256ec3`, in the demo port `wes_tes_demo_fixes_v26.1.2` `b317bc12545`. Tests went from 7 failed and 60 passed to 67 passed.
- **Upstream.** galaxyproject/galaxy.

### 47. `pulsar-finish` publishes `complete` after every upload got 403 (found in stage 6)

- **Problem.** Galaxy's job files API answers 403 to uploads for a job that is no longer running (`__authorize_job_access` in `lib/galaxy/webapps/galaxy/api/job_files.py`). Pulsar treats a 403 on an output upload as "not failing the job" (`_collect_output` in `pulsar/client/staging/down.py`, upstream commit `8bff105`, meant for purged datasets). So a task that outlives its Galaxy job publishes `complete`.
- **Evidence.** Stage 5 acceptance item 8, stage 4 `demo:runs/tesp-probes/galaxy/04-wes-cancel-stock-upstream/`.
- **Impact.** Galaxy ignores the message, so job state stays right. The TES task and Pulsar logs claim success for a job whose outputs were all refused, which misleads anyone reading them.
- **Fix.** Options: fail (or report `lost`) when every upload is refused, or when Galaxy's 403 body says the job is finished. Needs John's view of `8bff105`'s intent.
- **Size.** S.
- **Status.** Open, needs a decision.
- **Upstream.** galaxyproject/pulsar.

### 48. Funnel reports `exitCode: 0` for a running executor (found in stage 6)

- **Problem.** Funnel 0.12.3's executor logs carry `exitCode: 0` while the executor is still running (no `endTime` yet). A client that treats an exit code as "finished" sees a running executor as done. The demo's `scripts/gaps/watch_run.py` did, which broke the acceptance cancel timing on Funnel.
- **Evidence.** `demo:runs/stage6/h3-acceptance/watch-run-executor-done-before-fix.txt` and `-after-fix.txt`, demo commit `dccedc6`.
- **Impact.** Any TES client on Funnel. Galaxy acts only on task states, so it is unaffected.
- **Fix.** In clients, treat an executor as done only when it has an `endTime` (the demo's `executor_done` in `scripts/tes_task.py`). In Funnel, omit `exitCode` until the executor ends.
- **Size.** S.
- **Status.** Worked around in the demo. Open upstream.
- **Upstream.** ohsu-comp-bio/funnel.

### 49. Funnel leaves a pre-restart task's container running after a cancel (found in stage 6)

- **Problem.** Funnel 0.12.3 with `Compute: local` runs its worker inside the server process. After a server restart it doesn't resume tasks from before the restart (they stay `RUNNING`), and a later cancel marks such a task `CANCELED` without stopping its executor container.
- **Evidence.** `demo:runs/acceptance/20261115T033208Z-funnel/`: Galaxy's cancel retry succeeded on attempt 4 and Funnel marked the task `CANCELED` 39.4 s after it came back, but the tool container was still running 60 s later and the harness removed it. Stage 2 saw tasks stay `RUNNING` after a restart (`demo:docs/troubleshooting.md` T11).
- **Impact.** Containers outlive their task after any Funnel restart, using CPU and memory until they end. Galaxy's state stays right.
- **Fix.** In Funnel, reattach to or kill executors of tasks from before a restart (label containers with the task id and remove them on cancel or at startup). On the demo side, a cleanup by Funnel's container name pattern after a restart.
- **Size.** M.
- **Status.** Open.
- **Upstream.** ohsu-comp-bio/funnel.

### 50. Pulsar's `clean()` races a cancelled job and leaves its directory (found in stage 6)

- **Problem.** Pulsar's `PUT /jobs/{id}/cancel` signals the job's process tree and returns at once. The thread waiting for the process then writes `return_code` and removes the pid file. A DELETE arriving a few milliseconds later runs `clean()`, which does one `rmtree`, ignores any error and answers 200. A file written after `rmtree` listed the directory makes the final `rmdir` fail (the directory stays with `return_code` only), and a pid file removed before `rmtree` reaches it raises `FileNotFoundError` on Python 3.12 (the whole directory stays). tesp-api's DELETE comes 3 to 7 ms after its cancel. In stage 5 the second erase (item 37) removed such directories by chance.
- **Evidence.** `demo:runs/acceptance/20261115T030823Z-tesp/` (cancel and leftovers FAIL, 1 of 6 cancels), `demo:runs/stage6/tesp-erase-race/`: over 40 cancels of a running task, patches 1 to 16 with Pulsar `b476ccd` left 13 directories (7 with `return_code` only, 6 whole), either fix left none.
- **Impact.** Job directories with staged data pile up on the outer Pulsar. Any Pulsar client that deletes right after a cancel hits it, not only tesp-api.
- **Fix.** In Pulsar, retry `rmtree` and log a final failure. In tesp-api, check the job's status after the DELETE and delete again until Pulsar reports `lost`.
- **Size.** S.
- **Status.** Fixed two ways, each sufficient alone. Pulsar `clean_job_directory_retry` `ffbe6987cd84` (on `b476ccd`, pushed): `rmtree` retried up to 3 times, 0.2 s apart. Two deterministic tests fail on `b476ccd` and pass after. tesp-api patch 0017 (`d72420fd3ffe`, the demo default since `3fa10a9`): up to 3 more DELETEs, 1 s apart, and an erase that leaves the directory isn't recorded. Its new tests fail on `01bbf9b` (7 failed of 25 selected, `demo:runs/stage6/tesp-erase-race/fail-before-01bbf9b.txt`), and the full suite has 873 passing. Acceptance on the final pins passed (`demo:runs/acceptance/20261115T045850Z-tesp/`).
- **Upstream.** galaxyproject/pulsar (the root cause), mirelaminkova/tesp-api (the defensive check).

## Needs John's decision

### D1. Where the tesp-api patches should go

- **Options.** (a) Offer the series to the mirelaminkova fork, which it applies to. (b) Port to CESNET upstream, where only 0008 applies, because the fork is about 4,600 lines and 65 files ahead and the patches build on its polling, quoting and output rewrites. (c) Keep them as patch files in the demo only.
- **Evidence.** `demo:patches/tesp-api/README.md`: 17 patches, 873 unit tests passing (from 694), each fix with a test that fails without it. The demo now builds the series reproducibly on any host (`TESP_REF=patched`). 7 of the 17 are cherry-picks of the fork's own unmerged branches (#52 restart, `fix/basic-auth-401`, #48 redaction, #64, #66, #67). CESNET's upstream has had no commits since 2026-02, and its maintainer wrote that CESNET won't deploy tesp-api on a production Galaxy.
- **Recommendation.** (a), and only if John wants tesp-api recommended at all (D8). The fork author is working the same issues, and the new pieces (0001 to 0004 cleanup, cancel and watchdog, 0007 and 0015 Galaxy-aware redaction, 0016 and 0017 erase once and verify) fit there. Upstream would first need to take the fork. Until then, (c) is what exists.

### D2. Design A or design B

- **Options.** (a) Keep design A (Pulsar in the task) and land its fixes. (b) Build design B (Galaxy's `TesJobRunner`, plain TES tasks) properly. (c) Both: land A's fixes now, B later.
- **Evidence.** [DESIGN_B.md](DESIGN_B.md). B removes the broker link from tasks, the staging image, the broker password from tasks and the argv ceiling. It is faster (fastp 13 s against 22 s on Funnel) and the task JSON is about 40 % smaller. Stage 6 added signed per-file URLs, DIRECTORY outputs for Funnel and TESK, and cancel and recovery tests, none run live yet. It still needs the `dev` port, live TESK and directory-output runs, and tesp-api directory support. Stage 6 also raised design A's argv ceiling from 108 to 1,244 inputs (`coexecution_compact_launch`), which weakens one of B's advantages. A's fixes (polling, staging image stack, a published image) also help Kubernetes and GCP Batch coexecution, which share the staging image.
- **Recommendation.** (c). Land A's Galaxy polling and Pulsar staging fixes and publish a current image, because the default image loses data today on every coexecution runner. Then decide B on the `dev` port and live TESK runs of the stage 6 commits. B is the cleaner shape for Galaxy as a TES client, but tesp-api is its weakest server (no directory outputs).

### D3. The WES state for completed runs with failed or paused jobs

- **Options.** (a) Take `wes_run_state_executor_error_26_0` as is (any job in `error`, `failed` or `paused` → `EXECUTOR_ERROR`), on 26.0 or `dev`. (b) Narrow it: only `paused` jobs, or only workflow outputs in `error` or `paused`. (c) Drop it and keep the documented behavior.
- **Evidence.** The branch record's debrief. Galaxy's `doc/source/dev/ga4gh_wes.md` says "a failed job does not make the run unsuccessful", because filter-failed workflows expect some jobs to fail. The WES spec defines `COMPLETE` as executors exited without error and outputs uploaded. The demo saw `COMPLETE` with fastp `error` and MultiQC `paused`.
- **Recommendation.** (b) with workflow outputs: `EXECUTOR_ERROR` when any workflow output is in `error` or `paused`. It matches the spec's "output files successfully uploaded", keeps filter-failed workflows `COMPLETE`, and a non-Galaxy WES client can trust it. Paused-only is the cheaper fallback. Target `dev`, since it changes documented behavior.

### D4. Abandon `coexecutor_image_pycurl`

- **Options.** Abandon it, or keep it.
- **Evidence.** The 2026-11-14 restack folded its one commit into `coexecutor_image_modern_base` (`c4ae861`). The fork branch still points at the pre-restack `4ccfb64`. The record is in `branches_need_decision` as superseded.
- **Recommendation.** Abandon it: move the record to `abandoned/`, add it to `ABANDONED_BRANCHES.md`, and delete the fork branch if John wants it gone.

### D5. Pulsar kill semantics for socket-started containers

- **Options.** (a) SIGTERM, wait a grace period, then SIGKILL. `docker run` in the foreground forwards signals to the container by default, so the container would stop and `--rm` would remove it (inferred, not tested). (b) Have the job script record a container label or id and run `docker rm -f` on kill. (c) Document that sites should use a batch system and leave Pulsar alone. (d) Rely on tesp-api's watchdog, which covers tesp-api only.
- **Evidence.** Item 14. The same leak appears with Galaxy → Pulsar directly (`TES=pulsar`).
- **Recommendation.** (a), as a small Pulsar change with a test that runs a real `docker run` and cancels it. Keep tesp-api's watchdog, which also covers a Pulsar killed hard.

### D6. tesp-api's `List[Path]` argument model

- **Options.** Change `executor.command` to `List[str]`, or leave it.
- **Evidence.** Item 21. Galaxy is unaffected. URL arguments from other clients are corrupted.
- **Recommendation.** Change it on the fork, with a test that old stored tasks still load (paths were stored as strings, inferred). Only relevant if D1 is (a).

### D7. Backport the job files API 404 to 26.x

- **Options.** Backport `dev`'s 404 for missing input files to `release_26.0` and `release_26.1`, or not.
- **Evidence.** Item 24.
- **Recommendation.** Backport. It is one commit and turns an empty input into an error on every Pulsar and TES path.

### D8. Recommend tesp-api to Galaxy deployers at all

- **Options.** (a) Recommend tesp-api with the patch series for Galaxy TES deployments. (b) Recommend Galaxy's own `PulsarRESTJobRunner` (or Pulsar over AMQP) for Galaxy-only sites, and tesp-api only for sites that need one TES endpoint shared with other clients. (c) Recommend neither and point TES sites at Funnel or TESK.
- **Evidence.** `TES=pulsar` ran the same QC workflow from `PulsarRESTJobRunner` straight to the same Pulsar image, with identical outputs and no TES server, broker link from the task, staging image or credentials in task arguments (`demo:runs/tesp-probes/direct-pulsar/`). tesp-api adds a second Pulsar per job, the argv ceiling, and the credential exposure of item 11. CESNET doesn't run it in production.
- **Recommendation.** (b). Say plainly that tesp-api adds nothing for a Galaxy-only site. For shared-TES sites, document this line with the patch series (`TESP_REF=patched`) as a requirement.

### D9. Publish a current staging image and change Galaxy's default

- **Options.** (a) Open PRs for the six-branch Pulsar stack, publish `galaxy/pulsar-pod-staging:<new version>` after merge, and bump `DEFAULT_PULSAR_CONTAINER`. (b) Publish an image from the branches now. (c) Wait.
- **Evidence.** Item 5. Every Galaxy 26.x coexecution deployment on the default image loses discovered outputs silently.
- **Recommendation.** (a), as the most valuable single outcome of the whole investigation. The stack's design choices need John's eye first: CVMFS and Slurm/DRMAA dropped from the image, Conda kept behind a build arg (record `coexecutor_image_modern_base`).

### D10. How the launch message reaches the task under design A

- **Options.** (a) Compress it (raises the argv ceiling several-fold, keeps the credentials in arguments). (b) Let `pulsar-submit` fetch it from Galaxy by job key (removes the ceiling and the broker password from arguments, needs a Galaxy route or file). (c) Nothing, if design B replaces design A.
- **Evidence.** Items 9 and 11. (a) is built: `coexecution_compact_launch` `9036ff3` raises the ceiling to 1,244 inputs, stays compatible with older images for small messages, and halves the task JSON.
- **Recommendation.** Take (a) now, through PRs for the Pulsar stack. Decide (b) with D2: if A stays the main path, (b) is the way to get the broker password out of task arguments.

### D11. `tes_unreachable_timeout` semantics

- **Options.** (a) Keep the current rule: fail any watched job after the server has been unreachable for the timeout (default 3600 s). (b) Fail only jobs that never reached `running`, so a long outage doesn't fail healthy tasks.
- **Evidence.** The branch debrief. Under (a) a task can keep running after Galaxy failed its job (item 13). Under (b) a task that dies mid-run during an outage would hang its job.
- **Recommendation.** (a), now paired with item 13's cancel retry (`bd710f3b8da`, `tes_cancel_retry_timeout` default 24 hours). One hour is long enough that a routine TES restart doesn't fail jobs. Note the two options' opposite zeros: `tes_unreachable_timeout: 0` retries forever, `tes_cancel_retry_timeout: 0` tries once.

### D12. The executor label for single-log TES servers

- **Options.** (a) Keep `f71ca18704d`'s heuristic: when a task has one log for several executors, report "The task exited with code N". This also drops the executor name when Funnel or TESK fail at executor 0. (b) Detect tesp-api by `service-info` name, or by log timestamps, and keep `pulsar-submit` in Funnel and TESK messages.
- **Evidence.** `tes_task_state_polling_unreachable` debrief. On the patched tesp-api each executor has its own log anyway (patch 0013).
- **Recommendation.** (b) by timestamps, a small follow-up, unless the simpler message is acceptable. Low stakes either way.

### D13. Pulsar's 403-on-upload rule

- **Options.** (a) Keep it: a refused upload doesn't fail the job, and `pulsar-finish` publishes `complete`. (b) Report `failed` or `lost` when every output upload is refused, or when Galaxy's answer says the job is finished. (c) Have Galaxy answer such uploads with a distinct status (for example 409) that Pulsar treats as "job gone".
- **Evidence.** Item 47. Upstream `8bff105` added the rule for purged datasets.
- **Recommendation.** (c) if John agrees it is worth a Galaxy change, because it keeps `8bff105`'s purged-dataset case and makes the finished-job case explicit. Otherwise (a): it is harmless to Galaxy's state.
