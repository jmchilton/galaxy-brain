# Component - Job Resubmission and Runner States

Document how Galaxy decides whether to resubmit a failed job and where it sends it.

Cover:

- **Runner states.** The `runner_states` Bunch in the util tree shared with Pulsar, and `galaxy.jobs.runners.runner_state_definitions` (`register_runner_state`, `RUNNER_STATE_DEFINITIONS`: `fail_message`, `resubmit_description`, `condition`), if galaxy#24804 has merged. Which runners set which states: CLI Slurm plugin, DRMAA `SlurmJobRunner`, Kubernetes, AWS, Pulsar (remote `runner_state` from `full_status`), and `_finish_or_resubmit_job` for tool-detected and OOM errors.
- **The handler.** `_handle_runner_state` and `build_state_handlers`, `state_handlers/resubmit.py`: the gate, `_ExpressionContext` variables (`attempt`, `seconds_running`, `seconds_since_queued`, `runner_state`, `any_failure`), `_safe_eval`, `delay`, `handler`, destination vs environment targets, `runner_state_handled`, `mark_as_resubmitted`, and `Job.resubmission_count`.
- **Configuration.** `resubmit` on destinations and environments in job conf (XML and YAML), any site-wide defaults, and how dynamic destinations and TPV interact. Explain why resubmit rules aren't persisted on the job and how `JobHandlerQueue.job_pair_for_id` restores them for persisted-destination wrappers.
- **Pulsar specifics.** Resubmitting to the same Pulsar server: `client.clean()` before setup, `resubmission_count`, and the compatibility matrix between server and `pulsar-galaxy-lib` versions.
- **Tests.** `test/integration/test_job_resubmission.py` and its job confs, `test/unit/app/jobs/test_resubmit.py`.

Leave out the general monitor, stop and recovery lifecycle (requested separately as `galaxy_job_runner_monitor_and_stop_lifecycle`) and output finishing (covered by [[Component - Job Completion Lifecycle]]).

## Why

galaxy#24804 replaces four hand-kept lists of failure reasons with a registry, adds conditions, changes `unknown_error` semantics, and makes Pulsar jobs resubmittable. No note covers resubmission. [[Component - Job Completion Lifecycle]] only mentions it in passing, and [[Component - Galaxy Pulsar Runner Code Sharing]] covers only the shared `runner_states` file.

## Requested by

- vault/repositories/galaxy/reviews/active/24804: needed the resubmit handler, condition variables and runner-state flow to explain the PR, and found no note.
