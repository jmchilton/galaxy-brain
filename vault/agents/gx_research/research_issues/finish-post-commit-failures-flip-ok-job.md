# Post-commit failures in `finish()` can still flip an `ok` job to `error`

- Area: lib/galaxy/jobs/__init__.py (MinimalJobWrapper.finish / fail), lib/galaxy/jobs/runners/__init__.py, lib/galaxy/jobs/runners/pulsar.py
- Found while: [[Component - Job Completion Lifecycle]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

PR #24465 made `finish()` commit outputs, metrics and the final job state together (`lib/galaxy/jobs/__init__.py:2555-2559`) and wrapped the two post-commit steps it identified in `try/except`: hash-task queueing (`:2562-2569`) and the `update_time` bumps (`:2577-2582`). The rest of the tail is still unguarded:

- `task_wrapper.delay()` (`:2585-2588`). `ExpressionTool.exec_after_process` returns a `set_metadata.si(...)` signature when a datatype change requires metadata regeneration and Celery is enabled (`lib/galaxy/tools/__init__.py:3474-3481`). It also sets the output's `_state` to `SETTING_METADATA`, which the main commit persists.
- `self._report_error()` (`:2583-2584`), which calls the default error-report plugin for every output.

An exception from either propagates out of `finish()`. Every runner caller wraps `finish()` and calls `job_wrapper.fail("Unable to finish job", exception=True)` on any exception (`lib/galaxy/jobs/runners/__init__.py:879-889`, `lib/galaxy/jobs/runners/pulsar.py:878-892`). `fail()` refreshes the job, and only skips the failure path for `DELETED` jobs (`lib/galaxy/jobs/__init__.py:1621`). It then sets every output to `ERROR` and calls `job.set_final_state(ERROR)` (`:1641-1666`). `Job.set_state` assigns finished states unconditionally (`lib/galaxy/model/__init__.py:2219-2239`), so a committed `ok` job becomes `error`.

Consequences:

- An expression-tool job whose output changes datatype fails after it was already visible as `ok` if the Celery broker is unavailable at `delay()` time. API clients and the workflow scheduler may already have acted on the `ok` state.
- An error-report plugin exception on an already-`error` job runs `fail()` a second time, which submits the error reports again.

## Evidence / repro

Code read only. Repro idea: extend `test/unit/app/jobs/test_job_wrapper_finish.py` with a tool whose `exec_after_process` returns an object whose `delay()` raises `ConnectionError`, then drive the runner's `_finish_or_resubmit_job` (or call `fail()` as the runner would) and assert the job stays `ok`.

## Suggested fix

Guard `task_wrapper.delay()` and `_report_error()` the same way as the hash queueing: log, and leave the committed result alone. If the metadata task can't be queued, set the affected output to `FAILED_METADATA` in a short transaction instead of failing the job. Alternatively, make `fail()` refuse to downgrade a job that is already in a terminal state other than through an explicit flag.

## Related

- [[Component - Post Job Actions]]
