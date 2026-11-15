# Implementation debrief — `queued_manager_monitor_kwarg`

Run via claude-opus-5-5 (nested subagent of the ga4gh_wes_tes stage 5 agent), plan item P1 in `vault/projects/ga4gh_wes_tes/TESP_API_PLAN.md`. Base master `08dedcb9bc951a073e173ae6ddb0ef8e9ec9e275`; head `b476ccd3dfa8d8f13083cf0c094c4a2fa9fbb112`.

## Problem

`QueueManager` (`queued_python`) starts `num_concurrent_jobs` worker threads. Each takes a job off the queue and calls `Manager._run(job_id, command_line, montior=MonitorStyle.FOREGROUND)`, meaning "run the job and wait for it here". `_run` passed `montior=` on to `_start_monitor(*args, **kwd)`, which read `kwd.get("monitor", MonitorStyle.BACKGROUND)`. The misspelt key was ignored, every job got a background monitor thread, and the worker went straight back to the queue. So all queued jobs ran at once, whatever `num_concurrent_jobs` said (default 1).

`git log -S montior` finds the typo arriving in `8fd077b` ("Generalize orchestrated container scheduling", 2022-10-03), first released in 0.15.0. It is in 0.16.0 and was on master at `08dedcb`.

Effect seen in the demo: tesp-api's outer Pulsar is `queued_python` with `num_concurrent_jobs: 2`, and four `sleep 20` TES tasks ran all at once (stage 4, and again here).

## Fix

- `pulsar/managers/unqueued.py`, `pulsar/managers/queued.py`: rename the keyword to `monitor` in `_run` and its two call sites.
- `_start_monitor(self, *args, monitor: MonitorStyle = MonitorStyle.BACKGROUND)`: keyword-only instead of `**kwd`, so the same typo now raises `TypeError` and mypy reports it. The other caller (`CoexecutionManager.launch`) already passed `monitor=`.

No other `montior` spellings in the tree.

## Testing

New `test_num_concurrent_jobs_limits_running_jobs` in `test/manager_queued_test.py`: with `num_concurrent_jobs=1` (the test case's manager), launch two jobs that each record a start time, sleep 2 s, and record an end time; wait for both to complete; assert the intervals don't overlap. It needs no timing tolerance: before the fix both start together, after it the second starts after the first ends. About 4 s.

Before the fix (`.venv/bin` on `PATH`, `pytest test/manager_queued_test.py -v`):

```
FAILED test/manager_queued_test.py::PythonQueuedManagerTest::test_num_concurrent_jobs_limits_running_jobs
E       AssertionError: jobs overlapped with num_concurrent_jobs=1: [1794696919.652089, 1794696921.6523018] and [1794696919.678403, 1794696921.6785533]
=================== 1 failed, 2 passed, 2 warnings in 3.36s ====================
```

After: `3 passed, 1 warning in 4.58s`.

Also run after the fix:

- `make lint` (tox `ruff check .`): passes. `tox -e format` (isort): passes. `mypy` on the two modules: no issues.
- `pytest test/manager_*test*.py test/coexecution_manager_test.py -k "not kubernetes"`: 118 passed, 3 skipped.
- `pytest test/integration_test.py test/state_integration_test.py -k "not kubernetes"`: 43 passed, 22 skipped (66 s). These use `queued_python` managers through the client.

Dev environment: `uv venv .venv -p 3.12` plus `requirements.txt`, `dev-requirements.txt`, `-e .`, `tox`, `ruff`.

## Demo evidence

The demo builds tesp-api's outer Pulsar from a selectable source (`TESP_PULSAR_SOURCE` in `config/tesp/tesp.env`, demo commit `02d354a` in `~/projects/repositories/galaxy-wes-tes`). Probe `concurrency` (4 TES tasks of `sleep 20`, `num_concurrent_jobs: 2`, tesp-api fork `c3a9f237`):

| Outer Pulsar | Max concurrent containers |
| --- | --- |
| PyPI 0.16.0 | 4 |
| this branch, `b476ccd` | 2 |

Evidence and commands: `runs/tesp-stage5/pulsar-concurrency/README.md` in the demo repository.
