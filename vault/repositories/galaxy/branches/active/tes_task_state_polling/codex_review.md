Run via gpt-6.1-sol (Codex CLI 0.169.0; it reported reasoning effort `none`).

# Codex review

Codex raised one finding, and I confirmed and fixed it in `818dfbff276`, which the baseline refactor later replayed as `2402c691a80`. In this file, `cc17a5b47c1` is now `82daaf71827`. It was the debrief's own open question "Status before the first check", which Codex showed was reachable.

Not acted on: nothing. Codex found no duplicated logic or missing abstraction.

Codex's sandbox couldn't run local commands, so it read the code from GitHub snapshots, plus Pulsar 0.16.0's TES modules. It reviewed `origin/release_26.2...af12aa04327`, before the test challenge commits. The fix was applied on top of the test challenge's `cc17a5b47c1`, which had moved the "Pulsar reported" record from a set onto `TesTaskWatch.pulsar_reported` but kept the same gap.

## Fix

- The runner now records a final status that Pulsar reports before the monitor's first check (a short task, or a status just after recovery). Previously that status was dropped. If finishing the job then took longer than interval plus grace (worker queue backed up, slow output download), the check found the task `COMPLETE` and "unreported" and failed a job that Pulsar had finished.
- `_update_job_state_for_status` now creates the watch itself, when polling is on and the job is still this handler's queued or running job for that task (`_runs_task_here`, split out of `_waits_for_pulsar`). Both threads get the watch through `_watch()`, which uses `dict.setdefault`, so neither thread replaces a watch the other just added. Only the monitor thread removes watches.
- The `_runs_task_here` guard keeps late messages from creating watches nobody removes. Examples are a `cancelled` status for a stopped job, or the old task of a resubmitted job. This guard has no test, because a test would have to assert on private runner state, which the test challenge removed on purpose.
- Test: `test_final_status_from_pulsar_outlasting_the_grace_period_keeps_the_job` is now parametrized over `after_a_check` and `before_the_first_check`. The new case fails on `cc17a5b47c1` and passes after the fix. The file has 32 tests, all passing. Together with `test_pulsar_runner.py` and `test_runner_pulsar.py`, 83 pass. black, isort and ruff are clean. mypy from `lib/` reports only the pre-existing `galaxy/managers/notification.py` error.

<details>
<summary>Codex output</summary>

```json
{
  "coverage": {
    "files_reviewed": [
      "lib/galaxy/jobs/runners/pulsar.py",
      "lib/galaxy/jobs/runners/util/tes_task.py",
      "lib/galaxy/jobs/runners/__init__.py",
      "lib/galaxy/config/sample/job_conf.sample.yml",
      "lib/galaxy/dependencies/__init__.py",
      "test/unit/app/jobs/test_pulsar_tes_task_checks.py"
    ],
    "notes": "Reviewed GitHub snapshots and the release_26.2 comparison. Local commands failed during sandbox initialization, so the local origin ref could not be verified and tests could not run. Also read the pinned Pulsar 0.16.0 TES configuration and utility modules."
  },
  "findings": [
    {
      "severity": "P2",
      "category": "concurrency",
      "file": "lib/galaxy/jobs/runners/pulsar.py",
      "line": 1460,
      "title": "Remember final statuses received before the first monitor check",
      "detail": "The final status is recorded only if the task already has a watch. A completion callback can arrive before check_watched_item creates that watch. The superclass queues finish_job, which can leave the job queued or running while awaiting a worker or downloading outputs. Subsequent TES checks then treat the task as unreported and fail it after the grace period.",
      "failure_scenario": "A short task reports complete before its first monitor iteration. Galaxy's finish workers are busy for more than 180 seconds with the default settings. The callback does not populate _tes_tasks_reported; polling sees COMPLETE and calls fail_job with 'Pulsar never reported a final job status', despite having received completion and queued finish_job.",
      "confidence": "certain"
    }
  ]
}
```

Triage: CONFIRMED at `lib/galaxy/jobs/runners/pulsar.py` (`af12aa04327`, `_update_job_state_for_status` gated on `job_state.job_id in self._tes_task_watches`; the watch was created only in `check_watched_item`).

</details>
