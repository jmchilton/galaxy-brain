# Job ports and OIDC-token callbacks hand-copy the job_key check and drift from JobFilesManager

- Area: lib/galaxy/job_execution/ports/view.py, lib/galaxy/webapps/galaxy/api/job_tokens.py
- Found while: [[Component - Pulsar Input Staging]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

#23933 moved the job files API's `job_key` check into `JobFilesManager._authorize` (`managers/job_files.py:111-129`). The two other runner callbacks still keep their own copies:

- `JobPortsView.__authorize_job_access` (`job_execution/ports/view.py:27-43`) is commented "Copy/paste from JobFilesView - TODO: de-duplicate", but `JobFilesView` no longer exists. It looks the job up with the legacy `sa_session.query(model.Job).get(job_id)` and then reads `job.running` with no `None` check, so an unknown (decodable) job id gives a 500 instead of a 404. It accepts only `running` jobs. The job files API accepts all of `Job.non_ready_states`, and so does the token endpoint. A remote container that calls back before Galaxy has seen the `running` status update is rejected.
- `FastAPIJobTokens.__authorize_job_access` (`webapps/galaxy/api/job_tokens.py:54-70`) reads `job.destination_params` before any `None` check, so an unknown job also gives a 500. It also fetches the job twice.

## Evidence / repro

- Read in code. No tests cover `/api/jobs/{id}/ports` or `/api/jobs/{id}/oidc-tokens` for an unknown job or a non-running state.

## Suggested fix

Route both through a shared helper (e.g. a `JobFilesManager`-style `authorize_runner_callback(job_id, key, kind)`) that returns 404 for an unknown job and uses one definition of active. #22781 (open) moves in this direction with `job_execution/job_security.py`. If it lands, check that it covers these two routes.
