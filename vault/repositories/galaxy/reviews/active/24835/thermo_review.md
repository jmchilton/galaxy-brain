# Thermo review — PR #24835

- Profile: thermo_review (`_shared/reviewers/thermo_review.md`)
- Model: Claude Opus 5.5, effort: low
- Reviewed commit: f207f12dd5e528573a50cabca345d31fac34f76e (base `release_26.0`)

Verdict: reasonable shape for a release-branch fix; the email rewrite in `post.py` splits cleanly into `_job_completed` / `_map_over_completed` / `_send`. Main maintainability cost is the hand-threaded "queue before commit, run after commit" protocol. Larger cleanup belongs on dev; see [thermo_followup_refactor_issue.md](thermo_followup_refactor_issue.md).

## P2 1 — After-commit action protocol is hand-threaded through six call sites (follow-up refactor)

`after_commit_actions` must be queued before and run after every commit that settles a job: `MinimalJobWrapper.finish`, `fail`, `pause`/`_pause_job_if_over_quota` (+ `enqueue`), the job-cache copy path in `prepare`, `celery/tasks.py::setup_fetch_data`, and `JobHandlerQueue.__monitor_step`. The handler doesn't reuse the wrapper's queue; it keeps its own `settled_jobs` list, repeats `ActionBox.has_after_commit_actions(job)` at three spots, and threads a new `paused_jobs` out-param through `__filter_jobs_with_invalid_input_states`. Every new settling path must remember both halves or the email is silently dropped (or, if only `run` is forgotten, the queue leaks onto the next commit of that wrapper). Also `deferred_actions` + `has_after_commit_actions` + the per-site `not in ActionBox.deferred_actions` loop is the same "run non-deferred PJAs" loop copied in three places (`prepare`, `finish`, handler).

Fine for 26.0 as-is. For dev, collapse into one mechanism (session `after_commit` hook or a single `ActionBox`-owned settle helper). Plan in [thermo_followup_refactor_issue.md](thermo_followup_refactor_issue.md).

## P3 1 — `settled_states` vs `terminal_states` / `is_terminal` naming

`Job.terminal_states` = OK/ERROR/DELETED, but `Job.is_terminal` now returns `state in settled_states` (adds SKIPPED/PAUSED/STOPPED). Introducing a third name makes the existing mismatch more visible rather than resolving it. Either name the property consistently (`is_settled`, keeping `is_terminal` as alias) or note in the `settled_states` comment that `is_terminal` uses it. Low cost; skip if keeping 26.0 diff minimal.

## P3 2 — `ImplicitCollectionJobs.job_state_counts` duplicates the ICJ state-count query in `managers/jobs.py::fetch_job_states`

`fetch_job_states` already does `ICJJA join Job group_by(icj_id, state) count()`. The new model method is the single-ICJ version. On dev, `fetch_job_states` could call a shared model-level (or classmethod, multi-id) helper so there's one query. Not worth churning on the release branch; fold into the follow-up.

## P3 3 — Test-only behavior added to production `send_mail`

`send_mail` with a `mock_emails_to_path://` directory now writes one tempfile per email. It's behind the mock scheme so harmless, but it's test scaffolding in `galaxy.util`. Acceptable; at least keep the comment that it's the mock path only (it is). Optional.

## Notes (not findings)

- Docstring on `_map_over_completed` openly accepts duplicate summaries under near-simultaneous commits; correctness is for the bug reviewer.
- `MAPPED_OVER_SETTLED_STATES` as a module constant in `post.py` is fine; could live beside `Job.settled_states` if reused.
