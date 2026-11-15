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

- Is design B worth pursuing upstream? That is the decision for John. A real version would need a port to `dev` (`JobFilesManager`), signed URLs instead of the job key in URLs, and DIRECTORY outputs with a path-style PUT route for discovered outputs and `extra_files`. It would also need TESK runs, tests for cancel and recovery, and the polling branch's unreachable and `QUEUED` timeouts. The gap table is in the evidence README.
- The v26.1.2 job files bug (a missing input returns 200 with an empty body) is still present. It is worth a backport whatever the design.
- Not exercised live: cancel, recovery after a Galaxy restart, and TESK.
