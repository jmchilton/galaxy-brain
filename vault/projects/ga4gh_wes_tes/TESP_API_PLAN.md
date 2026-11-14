# Plan: Galaxy WES → Galaxy → tesp-api

Stage 4 output, 2026-11-14. Stage 5 builds what is described here without John available. Section 9 lists the decisions stage 5 takes alone (with defaults) and the ones it must leave for John.

Demo repository: `~/projects/repositories/galaxy-wes-tes`, `main` at `e3d3d0f` (below, `demo:` is a path in it). All probe evidence is under `demo:runs/tesp-probes/`.

## 1. Recommendation

Build design A+C in stage 5. Galaxy's stock `PulsarTesJobRunner` already runs both IWC workflows through tesp-api, upstream and fork, with job conf changes only. Every passing run passed first time, and the outputs are byte-identical to Funnel's. What doesn't work is the operational layer, and almost all of it is in tesp-api:

- cancel never stops the task's containers;
- containers and volumes are left behind;
- stdout and stderr are lost (upstream);
- a restart strands tasks;
- the whole job script travels in a URL query string.

So no redesign is needed to meet the goal. Stage 5 should make a tesp-api branch (based on the fork's `main`) that fixes these. It also adds two small Pulsar fixes, a small extension of the existing Galaxy TES polling branch, and the demo plumbing and acceptance run.

Two facts matter for John's larger question:

- **tesp-api adds nothing for Galaxy itself** (design D, measured). The same Pulsar image that tesp-api drives ran the IWC QC workflow straight from Galaxy's `PulsarRESTJobRunner`, with identical outputs and no TES server, no task-side broker link and no staging image. For Galaxy, tesp-api's only value is offering one TES endpoint that other clients also use.
- **Design B (TES-native staging) is the right long-term shape** for Galaxy as a TES client. It is feasible: Funnel and TESK need no changes, and the executor side worked with a stock biocontainer. But it is a new Galaxy runner plus a new job files upload route (one L and three M items). It helps tesp-api least of the three servers. This is for John to decide, not for stage 5.

Fallback if the stage 5 tesp-api branch stalls: run the stage 4 spike branch `spike/stage4-cancel-containers` (`fbcac3f`, fork `main` plus 46 lines) as is. It already passes the IWC QC workflow and the cancel test with nothing left behind ([section 2.2](#22-galaxy-through-tesp-api-demoruns-tesp-probesgalaxy)). Then record the remaining items as open.

## 2. What the experiments showed

Setup (all in the demo, committed):

- **`make up TES=tesp`** starts one tesp-api instance via docker compose (`demo:config/tesp/`, `demo:scripts/tesp/`).
  - tesp-api runs on `127.0.0.1:18200` with basic auth. Source is mounted from a worktree selected by `TESP_REF=upstream|fork|<commit>` or `TESP_SRC=<checkout>`.
  - MongoDB 7.0.25 runs alongside.
  - The outer Pulsar is 0.16.0 from PyPI, with docker CLI 29.1.3 and Apptainer 1.3.6, and the host Docker socket.
  - Names are `wes-tes-<instance>-*`.
- **Dependencies** come from the fork's lock fix `e2ce6ef`. Upstream's `poetry.lock` pairs typing-extensions 4.2.0 with aiosignal 1.4.0, so tesp-api fails to import. Upstream's own Dockerfile avoids the lock and resolves fresh, so its builds aren't reproducible.
- **`make up TES=pulsar`** is the comparison backend: Galaxy → Pulsar REST directly, using the same Pulsar image (`demo:scripts/direct-pulsar/`).
- **Versions:**
  - Galaxy v26.1.2 `391641a4e12` (stock), and the demo fixes branch `wes_tes_demo_fixes_v26.1.2` (`9f5084721b6`).
  - Staging image `wes-tes/pulsar-pod-staging:0.16.1.dev0-20b6460`.
  - tesp-api upstream `3d470f76`, fork `c3a9f237`.

### 2.1 TES level, no Galaxy (`demo:runs/tesp-probes/tes-level/`)

Thirteen probes plus a size probe ran against both refs; `README.md` there has the table. The ones that matter for Galaxy:

| Probe | upstream `3d470f76` | fork `c3a9f237` |
| --- | --- | --- |
| Galaxy-shaped task (pydantic-tes JSON with nulls, `sh -c` template with `$path` and quotes, `workdir /`, shared `/pulsar_staging/`) | COMPLETE; quoting and the 50 KB base64 args survive | same |
| Executor stdout/stderr in task logs | always empty (reads Pulsar's `stdout`, which is empty in Pulsar 0.16; the right key is `job_stdout`) | filled |
| Poll cap | 4 s × 400 = 27 min, then SYSTEM_ERROR; the container keeps running | no cap by default; the poll interval backs off ×1.25 up to 60 s, so `sleep 40` finishes at 61 s |
| Cancel of a running task | CANCELED in MongoDB only; Pulsar job and container run to the end | Pulsar job cancelled about 5 s later; container still runs to the end |
| Leftovers | every executor container (no `--rm`) and every `vol-<task id>-*` volume | same |
| tesp-api restart while a task runs | task stuck RUNNING forever | same |
| AMQP between tesp-api and Pulsar | SYSTEM_ERROR after 1 s (wrong exchange and message shape, then a `TypeError`) | same |
| Auth | no credentials gives 500, wrong gives 401 | same (fix on fork branch `fix/basic-auth-401`) |
| Singularity | busybox and shared volumes work; a local-only image fails with exit 255 and no message | same failure, with the reason shown |
| TES 1.1 fields (`ignore_error`, `streamable`, `backend_parameters`) | accepted and silently dropped | same |
| Concurrency, `num_concurrent_jobs: 2` | all 4 tasks ran at once | same |

Findings that change what Galaxy can do:

- **Size limits are execve limits, not the URL.** aiohttp and gunicorn passed a 4 MiB `command_line` query string, because Pulsar 0.16's `pulsar-serve` sets `limit_request_line: 0` (Pulsar `09346b8`). The breaking point is the `docker` CLI exec inside Pulsar's job shell:
  - one argv string of 131 071 bytes works and 131 072 fails (`MAX_ARG_STRLEN`);
  - all arguments together: 20 × 100 KiB works, 21 fails (`ARG_MAX` 2 097 152);
  - the error is `Argument list too long`, exit 126, EXECUTOR_ERROR.

  Galaxy's base64 launch message is one argv string, so a job with roughly 100 or more inputs can't start. The 39-input hyphy job is about 50 KB per copy. Funnel also starts executors with `docker run` arguments, so it has the same per-argument limit (inferred). A proxy or a non-`pulsar-serve` Pulsar in front would fail far earlier, at 4–8 KB (inferred from gunicorn's and nginx's defaults).
- **Why cancel doesn't stop containers:** Pulsar kills the job's process tree with SIGKILL (`pulsar/managers/util/kill.py`, psutil path). That kills the `docker run` client, but the container belongs to the Docker daemon.
- **Pulsar bug: `queued_python` never limits concurrency.** `pulsar/managers/unqueued.py:218,227` spell the keyword `montior`; `_start_monitor` (line 110) reads `monitor`, so worker threads never wait for a job. The bug arrived with `8fd077b` (0.15.0) and is still on master `08dedcb`. The stage 4 coordinator checked the source.
- **Argument rewriting:** `executor.command` is a pydantic `List[Path]`, so `a//b`, `c/` and `http://h/p` become `a/b`, `c` and `http:/h/p`. Galaxy's base64 can't contain `//`, so Galaxy is unaffected. Other clients passing URLs as arguments are not.
- **HTTP staging shapes:**
  - inputs: GET of the URL as given, query kept; redirects are not followed, so the redirect body becomes the input;
  - outputs: multipart POST with field `file`, query kept;
  - directory outputs: upstream loses relative paths, the fork sends them as the multipart filename.

### 2.2 Galaxy through tesp-api (`demo:runs/tesp-probes/galaxy/`)

| # | What | Result |
| --- | --- | --- |
| 01 | one fastp job via the tool API, stock Galaxy, upstream | PASS; task JSON 14.4 KB, job script 14.3 KB |
| 02 | IWC short-read QC via WES, stock, upstream | PASS, `demo:runs/2026-11-14-1ac1a4b1c225b8aa/` |
| 03 | IWC hyphy-preprocessing via WES (12 jobs, 39-input collapse job) | PASS; collapse job task JSON 100 368 B, job script 100 199 B in the query string |
| 04 | WES cancel mid-tool, stock, upstream | WES, Galaxy and TES say cancelled within 1 s; the tool container runs its full 120 s, then `pulsar-finish` runs, gets 403s and publishes `complete`, which Galaxy ignores |
| 05 | IWC QC on the fixes branch (polling 15 s, grace 30 s) | PASS, `demo:runs/2026-11-14-ac2c0bdd216c6336/`; one BASIC poll, no interference |
| 06 | cancel on the fixes branch | same as 04 |
| 07 | task dies early (bad staging image), fixes branch | job `error` 37 s after the task's EXECUTOR_ERROR; stderr empty because upstream stores no logs |
| 08 | IWC QC on the fork | PASS, `demo:runs/2026-11-14-ef6f69e2f7527004/`; the task log holds 13–22 KB of the in-task Pulsar's log, including Galaxy `job_key` values |
| 09 | cancel on the fork | Pulsar job cancelled 6 s later and `pulsar-finish` never runs; the container still runs 120 s |
| 10 | cancel with spike `fbcac3f` | container and volume removed 6 s after Galaxy's TES cancel, nothing left |
| 11 | IWC QC with the spike | PASS, `demo:runs/2026-11-14-b92ab34803983a54/`; zero containers or volumes left |
| 12 | one fastp job, `TESP_CONTAINER_TYPE=singularity` | EXECUTOR_ERROR in 8 s: Apptainer can't pull the local-only staging image; stock Galaxy leaves the job `queued` |

Measurements:

- **Timing** is the same as Funnel: fastp 24 s queued → ok (22 s on Funnel), MultiQC 28 s (27 s), and under 0.5 s between containers.
- **Galaxy `running`** arrives 5–8 s after task creation, from the in-task Pulsar's AMQP message, so tesp-api issue #46 is gone with the stage 2 Pulsar fix.
- **TES `COMPLETE`** lags Galaxy's `ok` by 2–4 s on upstream; on the fork it was once 13.8 s, because of the backoff.
- **Task size:** the job script is the task JSON minus about 170 B, because the base64 launch message appears twice.
- **Leftovers** on both refs: 3 exited containers and 1 volume per task, plus the outer Pulsar's job directory after a cancel. 67 containers and 23 volumes were cleaned up after this stage's runs.
- **Cancel of a finished or unknown task** returns 200 and leaves the state alone. So the stop-queue loop seen on TESK (improvement item 30) cannot happen against tesp-api.
- **Polling against a dead TES server:** the polling branch keeps retrying forever. Stage 3's TESK jobs 85 and 86 were retried every 15 s throughout stage 4.

### 2.3 Galaxy → Pulsar directly, no TES (`demo:runs/tesp-probes/direct-pulsar/`)

- **First run:** one config fix was needed (`docker_set_user: root`). Galaxy writes `--user <its own uid>` into the `docker run` line it builds, while the containerized Pulsar creates job directories as root.
- **With the fix:** IWC QC passed (`run 91d50f974270a5a6: PASS`), with outputs byte-identical to the Funnel and tesp-api runs.
- **Cancel:** WES cancel left the container running for its full 120 s. The cause is the same as the tesp-api fork's: Pulsar's SIGKILL of the job script. So "cancel stops the container" is a Pulsar problem whenever Pulsar starts containers through a Docker socket, with or without tesp-api.

### 2.4 TES-native staging feasibility (`demo:runs/tesp-probes/design-b/`)

Funnel v0.12.3 was probed live (14 tasks plus a fastp spike against a logging HTTP server). TESK 0.11.0 and tesp-api were code reading only. Galaxy, Pulsar and the code-reading reports are in that directory.

- **Inputs:**
  - Galaxy-shaped job files URLs (`…/files?path=…&job_key=…`) work as HTTP inputs on all servers.
  - Funnel and TESK follow redirects; tesp-api doesn't.
  - Pulsar's client staging with `remote_transfer` already computes the full (URL, path) list (`evidence/pulsar-staging/record_staging.txt`).
- **Outputs:**
  - Funnel and TESK upload with a raw-body `PUT` to the URL, query kept, and a directory output becomes one PUT per file to `<url path>/<relative path>`.
  - tesp-api uploads with a multipart `POST` (field `file`), which matches Galaxy's job files API today.
  - Galaxy accepts only the multipart POST, so Funnel and TESK need a new Galaxy route.
- **Fastp spike on Funnel:** one stock biocontainer executor, Galaxy-shaped input URLs, the job script as inline `content`, and datasets, `tool_stdout`, `tool_stderr`, exit code and `working/` as outputs. It ended COMPLETE in about 7 s with every file PUT.
- **Discovered outputs and `extra_files`:** their names aren't known up front, so the job directories must be declared as DIRECTORY outputs and collected in Galaxy. That works on Funnel and TESK. It does not work on tesp-api: upstream loses relative paths, and neither ref does wildcards.
- **Size:** about 200 B per input, against about 2.3 KB per input twice today (inferred). No broker. The job key stays in task URLs, which exposes strictly less than today's broker password plus job key.
- **Galaxy bug found:** on v26.1.2 a missing input dataset makes `GET /api/jobs/{id}/files` return 200 with an empty body (dev returns 404). A TES server would hand the tool an empty file.

### 2.5 CESNET context

- CESNET ran tesp-api with Galaxy on `galaxy-qa2` with `singularity_enabled: true`, images from CVMFS paths, the default staging image and PBS behind the outer Pulsar (usegalaxy PR #232).
- Their maintainer wrote there: "We will not deploy TESP on a production Galaxy instance of ours at this time."
- The fork's commit `2d8496a` refuses host-path executor images (a security fix). That would break CESNET's CVMFS-path singularity setup.

## 3. Designs compared

| | A: stock runner → tesp-api → outer Pulsar (as intended) | B: TES-native staging, no Pulsar in the task | C: fix tesp-api where weakest | D: Galaxy → Pulsar directly |
| --- | --- | --- | --- | --- |
| Works today? | **Yes** (IWC QC and hyphy, upstream and fork) | No: new runner and Galaxy route needed | (the part of A that's broken) | **Yes** (IWC QC) |
| Galaxy work | none to pass; polling branch for dead tasks (S follow-up) | L: new runner (polling, collection of uploaded trees), M: `PUT /api/jobs/{id}/files/{path}`, M: signed URLs, S: 404 backport | none | none (one config line) |
| Pulsar work | S: concurrency typo; M (optional): smaller launch message | M: `TesNativeClient` from recorded staging; M: local results collection | — | — |
| tesp-api work | see C | M–L: redirects, relative paths in directory outputs, stage-out after failure, PUT, wildcards | M: cancel stops containers, cleanup, immediate cancel, job script by file, restart recovery, log redaction, auth 401 | n/a |
| Risks | two Pulsars per job; broker reachable from tasks; credentials in executor arguments; ~100-input ceiling from `MAX_ARG_STRLEN` | biggest change; `finish_job` collecting a tree uploaded from elsewhere is new; uploading whole `working/` may be wasteful; tesp-api the weakest server for it | the upstream maintainers are quiet (no commits since 2026-02); the fork is unmerged | gives up the TES interface (no shared endpoint with Nextflow etc.) |
| Other TES consumers (Nextflow, Cromwell, Snakemake) | unaffected | the tesp-api items (redirects, relative paths, PUT) help them too | cancel, cleanup, restart, logs and job-script transport help every client | unaffected |
| Upstream acceptance (plausible) | Galaxy polling: likely (John maintains). Pulsar typo: certain. | Galaxy: plausible but large; needs John's design call | CESNET: uncertain (inactive); fork author: likely (works the same issues) | nothing to upstream |

Other ideas considered and rejected:

- Fixing tesp-api's AMQP mode. Galaxy doesn't need it: REST to Pulsar works, and Galaxy's own AMQP link to the in-task Pulsar is separate. Default: leave it broken and document it.
- Letting tesp-api recognize Galaxy's coexecution tasks and hand them to Pulsar natively. That is design D with extra steps.

## 4. Work breakdown for stage 5

Order: tesp-api first (T1–T7), then Pulsar (P1, optional P2), then Galaxy (G1), then the demo (D1–D4), then the acceptance run (section 5). Each step lands with a test that fails before the change. Sizes: S under half a day, M one to two days.

### 4.1 tesp-api: local branch `galaxy-wes-tes` in `~/projects/repositories/tesp-api`

Base: fork `main` `c3a9f237` (decision 9.1). One commit per step. After each step, export the patches with `git format-patch c3a9f237..galaxy-wes-tes -o ~/projects/repositories/galaxy-wes-tes/patches/tesp-api/` (clear the directory first) and commit them in the demo.

Unit tests need a dev-dependency image. Add `INSTALL_DEV` to `demo:config/tesp/tesp-api.Dockerfile` (`poetry install --only main,dev --no-root` when set). Tag it `${TESP_API_IMAGE}-dev` and run:

```sh
docker run --rm -v <worktree>:/app:ro -w /app wes-tes/tesp-api-deps:...-dev python -m pytest tests/unit -q
```

The fork has 13 unit test modules under `tests/unit/`. Run them all before and after each step. Integration checks use the TES probe suite against an instance on `TESP_SRC=<worktree>`:

```sh
TESP_INSTANCE=probe-fork TESP_HTTP_PORT=18220 TESP_SRC=<worktree> scripts/tesp/up.sh
scripts/tesp/probes/tes_probes.py --instance probe-fork --port 18220 --ref fork --out <dir> --probes <names>
```

**T1. Cancel and finish remove the task's containers and volumes (M).** Port the spike `fbcac3f` properly.

- **Change:**
  - In `utils/container.py` `ContainerCommandBuilder.get_run_command`: docker executors get `--rm --label tesp-api.task=<task id>`. The builder already has `_job_id`; make `stage_in_command`/`stage_out_command` set it too.
  - In `service/pulsar_operations.py`: `erase_job` (REST) runs a cleanup after `DELETE /jobs/{id}`. It submits a short Pulsar job `<id>-cleanup` that runs `docker rm -f` on the labelled containers and `docker volume rm` on `vol-<id>-*`, then waits up to 60 s and deletes that job.
  - Make sure `erase_job` runs on every terminal path: COMPLETE, EXECUTOR_ERROR, CANCELED (`error.py` `pulsar_cancel_task_promise`), and SYSTEM_ERROR from `max_wait_seconds`. Check `event_actions.handle_run_task` and `service/error.py`.
  - With `CONTAINER_TYPE=singularity` the cleanup is a no-op. Containers die with their process there (inferred); state this in the docstring.
- **Tests first:**
  - a unit test in `tests/unit/test_container_quoting.py` (or a new `test_container_labels.py`) asserting `--rm` and the label on executor, stage-in and stage-out commands;
  - a unit test with a fake `_pulsar_request` asserting `erase_job` submits a cleanup job whose command line contains the label filter and the volume prefix, and that a failing cleanup only logs.
- **Acceptance:**
  - probe `cancel` on the branch: the container is gone within 15 s of the cancel;
  - probe `leftovers`: zero containers and volumes for the probe's task ids after they finish;
  - demo cancel test (D3) as in section 5.
- **Evidence of need:** `galaxy/09`, `tes-level/*/cancel.json`, `leftovers.json`.

**T2. Act on cancel immediately (S).**

- **Change:** the fork's `POST /tasks/{id}:cancel` (`api/endpoints/task_endpoints.py`) only marks the task; `job_polling.poll_until_complete` notices it at the next poll, which can be 60 s away. After marking, dispatch an event (e.g. `cancel_task`) whose handler calls `pulsar_cancel_task_promise` (Pulsar `PUT /jobs/{id}/cancel`, then `erase_job` with T1's cleanup). Make the poll loop tolerate the job disappearing (404 or `TaskCanceledError` path). Also set the demo's `pulsar.status.max_poll_interval` to 10 s (config in `demo:config/tesp/compose.yaml` or `TESP_EXTRA_ENV_FILE`), so COMPLETE doesn't lag by up to 60 s.
- **Tests first:** a unit test that the cancel endpoint dispatches the event (fake dispatcher), and a `tests/unit/test_job_polling.py` case where the job vanishes mid-poll and polling ends as cancelled without SYSTEM_ERROR.
- **Acceptance:** probe `cancel`: Pulsar job status `cancelled` and no container within 10 s of the cancel, measured from the probe's timeline.

**T3. Send the job script as a file, not in the query string (S–M).**

- **Change:** in `PulsarRestOperations.run_job`:
  1. upload the script with the existing `upload()` path (`POST /jobs/{id}/files?type=input&name=tesp_job.sh`, body = script);
  2. submit `command_line=sh <returned path>`.

  Pulsar's `submit` route reads only the query string (`pulsar/web/framework.py` `build_func_args(func, args, req.GET, ...)`), so a POST body would need a Pulsar change; the file route works with any Pulsar. Check the fork's `log_pulsar_request` logs only method and path, and make the upstream-style DEBUG line in `event_actions.handle_run_task` log the script length, not its text.
- **Tests first:** a unit test with a fake `_pulsar_request` asserting the submit query is under 1 KB and the upload body is the script.
- **Acceptance:**
  - outer Pulsar's gunicorn access log (`docker logs wes-tes-tesp-pulsar`) shows no `command_line=` longer than 200 B during an IWC QC run;
  - the hyphy run still passes (the 39-input job's 100 KB script now goes as a file).

  This does not lift the `MAX_ARG_STRLEN` ceiling (P2).

**T4. Survive a tesp-api restart (M, cherry-pick).**

- **Change:** cherry-pick fork branch `fix/issue-52-resume-pulsar-jobs` (`333b8ff`, 7 files, +673/−70): it resumes waiting for Pulsar jobs after a restart. If it conflicts with T1–T3 beyond trivial fixes, skip it (decision 9.5).
- **Tests:** its own unit tests, plus probe `restart`.
- **Acceptance:** probe `restart`: the task ends COMPLETE after `docker restart wes-tes-<instance>-api`.

**T5. Don't store Galaxy secrets in task logs (S).**

- **Change:** the fork stores up to 64 KiB of the in-task Pulsar's log (`job_streams` in `service/pulsar_operations.py`), and that log contains Galaxy job files URLs with `job_key=…` (`galaxy/08`). Redact `job_key=[^&\s"']+`, URL userinfo (`//user:pass@`), and base64 runs of 200 or more characters before storing. Reuse or extend `redact_presigned_urls` in `service/client/client_s3.py`, or the fork branch `claude/log-redaction-39` if it fits.
- **Tests first:** a unit test in `tests/unit/test_log_redaction.py` with a Galaxy-shaped log line.
- **Acceptance:** after an IWC QC run, `GET /v1/tasks/{id}?view=FULL` for every task contains no `job_key=` value, no broker password and no base64 run of 200+ characters. Add this check to the demo's evidence collector (D2).

**T6. Basic auth: 401 instead of 500 without credentials (S, cherry-pick).** Cherry-pick `fix/basic-auth-401` (`321aa0a`, `94b77b0`). Acceptance: probe `auth` shows 401.

**T7 (optional, if time). One log per executor (M, cherry-pick).** Cherry-pick `fix/issue-67-per-executor-logs` (5 commits). With it, Galaxy's polling branch can name the failing executor (G1). Skip if it conflicts (decision 9.5).

Not in stage 5: singularity with local images (decision 9.4), AMQP mode, TES 1.1 fields, redirects for HTTP inputs, wildcard outputs, and the `List[Path]` argument rewriting. Record them in `docs/tesp-api.md` as known limits. Mention the argument rewriting to John: it corrupts URL arguments for every client. It is a one-line model change (`List[str]`), but it changes the stored model, so it needs care.

### 4.2 Pulsar: branches on the `jmchilton` fork

**P1. `queued_python` honours `num_concurrent_jobs` (S).**

- **Branch:** `queued_manager_monitor_kwarg`, based on `master` (`08dedcb`). It is independent of the coexecution stack, because the bug is unrelated to TES. Worktree via `ghwt create pulsar queued_manager_monitor_kwarg`.
- **Change:** in `pulsar/managers/unqueued.py`, rename the `montior` keyword to `monitor` in `_run` (line 218) and its call (227), and in `queued.py:121`.
- **Test first:** in `test/manager_queued_test.py`, with `num_concurrent_jobs=1`, launch two jobs that each sleep 2 s and write start and end timestamps. Assert they don't overlap. It fails today.
- **Acceptance:**
  - `make lint` and the new test pass;
  - push to `jmchilton`;
  - add a record under `vault/repositories/pulsar/branches/active/queued_manager_monitor_kwarg/` and one `MY_BRANCHES.md` line (`branches_implemented_needs_ci`);
  - in the demo, build the outer Pulsar image from this branch (D1 makes the source selectable) and show 4 × `sleep 20` tasks run 2 at a time with `TESP_PULSAR_CONCURRENCY=2` (probe `concurrency`).

  Without it, tesp-api's outer Pulsar has no concurrency limit at all.

**P2 (optional, decision 9.6). A smaller launch message (M).**

- **Branch:** `coexecution_compact_launch`, child of `coexecution_stage_out_failures`.
- **Change:** `pulsar/client/coexecution.py` `CoexecutionLaunchMixin.launch` sends the message zlib-compressed and base64-encoded, as `--base64-zlib` (and the same for `--app_conf_base64`). `pulsar/scripts/submit_util.py` accepts both forms.
- **Test first:** a unit test that a 200-input launch message stays under 128 KiB per argument and round-trips.
- **Caveat:** Galaxy v26.1.2's venv uses pulsar-galaxy-lib 0.15.15 for the client side. So the demo would have to install this Pulsar branch into Galaxy's venv for the client half to take effect. That is why it is optional. The default is to not build it in stage 5 and to record it as the fix for improvement item 32.

### 4.3 Galaxy: branches on the `jmchilton` fork

**G1. TES polling: give up on unreachable servers; label single-log tasks right (S).**

- **Branch:** new `tes_task_state_polling_unreachable`, child of `tes_task_state_polling` (`e3c0cc44649`, base `dev`), plus a demo port onto `wes_tes_demo_fixes_v26.1.2` (the existing demo-only combined branch; amend or add a commit, force-push allowed per the brief). Follow `vault/agents/_shared/GX_IMPLEMENTATION_HANDOFF.md` for records and debriefs.
- **Change:** in `lib/galaxy/jobs/runners/pulsar.py` `PulsarTesJobRunner._check_tes_task` and `lib/galaxy/jobs/runners/util/tes_task.py`:
  1. if the TES server can't be reached (connection error or 5xx) continuously for `tes_unreachable_timeout` (new destination parameter, default 3600 s), fail the job with a clear message instead of retrying forever;
  2. when a task has one `ExecutorLog` for several executors (tesp-api), don't attribute it to "Executor 0 (pulsar-submit)": `_executor_label` should say "task" when `len(logs[-1].logs) != len(task.executors)`.
- **Tests first:** in `test/unit/app/jobs/test_pulsar_tes_task_checks.py` (659 lines, fake clock), add a case where the fake client raises `ConnectionError` past the timeout (expects `fail_job`), and a task with three executors and one log (expects no executor name in the message).
- **Acceptance:** unit tests pass; in the demo, stop tesp-api with a job queued on it and see that job fail after the timeout (shortened to 60 s for the test), with the message in `job.info`.

Galaxy needs nothing else for the acceptance run. Don't touch WES for this plan: `wes_run_state_executor_error_26_0` stays in `branches_need_decision`, and acceptance judges success by job states.

### 4.4 Demo repository

**D1. Pins and selectable sources (S).**

- In `demo:config/tesp/tesp.env`, add `TESP_REF_stage5=<galaxy-wes-tes head>` and make the default `TESP_REF=stage5` once T1–T6 land. Keep `upstream` and `fork` selectable.
- Add `TESP_PULSAR_SOURCE=pypi|<git url>@<sha>` to `demo:config/tesp/pulsar-rest.Dockerfile`, so P1 can be tested. The default stays PyPI 0.16.0 unless P1 is in.
- Pin the Pulsar image's Python dependencies: `pip install` resolved unpinned transitive packages (galaxy-* 26.1.2 etc.). Add a constraints file generated once with `pip freeze`.

**D2. Evidence for tesp-api runs (S).** `demo:scripts/collect-tes-evidence.py` already maps jobs to tesp-api tasks (`backend: tesp`). Extend it, or `scripts/tesp/task_evidence.py`, to record per run:

- each task's final state and the outer Pulsar job's status;
- the leftover containers labelled `tesp-api.task=<id>` and the `vol-<id>-*` volumes (expect zero);
- the T5 secret scan of the stored task logs;
- the largest `command_line=` length seen in the outer Pulsar's access log (expect under 200 B after T3).

**D3. Cancel and dies-early checks for tesp-api (S).** Make `scripts/gaps/submit-watch.sh … gap_discover 120 --cancel-when executor1` and `… gap_badimage 0` work with `TES=tesp`; stage 4's runs `galaxy/04` and `galaxy/07` show the commands. Write a summary line per check: WES state, Galaxy job state, TES state, seconds from cancel to the container being gone, leftovers.

**D4. Docs (S).**

- Write `demo:docs/tesp-api.md`, which `tesp.env` already refers to. Cover:
  - architecture (Galaxy → tesp-api → outer Pulsar → Docker socket → staging image, tool, staging image);
  - configuration (`config/tesp/`, settings, refs);
  - the patches (`patches/tesp-api/`) and how to apply them;
  - networking, auth, and the known limits from sections 2.1–2.2 and those left out of section 4.1;
  - the comparison backend `TES=pulsar`;
  - troubleshooting.
- README: add `TES=tesp` and `TES=pulsar` to the backend text and the settings table, ports 18200 and 18250 to prerequisites, and the tesp-api pins to "Pinned versions".
- Makefile header: list `TES=tesp|pulsar`.
- `make clean`: also run `VOLUMES=1 scripts/tesp/down.sh` and delete `var/tesp*/` and `var/probe-*/` through a container (they contain root-owned Pulsar staging files).

## 5. End-to-end acceptance (stage 5 is done when all of these hold)

Run on Galaxy `wes_tes_demo_fixes_v26.1.2`, with G1 when available, via `GALAXY_ROOT_OVERRIDE`. Use tesp-api branch `galaxy-wes-tes` at a recorded SHA, `TES=tesp`, and staging image `0.16.1.dev0-20b6460`. Repeat item 1 once on stock v26.1.2 to show the stock runner still works.

1. **IWC short-read QC through WES only:** `make run` prints `PASS`. The run directory shows:
   - `all tool jobs ran on TES: True (backend: tesp)`;
   - every tool job's `job_runner_external_id` is a tesp-api task id;
   - that task is COMPLETE in tesp-api, and its outer Pulsar job finished with return code 0.
2. **IWC hyphy-preprocessing through WES only** (12 jobs, including the 39-input job): PASS, with the same per-job proof.
3. **Outputs verified** against the workflows' `*-tests.yml` assertions with galaxy-tool-util 26.1.2 (the demo's existing verification). fastp outputs are byte-identical to the Funnel runs (sha256 `4778fab9…` for the JSON report).
4. **Cancel:** a WES cancel while the tool container runs (D3) gives:
   - WES CANCELED within 5 s;
   - Galaxy job `deleted`;
   - TES task CANCELED;
   - the outer Pulsar job cancelled;
   - no task container within 15 s of the cancel;
   - no `vol-<id>-*` volume afterwards;
   - `pulsar-finish` never runs.
5. **Dies early:** a task with a bad staging image becomes a Galaxy `error` within 60 s of the task's EXECUTOR_ERROR, with a non-empty reason in `job.info` or stderr.
6. **Nothing left behind:** zero labelled containers and zero `vol-*` volumes after items 1–5; no `job_key` values or credentials in stored task logs (T5).
7. **Restart (if T4 landed):** `docker restart wes-tes-tesp-api` during a fastp job, and the WES run still passes.

Record the results in `demo:runs/tesp-acceptance/<date>/SUMMARY.md`, with links to each run directory, and in `docs/tesp-api.md`.

## 6. Where the code goes

| Project | Where | Push |
| --- | --- | --- |
| tesp-api | local branch `galaxy-wes-tes` in `~/projects/repositories/tesp-api`, based on fork `main` `c3a9f237`; worktree `demo:vendor/tesp-api-stage5` | nowhere (no GitHub fork); `git format-patch` series committed in `demo:patches/tesp-api/` with a `README.md` listing base, SHAs and what each patch does |
| Pulsar | `queued_manager_monitor_kwarg` on `master`; optional `coexecution_compact_launch` child of `coexecution_stage_out_failures` | `jmchilton` fork; records under `vault/repositories/pulsar/branches/active/` |
| Galaxy | `tes_task_state_polling_unreachable` child of `tes_task_state_polling`; demo port on `wes_tes_demo_fixes_v26.1.2` | `jmchilton` fork; records and debriefs per `GX_IMPLEMENTATION_HANDOFF.md` |
| Demo | `main` of `~/projects/repositories/galaxy-wes-tes` | local only |

The stage 4 spike branch `spike/stage4-cancel-containers` (`fbcac3f`) stays as the fallback. Don't delete it.

## 7. How the demo grows

- `make up TES=tesp` already works (stage 4). After D1 it defaults to the stage 5 tesp-api branch; `TESP_REF=upstream|fork` and `TESP_SRC=<checkout>` stay available.
- `make up TES=pulsar` stays as the comparison backend (Galaxy → Pulsar REST, no TES).
- `scripts/tesp/probes/tes_probes.py` is the TES-level regression suite (about 25 minutes per ref; `--probes` to select).
- `docs/tesp-api.md` (D4), `patches/tesp-api/`, `runs/tesp-acceptance/`.

## 8. Effort

- tesp-api: T1–T6 about 3–4 days (T7 is another day).
- Pulsar: P1 half a day.
- Galaxy: G1 one day.
- Demo: D1–D4 one to two days.
- Acceptance runs: half a day.

Total about 6–8 working days for one agent. The critical path is T1–T3.

## 9. Decisions: stage 5's defaults, and what goes to John

Stage 5 decides these alone, using the defaults:

1. **Base of the tesp-api branch:** fork `main` `c3a9f237`, not upstream. It already has the poll-cap removal, cancel → Pulsar, stdout, quoting and output fixes. Upstream has been quiet since 2026-02, and the fork is active on the same issues. Record which patches would also apply to upstream (try `git am` onto `3d470f76` in a scratch worktree and note the result in `patches/tesp-api/README.md`).
2. **Galaxy version for acceptance:** `wes_tes_demo_fixes_v26.1.2` (polling, cancel and WES fixes), plus one stock v26.1.2 run of item 1.
3. **Container type:** docker only.
4. **Singularity:** don't build it. It needs a registry for the staging image, or `docker-daemon://` support, which upstream mangles and the fork refuses. Document it.
5. **Cherry-picks that conflict (T4, T6, T7):** spend at most an hour resolving each, then skip it and record why.
6. **Launch message compression (P2):** skip unless T1–T6, P1, G1 and D1–D4 are done with time left. Record the ~100-input ceiling.
7. **If T1's cleanup job turns out flaky** (Pulsar job ordering, 60 s limit): keep the label and `--rm`, and instead have the outer Pulsar run tesp-api's job script with a wrapper that traps EXIT and removes the labelled containers. Remember that SIGKILL can't be trapped, so the separate cleanup job remains the reliable path. Don't change Pulsar's kill.
8. **WES state:** don't change. Success is judged by job states and task exit codes, as in stages 2–3.

For John, not stage 5:

- **Is tesp-api worth recommending to Galaxy deployers at all?** Design D gives the same results with less machinery. tesp-api only helps a site that wants one TES endpoint for Galaxy and for other TES clients. Even CESNET, its authors, decided not to run it in production.
- **Design B, a TES-native Galaxy runner.** It needs a new upload route (`PUT /api/jobs/{id}/files/{path}`), signed URLs, a runner that polls TES and collects uploaded job directories, and Pulsar client staging reused to list inputs. It would remove the broker, the staging image and the credentials in executor arguments, and work unchanged on Funnel and TESK. Size: one L plus three M, about 1,500–2,500 lines (inferred). See `demo:runs/tesp-probes/design-b/README.md`.
- **Pulsar kill for containers started through a Docker socket.** Pulsar's SIGKILL leaves containers running for every such deployment, direct or behind tesp-api. Options:
  - TERM, then wait, then KILL;
  - container names recorded by the job script and `docker rm -f` on kill;
  - documenting that sites must use a batch system.
- **Where tesp-api patches should go:** to CESNET upstream, to the mirelaminkova fork, or nowhere. No GitHub posts were made, per the brief.
- **Improvement items 17 and 32 (credentials and launch message size).** Design B solves both; within design A they need a Pulsar design choice (compression, or fetching the launch message from Galaxy by job key).
- **The argument rewriting in tesp-api's model** (`List[Path]`), which corrupts URL arguments for other clients.
- **The Galaxy job files API bug** on 26.1 (200 with an empty body for a missing input). dev already returns 404; a backport to `release_26.0`/`26.1` is a one-commit S, worth doing whatever the design.
