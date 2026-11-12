# Initial review — PR #24835 (default profile)

- Profile: default (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5, effort: low (agent setting)
- Reviewed commit: `f207f12dd5e528573a50cabca345d31fac34f76e` (diff vs `origin/release_26.0`)
- Tests: not run locally (worktree has no `.venv`); review is by reading.

## Verdict

Solid, careful change. The core idea (move `EmailAction` out of the settling transaction, check the map-over after commit, dedupe per map-over within a batch) is sound, and the double-send race and the populated-state gap are honestly documented. Traced all settle paths: `finish()`, `fail()` (incl. dependents it pauses), cached-copy in `_prepare_job` and in the handler, `enqueue()`/celery over-quota pause, handler walltime pause and invalid-input pause. Each queues before and runs after its commit. `fail()` re-queue after a raising `finish()` dedupes via the identity map. No correctness blockers found. Findings are test-coverage and abstraction quality.

## P2

### P2 1 — Handler and cache settle paths have no test

Five of the new call sites have no coverage: the handler's copied-job path (`handler.py` ~L564), walltime pause (~L591), `__filter_jobs_with_invalid_input_states` pause (~L681), `MinimalJobWrapper._prepare_job` cached-copy path (`jobs/__init__.py` ~L1325), and `enqueue()`/`setup_fetch_data` over-quota pause. These are the paths most likely to regress silently (each needs a manual `has_after_commit_actions` / `run_after_commit_actions` pairing). The unit tests call `ActionBox.execute_after_commit` directly, and the wrapper test covers only `finish()` and `fail()`.

Fix: add one integration test to `test/integration/test_job_completion_emails.py` that reruns the map-over with `use_cached_job` and asserts exactly one summary. The existing cached-job populator helpers make this cheap. Ideally also add a map-over whose upstream element errored, so dependents pause and send a `(N paused)` summary.

## P3

### P3 1 — Two parallel after-commit queues; unify into one small collector

The wrapper keeps `_after_commit_jobs` with `queue_after_commit_actions`/`run_after_commit_actions`. The handler keeps its own local `settled_jobs`, with three hand-written `if ActionBox.has_after_commit_actions(job): settled_jobs.append(job)` sites. `pause()` now both queues on the wrapper *and* returns a bool, so the handler can queue the same job again on its own list. Whatever is left on the wrapper's queue is silently dropped when the handler discards the wrapper. It's harmless today but easy to get wrong: any new `pause()` caller that doesn't later call `run_after_commit_actions` loses the email.

Fix: a tiny collector, e.g. `AfterCommitActions` with `queue(job)` (doing the `has_after_commit_actions` check and dedupe) and `run(app, session)`, used by both `MinimalJobWrapper` and `JobHandlerQueue`. Let `pause()` accept or queue into the caller's collector instead of returning a bool for the caller to re-check. This leaves a reusable abstraction behind instead of a pattern copied by hand to seven sites.

### P3 2 — Map-over integration test doesn't check collection names

`test_map_over_sends_one_summary_email` checks only the prefix and `(3 ok)`. If `job.output_dataset_collection_instances` came back empty for real map-over jobs, the summary would list no collections and the test would still pass. The unit tests set that association by hand. Assert the output HDCA's name, read from the run response's `implicit_collections`, appears in the body.

### P3 3 — Existing map-over state counter not reused

`HistoryDatasetCollectionAssociation.job_state_summary` (`model/__init__.py` ~L7971) already counts jobs per state for an HDCA's implicit collection jobs. The new `ImplicitCollectionJobs.job_state_counts` is a second query that does the same thing. Keeping the cheap `has_job_not_in_states` EXISTS check for the early exit makes sense. The count after it could come from the existing summary (non-zero fields), or the two could share one statement builder. Optional.

### P3 4 — SMTP now runs synchronously in the handler monitor loop for paused map-overs

`ActionBox.execute_after_commit` in `JobHandlerQueue.__handle_waiting_jobs` sends mail inline. `send_mail` uses `smtplib.SMTP(...)` with no timeout. Before this PR, pausing never sent mail. Now walltime and invalid-input pauses can, and they block dispatch for all users while SMTP responds. The copied-job case already did this before the PR. The impact is bounded (one email per map-over per pass, only with email on). It's worth a note or a follow-up to send asynchronously (celery) or set a timeout. Optional on a release branch.

### P3 5 — Narrow typing on new helpers

`EmailAction._job_completed(job)`, `_map_over_completed(job, implicit_collection_jobs)`, `_send(app, job, completed)` and `ActionBox.execute_after_commit(cls, app, sa_session, jobs)` are untyped, though `Job` is already imported into `post.py`. Annotate them (`job: Job`, `implicit_collection_jobs: ImplicitCollectionJobs`, `jobs: Iterable[Job]`, `completed: str`). Also, `_job_completed`/`_map_over_completed` return a message, not a flag. A name like `_completion_message` would read better at the `if completed:` call site. Cheap nit.

## Notes (not findings)

- Re-reading `job.post_job_actions` in `execute_after_commit` lazy-loads them per job after commit, before the per-map-over dedupe. A `fail()` that pauses many dependents pays that per job. Moving the dedupe ahead of the action load would skip it, but this is minor.
- `Job.settled_states` is a tuple while sibling `terminal_states`/`finished_states` are lists. Harmless.
- The documented follow-ups (exact-once marker, populated-state race with cached/skipped jobs, partial cancel) are reasonable to defer to `dev`.
