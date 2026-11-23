# Research follow-up from PR #24835 (learning_galaxy)

Reviewed commit: `f207f12dd5e528573a50cabca345d31fac34f76e` (base `release_26.0`).

## Stale research (conflicts with the baseline, independent of this PR)

### `vault/research/Component - Job Completion Lifecycle.md`

The note is verified against `dev` @ `65e6daff233`. Since then, [#24783](https://github.com/galaxyproject/galaxy/pull/24783) (`a4aedbe1759`, "Bump output collection update_time in the commit that finishes the job") changed the commit layout on both `dev` and `release_26.0`:

1. **Contract paragraph and walkthrough steps 12/14.** The note says `finish()` bumps the collections' and invocation steps' `update_time` together in a second transaction (`touch_dependent_update_times`). Now `job.touch_collections_update_time()` runs *before* `set_state` in the main commit. Only `job.touch_invocation_steps_update_time()` runs in the second, best-effort transaction.
2. **Transaction ownership table.** The `touch_dependent_update_times` row should name `touch_invocation_steps_update_time` only. The collection bump belongs in the main-commit row.
3. **Observers table, history panel row.** "HDCA and collection `update_time` from the second commit" is now the main commit.
4. **`set_final_state` section.** `touch_dependent_update_times()` is now split into `touch_collections_update_time()` and `touch_invocation_steps_update_time()`. The `finish()` row in the callers table should describe the split.

### `vault/research/Component - Post Job Actions.md`

5. **EmailAction "Content: ... workflow invocation link (if applicable)".** At baseline the link came from `job.workflow_invocation_step`, which is always `None` for mapped-over jobs. Those emails never had the link, even inside a workflow.
6. **"Job Success Path" / "Deferred (completion) ... All non-immediate actions follow this path".** It implies `finish()` is the only place completion PJAs run. At baseline the job-cache copy branch in `MinimalJobWrapper` and the handler's skipped-job branch (`jobs/handler.py` `__monitor_step`) also run all non-immediate PJAs.

## Post-merge activities (once #24835 merges and reaches `dev`)

The research notes describe `dev`, so make these edits after the `release_26.0` → `dev` forward merge.

### `Component - Post Job Actions.md`

- **Action Registration Categories:** add `after_commit_actions` (`EmailAction`) and `deferred_actions` (`immediate_actions + after_commit_actions`). Completion loops now skip `deferred_actions`, not just `immediate_actions`.
- **Execution Timeline / Dual Execution Paths:** describe three phases (immediate, in-transaction completion, after-commit). Add the API: `ActionBox.has_after_commit_actions`, `ActionBox.execute_after_commit` (one job per ICJ per batch, failures logged), `MinimalJobWrapper.queue_after_commit_actions` / `run_after_commit_actions`.
- **EmailAction section:** now runs after the settling commit. It also runs on pause (quota, walltime, failed input), and a standalone paused job suppresses the send. Mapped-over jobs send one summary per ICJ once every job is settled, with per-state counts and output collection names. Cancelling suppresses it. A resumed map-over can send again, and a race can rarely send twice. Map-over emails now include the invocation report link (`effective_workflow_invocation_step`).
- **Job Failure Path / Error Resilience:** `fail()` runs `EmailAction` through `run_after_commit_actions()` after its commit, not inline.
- **Async Challenges:** note that `DeleteIntermediatesAction` still reads sibling state in-transaction. The after-commit phase is the pattern that avoids the race.

### `Component - Job Completion Lifecycle.md`

- **Walkthrough step 7:** the PJAs that run are the ones not in `deferred_actions`, followed by `queue_after_commit_actions(job)`. Add a step right after the main commit: `run_after_commit_actions()`.
- **Failure boundaries / `fail()`:** queue before the error commit, run after it. A job queued by both `finish()` and `fail()` is deduped.
- **Observers table:** add `EmailAction` on sibling map-over jobs. It reads the committed states of ICJ siblings and depends on the main commit. Contrast it with `DeleteIntermediatesAction`'s in-transaction blind spot.
- **Terminal state persistence:** document `Job.settled_states` (ok, error, deleted, skipped, paused, stopped) next to `terminal_states` and `finished_states`, and note that `Job.is_terminal` means *settled*, not `terminal_states`.
- **Other settle paths:** `pause()` (now returns whether it paused), the job cache copy, handler skip/walltime/invalid-input pauses, and the Celery `setup_fetch_data` quota pause all run after-commit actions.

### `Component - Collection Models.md`

- **§9.1 ImplicitCollectionJobs, Key Properties:** add `has_job_not_in_states(states)` (`EXISTS`) and `job_state_counts()` (`GROUP BY state`). Cross-reference `HDCA.job_state_summary`, which computes similar counts by joining through the HDCA.

### Testing helpers (wherever email testing is documented, if anywhere)

- `smtp_server: mock_emails_to_path://<dir>` now writes one JSON file per email when `<dir>` is a directory. `galaxy.util.unittest_utils.read_mock_emails(dir)` returns them oldest first.
