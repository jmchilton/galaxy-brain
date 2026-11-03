# Implementation debrief — `issue_24545_oom_kill_detection`

Run via claude-opus-5-5. Base `origin/dev` `5ab3087a566`; head `8d8773f4ef0`.

## Root cause (verified)

galaxy#24545's job records (richard-burhans/technical-notes `busybox-sort/measurements/galaxy_runs.jsonl`) show an exit-0 job whose tool streams were empty and whose **job** stderr carried `slurmstepd: error: Detected 1 oom-kill event(s) in StepId=… .batch`. Nothing in Galaxy reads job stderr for OOM text on a successful job:

- `check_output` (tool_util) sees only tool streams; `JobWrapper.check_tool_output` received `job_stderr` but only stored it.
- `slurm.py` scans stderr only for `CANCELLED` and only matches `Exceeded job memory limit`.
- `PulsarJobRunner` finished via `JobWrapper.finish` directly, so even a detected OOM (e.g. a tool `fatal_oom`) never reached the resubmission handlers.

The reporter's jobs ran through Pulsar; Pulsar returns the DRM stderr as `job_stderr` (unshrunk), so a Galaxy-side check covers both runner families with no wire change and works against old Pulsar servers.

## What changed (6 commits)

1. `oom_kill_job_messages()` in `galaxy.tool_util.output_checker`, called from `JobWrapper.check_tool_output` — the only place both the generic runner path and Pulsar pass `job_stderr`. Definite-kill wording only (`Detected N oom-kill event(s)`, exact `Exceeded job memory limit`, the probe line below). Emits `RegexJobMessage(stream="job_stderr", error_level=FATAL_OOM)` — no API schema change. OOM overrides a generic tool error so `memory_limit_reached` can fire.
2. `slurm.py` CANCELLED post-mortem reuses the shared patterns (now `check_memory_limit()` module function); "at some point" warnings stay a slurm-only probable tier. First unit tests for slurm.py.
3. `_handle_detected_failure()` factored out of `_finish_or_resubmit_job`; Pulsar's staged-finish path (incl. FINISHING recovery) now runs it before `finish`, passing `check_output_detected_state`.
4. `check_cgroup_oom_kills` destination param → job script slots `$oom_kill_setup_statement`/`$oom_kill_report_statement` from `CGROUP_OOM_KILLS_STATEMENT.sh`; baseline/after delta of the shell's cgroup `oom_kill` (v2 `memory.events`, v1 `memory.oom_control`), prints a `galaxy: Detected N oom-kill event(s)…` line on job stderr — same detector, no new transport. Preserves `$?`. Sample job conf documented.
5. Integration tests: env `execute` writes the Slurm line to job stderr; exit-0 job must resubmit once (`resubmission_count` metric) on local and embedded Pulsar.
6. Typing fix (Pulsar streams normalized to `""` like the generic path).

## Tests

Red first for every behavior: detector unit tests, runner output-collection tests, slurm tests, Pulsar staged-finish tests, job-script probe tests (bash, sh; also passed under dash locally), local-runner param test, and both integration tests (red on an untouched `origin/dev` checkout with only the test file copied in — `StopIteration`, no resubmission; green on branch).

Ran: `test/unit/tool_util/test_output_checker.py`, `test/unit/app/jobs/{test_runner_output_collection,test_slurm_runner,test_pulsar_runner,test_runner_finishing_state,test_job_script_oom_kills,test_runner_local,test_job_configuration}.py`, the two new integration classes. job_script doctests pass.

## Checks outside the branch

- `test_runner_local.py::test_galaxy_lib_on_path` and `::test_timelimit_kills_job` fail identically on untouched `origin/dev` here (`sqlite3.OperationalError: no such table: job` in the mock app).
- mypy over changed modules: same 22 errors as base, none new.
- Local pre-commit `shell-lint` (sample config only, not CI) can't pass `DEFAULT_JOB_FILE_TEMPLATE.sh` (`$placeholder` lines); committed that change with `SKIP=shell-lint`. The new `CGROUP_OOM_KILLS_STATEMENT.sh` is shellcheck-clean.

## Known limits

- Docker containers run in the daemon's cgroup; the probe can't see their kills (documented).
- Probe is opt-in: in a shared cgroup (local runner under one systemd unit) another process's kill would be blamed on the job.
- Default-on job-stderr detection is a behavior change on dev; no opt-out param.

## Implementation snapshot

```
created …/differential-review/snapshots/20261103T132540Z-implementation-8d8773f4ef04.json
  implementation @ 8d8773f4ef04 vs origin/dev (merge-base 5ab3087a5662)
  first snapshot: 6 commits, 17 files, 36 hunks
```
