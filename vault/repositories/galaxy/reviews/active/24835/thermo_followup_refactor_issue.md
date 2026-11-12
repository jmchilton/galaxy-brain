# Follow-up: one mechanism for post-job actions that run after the settling commit

Context: #24835 (26.0) added `ActionBox.after_commit_actions` (EmailAction) that must run after the commit settling a job. It's wired by hand at each settling site.

## Problems
- Queue/run pairs at `MinimalJobWrapper.prepare` (job cache copy), `finish`, `fail`, `pause`, `_pause_job_if_over_quota`/`enqueue`, `celery/tasks.py::setup_fetch_data`, `JobHandlerQueue.__monitor_step` (own `settled_jobs` list + `paused_jobs` out-param on `__filter_jobs_with_invalid_input_states`).
- "Run every PJA not in `deferred_actions`" loop copied in `prepare`, `finish`, handler.
- `ImplicitCollectionJobs.job_state_counts` duplicates the grouped count in `managers/jobs.py::fetch_job_states`.
- `Job.terminal_states` vs `Job.settled_states` vs `Job.is_terminal` naming.

## Plan
1. Add `ActionBox.settle(app, sa_session, job, final_job_state=None)` that runs non-deferred PJAs and records after-commit work on the session (`sa_session.info["after_commit_jobs"]`).
2. Register one SQLAlchemy `after_commit` listener on the galaxy scoped session that drains that list via `ActionBox.execute_after_commit` (in a fresh transaction, then commit/rollback). Removes all explicit `run_after_commit_actions` calls and the handler's `settled_jobs`/`paused_jobs` plumbing.
3. Replace the three copied PJA loops with `ActionBox.settle`.
4. Move the ICJ grouped count into a model-level helper taking ids; use it from `fetch_job_states` and `EmailAction`.
5. Rename `Job.is_terminal` → `is_settled` (keep alias), document `terminal_states` vs `settled_states`.

Tests: existing `test/unit/job_execution/test_email_action.py`, `test/unit/app/jobs/test_job_wrapper_finish.py`, `test/integration/test_job_completion_emails.py` should pass unchanged; add a unit test that a commit with no settled jobs runs nothing and a rollback discards queued jobs.
