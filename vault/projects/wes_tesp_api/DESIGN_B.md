# Design B: Galaxy jobs as plain TES tasks

Design B sends each Galaxy tool job to a TES server as a plain, spec-following TES task. The task declares its inputs and outputs as TES `inputs` and `outputs` over HTTP against Galaxy's job files API, and runs only the tool's container. No Pulsar, no broker and no staging image run inside the task, and Galaxy learns the task's state by polling TES. A prototype ran the IWC short-read QC workflow through Galaxy WES on Funnel 0.12.3 and on tesp-api, with every IWC assertion passing and, at one core per job, fastp outputs byte-identical to design A's. After the stage 6 hardening it also passed QC, the hyphy workflow with its discovered collection, cancel, dies-early and leftovers on TESK and Funnel, and everything but discovered outputs on tesp-api.

This page is for a Galaxy developer deciding whether design B is worth building properly. It describes what the prototype does, how to run it, what the evidence shows, how it compares with design A ([ARCHITECTURE_AND_CONFIGURATION.md](ARCHITECTURE_AND_CONFIGURATION.md)), and what a production version would take.

Sources: the demo repository `/home/ubuntu/projects/repositories/galaxy-wes-tes` (`demo:runs/design-b/README.md` has the full evidence write-up, `demo:runs/tesp-probes/design-b/README.md` the stage 4 feasibility study), and the branch record `vault/repositories/galaxy/branches/active/tes_native_staging_v26.1.2/` in galaxy-brain.

## What the prototype does

Galaxy branch `tes_native_staging_v26.1.2` on the jmchilton fork, head `5e889591314`, five commits on `tes_task_polling_v26.1.2` `a1b53d59234` (tag v26.1.2 plus the stage 5 TES polling port; deliberately not rebased onto that branch's later commits):

- `40c052c35d4` "Accept raw-body PUT uploads on the job files API" (stage 5)
- `f33e416aa22` "Add a TES-native job runner prototype (design B)" (stage 5)
- `4c7750ea1e0` "Sign each TES task URL instead of passing the job key" (stage 6)
- `a1073074052` "Send discovered outputs and extra files back as TES DIRECTORY outputs" (stage 6)
- `5e889591314` "Leave ended TES tasks alone on cancel; test cancel and recovery" (stage 6)

The stage 5 runs below used `f33e416aa22`. [Stage 6 additions](#stage-6-additions) describes the last three commits and their live runs.

No Pulsar or tesp-api change was needed.

### The runner, `galaxy.jobs.runners.tes:TesJobRunner`

The prototype keeps Galaxy's own absolute paths inside the task, as the Kubernetes runner does. The stage 4 sketch had reused Pulsar's `/job` layout and staging code instead ("B1"), which would have needed a new Pulsar client, results collection and a synthesized Pulsar status. The path-preserving variant ("B2") needed none of that.

For each job the runner:

1. **Lists the inputs itself**: the input datasets with their metadata files and walked extra files (`job_io.get_input_fnames()`), every file of the job directory (job script, `tool_script.sh`, config files), and the tool-directory files that the job directory's text names. About 40 lines.
2. **Declares one TES volume, the job directory.** With `outputs_to_working_directory: true` every file the job writes lands in its job directory, and `finish_job` moves outputs into the object store afterwards, as it always does.
3. **Builds one executor**: the tool's container (resolved by Galaxy as usual), running `["/bin/sh", "<job dir>/tes_job_wrapper.sh"]` with the job directory as `workdir` and `GALAXY_SLOTS`/`GALAXY_MEMORY_MB` from `cpu_cores`/`ram_gb`.
4. **Sends the wrapper as an inline TES input** (`content`). The wrapper:
   1. creates the empty dataset files that Galaxy precreated on its own disk,
   2. runs `/bin/bash galaxy_<id>.sh` with stdout and stderr redirected to files,
   3. keeps the exit code the job script wrote, or writes `$?` if it wrote none,
   4. creates, empty, any declared output that is still missing,
   5. exits 0.

   Galaxy's job script is unchanged. Exiting 0 matters because TESK and tesp-api skip stage-out after a failed executor, and Funnel fails a task whose FILE output is missing. Galaxy reads the real exit code from the uploaded `galaxy_<id>.ec`.
5. **Declares FILE outputs** back to the job files API: the datasets, `outputs/tool_stdout`, `outputs/tool_stderr`, `galaxy_<id>.ec`, `.o`, `.e` and the core job metrics plugin's four files. 13 outputs for fastp.
6. **Polls TES** (reusing `tes_task.py` from the polling branch for state reads and redacted failure messages). On `COMPLETE` it sets metadata locally (`_handle_metadata_externally`, as the Kubernetes runner does) and finishes the job. `EXECUTOR_ERROR` and `SYSTEM_ERROR` fail the job with the redacted TES message. `stop_job` cancels the task, and `recover` resumes watching after a Galaxy restart.

In the stage 5 runs, input and output URLs had the form `http://172.17.0.1:18080/api/jobs/<encoded id>/files?path=<absolute path>&job_key=<key>`. Since `4c7750ea1e0` each URL carries a signed per-file `job_token` instead of the job key ([Stage 6 additions](#stage-6-additions)).

### The upload route

Funnel and TESK upload TES outputs with a raw-body `PUT` to the output URL. Galaxy's job files API accepted only a multipart `POST`, which is what tesp-api sends. The prototype adds `PUT /api/jobs/{job_id}/files?path=<abs>&job_key=<key>` with a raw body, as a FastAPI route in the legacy job files module. It runs the same job key, job state and write-location checks as `POST` (factored into shared functions), authorizes before reading the body, stages the body next to the target and renames it into place. Unlike `POST` it replaces `tool_stdout`/`tool_stderr` instead of appending.

### Configuration

Job conf template `demo:config/galaxy/job_conf_native.yml.in`, as rendered for tesp-api:

```yaml
runners:
  local:
    load: galaxy.jobs.runners.local:LocalJobRunner
    workers: 2
  tes_native:
    load: galaxy.jobs.runners.tes:TesJobRunner
    workers: 2
    galaxy_url: http://172.17.0.1:18080   # Galaxy as task containers and Funnel's worker see it
    tes_poll_interval: 2                  # seconds; the runner's default is 10
    # since 4c7750ea1e0: job_files_token_ttl caps signed URL lifetime (default 604800 s, 7 days)

execution:
  default: native_tesp
  environments:
    local:
      runner: local
    native_tesp:
      runner: tes_native
      tes_url: http://127.0.0.1:18200/
      authorization: basic
      basic_auth:
        username: <TESP_USER>
        password: <TESP_PASS>
      docker_enabled: true                # container resolution only; no docker run wrapping
      outputs_to_working_directory: true  # required by the runner
      cpu_cores: 2                        # also the job's GALAXY_SLOTS
      ram_gb: 4

limits:
  - type: destination_total_concurrent_jobs
    id: native_tesp
    value: 2
```

`native_funnel` is the same with Funnel's `tes_url` and credentials. Since demo commit `2ca77c0`, `make up TES=tesk TES_MODE=native` adds `native_tesk`: TESK's `tes_url`, no auth, `disk_gb: 2`, and the destination option `tes_directory_outputs: true` (also on by default for `native_funnel`, through `TES_NATIVE_DIRECTORY_OUTPUTS`, and always off for `native_tesp`). Destination parameters are those of the Pulsar TES runner (`tes_url`, `authorization`/`basic_auth`, `cpu_cores`, `ram_gb`, `disk_gb`) plus the two above. Runner parameters are `galaxy_url` and `tes_poll_interval`. RabbitMQ still runs, but only for Galaxy's own Celery worker (DRS checksums). No `amqp_url`, `message_queue_url` or `pulsar_container_image` exists in this mode.

## How to run it

It needs a Galaxy checkout of `tes_native_staging_v26.1.2` with its own venv, named by `GALAXY_NATIVE_ROOT` (default `vendor/galaxy-native`). Stock v26.1.2 has neither the runner nor the PUT route. `ghwt` rejects dots in branch names, so the worktree is made with git directly:

```sh
git -C ~/projects/repositories/galaxy worktree add \
  ~/projects/worktrees/galaxy/branch/tes_native_staging_v26.1.2 jmchilton/tes_native_staging_v26.1.2
# create a .venv there with the v26.1.2 pins, then in the demo's local.env:
#   GALAXY_NATIVE_ROOT=$HOME/projects/worktrees/galaxy/branch/tes_native_staging_v26.1.2

cd /home/ubuntu/projects/repositories/galaxy-wes-tes
make down
make up TES=tesp TES_MODE=native     # or TES=funnel
make run                             # PASS, plus tes-evidence.txt per job
# One core per job, for byte-identical fastp outputs (Galaxy restart only):
scripts/galaxy-down.sh && TES_NATIVE_CPU_CORES=1 scripts/galaxy-up.sh && make run
make down
```

`make up` records the mode in `var/tes-mode`. Running `make up` without `TES_MODE` records `pulsar` again, and every other backend behaves as before. `make status` shows the mode and the Galaxy checkout. `TES_NATIVE_POLL_INTERVAL` (2) and `TES_NATIVE_CPU_CORES` (2) are the demo settings.

## Evidence

### Runs

| Run | Server | Cores per job | Result | fastp JSON sha256 | Evidence |
| --- | --- | --- | --- | --- | --- |
| design A reference | Funnel | 1 (the Pulsar TES runner sets no `GALAXY_SLOTS`) | PASS | `4778fab9…` | `demo:runs/2026-11-14-9da1c5702ebec70c` |
| `7c5efafd96d66087` | Funnel | 2 | FAIL, first attempt (below) | empty | `demo:runs/design-b/funnel/attempt1-fail-from-work-dir` |
| `704dbb6bdf5315e6` | Funnel | 2 | PASS | `a4597fac…` | `demo:runs/design-b/funnel/2026-11-15-704dbb6bdf5315e6` |
| `bf37eedfa2837b81` | Funnel | 1 | PASS | `4778fab9…`, identical | `demo:runs/design-b/funnel/2026-11-15-bf37eedfa2837b81` |
| `aec259dddc7e2eec` | tesp-api `4bc9b5d9` | 2 | PASS | `a4597fac…` | `demo:runs/design-b/tesp/2026-11-15-aec259dddc7e2eec` |
| `8f3d143a4f297057` | tesp-api `4bc9b5d9` | 1 | PASS | `4778fab9…`, identical | `demo:runs/design-b/tesp/2026-11-15-8f3d143a4f297057` |

- Every tool job ran on `tes_native` with one executor, and every task ended `COMPLETE`. `tes-evidence.txt` in each run maps WES task → Galaxy job (`runner=tes_native`, `exit_code=0`) → TES task → `COMPLETE`.
- Both IWC assertions passed in every PASS run: the MultiQC report contains "Filtered Reads", and the fastp JSON's `pair` contains "paired end (301 cycles + 301 cycles)".
- **One core against two.** Design B passes `cpu_cores` to the job as `GALAXY_SLOTS`, so fastp ran `--thread 2`, which changes gzip block layout and two JSON fields. The decompressed reads are identical. With one core, the fastp JSON and both trimmed read files are byte-identical to design A. This also confirms that design A runs every job with one slot whatever `cpu_cores` says.
- **Exit codes cross the wrapper.** In the failed first attempt MultiQC exited 1 inside a task that ended `COMPLETE`. Galaxy read 1 from the uploaded `.ec` file and failed the job with "Fatal error: Exit code 1".
- **The first attempt's bug.** Galaxy's job script copies a `from_work_dir` output only `if [ -f working/x -a -f <output> ]`, and Galaxy precreates that output on its own disk. The runner hadn't staged outputs, so the copy was skipped, the wrapper created the output empty, and fastp went `ok` with empty reports. The wrapper now precreates the outputs Galaxy precreated, and a unit test runs a guarded copy.
- On tesp-api, the demo's secret scan finds the job key in `inputs[].url` and `outputs[].url` only. That is design B's known exposure, so in native mode `run_checks.py` reports it instead of failing. The tesp-api checks otherwise pass: per-task proof, no leftover containers, volumes or job directories, small `command_line=`.

### Task JSON sizes

| | fastp | MultiQC |
| --- | --- | --- |
| Design B, as Galaxy submits it | 10,608 B: 5 URL inputs + 1 inline, 13 outputs | 9,192 B: 5 + 1, 11 outputs |
| Design B, server view (Funnel, tesp-api) | 11,943 B, 11,574 B | 10,417 B, 10,076 B |
| Design A, tesp-api view (acceptance item 1) | 17,512 B | 16,598 B |

Each design B file entry costs about 420 bytes, because the demo's 123-character absolute paths appear twice (as `path` and URL-encoded in `url`). Design A's size grows inside the base64 launch message instead, which sits in two executor arguments and hits the `MAX_ARG_STRLEN` ceiling at roughly 100 inputs. Design B has no argument ceiling, and the gap widens with the input count.

### Timing, Galaxy job `queued` to `ok`

| Server | Design | fastp | MultiQC |
| --- | --- | --- | --- |
| Funnel | A (reference) | 22 s | 27 s |
| Funnel | B, 2 cores | 13 s | 18 s |
| Funnel | B, 1 core | 14 s | 18 s |
| tesp-api | A (acceptance item 1) | 23 s | 28 s |
| tesp-api | B, 2 cores | 19 s | 20 s |
| tesp-api | B, 1 core | 20 s | 20 s |

On Funnel, B drops the two staging executors (about 15 s per job), and Funnel's in-process HTTP staging moved fastp's 45 MB of outputs in 0.25 s. B adds up to one poll interval before Galaxy sees `COMPLETE`. About 6 to 7 s of each job is Galaxy setting metadata after the task, as in design A. On tesp-api the gain is smaller, because tesp-api still runs each task as an outer Pulsar job with curl helper containers for stage-in and stage-out, and polls every 4 to 10 s. Whole-workflow wall time (about 5 minutes) is dominated by the WES client's DRS waits, so it doesn't separate the designs.

### Code size and tests (stage 5)

| Part | Files | + | − |
| --- | --- | --- | --- |
| Galaxy code (`lib/galaxy/jobs/runners/tes.py` 475, `lib/galaxy/webapps/galaxy/api/job_files.py` +127/−49) | 2 | 602 | 49 |
| Galaxy tests | 2 | 310 | 0 |
| Demo scripts and config | 11 | 166 | 23 |
| Pulsar, tesp-api | 0 | 0 | 0 |

`test/unit/app/jobs/test_tes_runner.py` has 8 unit tests: URL quoting, the input listing, the wrapper run for real by `/bin/sh`, the task document, and the polling state machine (running set once, finish on `COMPLETE`, poll throttle, failure on `EXECUTOR_ERROR` with the job key redacted, no cancel of an ended task, stopped jobs dropped). `test/integration/test_job_files.py` gained 2 PUT tests against a real Galaxy test server: no Content-Type, parent directories created, replace instead of append, no staging leftovers, 403 after the job ends, 403 outside the job's write locations (including `..`) and for a bad key. All 7 tests in that file pass, and the 46 polling tests still pass. No fork CI was looked at.

## Stage 6 additions

Three commits on `f33e416aa22` (+721/−67 over 6 files), pushed to jmchilton. They are unit and integration tested, and ran live on TESK, Funnel and tesp-api ([Live runs](#live-runs-stage-6)). Test output before and after each change is in `demo:runs/stage6/h4-design-b/`. Details are in the branch record's debrief (`vault/repositories/galaxy/branches/active/tes_native_staging_v26.1.2/implementation_debrief.md`).

### Signed per-file URLs (`4c7750ea1e0`)

- Each input URL carries `job_token=<expiry>.<signature>` with scope `r` (GET, HEAD), and each output URL one with scope `w` (POST, PUT). The signature is HMAC-SHA256 over the job id, the scope, the expiry and the exact `path` string, with a key derived from Galaxy's `id_secret` (new module `lib/galaxy/security/job_files_tokens.py`). Tokens survive a Galaxy restart and work only on the Galaxy that issued them.
- The job files GET, multipart POST and raw PUT accept `job_token=` as an alternative to `job_key=`. The job state and write-location checks still apply, so a token stops working when the job ends. `job_key` keeps working for Pulsar.
- Runner parameter `job_files_token_ttl` (default 7 days) caps a token's life. The job's end revokes it earlier.
- `job_key`, which opens every file of the job, no longer appears anywhere in the task.
- Limits: a token is still a bearer credential for its one file until the job ends, readable by anyone who can read the task. It isn't bound to the TES task id, which isn't known before `create_task`. A resubmission under the same job id reuses still-valid tokens.
- Tests: 18 unit tests for the token module, runner URL tests, and the integration test `test_signed_per_file_tokens` (a token reads or writes only its own file, expired and garbage tokens get 403, tokens don't widen write locations, 403 after the job ends).

### DIRECTORY outputs for discovered outputs and `extra_files` (`a1073074052`)

- New route `PUT /api/jobs/{job_id}/files/{rel_path}?path=<dir>&job_token=...`, which takes the job key or a `d`-scope token for the directory. The target must stay strictly inside the directory (`..`, absolute paths and the directory itself are rejected), and the usual write-location check applies.
- With the destination option `tes_directory_outputs: true`, the runner declares `<job dir>/working` (discovered outputs, `galaxy.json`) and each output's extra files directory as TES `DIRECTORY` outputs. The wrapper creates them before the job script and deletes symlinks in them afterwards, because TESK refuses a whole output with any symlink and Funnel fails on links that leave the workspace.
- Per server, by source reading:
  - Funnel v0.12.3 sends one raw PUT per file to `<URL path>/<relative path>?<query>`, query kept: works with the route.
  - TESK (tesk-core v0.11.0) does the same: works with the route.
  - tesp-api sends one multipart POST per file to the same URL, with the relative path only in the multipart filename. Galaxy's POST ignores filenames, so `tes_directory_outputs` stays off on `native_tesp`, and discovered outputs (the hyphy workflow, `gap_discover`) still don't work there.
- All of `working/` is uploaded, intermediate files included. Empty directories never arrive, on any backend.
- Tests: unit tests for the directory list, the task document and the wrapper (run for real, with a symlink and a dangling link), and the integration test `test_directory_put` (Funnel-style and TESK-style escaping, wrong-scope and wrong-directory tokens, `..%2F` escapes, the job ending). `test/integration/test_job_files.py` now has 9 passing tests.

### Cancel of an ended task, cancel and recovery tests (`5e889591314`)

- When a cancel fails, `stop_job` reads the task state. An ended or `CANCELING` task is logged as "nothing to cancel" (TESK answers 400 to cancelling an ended task). Any other state is logged as an error saying the task may still be running.
- Seven new unit tests cover cancel, recovery of queued and running jobs, and missing task ids. Recovery was already correct: after a restart the existing task is polled again, not resubmitted.
- Known gap: if Galaxy dies between `create_task` and storing the task id, the job is requeued and the first task is left as an orphan. A submission nonce would close it and was judged not worth it in the prototype.

Unit tests across these files went from 54 to 83 (`demo:runs/stage6/h4-design-b/cancel-recover-unit-after.txt`: 83 passed).

### Demo (`2ca77c0`)

`make up TES=tesk TES_MODE=native` uses `native_tesk` and doesn't load the staging image. `gap_badimage` goes to `<default env>_badimage`, whose image doesn't exist, so the dies-early check works in native mode. The tesp-api secret scan no longer excuses `job_key` in native task URLs. Static checks: `demo:runs/stage6/h4-design-b/demo-static-checks.txt`. Demo commits `4a32962` and `313dc19` later fixed harness bugs found by the live runs.

### Live runs (stage 6)

Galaxy `5e889591314` unchanged, `make acceptance TES_MODE=native` (evidence in `demo:runs/stage6/h4-design-b/phase2/` and the run directories under `demo:runs/acceptance/`):

| Backend | Run | iwc-qc | iwc-hyphy | cancel | dies-early | leftovers |
| --- | --- | --- | --- | --- | --- | --- |
| TESK (kind, tesk-api 1.2.0, filer 0.11.0) | `20261115T041415Z-tesk-native`, cancel rerun `20261115T043156Z-tesk-native` | PASS | PASS, 12 jobs, the discovered collection through DIRECTORY outputs | PASS on the rerun: WES `CANCELED` 1.2 s after the cancel, no executor pod left | PASS: Galaxy `error` 1.1 s after `EXECUTOR_ERROR` (TESK takes about 240 s to give up on a missing image) | PASS |
| Funnel 0.12.3 | `20261115T043559Z-funnel-native` | PASS | PASS | PASS: containers gone 4.7 s after the cancel | PASS: 1.1 s | PASS |
| tesp-api (`patched`) | `20261115T044628Z-tesp-native`, rerun `20261115T045338Z-tesp-native` | PASS | FAIL, as expected: no DIRECTORY outputs on tesp-api, 4 of 12 jobs ran | PASS on the rerun: containers gone 1.1 s after the cancel | PASS on the rerun | PASS |

- On TESK the QC jobs took 87 to 89 s from `queued` to `ok`, against 13 to 18 s on Funnel, because TESK starts separate filer pods. Galaxy received 40 directory PUTs, all answered 200.
- Signed URLs live: the stored Funnel tasks of the native run contain 0 `job_key` and 324 `job_token=` occurrences (the 6 stage 5 tasks still in Funnel's database contain 378 job keys). The strict tesp-api secret scan found no job key in tesp-api's stored tasks.
- The first TESK cancel failure was a harness misreading: TESK keeps a finished task's PVC `Terminating` until `taskTtlSeconds` (86,400 s) deletes its pods.
- Left open: TESK holds a design B task's PVC storage for a day unless `taskTtlSeconds` is lowered. Funnel writes task URLs, and so tokens, into its system logs (each token opens one file in one direction until the job ends). Recovery after a Galaxy restart is unit-tested only. `tes-restart` and `unreachable` skip in native mode.

## Design A and design B compared

| | Design A: `PulsarTesJobRunner` → TES server → staging image | Design B: `TesJobRunner`, plain TES task |
| --- | --- | --- |
| Works today | Yes, stock Galaxy v26.1.2, on Funnel, TESK and tesp-api | Prototype on v26.1.2. All acceptance scenarios pass on TESK and Funnel, all but discovered outputs on tesp-api. |
| Executors per task | 3 (staging, tool, staging) | 1 (tool) |
| Broker | Required, reachable from every task container | None for jobs |
| Staging image | Required, and Galaxy's default one loses discovered outputs | None |
| Job state | AMQP push from the in-task Pulsar. Polling only on the polling branch, as a safety net. | TES polling (2 s in the demo, 10 s default) |
| Credentials in the task | Broker URL with password and the job key, base64 in executor arguments, readable by anyone who can read the task | Since `4c7750ea1e0`, one signed token per file and direction, valid until the job ends or the TTL. No job key, no broker password. (Stage 5 runs: the job key in every URL.) |
| Argument size | One argument of about 1,169 bytes of base64 per input. About 109 inputs fail with `Argument list too long`. 1,244 with Pulsar `coexecution_compact_launch` (a 600-input Galaxy job passed on tesp-api). | No argument ceiling. About 420 B per file in the task JSON with the demo's long paths. |
| Speed, `queued` → `ok` (fastp / MultiQC) | Funnel 22 / 27 s, tesp-api 23 / 28 s, TESK 41 s for fastp (stage 3) | Funnel 13 / 18 s, tesp-api 19–20 / 20 s, TESK 87–89 s per QC job (filer pods) |
| Cores | Every job gets `GALAXY_SLOTS=1` | `cpu_cores` becomes `GALAXY_SLOTS` |
| Discovered outputs, `extra_files` | Work with the current staging image | Since `a1073074052`, DIRECTORY outputs on Funnel and TESK (hyphy passes live on both). Not on tesp-api. |
| Paths | Rewritten to `/pulsar_staging/<job id>/` | Galaxy's absolute paths in the task |
| Galaxy change | None to pass. Polling branch recommended. | New runner, upload routes and URL signing, about 1,600 lines with tests (+912/−49 in stage 5, +721/−67 in stage 6) |
| Pulsar change | Six-branch staging image stack, plus the outer Pulsar concurrency fix for tesp-api | None |
| tesp-api fit | Good with the stage 5 patches | Works for fixed FILE outputs. DIRECTORY outputs need tesp-api fixes (relative paths, wildcards). |

## What productising design B would take

From the prototype's gap table (`demo:runs/design-b/README.md#production-gaps`). Sizes are estimates, S under a day with tests, M a few days, L needs design or touches several projects.

| Area | Prototype | Production needs | Size |
| --- | --- | --- | --- |
| Base | v26.1.2, PUT route bolted onto the legacy job files module | Port to `dev`'s `JobFilesManager`: PUT beside its POST, with the same staging and recheck logic | S–M |
| Credentials | Done in stage 6: signed per-file, per-direction tokens with a TTL, revoked at job end, live on all three servers | Bind tokens to the TES task, review the key derivation, keep tokens out of Funnel's system logs | S |
| Discovered outputs, `extra_files`, `galaxy.json`, glob `from_work_dir` | Stage 6: DIRECTORY outputs for `working/` and extra files through `PUT /files/{rel_path}`, hyphy passes live on Funnel and TESK | Uploading only what Galaxy collects, empty directories. On tesp-api a POST variant that joins the multipart filename onto `path`, or tesp-api fixes. | M |
| Other job metrics plugins | Only the core plugin's four files come back | Ask the instrumenters for their file names, or upload `metadata/` as a directory | S |
| Object stores | Inputs through Galaxy, outputs moved into the store at finish | Presigned GET inputs for S3-backed stores | M |
| TESK | Stage 6: `native_tesk` with `disk_gb: 2`, all scenarios pass live | Lower `taskTtlSeconds` or delete finished tasks' pods, so PVC storage isn't held for a day | S |
| Cancel and recovery | Stage 6: cancel passes live on all three servers. Recovery is unit tested only. Orphan task if Galaxy dies between create and storing the id. | A live restart test, optionally a submission nonce | S |
| Failures | Unreachable TES retried forever | `tes_unreachable_timeout` and a `QUEUED` timeout from the polling branch | S |
| Resubmission, limits, walltime | None | Resubmit as a new task, map limits to TES | M |
| Staging volume | Every job directory file is staged | Skip known-unused files, size checks | S |
| The v26.1.2 missing-input bug | `GET /api/jobs/{id}/files` for a missing input returns 200 with an empty body, so a TES server would hand the tool an empty file | `dev` already returns 404. Backport, whatever the design. | S |

Summed, a production design B is now the `dev` port plus several M and S items, the largest being discovered outputs on tesp-api, object stores and resubmission. The prototype's roughly 1,600 changed lines cover fixed FILE outputs, signed URLs, cancel, and DIRECTORY outputs on Funnel and TESK, all exercised live. The stage 4 estimate of 1,500 to 2,500 lines for a production version (inferred) still looks right.

Whether to pursue design B at all is a decision for John ([BUGS_AND_ENHANCEMENTS.md](BUGS_AND_ENHANCEMENTS.md#needs-johns-decision)).
