# Hardening record (stage 6, 2026-11-15)

What stage 6 changed in the Galaxy WES → Galaxy → tesp-api line, why, and the evidence. Every code fix has a test that failed before it and passes after. The before and after outputs are saved next to the evidence.

The demo repository is `~/projects/repositories/galaxy-wes-tes` (local git only). Paths written `demo:<path>` are relative to it. Galaxy and Pulsar branches are on the `jmchilton` forks, with no pull requests. tesp-api changes are a local branch, `galaxy-wes-tes` in `~/projects/repositories/tesp-api`, exported as `demo:patches/tesp-api/*.patch`.

## Summary

| # | Item | Where | Result |
| --- | --- | --- | --- |
| 1 | tesp-api source reproducible without a local-only commit | demo `scripts/tesp/lib.sh`, `config/tesp/tesp.env` | Fixed. `TESP_REF=patched` builds the same commit on any host. |
| 2 | tesp-api erased a cancelled task twice | tesp-api patches 0016 and 0017, Pulsar `clean_job_directory_retry` | Fixed. One erase per task, and a Pulsar race the second erase had hidden is fixed too: leftovers after 40 cancels went from 13 to 0. |
| 3 | Galaxy never retried a TES cancel that failed while the server was down | Galaxy `tes_task_state_polling_unreachable` | Fixed. The cancel is retried until it lands or a cap runs out. Live on tesp-api: the orphaned task ends CANCELED. |
| 4 | Misleading "exited with code 0" for SYSTEM_ERROR tasks | Galaxy `tes_task_state_polling_unreachable` | Fixed. The job info names the TES server's reason. |
| 5 | No single regression entry point | demo `make acceptance` | Built. Funnel: PASS. tesp-api from a fresh clone: 5 PASS, 2 FAIL on one intermittent leftover, fixed (item 2) and rerun PASS. Design B: PASS on TESK and Funnel. |
| 6 | Jobs with 109 or more inputs can't start (argv ceiling) | Pulsar `coexecution_compact_launch` | Reproduced to the byte and fixed. New ceiling 1,244 inputs; a 600-input Galaxy job passes on tesp-api. |
| 7 | Design B: job key in task URLs, no discovered outputs, cancel untested | Galaxy `tes_native_staging_v26.1.2` | Signed per-file URLs, DIRECTORY outputs (Funnel and TESK), cancel and recovery tests. Live: all scenarios PASS on TESK and Funnel; on tesp-api all but discovered outputs. |
| 8 | The demo's run watcher misread Funnel executors | demo `scripts/tes_task.py` | Fixed while building item 5. |

## 1. Reproducible tesp-api source

**Problem.** The demo's default tesp-api source was `TESP_REF=stage5`, commit `4bc9b5d`, which existed only in one clone on one machine. Anyone else had to apply the patches by hand and pick the result by branch name.

**Change.** Demo commits `02b094d`, `ff3c3a4`, `2ad9cd6` and `5d949be`. The new default `TESP_REF=patched` (`demo:scripts/tesp/lib.sh`):

1. Finds the fork base `c3a9f2376df7a634ad6c33959800d169219b7560` in `TESP_REPO`. If `TESP_REPO` is missing or lacks it, it clones `https://github.com/mirelaminkova/tesp-api.git` into `demo:vendor/tesp-api-src`.
2. Runs `git am` of `demo:patches/tesp-api/*.patch` on a detached worktree with a fixed committer name and email, `--committer-date-is-author-date`, no hooks and no signing. The commit SHA is therefore the same everywhere. git 2.25, 2.45 and 2.53 gave the same SHA.
3. Compares the tree with `TESP_PATCHED_TREE` in `demo:config/tesp/tesp.env`. On a mismatch it stops and prints the tree and commit it got.
4. Writes a stamp file (`vendor/tesp-api-patched.stamp`: series sha256, base, tree pin). A changed series, changed pins or local edits trigger a rebuild, so an old worktree is never used by mistake.

Pins when H1 landed (16 patches): `TESP_PATCH_BASE=c3a9f237…`, `TESP_PATCHED_TREE=df703fc53df5cedfc7145568089a0a1d2db3338e`, `TESP_PATCHED_COMMIT=82c57ebf27402da978c0ce2edf34c0583bdaea7b`, the tree of the local branch `galaxy-wes-tes` at `01bbf9bb7da4`. The coordinator applied the 16 patches in a separate clone and got the same commit and tree. After patch 0017 (item 2) the pins are tree `c3cc3dad70965578503a92ba18958238316e4c65` and commit `c5ca66a2b9096086df79f40487a4da905bee75da` (branch head `d72420fd3ffe`).

`TESP_REF=stage5` was dropped. `upstream`, `fork`, any commit-ish and `TESP_SRC` work as before.

**Evidence.** `demo:runs/stage6/tesp-reproducible/`. A fresh clone of the demo repository in a scratch directory, with `TESP_REPO=/nonexistent/tesp-api`, cloned the fork from GitHub, built the worktree, matched the tree, and reused it unchanged on a second run. tesp-api started from it as instance `s6repro`, and the `basics` and `cancel` probes passed. Failure modes were checked too: a changed series rebuilds, changed patch content fails loudly, no network gives "could not clone", a missing base names both places it looked.

The full acceptance matrix also ran from a fresh clone with `TESP_REPO=/nonexistent/tesp-api` (item 5).

**To change the series:** commit on `galaxy-wes-tes`, run `git format-patch c3a9f237..galaxy-wes-tes -o demo:patches/tesp-api/`, and copy the tree and commit from `lib.sh`'s mismatch message into the two pins.

## 2. tesp-api erased a cancelled task twice

**Problem.** Stage 5 saw both the `cancel_task` event handler and the polling loop send the Pulsar cancel, the DELETE and the cleanup job for one cancelled task. The second pass found nothing, so it was harmless but doubled the work on the outer Pulsar.

**Change.** Patch 0016 (`01bbf9bb7da4`), `tesp_api/service/pulsar_operations.py`. Each process records the jobs it erased successfully (`ErasedJobs`, checked under patch 0002's per-job lock). An erase counts only if Pulsar answered the DELETE and the cleanup job returned 0, so a failed erase is retried by the next caller. A job set up after an erase, or whose set-up request was still running when the erase started, is erased again. The record is per process; after a restart, recovery may erase once more, which is harmless.

**Tests.** The full suite went from 856 to 869 passed (1 skipped). Of the 17 new and changed tests, 8 failed on `4bc9b5d` and all pass on `01bbf9b`; the 9 that passed before are guards for the set-up rules, and two mutation runs showed they catch a wrong fix. Evidence: `demo:runs/stage6/tesp-erase-once/`.

**Live.** `demo:runs/stage6/tesp-reproducible/08-erase-counts.txt`: a task cancelled while running, and one cancelled while its Pulsar job was queued, each got 1 cancel, 1 DELETE and 1 cleanup job; tesp-api logged "erased already" for the second caller. A cancel that crosses the submit (10.942 s against 10.944 s) still erases twice, on purpose: tesp-api can't know whether Pulsar took the submit before the DELETE.

**Follow-up: the second erase had been hiding a Pulsar race.** The tesp-api acceptance run from a fresh clone (item 5) found, after 1 of 6 cancels, the outer Pulsar job directory left behind with only `return_code` in it. The mechanism, in the outer Pulsar (`b476ccd`, `queued_python`, Python 3.12.16):

- `PUT /jobs/{id}/cancel` records the cancel, signals the process tree and returns at once. The thread waiting for the process then writes `return_code` and removes the pid file.
- tesp-api's DELETE arrives 3 to 7 ms after the cancel, while those writes happen. Pulsar's `BaseManager.clean()` runs one `rmtree`, ignores any error, and answers 200.
- A `return_code` written after `rmtree` listed the directory makes the final `rmdir` fail: the directory stays with `return_code` only. A pid file removed before `rmtree` reaches it raises `FileNotFoundError` on Python 3.12: the whole directory stays.
- In stage 5 the polling loop's second DELETE removed such directories by chance. Patch 0016 took that second erase away.

Two fixes, each sufficient alone:

- **tesp-api patch 0017** (local branch `galaxy-wes-tes` `d72420fd3ffe`). After the DELETE and the cleanup job, `erase_job` asks Pulsar for the job's status. Pulsar reports `lost` only when the job directory is gone. Until then tesp-api deletes again, up to 3 times, 1 s apart. If the directory stays or the status can't be read, the erase is not recorded, so the polling loop or recovery tries again. It works with any outer Pulsar, PyPI 0.16.0 included. Run against `01bbf9b`, the new and changed tests give 7 failed and 18 passed (the 4 new tests plus 3 existing ones that now expect the status request; `demo:runs/stage6/tesp-erase-race/fail-before-01bbf9b.txt`); the full suite has 873 passed, 1 skipped. New pins: `TESP_PATCHED_TREE=c3cc3dad70965578503a92ba18958238316e4c65`, `TESP_PATCHED_COMMIT=c5ca66a2b9096086df79f40487a4da905bee75da` (demo commit `3fa10a9`).
- **Pulsar `clean_job_directory_retry`** (`ffbe6987cd84`, on `queued_manager_monitor_kwarg` `b476ccd`, pushed). `clean()` retries `rmtree` up to 3 times, 0.2 s apart, and logs a final failure instead of ignoring it. Two deterministic tests (one drops `return_code` in just before the final `rmdir`, one removes the pid file just before `rmtree` reaches it) fail on `b476ccd` and pass after. The demo's default outer Pulsar stays `b476ccd`; `TESP_PULSAR_SOURCE=https://github.com/jmchilton/pulsar.git@ffbe6987cd84b79ff08a4c6cd9d45ec2f04de408` selects the fix.

Live, `demo:runs/stage6/tesp-erase-race/`: a tesp-api-only instance, 40 cancels of a running task per configuration, a directory counted as left if it exists 12 s after the cancel.

| tesp-api | Outer Pulsar | Directories left |
| --- | --- | --- |
| `82c57ebf` (patches 1–16) | `b476ccd` | 13 of 40 (7 with `return_code` only, 6 whole) |
| `01bbf9b` (patches 1–16) | `ffbe698` | 0 of 40 |
| `c5ca66a2` (patches 1–17) | `b476ccd` | 0 of 40 (the race hit 3 times; each directory was removed by the second DELETE 1 s later) |

Acceptance on the final pins: `demo:runs/acceptance/20261115T045850Z-tesp/` (coordinator, demo `313dc19`, tesp-api `c5ca66a2` with patches 1–17, outer Pulsar `b476ccd`, Galaxy `wes_tes_demo_fixes_v26.1.2` `b317bc12545`). `SCENARIOS=iwc-qc,cancel,dies-early,unreachable,leftovers`, overall PASS in 9 minutes plus 74 s of `make up`: cancel with WES CANCELED 1.2 s after the cancel and containers gone at 1.5 s, dies-early 41.5 s, unreachable (Galaxy `error` 64.3 s after the stop) with the cancel-retry hook PASS, nothing left of 5 tasks.

## 3. Galaxy retries a failed TES cancel

**Problem.** Stage 5 acceptance item 8: with `tes_unreachable_timeout: 60`, Galaxy failed the job after tesp-api had been unreachable for 60 s and sent the TES cancel once, while tesp-api was still down. It never retried. When tesp-api came back it resumed the task and ran it to COMPLETE. The Funnel acceptance run in stage 6 showed the same on Funnel: the task stayed RUNNING with its tool container after the outage.

**Change.** Galaxy `tes_task_state_polling_unreachable` `bd710f3b8da` (on `f71ca18704d`; parent `tes_task_state_polling` `e3c0cc44649`, base `dev`), in `lib/galaxy/jobs/runners/pulsar.py`:

- The thread stopping the job sends one cancel. On a connection error, timeout or 5xx it queues the cancel in memory, logs a WARNING and returns. It never raises, so stage 3's fix for the stop-queue loop holds.
- The runner's monitor thread retries 10 s later, then doubles the wait up to 120 s. It stops when the cancel succeeds, when the task has ended, is CANCELING or is gone (404), when the server refuses (400, 401, 403), or when the cap runs out.
- Each sweep sends at most one request per unreachable server. pydantic-tes has no request timeout, so a request to a dead host can block for about 2 minutes.
- New runner option `tes_cancel_retry_timeout`, default 86400 s. `0` tries once, the old behaviour. (For `tes_unreachable_timeout`, `0` means retry forever; the sample job conf says so.)
- Pending retries live in memory. A Galaxy restart loses them; at shutdown Galaxy logs each pending task and its TES URL. Persisting them would need a schema change for a narrow window (server down past the timeout and Galaxy restarted before it returns).

Log lines: WARNING `Could not reach the TES server to cancel the task, retrying for up to N seconds`, INFO `Cancelled TES task on attempt N`, ERROR `Gave up cancelling TES task ...`.

**Tests.** `test/unit/app/jobs/test_pulsar_tes_task_checks.py`: 16 failed and 44 passed before the fix, 60 passed after; 131 passed with the four neighbouring runner test files. Evidence: `demo:runs/stage6/h2a-cancel-retry/unit-*.txt`.

**Demo ports** (new commits, nothing rewritten): `tes_task_polling_v26.1.2` `031b96fe16a`, `wes_tes_demo_fixes_v26.1.2` `8b3166c80fb`.

**Live check.** `demo:scripts/tesp/acceptance/unreachable-cancel.sh`, also the follow-up hook of `make acceptance`'s `unreachable` scenario. It passes only if the job goes `error`, the task ends CANCELED (not COMPLETE) after tesp-api answers again, and no labelled container or `vol-<id>-*` volume is left.

Live results (item 5): on tesp-api the hook PASSed twice; the orphaned task was CANCELED 37.9 s after tesp-api answered again, on Galaxy's fourth attempt, and no `pulsar-finish` ran. On Funnel the task was CANCELED 39.4 s after Funnel answered, but Funnel left the pre-restart container running.

**Not changed: pulsar-finish publishing `complete` after 403s.** In stage 5 the resumed task's `pulsar-finish` got 403 on every upload and still published `complete`. Galaxy answers 403 to job files requests for a finished job (`lib/galaxy/webapps/galaxy/api/job_files.py`, `__authorize_job_access`), and Pulsar treats any 403 on an output upload as allowed (`pulsar/client/staging/down.py`, `_collect_output`, from upstream `8bff105`, meant for datasets purged during the job). Changing that rule is a decision for John ([BUGS_AND_ENHANCEMENTS.md](BUGS_AND_ENHANCEMENTS.md)). With the cancel retry the task no longer reaches `pulsar-finish` in this scenario.

## 4. SYSTEM_ERROR job info

**Problem.** Found while measuring item 6. Funnel records exit code 0 for an executor it could not start, so the polling branch's job info said "The task exited with code 0." The reason (`fork/exec /usr/bin/docker: argument list too long`) was only in the task's system logs.

**Change.** Galaxy `tes_task_state_polling_unreachable` `025f1256ec3`, `lib/galaxy/jobs/runners/util/tes_task.py`. For SYSTEM_ERROR the job info ends with `System log: <reason>`, the last error line of the system logs: Funnel's `error='…'` value, the text after TESK's `ERROR:`, or tesp-api's reason line (patch 0011). It is redacted like the stderr excerpt and cut so the summary is at most 130 characters. Exit code 0 is never reported for SYSTEM_ERROR. Funnel's and tesp-api's formats come from real tasks and patch tests; TESK's from its source only (no TESK SYSTEM_ERROR was seen in this project).

**Tests.** 7 failed and 60 passed before, 67 passed after. On the recorded Funnel tasks: the argv task now reads `System log: fork/exec /usr/bin/docker: argument list too long`, a failed download `System log: httpStorage: GET request returned status code: 404`. Evidence: `demo:runs/stage6/h2a-cancel-retry/system-error-*`.

**Demo ports:** `tes_task_polling_v26.1.2` `1f7cae33d5f`, `wes_tes_demo_fixes_v26.1.2` `b317bc12545` (both fixes).

## 5. `make acceptance`

**Problem.** Stage 5's checks were separate scripts (`run_checks.py`, `acceptance-checks.sh`, gap scripts) run by hand, tesp-only for cancel and dies-early, with results in prose.

**Change.** Demo commits `e62c6b4`, `297c2d5`, `2d7b9a5`, `dccedc6`, `0c87d05` and later. `make acceptance [TES=funnel|tesk|tesp] [TES_MODE=pulsar|native] [SCENARIOS=a,b]` runs `demo:scripts/acceptance.sh`:

- It refuses (exit 2) a Galaxy checkout without the TES polling options, and runs Galaxy on the gap job conf with a 15 s check interval, a 30 s grace period and a 60 s unreachable timeout.
- It brings the stack up if nothing runs, reuses this backend's stack, refuses when another backend runs, and stops it only with `ACCEPTANCE_DOWN=1`.
- Scenarios, in order: `iwc-qc`, `iwc-hyphy`, `cancel`, `dies-early`, `tes-restart`, `unreachable`, `leftovers`. Each is PASS, FAIL or SKIP with a reason. A crashing scenario becomes FAIL and the rest still run.
- Output: `demo:runs/acceptance/<UTC>-<backend>[-native]/result.json` (schema version, times, backend, mode, pins, per-scenario status, duration, evidence directory and details, overall), `SUMMARY.txt`, and one directory per scenario. `result.json` is rewritten after each scenario. The exit status is non-zero on any FAIL.
- `scripts/tesp/acceptance-checks.sh` now runs cancel and dies-early on Funnel, TESK and tesp-api; its tesp command line is unchanged.
- `scripts/acceptance.sh --self-test` runs 27 harness tests without a stack.

**Funnel run.** `demo:runs/acceptance/20261115T022857Z-funnel/`, 12 min 45 s on a running stack, Galaxy `3585089e925`, Funnel 0.12.3, staging image `0.16.1.dev0-20b6460`. Overall PASS:

| Scenario | Status | Numbers |
| --- | --- | --- |
| iwc-qc | PASS | 323 s, 2 tool jobs COMPLETE on Funnel, IWC assertions pass |
| iwc-hyphy | PASS | 244 s, 12 tool jobs |
| cancel | PASS | WES CANCELED 1.2 s after the cancel, containers gone at 3.0 s, `pulsar-finish` never ran |
| dies-early | PASS | Galaxy `error` 45.1 s after EXECUTOR_ERROR (bound 60 s) |
| tes-restart | SKIP | Funnel 0.12.3 with `Compute: local` doesn't resume tasks after a restart |
| unreachable | PASS | Galaxy `error` 61.6 s after Funnel stopped; the task stayed RUNNING afterwards (item 3) and the harness cleaned it up |
| leftovers | PASS | 17 tasks, all final, no task containers |

**tesp-api run from a fresh clone.** `demo:runs/acceptance/20261115T030823Z-tesp/` (`FRESH-CLONE.txt` records the clone commit `5602e9d` and its settings). It ran from a fresh clone of the demo repository with `TESP_REPO=/nonexistent/tesp-api` (so the tesp-api fork came from GitHub) and `GALAXY_ROOT_OVERRIDE` pointing at `wes_tes_demo_fixes_v26.1.2` `8b3166c80fb`; nothing in `local.env`. Pins: tesp-api `patched` `82c57ebf` (tree `df703fc5`), outer Pulsar `b476ccd3dfa8`, staging image `0.16.1.dev0-20b6460`. About 20 minutes on a running stack.

| Scenario | Status | Numbers |
| --- | --- | --- |
| iwc-qc | PASS | 323 s |
| iwc-hyphy | PASS | 184 s, 12 tool jobs |
| cancel | FAIL | WES CANCELED 1.2 s after the cancel, containers gone at 3.1 s, one DELETE, no `pulsar-finish`, but one outer Pulsar job directory left (below) |
| dies-early | PASS | Galaxy `error` 41.7 s after EXECUTOR_ERROR |
| tes-restart | PASS | tesp-api restarted while fastp's tool container ran; both tasks COMPLETE, IWC assertions pass |
| unreachable | PASS | Galaxy `error` 63.1 s after the stop; follow-up hook PASS: Galaxy's cancel succeeded on attempt 4 and the orphaned task was CANCELED 37.9 s after tesp-api answered again, with no `pulsar-finish` |
| leftovers | FAIL | the same job directory; nothing else left of 19 tasks |

The failure is real and intermittent: after one cancel, the outer Pulsar job directory `var/tesp/pulsar/staging/<task id>/` was left holding only `return_code`. tesp-api sent the Pulsar cancel at .198, the killed job wrote `return_code` at .199, and the single DELETE came at .203. Before patch 0016 the second erase removed such a directory. It happened in 1 of 6 tesp cancels (`demo:runs/stage6/h3-acceptance/tesp-cancel-repeat/`: 4 more cancels were clean). The cause is a Pulsar race that the old double erase hid; it is fixed by tesp-api patch 0017 and, independently, by Pulsar `clean_job_directory_retry` (item 2, "Follow-up").

An earlier fresh-clone run (`demo:runs/stage6/h3-acceptance/20261115T024638Z-tesp-fresh-clone-run2/`) gave the same unreachable PASS and found two demo bugs, fixed with tests: `make up TES=tesp` on a clone where Funnel never ran stopped at "FUNNEL_USER is not set" (`5221643`), and `run_checks.py` missed a task's `complete` when Pulsar finished and tesp-api erased the job within one 0.5 s sample (`5d6f6ee`).

**Funnel with the cancel retry.** `demo:runs/acceptance/20261115T033208Z-funnel/` (`SCENARIOS=unreachable,leftovers`, Galaxy `8b3166c80fb`). Galaxy failed the job 62.7 s after Funnel stopped, retried the cancel 10, 30 and 70 s later, and attempt 4 succeeded: Funnel marked the task CANCELED 39.4 s after it answered again. But the tool container started before Funnel's restart kept running, and the harness had to remove it, so the scenario is FAIL. Funnel 0.12.3's local worker runs inside the server process and doesn't stop executors of a task from before a restart. That is a Funnel limitation; Galaxy's side works.

**Native mode** (`8d7fc27`): `cancel` and `dies-early` run under `TES_MODE=native` without restarting Galaxy; `tes-restart` and `unreachable` SKIP there.

## 6. The argv ceiling

**Problem.** Galaxy's `PulsarTesJobRunner` passes the Pulsar launch message, base64-encoded, as one argument of executors 0 (`pulsar-submit`) and 2 (`pulsar-finish`). Linux refuses any single argument of 131,072 bytes or more (`MAX_ARG_STRLEN`). Stage 4 estimated "about 100 inputs".

**Measured.** `demo:runs/stage6/argv/`, demo commit `9cc2b0d`, scripts in `demo:scripts/argv/`.

- Largest argument that starts: 131,068 bytes of base64 (a multiple of 4), which is 98,301 bytes of JSON.
- JSON size = F + N·(e + c). Per staged file e = 229 + |name| + 2|P| + |quote_plus(P)| + |dataset id| + 36 + |files endpoint|, where P is the dataset path; c is the tool's command text per input; F is fixed. In the demo one input costs 877 JSON bytes (1,169 base64 bytes). The model reproduces the real 39-input hyphy message to the byte (36,946 JSON, 49,264 base64).
- **108 inputs start; 109 don't** (131,116-byte argument). Shorter paths allow 129, longer 107.
- tesp-api: EXECUTOR_ERROR, exit 126, `docker: Argument list too long`. Funnel: SYSTEM_ERROR within about 1 s, `fork/exec /usr/bin/docker: argument list too long`. TESK (computed, not run): two copies plus 1,616 bytes must fit TESK's 262,144-byte annotation, so about the same limit. Design B has no such argument.
- Stock Galaxy leaves such a job `queued` forever; the polling branch fails it (with item 4, it names the reason).
- TES level, both backends: one busybox argument of 131,071 bytes completes, 131,072 fails. Launch-message-shaped tasks with Pulsar's own decoder: 108 inputs complete, 109 fail.

**Fix.** Pulsar `coexecution_compact_launch` `9036ff3` on the stack tip `coexecution_stage_out_failures` `20b6460`:

- `ea7bc6e`: a message longer than 131,071 bytes is sent as `--base64_zlib`, URL-safe base64 of the zlib-compressed JSON. Messages that fit are sent as before, byte for byte, so old staging images keep working for them. URL-safe base64 is needed: tesp-api collapses `//` in executor arguments, and a standard-base64 compressed message lost 3 bytes there. A message too large even compressed raises at launch with a clear error. An old image given `--base64_zlib` exits 2 at once.
- `9036ff3`: `pulsar-finish` gets only `{"job_id"}`. Staging images since 0.15.0 read nothing else from it. This halves the task JSON, which is what TESK's annotation limit counts.
- The hyphy message shrinks from 49,264 to 4,948 bytes (9.96×). The new ceiling is **1,244 inputs**: 1,244 passed and 1,245 failed, on tesp-api and on Funnel.
- Tests: 6 failed and 2 passed on `20b6460`, 23 passed at `9036ff3`. Demo port for Galaxy 26.1's pulsar-galaxy-lib: `coexecution_compact_launch_0.15.15` `f826997`. Staging image `wes-tes/pulsar-pod-staging:0.16.1.dev0-9036ff3`. No Galaxy change is needed.
- Client and image matrix at 600 inputs on both backends: stock client + old image can't start; fixed client + new image COMPLETE with all 600 inputs staged; fixed client + old image exits 2. At 20 inputs either image works.

**Galaxy level.** `demo:runs/stage6/argv/galaxy/tesp-2026-11-15T0339Z/` and `funnel-2026-11-15T0353Z/` (each with `summary.md`, `results.json` and a passing secret scan), demo commit `c070155`, about 23 minutes. Galaxy `wes_tes_demo_fixes_v26.1.2` `8b3166c80fb` on the gap job conf. Tool `argv_cat_many` (one job, N inputs) on the stock client and old image `20b6460`; `argv_cat_many_new` on the fixed client (pulsar-galaxy-lib 0.15.15 plus `f826997` as an overlay on `PYTHONPATH`, `GALAXY_EXTRA_PYTHONPATH`) and image `9036ff3`. Calibration in this Galaxy: 876 JSON bytes per input plus 2,764 fixed. The boundary moves by about one input between histories, because dataset ids gain a digit.

| Backend | Client and image | Inputs | Result |
| --- | --- | --- | --- |
| tesp-api | stock, old | 10, 40, 109 | `ok` (109: a 131,000-byte argument) |
| tesp-api | stock, old | 110 | `error` 52 s later (polling branch): "… EXECUTOR_ERROR … exited with code 126", stderr `docker: Argument list too long` |
| tesp-api | fixed, new | 10, 40 | `ok`, plain base64 |
| tesp-api | fixed, new | 109, 110, 600 | `ok`, compressed (12.8, 12.9 and 65 KB arguments); every input in the output; the task JSON at 110 inputs is 15 KB instead of 266 KB |
| tesp-api | fixed, old | 110 | `error`: exit 2, `unrecognized arguments: --base64_zlib` |
| tesp-api | fixed, old | 20 | `ok`: the job-id-only `pulsar-finish` works on the old image |
| Funnel | stock, old | 108 | `ok` |
| Funnel | stock, old | 109, 110 | `error` 46–49 s later, "SYSTEM_ERROR … exited with code 0" (`8b3166c80fb` lacks item 4's fix) |
| Funnel | fixed, new | 109, 110 | `ok` |

## 7. Design B hardening

The prototype `tes_native_staging_v26.1.2` went from `f33e416aa22` to `5e889591314` (still on `a1b53d59234`). It stays a prototype for John to decide on; see [DESIGN_B.md](DESIGN_B.md).

- `4c7750ea1e0`: **signed per-file URLs.** A task URL carries `job_token=<expiry>.<signature>`, an HMAC-SHA256 over the job id, a scope (`r` read, `w` write, `d` write below a directory), the expiry and the exact path, keyed from Galaxy's `id_secret`. The job files routes accept it instead of `job_key`. Tokens also die with the job, because the job-state checks still apply. Runner parameter `job_files_token_ttl`, default 7 days. The job key no longer appears in the task.
- `a1073074052`: **DIRECTORY outputs** for discovered outputs and `extra_files`. New route `PUT /api/jobs/{id}/files/{rel_path}?path=<dir>` and destination option `tes_directory_outputs`. From source: Funnel 0.12.3 and TESK's filer upload a DIRECTORY output as one PUT per file to `<url>/<relative path>`, keeping the query. tesp-api sends one multipart POST per file with the relative path only in the filename, so it stays off there.
- `5e889591314`: cancel of an ended task is logged as nothing to cancel; cancel and Galaxy-restart recovery tests added (recovery already worked).
- Unit tests 54 → 83, and 2 new integration tests (`test_signed_per_file_tokens`, `test_directory_put`) against Galaxy's test server; the new tests failed first. Evidence: `demo:runs/stage6/h4-design-b/`.
- Demo commit `2ca77c0`: `make up TES=tesk TES_MODE=native`, and native dies-early routing (`gap_badimage` to a missing image).

**Live runs** (Galaxy `5e889591314` unchanged; demo commits `4a32962` and `313dc19` fixed only harness bugs; evidence in `demo:runs/stage6/h4-design-b/phase2/`):

| Backend | Run | iwc-qc | iwc-hyphy | cancel | dies-early | leftovers |
| --- | --- | --- | --- | --- | --- | --- |
| TESK (kind, tesk-api 1.2.0, filer 0.11.0) | `20261115T041415Z-tesk-native`, cancel rerun `20261115T043156Z-tesk-native` | PASS | PASS, 12 jobs, discovered collection through DIRECTORY outputs | PASS on rerun: WES CANCELED 1.2 s after the cancel, no executor pod left | PASS: Galaxy `error` 1.1 s after EXECUTOR_ERROR (TESK needs about 240 s to give up on a missing image) | PASS |
| Funnel 0.12.3 | `20261115T043559Z-funnel-native` | PASS | PASS | PASS: containers gone 4.7 s after the cancel | PASS: 1.1 s | PASS |
| tesp-api (`patched`) | `20261115T044628Z-tesp-native`, rerun `20261115T045338Z-tesp-native` | PASS | FAIL as expected: tesp-api has no DIRECTORY outputs, 4 of 12 jobs ran | PASS on rerun: containers gone 1.1 s after the cancel | PASS on rerun | PASS |

- On TESK the IWC QC jobs took 87 to 89 s from queued to ok against 13 to 18 s on Funnel, because TESK starts separate filer pods. Galaxy received 40 directory PUTs, all 200.
- Signed URLs live: the stored Funnel tasks of the native run contain 0 `job_key` and 324 `job_token=` occurrences; the 6 stage 5 tasks still in Funnel's database contain 378 job keys. The strict tesp secret scan found no job key in tesp-api's stored tasks.
- Harness bugs fixed on the way: TESK keeps a finished task's PVC `Terminating` until `taskTtlSeconds` (86400 s) deletes its pods, which the cancel check misread; TESK's dies-early needs a 480 s watch; native tesp jobs weren't found by `run_checks.py`; `gap_evidence.py` now redacts `job_token=` values.
- Left: TESK holds a design B task's PVC storage for a day unless `taskTtlSeconds` is lowered; Funnel writes task URLs, and so tokens, into its system logs (each token opens one file in one direction until the job ends); recovery after a Galaxy restart is unit-tested only; `tes-restart` and `unreachable` skip in native mode.

Not done, and why: DIRECTORY outputs on tesp-api (needs a new POST mode in tesp-api and Galaxy); binding tokens to the TES task id (not known before `create_task`); a submission nonce for a Galaxy crash between `create_task` and saving the task id; the `dev` port (the first step if John picks design B).

## 8. Funnel executor state in the demo watcher

Funnel reports `exitCode: 0` for an executor that is still running. `demo:scripts/gaps/watch_run.py` treated that as finished, so on Funnel the "cancel while the tool runs" trigger never fired and the cancel check let the job finish. It had been broken since the TESK commit `2e95b63`. The logic is now `executor_done` in `demo:scripts/tes_task.py`, with a test that fails without it.

## Branches and SHAs at the end of stage 6

All Galaxy and Pulsar branches are on the `jmchilton` forks, with no pull requests. The tesp-api branch is local; its patches are in `demo:patches/tesp-api/`.

| Repository | Branch | Head at stage 6 start | Head at stage 6 end | Base or parent |
| --- | --- | --- | --- | --- |
| galaxy | `tes_task_state_polling_unreachable` | `f71ca18704d` | `025f1256ec3` | `tes_task_state_polling` `e3c0cc44649` (base `dev`) |
| galaxy | `tes_task_polling_v26.1.2` (demo port) | `a1b53d59234` | `1f7cae33d5f` | tag `v26.1.2` |
| galaxy | `wes_tes_demo_fixes_v26.1.2` (demo port) | `3585089e925` | `b317bc12545` | tag `v26.1.2` |
| galaxy | `tes_native_staging_v26.1.2` (design B) | `f33e416aa22` | `5e889591314` | `tes_task_polling_v26.1.2` `a1b53d59234` |
| pulsar | `coexecution_compact_launch` (new) | — | `9036ff3` | `coexecution_stage_out_failures` `20b6460` |
| pulsar | `coexecution_compact_launch_0.15.15` (new, demo port) | — | `f826997` | tag `0.15.15` |
| pulsar | `clean_job_directory_retry` (new) | — | `ffbe6987cd84` | `queued_manager_monitor_kwarg` `b476ccd3dfa8` |
| tesp-api | `galaxy-wes-tes` (local) | `4bc9b5d927f8` (15 patches) | `d72420fd3ffe` (17 patches) | fork `c3a9f237`; deterministic `patched` commit `c5ca66a2`, tree `c3cc3dad` |

Demo repository: `main` from `3191a48` to `7c09840`. Images built in stage 6: `wes-tes/pulsar-pod-staging:0.16.1.dev0-9036ff3` (compressed launch messages) and `wes-tes/tesp-pulsar-rest:git-ffbe6987cd84-docker29.1.3` (outer Pulsar with the `rmtree` retry). The demo's defaults are unchanged: staging image `0.16.1.dev0-20b6460`, outer Pulsar `b476ccd`.
