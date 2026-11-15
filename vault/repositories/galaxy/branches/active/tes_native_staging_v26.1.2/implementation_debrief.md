# Implementation debrief: tes_native_staging_v26.1.2

Stage 5 stretch goal of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md): a working prototype of design B, so that the synthesis can say from evidence what a spec-following TES path costs. The full evidence write-up is `runs/design-b/README.md` in `~/projects/repositories/galaxy-wes-tes`, which also covers sizes, timing, LOC and the production gap table.

## Branch

- `jmchilton/galaxy` `tes_native_staging_v26.1.2`, base `tes_task_polling_v26.1.2` `a1b53d59234` (tag `v26.1.2` plus the TES polling port, whose `tes_task.py` it reuses).
- `40c052c35d4` Accept raw-body PUT uploads on the job files API.
- `f33e416aa22` Add a TES-native job runner prototype (design B).
- Worktree `~/projects/worktrees/galaxy/branch/tes_native_staging_v26.1.2`, made with `git worktree add`, because `ghwt` rejects dots in branch names. It has its own `.venv` with the 423 pins of `tes_task_polling_v26.1.2`'s.
- +912/−49 over 4 files: `lib/galaxy/jobs/runners/tes.py` (475), `lib/galaxy/webapps/galaxy/api/job_files.py`, and 2 test files.

## Design and why

The task uses Galaxy's own absolute paths (stage 4's "B2", Kubernetes-runner style), not Pulsar's `/job` layout with a `TesNativeClient` ("B1"):

- The command line needs no rewriting, and `build_command` already copies `from_work_dir` outputs inside the job.
- `outputs_to_working_directory: true` keeps every write in the job directory, which is the task's one volume.
- The runner lists the inputs itself: input datasets with their metadata and extra files, every job directory file, and tool-directory files the job's text refers to.
- No Pulsar change was needed. B1 would have added two Pulsar M items and an install into Galaxy's venv.

Mechanics:

- One executor runs a small wrapper, sent as inline `content`. The wrapper precreates the outputs that Galaxy precreated, runs Galaxy's unchanged job script, keeps the tool's exit code in `galaxy_<id>.ec`, creates any missing declared output and exits 0. TESK and tesp-api skip stage-out after a failed executor, and Funnel fails a task whose FILE output is missing.
- Outputs are FILE outputs to the job files API: datasets, `tool_stdout`, `tool_stderr`, `.ec`, `.o`, `.e` and the core metrics files. Galaxy then sets metadata locally (`_handle_metadata_externally`) and finishes the job.
- Funnel uploads with a raw PUT, so Galaxy gained `PUT /api/jobs/{id}/files?path=&job_key=`. On v26.1.2 it is a FastAPI route in the legacy module, with the auth and write checks factored out of the controller into shared functions. tesp-api's multipart POST hits the existing route unchanged.

## Results

- **IWC QC through Galaxy WES: PASS** on Funnel 0.12.3 (runs `704dbb6bdf5315e6` with 2 cores, `bf37eedfa2837b81` with 1 core) and on tesp-api stage 5 `4bc9b5d9` (`aec259dddc7e2eec` with 2 cores, `8f3d143a4f297057` with 1 core).
- Every tool job ran on `tes_native` with one executor, and its task ended `COMPLETE`. The proof is in `tes-evidence.txt` per run.
- With 1 core, the fastp JSON (`4778fab9…`) and both read files are byte-identical to the design A reference `2026-11-14-9da1c5702ebec70c`. With 2 cores, the job gets `GALAXY_SLOTS=2`, fastp writes different gzip blocks, and the decompressed reads are still identical. This also confirms that the Pulsar TES runner runs every job at 1 slot.
- `queued` → `ok`: on Funnel, fastp 13 s and MultiQC 18 s (design A: 22 s and 27 s). On tesp-api, 19–20 s and 20 s (design A: 23 s and 28 s).
- Task JSON: about 10.6 KB and 9.2 KB, against design A's 17.5 KB and 16.6 KB. Each file entry costs about 420 B because of the demo's long absolute paths.

## Tests

- `test/unit/app/jobs/test_tes_runner.py`, 8 tests. They cover the URL, the input listing, the wrapper run for real by `/bin/sh`, the task document and the polling state machine.
- `test/integration/test_job_files.py`, 2 new PUT tests. The file's 7 tests pass against a real test server.
- The 46 polling tests still pass. ruff and black are clean, and mypy reports nothing in the changed files.
- Run with `.venv/bin/python -m pytest -p no:postgresql …`. The venv lacks libpq, so pytest-postgresql fails to import otherwise.

## Problems hit

- **`from_work_dir` outputs came back empty** in the first Funnel run. Galaxy's copy is guarded by `-f <output>`, the output files weren't in the task, and fastp went `ok` with empty reports. The wrapper now precreates them, and a unit test runs a guarded copy.
- **The demo's tesp secret scan** failed on job keys in input and output URLs, which is design B's documented exposure. In native mode those two fields are reported and not failed.
- **A cosmetic bug in the demo's TES task conversion**: it dropped `inputs` and `outputs`. Fixed.

## Open questions and follow-ups

- Is design B worth pursuing upstream? That is the decision for John. Stage 6 added signed URLs, DIRECTORY outputs on Funnel and TESK, the cancel no-op and tests for cancel and recovery. Its phase 2 ran all of that live on TESK, Funnel and tesp-api. Still needed: the `dev` port and the polling branch's unreachable and `QUEUED` timeouts. The gap table is in the evidence README.
- The v26.1.2 job files bug (a missing input returns 200 with an empty body) is still present. It is worth a backport whatever the design.
- Not exercised live: recovery after a Galaxy restart (unit-tested only), and the `tes-restart` and `unreachable` acceptance scenarios, which skip in native mode.

## Stage 6 hardening (H4, 2026-11-15)

Three commits on `f33e416aa22`, pushed to `jmchilton`; the head is `5e889591314`. Stage 6 adds +721/−67 over 6 files.

- **Base.** The branch stays on `tes_task_polling_v26.1.2` `a1b53d59234`. That branch has since gained another agent's commits (fork head `031b96fe16a`); this branch was deliberately not rebased onto them.
- **Project.** Also part of the [WES on tesp-api project](../../../../../projects/wes_tesp_api/index.md).
- **Evidence.** Test output before and after each change is in `runs/stage6/h4-design-b/` in the demo repository.

### `4c7750ea1e0` Signed per-file URLs instead of the job key

**The token.** A new module, `lib/galaxy/security/job_files_tokens.py`.

- Format: `<expires>.<signature>`, 54 bytes. Example: `1763805600.` followed by 43 base64url characters.
- Signature: HMAC-SHA256 over the job id, the scope, the expiry and the exact `path` string.
- Key: `HMAC-SHA256(id_secret, "galaxy job files token v1")`. So tokens survive restarts and are valid only on the Galaxy that issued them.
- Scopes: `r` (GET, HEAD), `w` (POST, PUT) and `d` (PUT below a directory; added in the next commit).
- Why new code: Galaxy had no signed-URL helper to reuse. `IdEncodingHelper` is Blowfish id encryption. The async controller's `hmac_new` is HMAC-SHA1 with no expiry. The module therefore uses stdlib `hmac` and `hashlib` with `id_secret`, and compares with `hmac.compare_digest` on bytes.

**The API.**

- The job files GET, multipart POST and raw PUT accept `job_token=` as an alternative to `job_key=`.
- The job state and write-location checks still apply, so a token stops working when the job ends.
- `job_key` keeps working, for Pulsar.

**The runner.**

- Every input URL is signed `r` and every output URL `w`.
- Tokens are valid for the runner parameter `job_files_token_ttl`: default 7 days, and only a cap, since the job's end revokes them.
- `job_key` no longer appears anywhere in the task.
- A token that leaks into executor stderr is caught by `redact()`'s existing `token=` pattern.

**Tests.**

- `test/unit/data/security/test_job_files_tokens.py`, 18 tests: round trip; binding to the path, scope, job and secret; expiry; a tampered expiry; malformed and non-ASCII tokens.
- Runner unit tests for the URLs.
- Integration test `test_signed_per_file_tokens`:
  - a token reads or writes only its own file, with PUT and with POST;
  - expired and garbage tokens get 403;
  - a valid token doesn't widen the write locations;
  - tokens get 403 after the job ends.
- Before the change, the tests failed: first an import error, then, once the module existed, 400 "requires a valid 'job_key'".

**Limits.**

- A token is a bearer credential for its one file until the job ends. Anyone who can read the task can use it.
- A resubmission of the same job id reuses still-valid tokens.
- Tokens aren't tied to the TES task. The task id isn't known before `create_task`.

### `a1073074052` DIRECTORY outputs for discovered outputs and `extra_files`

A nested research agent read the TES spec and each backend's code. Its verdict and evidence:

- **TES spec.**
  - 1.0 doesn't say how a DIRECTORY URL maps to its contents. Its only hint, for `TaskLog.outputs`, is "Directory outputs are flattened into separate items".
  - 1.1 adds `path_prefix`: "output URLs are constructed by appending pruned paths to the directory specified in `tesOutput.url`".
  - Neither version says anything about the HTTP method, query strings, empty directories or symlinks.
- **Funnel v0.12.3 (`738ab75a`): yes.**
  - One raw PUT per file to `<URL path>/<relative path>?<query>`. Each segment is escaped, and the query string is kept byte for byte (`internal/storage/url.go`, `Join` in `http.go`, tests in `http_test.go`). Stage 4's live log shows the same URL shape.
  - Funnel creates the directory before the run. An empty directory only logs a warning.
  - A symlink that leaves the workspace, or dangles, fails that output, and the task ends `SYSTEM_ERROR` (`internal/worker/output_snapshot.go`, `worker.go`).
- **TESK filer (tesk-core v0.11.0 `2a4f0ba`): yes.**
  - One raw PUT per file to `<URL path>/<quoted name>?<query>`, query kept (`http_join` and `upload_dir` in `filer.py`).
  - Any symlink below the directory refuses the whole output, and the task ends `SYSTEM_ERROR` (`output_has_symlink` in `transput.py`).
  - Each DIRECTORY output is its own PVC subPath mount (`generate_mounts` in `taskmaster.py`).
- **tesp-api `4bc9b5d`: only partly.**
  - It sends one multipart POST per file to the *same* URL. The relative path is only in the multipart filename (`tesp_api/utils/container.py`).
  - Galaxy's POST ignores filenames. Whether v26.1.2's multipart parser keeps `/` in a filename is unverified.
  - Missing paths and symlinks are skipped.

**What was built, for Funnel and TESK.**

- A route, `PUT /api/jobs/{job_id}/files/{rel_path:path}?path=<dir>&job_token=...`.
  - It takes `job_key`, or a `d`-scope token for the directory. A file write token can't be used as a prefix.
  - The target must stay strictly inside the directory: `..`, absolute paths and the directory itself are rejected.
  - The usual write-location check applies to the target.
- A destination parameter, `tes_directory_outputs: true`.
  - The runner then declares two kinds of DIRECTORY output: `<job dir>/working` (discovered outputs, `galaxy.json`) and each output's `false_extra_files_path`.
  - The wrapper creates them before the job script and deletes the symlinks in them afterwards.
- Tests:
  - Unit tests for the directory list, the task document and the wrapper. The wrapper runs for real under `/bin/sh`, with a symlink and a dangling link that must be removed.
  - Integration test `test_directory_put`: Funnel-style and TESK-style escaping; an extra files directory written with the job key; wrong-scope and wrong-directory tokens; `..%2F` escapes; a valid token for a directory outside the job; the job ending.
- Size: +241/−29 over 6 files, about half of it tests (`git show --stat a1073074052`). The signed-URL commit is +376/−41, the cancel commit +112/−5.

**Not done, and costs.**

- **tesp-api directory outputs.** These would need a POST variant that joins the multipart filename onto `path`, plus a check of the legacy parser. `tes_directory_outputs` stays off on `native_tesp`. So discovered outputs still don't work there: the hyphy workflow, and `gap_discover`'s `extra/` and `pieces/`.
- **All of `working/` is uploaded**, intermediate files included.
- **Empty directories never arrive**, on any backend.

### `5e889591314` Cancel of an ended task; cancel and recovery tests

- **Cancel.** When the cancel fails, `stop_job` reads the task state, as the Pulsar TES runner does.
  - An ended or `CANCELING` task is logged as "nothing to cancel". TESK answers 400 to cancelling an ended task.
  - Any other state is logged as an error saying the task may still be running.
- **Tests.** Seven new unit tests: cancel; cancel of an ended task; a failed cancel of a running task; no task id; `recover()` for a queued job and for a running job; `recover()` without a task id. The runner now has 19 unit tests.
- **Recovery.** It was already correct, and the tests now show it. After a restart, the existing task is polled again, not resubmitted. The job finishes from the uploaded `galaxy_<id>.ec`, `.o` and `.e` at their default paths.
- **Known gap, not fixed.** If Galaxy dies between `create_task` and `set_external_id`, the handler requeues the job, because it has no external id. The first task is left behind as an orphan.

### Demo (`~/projects/repositories/galaxy-wes-tes` `2ca77c0`)

- `make up TES=tesk TES_MODE=native` is accepted. It uses environment `native_tesk`: no auth, `disk_gb: 2`, `tes_directory_outputs`. In native mode the staging image is not loaded.
- `TES_NATIVE_DIRECTORY_OUTPUTS` defaults to `true` for Funnel and TESK. On tesp-api it is always false.
- `gap_badimage` goes to `<default env>_badimage`. That environment's image, `quay.io/biocontainers/wes-tes-does-not-exist:0.0--0`, doesn't exist.
- The tesp secret scan no longer excuses `job_key` in native task URLs.
- Checked statically only, not yet run:
  - `bash -n`;
  - shellcheck 0.11.0, with no findings on changed lines;
  - the job conf rendered for all three backends and parsed with `yaml.safe_load`.

### Phase 2: live runs (2026-11-15, 04:00–05:00 UTC)

Galaxy `5e889591314` throughout. Phase 2 found no Galaxy bug, so the branch is unchanged. The evidence is in the demo repository at `313dc19`, under `runs/acceptance/<stamp>-<backend>-native/` and `runs/stage6/h4-design-b/phase2/`. Every saved file was secret-scanned for job keys, job tokens and `.env.local` values.

**TESK** (kind, TESK 1.2.0 with tesk-core 0.11.0 filer; `make up TES=tesk TES_MODE=native` took 2 min 34 s):

- `make run` IWC QC: PASS (run `9b6b24062dbce8c1`).
  - fastp went from queued to ok in 87 s and MultiQC in 89 s, against 13–18 s on Funnel. TESK starts separate filer pods for inputs and outputs. The first submit took 42 s on a cold tesk-api.
  - The stored task has `job_key` 0 times and `job_token=` 23 times, with 5 DIRECTORY outputs.
  - 40 directory PUTs reached `/files/<rel>`, all 200.
- `make acceptance` (`20261115T041415Z-tesk-native`):
  - iwc-qc PASS.
  - iwc-hyphy PASS: 12 jobs, and the discovered collection came through DIRECTORY outputs.
  - dies-early PASS: Galaxy `error` 1.1 s after TESK's `EXECUTOR_ERROR`, which TESK reached about 240 s after the pod went into ErrImagePull.
  - leftovers PASS.
  - cancel FAILed on "no PVC of the task afterwards" (see the fix below). The rerun (`20261115T043156Z-tesk-native`) PASSed: WES CANCELED 1.2 s after the cancel, Galaxy `deleted`, TES CANCELED, no running pod.
- `gap_discover` through WES: `extra_1` was discovered next to the report, and the `pieces` list had 3 elements.

**Funnel 0.12.3** (`20261115T043559Z-funnel-native`):

- All five scenarios PASS:
  - iwc-qc and iwc-hyphy (12 jobs);
  - cancel: WES CANCELED in 1.3 s, containers removed 4.7 s after the cancel;
  - dies-early: Galaxy `error` 1.1 s after `EXECUTOR_ERROR`;
  - leftovers.
- The 16 stored tasks of the run have `job_key` 0 times and `job_token=` 324 times in their URLs (`phase2/funnel-task-url-scan.txt`). Funnel's 6 stage 5 tasks, still in its database, carry 378 job keys.

**tesp-api** (`TESP_REF=patched`; `20261115T044628Z-tesp-native`, rerun `20261115T045338Z-tesp-native`):

- iwc-qc PASS. The tesp-api secret scan, now strict (job keys in URLs no longer excused), found 0 job keys in the stored FULL tasks.
- iwc-hyphy FAIL, as expected: tesp-api has no directory outputs, so 4 of the 12 jobs ran.
- cancel and dies-early first FAILed on a harness bug (below). On rerun both PASSed:
  - cancel: WES CANCELED in 1.1 s, containers removed 1.1 s after the cancel;
  - dies-early: Galaxy `error` right after `EXECUTOR_ERROR` (exit 125, docker "failed to resolve reference" in the stderr).
- leftovers PASS.

**Bugs found and fixed, all in the demo harness, none in Galaxy:**

- `4a32962`: the TESK PVC check.
  - TESK deletes a task's PVC when the task ends. The claim then stays `Terminating` (`kubernetes.io/pvc-protection`) while the task's finished filer and executor pods exist, which is until TESK's `taskTtlSeconds` (86400) removes their Jobs.
  - Deleting those Jobs by hand made the claim disappear at once.
  - `tes_task.tesk_pvcs` now ignores claims that are already being deleted. Design A never hit this, because its tasks have no TES inputs or outputs and so no PVC.
  - Consequence: on TESK, a design B task holds its storage for a day unless `taskTtlSeconds` is lowered.
- `4a32962`: the dies-early watch is 480 s on TESK, which fails a missing image only after 240 s.
- `313dc19`: `run_checks.task_ids_from` now also takes `tes_native` jobs. Before, native tesp cancel saw TES state None, and dies-early had no `tesp-checks.txt`.
- `313dc19`: `gap_evidence.redact` now removes `job_token=` values.
  - Funnel's system log errors for the dies-early task carried output URLs. The task's executor never ran, so Funnel's stage-out of the missing outputs failed.
  - The one saved file that had tokens was redacted.

**Exposure that remains:** Funnel writes the task URLs into its system logs: 683 `job_token=` values over the 16 tasks. Each value opens one file, in one direction, until its job ends. That is the intended trade-off against the old job key in every URL.

### Decided not worth doing in this prototype

- **Directory outputs on tesp-api** (see above).
- **Tying tokens to the TES task.** The task id isn't known before `create_task`.
- **A submission nonce** to close the orphan-task window.
- **The `dev` port.** It remains the first step if John wants design B.
