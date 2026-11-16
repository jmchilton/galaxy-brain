# Initial review: galaxyproject/galaxy#24804

- Profile: default (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `677cab47347c1b40acf2988bed2f8ae18507ca9e`
- Diff: `git diff origin/dev...HEAD` in `~/projects/worktrees/galaxy/pr/24804`

These were left alone because the PR description calls them out explicitly: `unknown_error` no longer matching node failure or preemption, the CLI memory message wording, mirroring the Slurm code with Pulsar, the `register_runner_state` API shape, and the native Slurm runner and TPV-over-MQ limits.

## Summary

The registry consolidation is a real improvement. The old `MESSAGES` dict, the allowlist in `failure()` and the hand-written context variables could drift apart, and the swallowed `KeyError` for `JOB_OUTPUT_NOT_RETURNED_FROM_CLUSTER` shows they already had. The Pulsar side is well isolated and the embedded-Pulsar integration test covers resubmitting to the same server. The main risk is in the Slurm CLI plugin: `squeue -t all`, the repaired sacct fallback and the new state mapping change how ordinary finished jobs are classified, and none of those plugin status paths has a test.

## Findings

### P2 1: Slurm CLI jobs whose batch script exits non-zero now skip `finish_job` and fail with a generic message

`lib/galaxy/jobs/runners/util/cli/job/slurm.py`, `parse_single_status` / `get_single_status`.

Before this PR, a finished job dropped out of the bulk `squeue` and the single-status check returned `job_states.OK` in every case. The old sacct branch computed `state` and then discarded it. So every finished CLI Slurm job went through `finish_job`, which reads the exit code file and applies the tool's `<stdio>` rules in `check_tool_output`.

The PR changes this in two ways:

- `get_single_status` now uses `squeue -t all`, which keeps listing `F` (FAILED) jobs for `MinJobAge`.
- The sacct branch now returns `_get_job_state(self._state_from_sacct(...))`.

Both map Slurm `FAILED` to `job_states.ERROR`. `check_watched_items` then calls `_handle_job_failure_reasons`, which finds no runner state for `FAILED`, and `mark_as_failed`. That path is `fail_job` → `job_wrapper.fail("Job failed")`: no `check_tool_output`, no tool stdout or stderr in the job, and no resubmission as `tool_detected`.

Slurm reports `FAILED` when the batch script exits non-zero. The command line ends with `sh -c "exit $return_code"` (`command_factory.YIELD_CAPTURED_CODE`), so the script exits with the tool's exit code unless `$instrument_post_commands` comes after it and exits 0. With the default `core` metrics plugin that masking happens. On sites without a post-instrumenting metrics plugin, or with a custom job template, these tools would now fail:

- tools that declare a non-zero exit code as a warning or as acceptable;
- legacy profile tools that ignore exit codes.

They would also lose the stdout and stderr the user saw before. An ordinary tool error would show "Job failed" instead of the tool's stderr.

Fix: treat Slurm `F` as "finished, let `finish_job` decide". For example, map it to `OK` in `_get_job_state` for the single-status and sacct paths and let the exit code file drive the outcome. Alternatively, return ERROR for `F` only when `scontrol` shows a signal reason (the `RaisedSignal` case this PR already parses). Add unit tests for `parse_single_status` covering the squeue `-t all` output, the sacct fallback and `parse_status`. None of these Slurm plugin status changes is tested now; `test_cli_failure_reasons.py` covers only `parse_failure_reason`/`parse_failure_message`.

### P3 1: `_get_job_state` silently returns `None` for squeue codes it doesn't know

`Slurm._get_job_state` changed from raising `KeyError("Failed to map slurm status code ...")` to `.get(state)`, and lost its `str -> str` annotation. `squeue` can report several codes that aren't in the map, and more of them are reachable now that single status uses `-t all`: `CF` (configuring, common with cloud and power-save nodes), `ST`, `SI`, `SO`, `SE`, `RH`, `RD`, `RF`.

For these, `parse_status` stores `None` and `check_watched_items` then does an extra single-status `squeue` call, which returns `None` again. It logs a state change "to None" and calls `job_wrapper.change_state(None)`. The SQL `NOT IN (NULL, ...)` guard happens to make that a no-op, but the result is still a silent, unlogged unknown state that relies on that guard.

Fix: map the missing codes explicitly (e.g. `CF` → QUEUED, `ST`/`SI`/`SO`/`RH`/`RD`/`RF` → RUNNING or QUEUED, `SE` → ERROR), log once when a code is unknown, and keep the return type a `str`.

### P3 2: Pulsar's tool-failure resubmission duplicates the base runner's logic

`PulsarJobRunner._resubmitted_for_tool_failure` repeats, nearly line for line, the tail of `BaseJobRunner._finish_or_resubmit_job` (`lib/galaxy/jobs/runners/__init__.py` around lines 849–882): `check_tool_output`, commit, map `OUT_OF_MEMORY_ERROR` to `MEMORY_LIMIT_REACHED` and anything else to `TOOL_DETECT_ERROR`, call `_handle_runner_state("failure", ...)`, then check `runner_state_handled`. The detected-state to runner-state mapping now lives in two places and can drift.

Fix: extract a small `BaseJobRunner` helper, e.g. `_resubmit_for_detected_state(job_state, detected_state) -> bool`, and use it from both paths.

### P3 3: `job_pair_for_id` re-implements part of `__recover_job_wrapper` and has no test

`handler.py` `job_pair_for_id` now restores `resubmit` from `job_config.get_destination(job.destination_id)`. `JobHandlerQueue.__recover_job_wrapper` already does this, with the same comment, and also restores `env` and `tags`. Two copies of "re-attach non-persisted destination config" will drift.

Two smaller points:

- `get_destination` deep-copies the destination on every MQ status message, including every `running` update.
- When `destination_id` is `None`, `get_destination` falls back to the default destination's resubmit rules instead of raising `KeyError`.

The fix for "Jobs updated over a message queue lost their resubmit definitions" has no test.

Fix: factor out a helper (e.g. `_restore_unpersisted_destination_config(job, job_destination)`) that both callers use, skip it when `job.destination_id` is `None`, and add a unit test that `job_pair_for_id` returns a wrapper whose destination carries the configured `resubmit`.

### P3 4: Messages the registry now owns are still duplicated

The PR's goal is "one place to declare a reason". Since it already edits `lib/galaxy/jobs/runners/slurm.py`, that file could use the registry instead of its own copies:

- `OUT_OF_MEMORY_MSG` is the same string as `RUNNER_STATE_DEFINITIONS[MEMORY_LIMIT_REACHED].fail_message`.
- The inline walltime message is the same string as the `WALLTIME_REACHED` definition.
- `slurm_state == "NOT_FOUND"` compares against a literal even though `NOT_FOUND` is now exported from `runners/util/slurm`.

Fix: derive these from the definitions and the constant.

### P3 5: New `job_output_not_returned_from_cluster` condition variable is undocumented

Registering `JOB_OUTPUT_NOT_RETURNED_FROM_CLUSTER` with `condition="job_output_not_returned_from_cluster"` adds a new boolean to resubmit expressions, and `test_resubmit.py` asserts it. `doc/source/admin/jobs.md` and `job_conf.sample.yml` were updated for `node_failure`, `preempted` and `runner_state` but don't list it.

Fix: add it to both lists.

### P3 6: A non-string `runner_state` from Pulsar raises instead of being ignored

`_apply_remote_runner_state` already guards against malformed reason strings with `REMOTE_RUNNER_STATE`. A non-string value still breaks it:

- an int makes `REMOTE_RUNNER_STATE.fullmatch` raise `TypeError`;
- a list makes `RUNNER_STATE_DEFINITIONS.get` raise because the value is unhashable.

On the MQ path the exception goes up through `__async_update`, so the job is never failed. On the polling path the monitor logs it and retries forever.

Fix: if the value isn't a `str`, log it and return `message`, like the malformed-string case.

### P3 7 (optional): Several new unit tests are low value or mock the code under test

Examples in `test_pulsar_runner.py` and `test_resubmit.py`:

- The two `discard_previous_attempt` tests only assert that `client.clean()` is called, or that an exception is swallowed.
- `test_every_handled_runner_state_has_a_message` repeats a fact the parametrized resubmit test already proves.
- The `_update_job_state_for_status` and `_resubmitted_for_tool_failure` tests call unbound methods with a `MagicMock` standing in for `self`, so `fail_job` and `_handle_runner_state` are themselves mocks.

The embedded-Pulsar integration test is the strong coverage here. Consider dropping the trivial tests, and spend the effort on the untested Slurm plugin status paths from P2 1 and the `job_pair_for_id` fix from P3 3.

## Notes (not findings)

- Resubmitting with `resubmission_count > 0` always calls `client.clean()`. Over HTTP this removes the failed attempt's remote directory even when `cleanup_job` is `never` or `onsuccess`. The description says this is deliberate, because Pulsar ignores job ids that reached a final status. It may be worth one sentence in the admin docs for sites that keep failed job directories for debugging.
- With Slurm's default `JobRequeue=1`, `NF` and `PR` jobs may be requeued by Slurm while Galaxy marks them ERROR. `NF` → ERROR predates this PR, and the description's test plan uses `--no-requeue`. Admins might need a docs note that these conditions assume Slurm is not requeueing.
- `_complete_staged_job` is also reached from FINISHING-state recovery (`_finish_staged_job`), so a restarted job re-runs the tool-failure resubmit check. The result should match the first check, so this looks harmless.
