# Component - Galaxy Job Runner Monitor and Stop Lifecycle

Document how a Galaxy job runner watches, fails and stops jobs after submission, as the runner-side counterpart to [[Component - Job Completion Lifecycle]] (which starts once a runner decides the command has finished).

Cover:

- **Watching.** `AsynchronousJobRunner` (`lib/galaxy/jobs/runners/__init__.py`): the `poll` flag, the monitor thread, `watched` / `monitor_queue`, `check_watched_item` and what each return value means (the state to keep watching, `None` to drop it), `AsynchronousJobState`, the work queue and its worker threads, and who may call `mark_as_finished`, `fail_job` and `_finish_or_resubmit_job`.
- **Failing.** `fail_job` and its `stop_job` flag (defaults to true, so it calls `stop_job` and therefore the remote cancel before failing), `full_status["stderr"]`, runner state handlers and resubmission (`unknown_error`), and what `Job.info` (255 characters) holds.
- **Stopping.** `JobHandlerStopQueue` (`lib/galaxy/jobs/handler.py`): `DELETING` and `STOPPING` jobs, the one-transaction-per-step behaviour that rolls back and retries every second when a runner's `stop_job` raises, and each runner's contract for `stop_job` (raise, log, or ignore).
- **Recovery.** `recover()` at startup, `recovers_finishing_jobs`, how a job's `job_runner_external_id` and `handler` identify who owns it.
- **Pulsar runners.** `PulsarJobRunner` and its MQ, REST, coexecution and TES subclasses: which set `use_mq` and `poll`, how status messages reach `_update_job_state_for_status`, the final-status handling, `_kill_remote_job`, and the runner param spec mechanism (`PULSAR_PARAM_SPECS`, per-class `pulsar_param_specs`).
- **Tests.** The harnesses in `test/unit/app/jobs/` (`test_pulsar_runner.py`, `test_runner_pulsar.py`, `test_runner_finishing_state.py`, `test_pulsar_tes_task_checks.py` if merged) and how they build a runner from a mock app.

Leave out job preparation and submission, per-runner scheduling and cluster-specific state mapping other than Pulsar, and everything after the runner decides the job finished.

## Why

`tes_task_state_polling` adds a monitor-thread check, a `fail_job(stop_job=False)` path and a non-raising `stop_job` override to the Pulsar TES runner, and needed all of the above established from code. No note covers the runner side: [[Component - Job Completion Lifecycle]] explicitly excludes runner startup and submission, and [[Component - Galaxy Pulsar Runner Code Sharing]] is about code sharing, not lifecycle. Other open Pulsar runner branches (`pulsar_mq_status_poll`, `htcondor_pulsar`, `tes_task_state_polling_unreachable`) touch the same seams.

## Requested by

- vault/repositories/galaxy/branches/active/tes_task_state_polling/brain_research.md: needed the watch, fail and stop contract (including the stop queue's rollback loop) and found no note for it.
- vault/repositories/galaxy/branches/active/tes_native_staging/brain_research.md: the TES-native `TesJobRunner` is a non-Pulsar `AsynchronousJobRunner` subclass (own `check_watched_item`, `stop_job`, `recover`, `finish_job`); authoring and reviewing it needs the same contract, plus what a non-Pulsar runner must implement (`queue_job`, `build_command_line`, metadata handling at finish).
- vault/repositories/galaxy/reviews/active/24804: the Pulsar `failed` status now fetches `full_status()` and records a remote `runner_state`, MQ updates rely on `job_pair_for_id` restoring the destination's `resubmit` list, and `_complete_staged_job` offers tool-detected failures to resubmission. The note should cover these Pulsar fail paths.
