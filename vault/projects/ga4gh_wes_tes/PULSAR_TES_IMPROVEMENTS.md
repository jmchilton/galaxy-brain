# Improving WES → Galaxy → Pulsar → TES

A prioritised list of bugs and missing features found while building and testing the demo in stages 2 and 3. It covers Galaxy (the WES API, the Pulsar TES runner, DRS), Pulsar (the TES client, coexecution, the staging image) and the two TES servers the demo ran on (Funnel and TESK).

Written 2026-11-14, at the end of stage 3. Demo repository: `~/projects/repositories/galaxy-wes-tes` (below, `demo:` is a path in it). Galaxy line numbers are for tag `v26.1.2` (`391641a4e12`) unless a branch is named. Pulsar line numbers are for `master` `08dedcb`.

**Pulsar SHAs changed after this was written.** On 2026-11-14 the coordinator restacked the Pulsar branches, with John's authorization to force-push: `1138cd0`'s message was reworded, `coexecutor_image_pycurl` was folded into `coexecutor_image_modern_base`, and the CI test fix now runs through the whole stack. The new tips are `coexecutor_image_modern_base` `c4ae861`, `coexecution_publish_running` `5e3de24`, `coexecution_stage_failures` `954ab40`, `coexecution_dependency_dir_default` `ef7caea`, `coexecution_client_fixes` `b31602a` and `coexecution_stage_out_failures` `20b6460`. The final tree matches the old `3b2cde8`. Older Pulsar SHAs below are the pre-restack commits; the branch records hold the current ones.

## How to read this

Priority:

- **P1**: jobs hang forever, results are silently wrong, or the setup can't work at all.
- **P2**: a real failure mode or a lot of friction, with a workaround.
- **P3**: polish, small spec gaps, documentation.

Size: **S** is under a day with tests, **M** a few days, **L** needs design or touches several projects.

Status: "fixed on `<branch>`" means a pushed branch on the `jmchilton` fork with a test that fails without the fix. Records: Galaxy branches under `vault/repositories/galaxy/branches/active/`, Pulsar under `vault/repositories/pulsar/branches/active/`. No PRs were opened.

## Summary

| # | Pri | Component | Item | Size | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | P1 | Galaxy runner | Galaxy never polls TES; a dead task leaves the job queued forever | M | fixed on `tes_task_state_polling` |
| 2 | P1 | Pulsar image | Galaxy's default staging image silently drops `discover_datasets` outputs | M | open (image built locally only) |
| 3 | P1 | Pulsar | `pulsar-submit`/`pulsar-finish` swallow exceptions and exit 0 | S | fixed on `coexecution_stage_failures` |
| 4 | P1 | Pulsar image | The coexecutor Dockerfile can't build current Pulsar | S | fixed on `coexecutor_image_modern_base` (+ `coexecutor_image_pycurl`) |
| 5 | P1 | Galaxy WES | `COMPLETE` reported for runs whose jobs failed or are paused | S | branch `wes_run_state_executor_error_26_0` (needs decision) |
| 6 | P1 | Pulsar | An output written as a directory gives a green job with an empty dataset | S | fixed on `coexecution_stage_out_failures` |
| 7 | P2 | Pulsar | `running` never published from `pulsar-submit --no-wait`; jobs go queued → ok | S | fixed on `coexecution_publish_running` |
| 8 | P2 | Pulsar | Stage-out errors never reach Galaxy | S | fixed on `coexecution_stage_out_failures` |
| 9 | P2 | Pulsar | Coexecution app writes `dependencies/` under `/`; dies on a read-only root | S | fixed on `coexecution_dependency_dir_default` |
| 10 | P2 | Galaxy WES | `use_cached_job` as a JSON boolean gives 500 | S | fixed on `wes_api_fixes_26_0` |
| 11 | P2 | Galaxy WES | Run endpoints give 500 without credentials | S | fixed on `wes_api_fixes_26_0` |
| 12 | P2 | Galaxy WES | Cancel turns a COMPLETE run into CANCELED | S | fixed on `wes_api_fixes_26_0` |
| 13 | P2 | Galaxy WES | Rejected submissions leave a workflow and a history behind | S | fixed on `wes_api_fixes_26_0` |
| 14 | P2 | Galaxy WES/DRS | Collection outputs have no elements and no DRS URIs | M | open |
| 15 | P2 | Galaxy DRS | Every DRS object costs a 60 s `Retry-After`; 202 forever without Celery | M | open |
| 16 | P2 | Galaxy DRS | DRS URIs name an unresolvable `drs.<host>`; objects only for public datasets | S–M | open |
| 17 | P2 | Galaxy runner/Pulsar | Broker credentials travel in TES executor arguments | L | open (design) |
| 18 | P2 | Galaxy runner/Pulsar | No TES auth beyond basic; `basic_auth` alone silently sends nothing | M | open |
| 19 | P2 | Pulsar | No CI runs any TES path; no published current staging image | M | open |
| 20 | P2 | pydantic-tes | No HTTP timeout, MINIMAL view unparseable, TES 1.1 states missing | S | open |
| 21 | P2 | Galaxy runner | Galaxy v26.1.x sends dependency resolution for containerized TES jobs | S | fixed upstream (`19f8286868d`, 26.2) |
| 30 | P1 | Galaxy runner | Cancelling a TES task that already ended (TESK: HTTP 400) loops Galaxy's stop queue forever | S | fixed on `tes_task_state_polling` |
| 31 | P2 | Pulsar | A terminal status can be lost when the app shuts down right after postprocessing | S | fixed on `coexecution_stage_out_failures` |
| 32 | P2 | Pulsar/TESK | Task JSON (base64 launch message) grows ~2.3 KB per input; TESK caps it at 256 KiB | M | open |
| 22 | P3 | Galaxy WES | Omitted optional parameters shown as `{"__class__": "NoReplacement"}` | S | fixed on `wes_api_fixes_26_0` |
| 23 | P3 | Galaxy WES | Tasks carry no job state; failed job stderr URLs empty; `INITIALIZING` while jobs run | S–M | open |
| 24 | P3 | Galaxy WES | Integer inputs not validated; small spec gaps in paging and service-info | S | open |
| 25 | P3 | Galaxy WES | WES can't install tools or create users; workflows need pre-installed tools | L | open (design) |
| 26 | P3 | Pulsar | Default coexecution image tag doesn't exist; TES `QUEUED` maps to failed | S | fixed on `coexecution_client_fixes` |
| 27 | P3 | Galaxy runner | Container resolution takes 25–32 s per job after each Galaxy start | S | open |
| 28 | P3 | Funnel | Root-owned work files, no scheduler, tasks orphaned by restart, pull per executor | M | open (upstream) |
| 29 | P2 | TESK | No auth mode shared with Pulsar, slow failure on bad images, retries, `ram_gb` not a limit | M | open (upstream; demo config works around retries) |

The sections below are grouped by component; items found late in stage 3 are under "Found in stage 3".

## Galaxy: Pulsar TES runner

### 1. Galaxy never polls TES (P1, M)

- **What's wrong.** `PulsarTesJobRunner` has `poll = False` (`lib/galaxy/jobs/runners/pulsar.py:1192`). Job state arrives only as AMQP messages from the Pulsar inside the TES task. If the task dies before Pulsar publishes (bad staging image, image pull failure, OOM, the in-task broker URL unreachable, the TES server cancels or loses the task), the Galaxy job stays `queued` or `running` forever, and so does the WES run.
- **Evidence.** demo: `runs/gaps/tes-dies-early/` (two jobs stuck `queued` for 11 minutes through two restarts while Funnel showed `EXECUTOR_ERROR` and `COMPLETE`); demo: `docs/gap-tests.md` test 3; demo: `docs/troubleshooting.md` "Jobs that never report back".
- **Impact.** The most damaging failure in the chain: nothing tells the user or admin, and a WES client polls forever.
- **Fix.** A monitor thread in the TES runner GETs each task (`view=BASIC`) every `tes_status_check_interval` (default 60 s). If the task is terminal (COMPLETE, EXECUTOR_ERROR, SYSTEM_ERROR, CANCELED, PREEMPTED) or 404 for `tes_status_grace_period` (default 120 s) and Pulsar sent no final status, the job is failed through `fail_job` with the failing executor and a redacted stderr tail. TES connection errors are retried, never fatal.
- **Status.** Fixed on Galaxy `tes_task_state_polling` (base `dev`, head `e3c0cc44649`, which also carries item 30's fix, a `Job.info` length fix and a CI-only test fix; demo port `tes_task_polling_v26.1.2` `6baaaec7486`). Verified in the demo: the dead tasks above failed 36–46 s after the task ended, and jobs left stuck by stock Galaxy were failed within 30 s of a restart (demo: `runs/gaps/tes-dies-early-polling/`, `runs/gaps/tes-dies-early/polling-recovery/`, `runs/gaps/polling-normal-job/`). Open: pydantic-tes has no request timeout (item 20); tasks stuck in TES `QUEUED` forever are not handled; a late `complete` after the runner failed the job still calls `mark_as_finished`.

### 17. Broker credentials travel in TES executor arguments (P2, L)

- **What's wrong.** The Pulsar app config, broker URL with password included, is base64-encoded in the arguments of the first and last executor of every task, next to the launch message with the job files API key (`pulsar/client/coexecution.py`, `CoexecutionLaunchMixin.launch`). Anyone who can read TES tasks can read them. TES servers keep them in places Galaxy doesn't control: Funnel logs full `docker run` lines in task system logs; TESK stores the task JSON in Kubernetes annotations and ConfigMaps.
- **Evidence.** demo: `docs/pulsar-tes-runner.md` "Credentials in executor arguments"; demo: `docs/tesk.md`. Stage 3 had to redact an evidence file that had kept them (demo commit `80d7ea9`), and Galaxy's polling fix has to redact executor stderr and system logs before showing them.
- **Impact.** On a shared TES server, other TES users can publish fake job statuses to Galaxy's broker or read its queues.
- **Fix.** Several options, none small: per-job broker credentials (RabbitMQ users or topic permissions per job), a short-lived signed token instead of a broker password, sending the app config through a TES input (a URL on Galaxy's job files API, fetched with the job key) instead of in arguments, or the relay mode Pulsar already has for other runners. Needs a design discussion.
- **Status.** Open.

### 18. TES auth: basic only, and easy to misconfigure (P2, M)

- **What's wrong.** Pulsar's TES config supports `authorization: none|basic` (`pulsar/client/tes_job_config.py`). `basic_auth` without `authorization: basic` silently sends no header, and Galaxy's `job_conf.sample.yml` shows exactly that. No bearer/OIDC option exists, while TESK's API only accepts OIDC bearer tokens, so TESK can only be used with auth off.
- **Evidence.** RESEARCH.md 2.1; demo: `config/galaxy/job_conf.yml.in` comment; demo: `docs/tesk.md` (auth section).
- **Impact.** Unprotected TES servers in practice, which item 17 makes worse.
- **Fix.** Turn on basic auth when `basic_auth` is present (or reject the half config), fix the sample, add `authorization: bearer` with a static token or a token command.
- **Status.** Open.

### 21. Dependency resolution sent for containerized jobs (P2, S)

- **What's wrong.** Galaxy before 26.2 sends a `dependencies_description` for TES jobs that already have a tool container, so the staging image tries Conda.
- **Evidence.** RESEARCH.md 2.2; demo: `config/galaxy/job_conf.yml.in` (`dependency_resolution: none`).
- **Fix/Status.** Fixed upstream by `19f8286868d` ("Skip Pulsar dependency resolution for containerized jobs"), in `release_26.2` and `dev`. Workaround on 26.1: `dependency_resolution: none` on the destination.

### 27. Container resolution delay after each start (P3, S)

- **What's wrong.** After a Galaxy restart, the first TES jobs wait 25–32 s in `queued` before their task exists, because the `mulled` resolver lists the whole biocontainers namespace on quay.io while its cache is cold. Later jobs take 1–2 s.
- **Evidence.** demo: `docs/troubleshooting.md` I8; demo: `runs/gaps/concurrency/iwc-parallel-172948/galaxy-container-resolution-excerpt.txt`.
- **Fix.** Query the single repository's tags instead of listing the namespace, or warm the cache at startup.
- **Status.** Open. Not TES-specific.

## Pulsar: staging image, coexecution and the TES client

### 2. The default staging image drops discovered outputs (P1, M)

- **What's wrong.** Galaxy's `DEFAULT_PULSAR_CONTAINER` is `galaxy/pulsar-pod-staging:0.15.0.2` (`lib/galaxy/jobs/runners/pulsar.py:1153`), built in 2023 from Pulsar 0.15.0.dev1. Galaxy 26.x describes discovered outputs with `dataset_collector_descriptions` when it believes Pulsar ≥ 0.15.13. At submit time it takes the version from its own client library (pulsar-galaxy-lib 0.15.15); at finish it takes `0.15.0.dev1` from the status message. The old image ignores the new key, never uploads the discovered files, and the job ends `ok`.
- **Evidence.** demo: `runs/gaps/discovered-outputs/` (same workflow, two images: the `0.15.0.2` job is `ok` with an empty collection and a missing primary dataset; the current image keeps 3 elements and the dataset); demo: `docs/gap-tests.md` test 1; demo: `docs/troubleshooting.md` I6; Pulsar `docs/compatibility.rst` marks the pair broken.
- **Impact.** Silent data loss for every tool with `discover_datasets` on every Galaxy 26.x TES, Kubernetes or GCP Batch coexecution deployment that uses the default image.
- **Fix.** Publish a current staging image (items 4 and 19) and bump `DEFAULT_PULSAR_CONTAINER`. In Galaxy, take the coexecution Pulsar version from one place: map the configured `pulsar_container_image` to its Pulsar version (Pulsar master `bbf4a54` added `KNOWN_PULSAR_CONTAINER_VERSIONS` in `setup_handler.py`; pulsar-galaxy-lib 0.15.15 lacks it, so a pin bump is needed), and fail loudly when finish sees a version that can't handle what submit sent.
- **Status.** Open. The demo works around it with a locally built image from the branch stack below.

### 3. Staging failures swallowed (P1, S)

- **What's wrong.** `run_server_for_job` and `run_server_for_job_finish` (`pulsar/scripts/submit_util.py`) catch `BaseException`, log, and exit 0. A failed stage-in published `failed` (after item 7's fix) but the TES task went on to the tool executor, which waits for a `command_line` that is never written. A failed stage-out ended the task `COMPLETE`.
- **Evidence.** demo: `runs/setup/tes-smoke/staging-*.txt` (exit 0 with a stub job); demo: `runs/gaps/stage-in-failure/README.md` and `runs/gaps/stage-out-galaxy-down/`; the stage-failures record's `docker_verification/output.md`.
- **Impact.** In the demo the hang was masked: on `failed`, Galaxy's `fail_job` cancels the TES task, which kills the waiting tool executor. A TES server that doesn't honour cancel, or a lost `failed` message, leaves the task running until its timeout. The failure reason was also lost: the stage-in error went to a job file nothing reads, so Galaxy showed only "Remote job server indicated a problem".
- **Fix.** Return a non-zero exit code on failure (keeping `pulsar-submit --wait` at 0, because Kubernetes Jobs would rerun a failed pod), and put the preprocessing error into `metadata/tool_stderr` so the `failed` status carries it.
- **Status.** Fixed on Pulsar `coexecution_stage_failures` (`37a1e6d`, plus the CI-only test fix `a3f8c72`). Verified with docker and in the demo: with the current image a stage-in failure fails the Galaxy job within 6–8 s with "Pulsar failed to stage inputs or launch the job: Connection refused …" in its stderr.

### 4. The coexecutor image couldn't be built (P1, S)

- **What's wrong.** `docker/coexecutor/Dockerfile` starts `FROM conda/miniconda3` (Debian 9, Python 3.7) and copies a `py2.py3` wheel name; current Pulsar needs Python ≥ 3.10 and builds a `py3` wheel.
- **Evidence.** demo: `docs/pulsar-staging-image.md`; record `coexecutor_image_modern_base` and its `review.md`.
- **Impact.** Nobody can produce a staging image with current Pulsar, which is how item 2 persists.
- **Fix.** Rebuild on `python:3.12-slim` (digest-pinned), install the wheel with `[amqp,galaxy_extended_metadata]`, keep Conda behind a build arg, drop CVMFS/Slurm/DRMAA.
- **Status.** Fixed on Pulsar `coexecutor_image_modern_base` (`1138cd0`). The branch review found that dropping pycurl moved stage-out to the `requests` transport, which reads each output into memory (835 MB peak for a 400 MB file, against 72 MB in the old image); fixed on `coexecutor_image_pycurl` (`4ccfb64`, 43 MB peak), to be folded into the base branch. The `1138cd0` commit message misdescribes the read-only failure and still needs rewording (an amend was attempted in stage 3 and blocked by the session's permission settings). Open: no CI builds the image; Conda and pip dependencies still float at build time.

### 6. A directory instead of an output file gives a green job (P1, S)

- **What's wrong.** If a tool writes a directory where an output file should be, or no file at all, Pulsar's `has_output_file` only matches files, nothing is uploaded, and the job ends `ok` with an empty dataset.
- **Evidence.** demo: `docs/gap-tests.md` test 4, "A directory where the output file should be"; demo: `runs/gaps/stage-out-failure/`.
- **Impact.** Silently wrong results.
- **Fix.** Make Pulsar consistent with what Galaxy does for the same tool on a local runner. A local Galaxy runner fails the job ("Unable to finish job", an `IsADirectoryError`), so Pulsar diverged. For a *missing* output a local Galaxy with the default disk object store also ends `ok` with a 0-byte dataset, so that case is not Pulsar-specific (it is a Galaxy-wide gap worth its own issue).
- **Status.** Directory case fixed on Pulsar `coexecution_stage_out_failures` (`53f91f1`): `ResultsCollector` reports `Output <name> is a directory, not a file`, `pulsar-finish` exits 1 and Galaxy fails the job (demo: `runs/gaps/stage-out-failure-53f91f1/`). Open: an *empty* directory at an output path is still not noticed; missing outputs stay green, as on a local runner.

### 7. `running` never published (P2, S)

- **What's wrong.** `pulsar-submit --no-wait` shut its app down before anything called `get_status`, which is where the stateful manager publishes `running`. Galaxy showed TES jobs `queued` until they finished. Same symptom as tesp-api issue #46.
- **Evidence.** demo: `docs/notes/pulsar-running-status.md`; demo: `runs/2026-11-14-b2563e46ebf0c519/tes-evidence.txt` (before) and `runs/2026-11-14-46e59ec8766b06a0/tes-evidence.txt` (after).
- **Fix.** Poll `get_status` until the job leaves `preprocessing`, then exit.
- **Status.** Fixed on Pulsar `coexecution_publish_running` (`07051ab`); review found no P1/P2 issues. Polish left: `wait_for_launch` has no timeout if the staging thread dies without a marker.

### 8. Stage-out errors never reach Galaxy (P2, S)

- **What's wrong.** When `pulsar-finish` can't upload outputs, Pulsar publishes `failed` without the error. Galaxy shows "Remote job server indicated a problem" with empty stdout and stderr. The reason is only in the TES executor log, which users can't see.
- **Evidence.** demo: `runs/gaps/stage-out-galaxy-down/`; demo: `docs/troubleshooting.md` I7.
- **Fix.** Carry the postprocessing error in the failed status, as item 3 does for preprocessing.
- **Status.** Fixed on Pulsar `coexecution_stage_out_failures` (`6038976`): `postprocess` raises `OutputStagingError`, the `postprocessing_failed` marker keeps the message, and `stderr_contents` appends "Pulsar failed to stage outputs: …" after the tool's stderr (all managers). Verified with docker and in the demo with the `0.16.1.dev0-53f91f1` image (demo: `runs/gaps/stage-out-failure-53f91f1/`: the job's stderr reads "Pulsar failed to stage outputs: Connection refused …"; the job info line is still the generic one). Open: with live stdout updates on, the status carries `stderr: None` and the message is dropped; Galaxy's polling (non-AMQP) Pulsar runner ignores `full_status` for `failed`.

### 9. Coexecution app writes under `/` (P2, S)

- **What's wrong.** With no `tool_dependency_dir`, the in-task Pulsar app defaults to `dependencies` relative to the working directory `/`, and galaxy-tool-util 26.x's Conda resolver creates it. On a read-only root filesystem (Funnel's default template) `pulsar-submit` dies while the app is built, exits 1, and nothing is published (item 1).
- **Evidence.** demo: `docs/troubleshooting.md` T8; demo: `docs/funnel.md` "Read-only root filesystem".
- **Fix.** Default coexecution apps to no dependency directory (`"none"`) unless configured; containerless jobs still get the client's `dependency_resolution`.
- **Status.** Fixed on Pulsar `coexecution_dependency_dir_default` (`e90a555`), which also drops the image's `PULSAR_CONFIG_TOOL_DEPENDENCY_DIR` workaround from `1138cd0`. The read-only check passes for the `4ccfb64` image. Open: containerless (Conda) jobs on a read-only root are untested.

### 19. No TES CI and no published image (P2, M)

- **What's wrong.** Neither Galaxy nor Pulsar runs any TES test in CI. Galaxy's `test/integration/test_coexecution.py` TES classes need `GALAXY_TEST_AMQP_URL` and `FUNNEL_SERVER_TARGET` and skip on GitHub; Pulsar deleted its commented-out Funnel job in `021a67a`. No image newer than 2023 is published.
- **Evidence.** RESEARCH.md 2.6; everything in items 2, 3, 4, 7 and 9 went unnoticed.
- **Fix.** Funnel is a single static binary and RabbitMQ a service container, so a GitHub job is cheap: start both, run Pulsar's TES integration tests and Galaxy's TES integration classes. Build the staging image in Pulsar CI (with a `--read-only` smoke test) and publish it on release.
- **Status.** Open.

### 20. pydantic-tes gaps (P2, S)

- **What's wrong.** pydantic-tes 0.4.0 calls `requests` without a timeout, so a TES server that accepts and never answers stalls the caller (item 1's monitor thread included). `get_task(..., "MINIMAL")` fails because `TesTask` requires `executors`. `TesState` lacks TES 1.1 `PREEMPTED` and `CANCELING`. It posts explicit nulls (`"id": null`), which Funnel and TESK both accept.
- **Evidence.** demo: `docs/troubleshooting.md` T7; demo: `docs/funnel.md` "pydantic-tes 0.4.0 against Funnel v0.12.3"; demo: `docs/tesk.md`; Galaxy record `tes_task_state_polling` debrief.
- **Fix.** Add a default timeout, make view-dependent fields optional, add the 1.1 states, dump with `exclude_none`.
- **Status.** Open.

### 26. Default image tag and TES state map (P3, S)

- **What's wrong.** Pulsar's default coexecution image (`pulsar/client/coexecution.py`, `0.15.0.0`) was never pushed. Pulsar's TES state map (`pulsar/client/tes.py`) lacks `QUEUED`, so a polling client would report a queued task as failed. The two TES client classes have swapped docstrings.
- **Fix/Status.** Fixed on Pulsar `coexecution_client_fixes` (`75185ac`): default `0.15.0.2`, the newest published tag (still broken for item 2), `QUEUED` → queued. The same swapped docstrings exist in `pulsar/client/aws_batch.py`; not fixed.

## Galaxy: WES API and DRS

### 5. COMPLETE with failed or paused jobs (P1, S)

- **What's wrong.** Galaxy maps invocation state `completed` to WES `COMPLETE` (`lib/galaxy/webapps/galaxy/services/wes.py:77`), and an invocation is completed once every job is terminal, failed ones included. The WES spec defines COMPLETE as executors exited without error, and EXECUTOR_ERROR for an executor failure. Tasks don't carry job state, so a paused job looks like one with no exit code yet.
- **Evidence.** demo: `runs/setup/wes-probes/probe-I-iwc-submit-cancel/` (COMPLETE with fastp `error` and MultiQC `paused`); demo: `runs/gaps/tes-dies-early-polling/` and `runs/gaps/stage-in-failure/` (COMPLETE runs with failed jobs); demo: `docs/troubleshooting.md` "Galaxy WES bugs" 5.
- **Impact.** A WES client that trusts the state reports success for a failed analysis. The demo's client judges success from task exit codes instead.
- **Fix.** Report EXECUTOR_ERROR when the invocation's job-state summary counts any job in error, failed or paused.
- **Status.** Branch `wes_run_state_executor_error_26_0` (`d83962aa811`, stacked on `wes_api_fixes_26_0`), in `branches_need_decision`: it reverses a choice Galaxy's WES docs state explicitly ("a failed job does not make the run unsuccessful").

### 10–13. Request handling bugs (P2, S each)

- **What's wrong.**
  - 10: `workflow_engine_parameters` `{"use_cached_job": true}`, a boolean as service-info advertises, gives 500 (`.lower()` on a bool, `services/wes.py:560`).
  - 11: `GET /runs/{id}`, `/status`, `/tasks`, `/tasks/{id}` and `POST /runs/{id}/cancel` give 500 without credentials (`_get_invocation` reads `trans.user.id`).
  - 12: cancel of a COMPLETE run turns it CANCELED.
  - 13: a rejected submission (bad engine parameters, missing required input) leaves an imported workflow and an empty history behind.
- **Evidence.** demo: `docs/troubleshooting.md` "Galaxy WES bugs" 1–4; demo: `runs/setup/wes-probes/` (probes C, E, F, H, I).
- **Fix.** Accept JSON booleans; raise `AuthenticationRequired` before the lookup; make cancel of a terminal run a 200 no-op; validate before importing, and roll back on invocation errors.
- **Status.** Fixed on Galaxy `wes_api_fixes_26_0` (base `release_26.0`, head `85f9b2b42be`), one commit and one API test each. Re-probed in the demo on `wes_tes_demo_fixes_v26.1.2`: none of them reproduces (demo: `runs/gaps/wes-fixes/`). The native invoke API has the same leftover-history leak with `new_history_name` (`run_request.py`); not fixed.

### 14. Collections without elements or DRS URIs (P2, M)

- **What's wrong.** The run log gives collection outputs as `{src: hdca, id}` only. Element DRS ids use a separate id encoding (`encode_id(..., kind="drs")`), so a client can't build them from anything WES returns.
- **Evidence.** demo: `runs/2026-11-14-46e59ec8766b06a0/galaxy-native-calls.json` (5 native calls per run, all for collections); demo: `docs/troubleshooting.md` "Galaxy WES bugs" 9; demo: `README.md` "Galaxy-native API calls".
- **Impact.** No pure-WES client can fetch a collection output, and most IWC workflows output collections.
- **Fix.** Expand collections in the run log's `outputs` (nested elements with identifiers and DRS URIs), or give collections a DRS bundle object.
- **Status.** Open.

### 15. DRS waits and the Celery dependency (P2, M)

- **What's wrong.** `get_drs_object` answers 202 with `Retry-After: 60` until the dataset has a stored checksum, and only a Celery task computes it (`services/datasets.py:579`). With Celery each object still costs one 60 s wait; without a worker it answers 202 forever and Galaxy logs nothing.
- **Evidence.** demo: `docs/troubleshooting.md` I3 and "Galaxy WES bugs" 8; demo: `runs/2026-11-14-b2563e46ebf0c519/outputs-manifest.json` (no worker) and `runs/2026-11-14-46e59ec8766b06a0/outputs-manifest.json` (worker). Four of the demo's roughly six minutes per run were DRS waits until stage 3 added `--prime-drs` (request every object once, wait once).
- **Fix.** Compute checksums when jobs finish (or lazily inline for small files), return a short `Retry-After`, and warn at startup or in the 202 body when DRS needs Celery and none is configured.
- **Status.** Open.

### 16. DRS URIs and visibility (P2, S–M)

- **What's wrong.** `self_uri` is `drs://drs.<request host>/<id>` (`services/datasets.py:560`); `drs.127.0.0.1` doesn't resolve, and the URI drops any path prefix. DRS objects are served only for public datasets, even to the owner with a valid key (`services/datasets.py:557`), while the access URL serves the owner's private dataset.
- **Evidence.** `outputs-manifest.json` in every demo run directory (`uri_host_resolves: false`); demo: `runs/setup/wes-probes/probe-G-drs-access/results.txt`.
- **Fix.** Use the configured `galaxy_infrastructure_url` host (or a `drs_hostname` option) and the hostname-based compact form; authorize DRS objects like the access URL.
- **Status.** Open.

### 22. NoReplacement in the run log (P3, S)

- **What's wrong.** An omitted optional parameter appears in the run log as `{"__class__": "NoReplacement"}`.
- **Evidence.** demo: `docs/troubleshooting.md` "Galaxy WES bugs" 6.
- **Status.** Fixed on `wes_api_fixes_26_0` (reported as `null`; the native API is unchanged).

### 23. Task and state detail (P3, S–M)

- **What's wrong.** WES tasks carry no job state, so paused jobs look running. The `stdout`/`stderr` URLs of a failed job returned empty bodies; the reason was only in the native job's `job_messages`. The run is `INITIALIZING` while its first jobs already run, because invocation state `ready` maps to INITIALIZING (`services/wes.py:75`). Step tasks report `null` exit codes.
- **Evidence.** demo: `docs/troubleshooting.md` "Galaxy WES bugs" Minor; demo: `docs/gap-tests.md` "Bugs and findings"; demo: `runs/gaps/iwc-hyphy/`.
- **Fix.** Put Galaxy's job state and info into the task's `system_logs` or a tag, map `ready` with running jobs to RUNNING, and serve job messages when stderr is empty.
- **Status.** Open.

### 24. Validation and spec details (P3, S)

- **What's wrong.** Integer workflow inputs accept `"abc"` and keep `"15"` as a string (shared invocation code, not WES-specific). List-runs `next_page_token` is `null` at the end where the spec uses `""`. The 400 for a missing input names a database step id. service-info `auth_instructions_url` is `"TODO"` (`services/wes.py:374`), and without config its `id` is the reversed request host.
- **Evidence.** demo: `docs/troubleshooting.md` "Galaxy WES bugs" 7, 10 and Minor.
- **Status.** Open.

### 25. WES can't set anything up (P3, L)

- **What's wrong.** Every tool a workflow uses must already be installed at the exact revision, and users and API keys must exist; WES has no way to do either, so every deployment needs Galaxy's own API for setup. WES on Galaxy accepts only Galaxy workflow types, which no other WES server runs.
- **Evidence.** demo: `README.md` "Galaxy-native API calls"; RESEARCH.md 5.
- **Impact.** Supports John's view that interop is small: a WES client still needs Galaxy-specific setup and Galaxy-specific workflows.
- **Fix.** Out of WES's scope; at most, a clear error naming the missing tools (`workflow_engine_parameters` could opt into Tool Shed installs for admins).
- **Status.** Open (design).

## Found in stage 3

### 30. Cancelling a finished TES task loops forever (P1, S)

- **What's wrong.** TESK answers `POST /tasks/{id}:cancel` on a finished task with HTTP 400 (Funnel answers 200). Pulsar's TES `kill()` raises through pydantic-tes, and Galaxy's `JobHandlerStopQueue` rolls back and retries every second, through restarts; the job stays `deleting` while WES already says CANCELED. The same exception inside `fail_job` (which calls `stop_job` first) would leave a job unfailed.
- **Evidence.** demo: `runs/gaps/cancel-finished-task-tesk/` (55 retries in the first minute); demo: `docs/tesk.md` "Cancel of a finished task"; demo: `docs/troubleshooting.md` K1.
- **Impact.** Any WES or Galaxy cancel that races a finishing task on TESK, and any stock-Galaxy cancel of a job whose task died unreported (item 1), wedges the job and fills the log.
- **Fix.** When the cancel fails, read the task state; if it is terminal or 404, treat the stop as done. Pulsar's `kill()` could do the same; TESK could also make cancel of a finished task a no-op.
- **Status.** Fixed on Galaxy `tes_task_state_polling` (`211ae51ddaa`): a `_kill_remote_job()` hook used by `stop_job` and the STOPPED-status path; the TES runner reads the task state when the cancel fails, treats finished, CANCELING or 404 as done (INFO log), and otherwise logs an error without raising, so the stop queue can't loop and `fail_job` still fails the job. Verified on TESK (demo: `runs/gaps/cancel-finished-task-tesk-fixed/`): the job is `deleted` within a second, no retries. The same run reproduced the `fail_job` case: on stock v26.1.2 the 400 dropped Pulsar's `failed` message and jobs stayed `running` for good; on the branch they went to `error` at once. The Pulsar-side fix in `kill()` is described in the branch debrief, not implemented.

### 31. Terminal status lost at shutdown (P2, S)

- **What's wrong.** The stateful manager writes the `postprocessed` marker before publishing the final status, and `get_status` reports terminal once the marker exists. `pulsar-finish` can then shut the app down and stop the outbox before the staging thread enqueues the message; in a TES task nothing ever sends it. The preprocessing-failure path has the same window (`pulsar/managers/stateful.py`, `do_postprocess` and `_record_preprocessing_failure`).
- **Evidence.** Found by code reading in the gap tests (demo: `docs/gap-tests.md` "Bugs and findings"); proved with a 3 s delay in `full_status`: `pulsar-finish` published only `running`.
- **Impact.** Rare (a millisecond window), but it produces item 1's stuck job with nothing visibly wrong.
- **Fix/Status.** Fixed on Pulsar `coexecution_stage_out_failures` (`90600e8`): terminal publications are counted from before the marker is written until the callback returns, and `shutdown` waits for the count to reach zero before stopping the outbox. Three tests fail before and pass after.

### 32. Task size grows with inputs (P2, M)

- **What's wrong.** Pulsar's launch message, with every input path and file action, is base64-encoded into the arguments of two executors. A 39-input `collapse_dataset` job produced a 100 KB task JSON (about 2.3 KB per input). TESK stores the whole task JSON in a Kubernetes annotation, capped at 256 KiB, so a job with about 110 inputs can't be created on TESK. Other servers have request-size limits too.
- **Evidence.** demo: `docs/tesk.md` "Task size"; demo: `runs/gaps/iwc-hyphy-tesk/`.
- **Fix.** Send the launch message once instead of twice, compress it, or let `pulsar-submit` fetch it from Galaxy's job files API by job key (which would also address item 17).
- **Status.** Open; not tested at the limit.

## TES servers

### 28. Funnel v0.12.3 (P3, M, upstream)

- Executors run as root and write into bind-mounted task directories, so the host user can't delete Funnel's work dir (demo: `docs/funnel.md` "Root-owned files in the work dir"; the demo deletes through a container, `scripts/funnel-clean-work.sh`).
- The `local` compute backend starts every task at once, with no scheduler or resource accounting; Galaxy's `destination_total_concurrent_jobs` has to limit it (demo: `docs/pulsar-tes-runner.md` "Concurrency").
- Stopping the server orphans running containers, and tasks stay `RUNNING` after a restart (demo: `docs/troubleshooting.md` T11).
- `docker pull` before every executor: a registry round trip per executor for registry images, and an error line in system logs for local images (T10).
- The server binds all interfaces; basic auth is cleartext HTTP.
- System logs contain full `docker run` lines, Pulsar's base64 arguments included (item 17).
- The default run template uses `--read-only`; fine with the current staging image (item 9), untested with biocontainers.

### 29. TESK (chart 0.3.0, tesk-api 1.2.0, taskmaster 0.11.0) (P2, M, upstream)

Both IWC workflows pass on TESK (demo: `runs/2026-11-14-a9c9898b43e9b34b/`, `runs/2026-11-14-b49705f64be28a1e/`, `runs/gaps/iwc-hyphy-tesk/`), with no Galaxy or Pulsar change beyond the job conf. What got in the way, all in demo: `docs/tesk.md` "Quirks" and `docs/troubleshooting.md` K1–K8:

- **Auth.** tesk-api accepts OIDC bearer tokens or nothing; Pulsar sends nothing or basic. The demo runs TESK with `noauth` on 127.0.0.1, so every local user and every pod in the cluster can read tasks, including item 17's credentials, and create tasks. Fix on either side: basic auth in tesk-api, or bearer support in Pulsar (item 18).
- **Cancel of a finished task is HTTP 400** (item 30). Funnel answers 200.
- **Retries.** The chart's default `executorRetries: 2` reruns a failed executor, which would rerun stage-in, the tool or stage-out. The demo sets 0. A TES-level knob (or a per-task backend parameter) would let Pulsar ask for no retries.
- **Missing images fail slowly and silently.** A pod that can't pull stays pending until the taskmaster's 240 s timeout; the task ends `EXECUTOR_ERROR` with no exit code and no reason. Funnel fails in seconds with "pull access denied".
- **`ram_gb` is only a request when `cpu_cores` is set**, so tool memory isn't capped (the taskmaster copies requests into limits only when no limit is set). `disk_gb: 0` rejects the whole task with 400.
- **State flaps** `RUNNING → QUEUED → RUNNING` between executors. Harmless for Galaxy (it acts only on terminal states) but surprising for any poller.
- **Overhead.** One pod per executor adds about 17 s per Pulsar job (fastp 41 s against 23 s on Funnel; the hyphy workflow 3 min 46 s against 1 min 41 s). Pulsar's three-executor design pays it three times.
- **PVCs outlive tasks** while finished pods exist (TTL one day), so staged data stays on the node.
- **Base path** only `/ga4gh/tes/v1`, and pydantic-tes needs `tes_url` with a trailing slash (`http://127.0.0.1:18100/ga4gh/tes/`); without it every call 404s.
- **Networking.** Pods reached Galaxy and RabbitMQ at the Docker bridge address `172.17.0.1` on a single-node kind cluster. A multi-node cluster needs real routable addresses for both, which is the general deployment problem of this design: the TES workers must reach Galaxy's job files API and the broker.

## Branches at the end of stage 3

Galaxy (`jmchilton` fork):

| Branch | Base | Head | Items |
| --- | --- | --- | --- |
| `tes_task_state_polling` | `dev` | `e3c0cc44649` | 1, 30 |
| `wes_api_fixes_26_0` | `release_26.0` | `85f9b2b42be` | 10–13, 22 |
| `wes_run_state_executor_error_26_0` | `wes_api_fixes_26_0` | `d83962aa811` | 5 (needs decision) |
| `tes_task_polling_v26.1.2`, `wes_api_fixes_v26.1.2`, `wes_tes_demo_fixes_v26.1.2` | tag `v26.1.2` | `6baaaec7486`, `2aad3a3e80c`, `9f5084721b6` | demo-only ports, not for PRs |

Pulsar (`jmchilton` fork), one linear stack on `master` `08dedcb`:

| Branch | Head | Items |
| --- | --- | --- |
| `coexecutor_image_modern_base` | `1138cd0` | 4 |
| `coexecution_publish_running` | `07051ab` | 7 |
| `coexecution_stage_failures` | `a3f8c72` | 3 |
| `coexecution_dependency_dir_default` | `e90a555` | 9 |
| `coexecution_client_fixes` | `75185ac` | 26 |
| `coexecutor_image_pycurl` | `4ccfb64` | 4 (fold into the base branch) |
| `coexecution_stage_out_failures` | `3b2cde8` | 6, 8, 31 |

The demo's staging image `wes-tes/pulsar-pod-staging:0.16.1.dev0-53f91f1` is built from the stack (code identical to `3b2cde8`; the later commit only changes a test). The stack needs one rebase before any PR: fold `coexecutor_image_pycurl` into the base, reword `1138cd0`, and carry `a3f8c72` into the children so their CI goes green.

## What would help most next

1. Publish a current staging image and make Galaxy's default point at it (item 2). Until then every Galaxy 26.x coexecution deployment on the default image loses discovered outputs silently.
2. Land the Galaxy TES polling and cancel fixes (items 1, 30) and the Pulsar stage-failure stack (items 3, 6, 7, 8, 9, 31). Together they turn every failure seen in stage 3 into a failed job with a reason, instead of a hang or a green job.
3. Add TES to CI (item 19), so these don't rot again.
4. Decide the WES state semantics (item 5) and fix collection outputs and DRS (items 14–16); without them a WES client can't judge success or fetch most IWC outputs without Galaxy's own API.
5. Rethink how credentials and the launch message reach the task (items 17, 18, 32). This is the main obstacle to running Galaxy's TES runner against a shared TES service.
