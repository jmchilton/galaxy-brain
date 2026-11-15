# Implementation debrief: wes_run_state_executor_error_26_0

Stage 3 of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md). Demo bug 5 in `~/projects/repositories/galaxy-wes-tes/docs/troubleshooting.md`: the demo's IWC run went to COMPLETE with fastp in `error` (exit code 127) and MultiQC `paused`, so a WES client that trusts the state reports success.

One commit, `d83962aa811`, stacked on [`wes_api_fixes_26_0`](../wes_api_fixes_26_0/index.md) (`85f9b2b42be`). Pushed to `jmchilton`. Kept separate because it changes documented behavior.

## Change

`_invocation_wes_state` replaces the three `GALAXY_TO_WES_STATE.get(...)` calls (status, run summary, run log). A Galaxy `completed` invocation maps to EXECUTOR_ERROR when its `WorkflowInvocationCompletion.job_state_summary` counts any job in `error`, `failed` or `paused`; otherwise COMPLETE. Other states map as before. `list_runs` now `joinedload`s `WorkflowInvocation.completion` to avoid one query per run.

Why the completion record: the `WorkflowCompletionMonitor` writes it when it sets `completed`, and its summary already includes subworkflow jobs (`compute_recursive_job_state_summary`). No extra job queries per request. It is a snapshot: if a user later resumes a paused job and it succeeds, the run stays EXECUTOR_ERROR. Galaxy doesn't revisit `completed` either.

Why paused counts: Galaxy pauses a job when an input is in error (the usual case) or for quota or admin reasons. It won't run without user action, so the run's outputs were not produced. WES `PAUSED` is non-terminal, and a client would poll forever on a run Galaxy considers finished.

`deleted`, `stopped` and `skipped` jobs still give COMPLETE: skipped is normal conditional execution, and deleted or stopped jobs in a completed invocation come from user action.

The doc's "Why `completed` ⇒ `COMPLETE`, even when a job failed" section is replaced by one describing the new mapping.

## Why it needs a decision

`doc/source/dev/ga4gh_wes.md` on `release_26.0` says this is intentional: "a failed job does not make the run unsuccessful", because workflows can route mapped steps through a filter-failed collection operation so that some jobs may fail. With this branch those runs report EXECUTOR_ERROR when a job fails.

For it: the WES spec defines COMPLETE as "Executors have exited without error and output files have been successfully uploaded" and EXECUTOR_ERROR as an executor exiting non-zero. Non-Galaxy WES clients (the point of WES) don't know about filter-failed patterns, and tasks carry no job state, so a client can't tell a paused job from one that hasn't started.

Options:

1. Take it as is, on 26.0 as a spec-conformance fix or retargeted to `dev` as a behavior change.
2. Narrow it: count only `paused` jobs (a filter-failed workflow has errors but no paused jobs downstream), or report EXECUTOR_ERROR only when a workflow output dataset or collection is in `error` or `paused` (closest to "output files successfully uploaded"; more queries).
3. Drop it and keep the documented behavior.

Separately, Galaxy's `failed` (scheduling failure) maps to EXECUTOR_ERROR; WES `SYSTEM_ERROR` ("stopped due to a system error, but not from an Executor") arguably fits it better. Not changed.

## Tests and evidence

New test `test_wes_state_mapping_failed_job`: `job_properties` with `failbool: true` feeding `cat1`; waits for Galaxy `completed`, then expects EXECUTOR_ERROR from `/status`, the run log and `GET /runs`.

- Before (on `85f9b2b42be` plus the test): fail, `assert 'COMPLETE' == 'EXECUTOR_ERROR'`.
- After (`d83962aa811`): pass. `test_wes_state_mapping` (success path still COMPLETE) and `test_wes_list_runs` (query change) also pass.

Each test was run in its own pytest invocation, using the parent worktree's venv through a `.venv` symlink (untracked, not committed). `ruff`, `black`, `isort` and `flake8` are clean.
