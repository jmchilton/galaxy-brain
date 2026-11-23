# One mechanism for post job actions that run after the settling commit

#24835 (26.0) added `ActionBox.after_commit_actions` (`EmailAction`), which must run after the commit that settles a job. Each settling site wires it by hand. That's fine for a release branch; on `dev` it should become one mechanism.

## Problems

- Queue/run pairs at `MinimalJobWrapper.prepare` (job cache copy), `finish`, `fail`, `pause`, `_pause_job_if_over_quota`/`enqueue`, `celery/tasks.py::setup_fetch_data` and `JobHandlerQueue.__handle_waiting_jobs`. The handler keeps its own `settled_jobs` list, checks `ActionBox.has_after_commit_actions` at three sites and threads a `paused_jobs` out-param through `__filter_jobs_with_invalid_input_states`. `pause()` queues on the wrapper and also returns a bool, so the handler queues the job again on its own list and drops the wrapper's queue. Any new settling path that forgets either half silently loses the email.
- The "run every PJA not in `deferred_actions`" loop is copied in `prepare`, `finish` and the handler.
- `ImplicitCollectionJobs.job_state_counts` is a fourth copy of the per-ICJ state count, next to `HistoryDatasetCollectionAssociation.job_state_summary` and the ICJ branches of `managers/jobs.py::fetch_job_states` and `summarize_jobs_to_dict`.
- The settled check runs once per finishing job and scans the settled prefix, so total work grows with the square of the map-over size. Its plan is also not pinned to the ICJ side.
- `EmailAction` sends SMTP inline, including from the handler's monitor loop for paused map-overs, and `send_mail` sets no SMTP timeout.
- `Job.terminal_states`, `Job.settled_states` and `Job.is_terminal` (which checks `settled_states`) use overlapping names.

## Plan

1. Add one small collector (or `ActionBox.settle(app, sa_session, job, final_job_state=None)`) that runs the non-deferred PJAs and records after-commit work. Either register a single SQLAlchemy `after_commit` listener on the Galaxy scoped session that drains it, or have `MinimalJobWrapper` and `JobHandlerQueue` share the collector. Drop the explicit `run_after_commit_actions` calls, the handler's `settled_jobs`/`paused_jobs` plumbing and `pause()`'s return value.
2. Replace the three copied PJA loops with that helper.
3. Add the pending-jobs counter on `ImplicitCollectionJobs` that #24835 lists as a follow-up (migration), so the settled check is constant-cost and the summary is sent exactly once. Until then, pin the check to the ICJ side (`Job.id = ANY(ARRAY(SELECT job_id FROM icjja WHERE icj_id = …))`) and confirm with `EXPLAIN (ANALYZE, BUFFERS)` on a production-sized database.
4. Move the per-ICJ grouped count into one model-level helper taking ids. Use it from `fetch_job_states`, `summarize_jobs_to_dict`, `job_state_summary` and `EmailAction`.
5. Send the summary from a Celery task (deduplicated per ICJ) rather than inline in runner threads and the handler loop.
6. Rename `Job.is_terminal` to `is_settled` (keep an alias) and document `terminal_states` vs `settled_states`.

## Tests

`test/unit/job_execution/test_email_action.py`, `test/unit/app/jobs/test_job_wrapper_finish.py` and `test/integration/test_job_completion_emails.py` should pass unchanged. Add a unit test that a commit with no settled jobs runs nothing and that a rollback discards queued jobs, plus integration coverage for the walltime and over-quota pause paths.
