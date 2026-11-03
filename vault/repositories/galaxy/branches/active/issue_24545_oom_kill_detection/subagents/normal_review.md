# Normal review debrief — `issue_24545_oom_kill_detection`

Reviewed `8d8773f4ef0`; verdict "needs changes, one P1". Fixed the P1 red-first in `7d6d62ccd10`: `_handle_detected_failure` now skips the failure handlers for STOPPING/STOPPED/DELETING/DELETED/ERROR jobs. That covers Pulsar's new finish path, where a user-stopped job could have been requeued, and the same older gap in the generic path (e.g. drmaa STOPPED). The new tests replace the Pulsar unit test that duplicated the embedded-Pulsar integration test (P3 8). Also took P3 9 (`check_memory_limit -> str | None`, `DETECTED_JOB_STATE` annotation) and P3 3 (sample conf notes the cgroup v1 counter needs Linux ≥ 4.13 and that Singularity/Apptainer kills are seen). Both integration tests were rerun and pass.

Not acted on:

- P3 2 (Pulsar tool errors now trigger `tool_detected_failure`/`any_failure` resubmission): goes in the PR description during polish.
- P3 4 (a third copy of cgroup discovery; `cgroup_mount`/`proc_cgroup` used only by tests): the metrics plugin's templates are single post-commands that dump files. The probe needs a pre/post function pair writing to stderr, so the two don't share cleanly. Exposing the mount as a destination param adds a knob no one asked for. The PR should explain this.
- P3 5 (shared check → commit → handle → finish helper): the generic path interleaves stdio-read errors and cleanup between those steps. The guard now has a single home in `_handle_detected_failure`, which is the part both paths need.
- P3 6 (FINISHING recovery passes `job_stderr=None`): the recovery path has no stored job stderr to scan. This is a known limit and goes in the PR.
- P3 7 (k8s/gcp streaming runners copy tool stderr into job stderr): the anchored patterns make a false match unlikely. This goes in the PR rather than a code comment.

<details><summary>Full review</summary>

Run via claude-opus-5-5 (effort not exposed to the agent).

# Review: `issue_24545_oom_kill_detection` @ `8d8773f4ef0` vs `origin/dev` (merge-base `5ab3087a566`)

## Verdict

**Needs changes: one P1.** The design is sound and small. One detector reads job stderr and feeds the existing `FATAL_OOM` → `OUT_OF_MEMORY_ERROR` → `MEMORY_LIMIT_REACHED` path. The probe reports through the same channel, and Slurm's CANCELLED post-mortem reuses the same patterns. The shell probe is correct in the cases checked. The one real bug is in the Pulsar change. `_finish_pulsar_job` now runs the failure handlers (resubmission) *before* `JobWrapper.finish()`'s DELETED/ERROR guard. As a result, user-stopped, deleted and already-errored Pulsar jobs can go through resubmission. Everything else is P3.

Checked and clean, not findings:
- `$$` in the `proc_cgroup` default survives `Template.safe_substitute` because it is passed as a value, not template text. `$(`, `$((`, `$1`, `$?` and `$_galaxy_*` are not substitutable keys. The outer template is single-pass, so the inserted probe text is not substituted again.
- The probe preserves `$?`. I rendered the script with a pipeline `true | false; sh -c 'exit 0'` and a counter bump, and ran it under both `dash` and `bash`. Both exit 0 and both print the `galaxy: Detected 1 oom-kill event(s)…` line.
- v2 discovery (`0::` line, hierarchical `memory.events`, victim-memcg accounting) and v1 discovery (a `memory` controller matched in a comma list) are right. A v2 cgroupns container sees its own root `memory.events`, so it also works there. Missing or unreadable files make the probe a silent no-op.
- `check_cgroup_oom_kills` has a single entry point (`BaseJobRunner.get_job_file`), so every Galaxy-side shell runner gets it. Pulsar picks it up from destination params through the companion branch. The Pulsar route `loads()` the JSON value before `asbool`.
- Extended metadata: `set_metadata.py` can't see job stderr and marks the job OK. `finish()` still escalates `final_job_state` to ERROR and sets the job's output datasets to ERROR (`lib/galaxy/jobs/__init__.py` ~2473). Precreated outputs are covered. I did not verify whether collection elements discovered by the extended import also flip.
- Default-on scanning of job stderr: natefoo endorsed catching the Slurm wording. The patterns are anchored at line start and use only the definite-kill wording. The "at some point" warnings stay a slurm-only "probable" tier.
- Security: a user can already force `memory_limit_reached` with a user-defined tool's own `fatal_oom` stdio rule, so spoofing the stderr line gives them nothing new. No private report was written.
- The branch's unit tests pass (`test_job_script_oom_kills`, `test_output_checker`, `test_slurm_runner`, `test_pulsar_runner`, `test_runner_output_collection`, `test_runner_local.py::TestLocalJobRunner::test_check_cgroup_oom_kills`).

## Bugs

### P1 1: Pulsar now runs resubmission handlers on stopped, deleted and errored jobs

`lib/galaxy/jobs/runners/pulsar.py:881-899` (`_finish_pulsar_job`)

Before the branch, Pulsar finished every job through `job_wrapper.finish()`. `finish()` starts with `if job.state == DELETED or ERROR: return fail()` (`lib/galaxy/jobs/__init__.py:2300`), so `check_tool_output` never ran for those jobs and no failure handler ran at all. The branch hoists `check_tool_output` + `_handle_detected_failure` in front of `finish()`, which skips that guard. Pulsar finishes these jobs on purpose:

- A `cancelled` status (after `stop_job` kills a deleted job) and a STOPPED job both go `_update_job_state_for_status` → `mark_as_finished` → `finish_job` (`pulsar.py:414-422`).
- `finish_job` computes `completed_normally = state not in [ERROR, DELETED]` (`:821`). For STOPPED it forces `exit_code = 0` because "we know the user stopped the job" (`:825`).
- After a download failure, `job_wrapper.fail(...)` has already run, and the job still continues into `_complete_staged_job`.

Failure scenario (STOPPED): a user stops a Pulsar job. The tool left something on stderr. Legacy tools with no stdio rules fail on any stderr, and so does any tool whose stdio regex matches. That gives `GENERIC_ERROR` → `TOOL_DETECT_ERROR` → `resubmit.failure`. If the destination has `resubmit: [{condition: any_failure}]`, `tool_detected_failure`, or an unconditional resubmit (common in TPV setups), the handler fires. STOPPED is not in `Job.finished_states`, so `mark_as_resubmitted` → `set_state(RESUBMITTED)` succeeds. **The user-stopped job is requeued and runs again.**

For DELETED/ERROR, `set_state` is a no-op, but the handler still:
- rewrites `destination_id`/`destination_params`
- moves the JWD to `_cleared_contents`
- clears `job_runner_external_id`
- overwrites `job.info` with "This job was resubmitted to the queue because…"
- calls `dispatcher.put()` when `track_jobs_in_database` is false

It also returns with `runner_state_handled=True`, so the `fail()` that `finish()` used to run (cleanup, metrics) is skipped.

Red test. It reuses the branch's `_staged_job` helper from `test/unit/app/jobs/test_pulsar_runner.py` and passes for all three states, which shows the handlers run and `finish` is skipped:

```python
@pytest.mark.parametrize("state", [model.Job.states.DELETED, model.Job.states.STOPPED, model.Job.states.ERROR])
def test_terminal_job_skips_failure_handlers(tmp_path, state):
    runner, job_state, result = _staged_job(tmp_path, "")
    job_state.job_wrapper.get_job().state = state
    result = dataclasses.replace(result, tool_stderr="Killed")
    handled = []

    def resubmit(app, runner, js):
        handled.append(js.runner_state)
        js.runner_state_handled = True

    runner.runner_state_handlers["failure"] = [resubmit]
    runner._complete_staged_job(job_state, result, handle_metadata_externally=False)
    # On the branch today: handled == [TOOL_DETECT_ERROR], finish not called.
    assert handled == []
    job_state.job_wrapper.finish.assert_called_once()
```

**Fix:** don't run the detected-failure handlers for a job the user or Galaxy already ended. The cleanest place is `BaseJobRunner._handle_detected_failure`:

```python
if job_state.job_wrapper.get_state() in (
    model.Job.states.DELETED, model.Job.states.DELETING,
    model.Job.states.STOPPED, model.Job.states.STOPPING,
    model.Job.states.ERROR,
):
    return False
```

Then `finish()` handles the job as it did before. This also closes the same gap in the generic path: drmaa/slurm send STOPPED jobs to `finish_job` → `_finish_or_resubmit_job`, and local finishes DELETED jobs. That gap predates the branch, so fixing it there is optional. At minimum, Pulsar shouldn't newly gain it. Add the test above, plus a generic-path STOPPED case if the guard goes into `_handle_detected_failure`.

## Should fix / minor

### P3 1: Pulsar behavior change needs calling out (all tool-detected errors now resubmit)

`pulsar.py:893-899`. Pulsar tool errors used to go straight to `finish()`, so `tool_detected_failure`, `any_failure` and unconditional resubmit rules never fired for Pulsar tool errors, only for `failed`/`lost`. Now they fire for every detected error, not just OOM. That is correct and matches the sibling runners. However, usegalaxy.* / TPV deployments with `any_failure` resubmits will see new resubmissions after upgrading. Say so explicitly in the PR description and release notes.

### P3 2: The cgroup probe is a silent no-op on v1 kernels older than 4.13

`CGROUP_OOM_KILLS_STATEMENT.sh`. `memory.oom_control` only has an `oom_kill` line from Linux 4.13 on. On EL7 (3.10) or similar, an admin who enables `check_cgroup_oom_kills` gets nothing and no hint why. Document the kernel requirement in the `job_conf.sample.yml` block. While there, consider noting that Singularity/Apptainer containers stay in the job's cgroup, so their kills are seen; only Docker and rootless Podman escape it.

### P3 3: The cgroup discovery logic now exists in a third place; `cgroup_mount` is a test-only seam

`lib/galaxy/jobs/runners/util/job_script/__init__.py:117-123`. The `cgroup` job-metrics instrumenter (`lib/galaxy/job_metrics/instrumenters/cgroup.py:76-103`) already does v1/v2 discovery from `/proc/$$/cgroup`. It has a configurable `cgroup_mount` and already records `memory.events.oom_kill` / `memory.oom_control.oom_kill`, post-hoc and without a baseline. The probe re-implements the discovery (better: it handles comma-joined v1 controllers), and the Pulsar copy is a fourth instance. Also, `cgroup_mount`/`proc_cgroup` are `job_script()` kwargs used only by tests. In production the mount is hard-coded to `/sys/fs/cgroup`, while the metrics plugin lets admins override it.

**Fix:** either share one discovery snippet between the instrumenter and the probe, or expose `cgroup_mount` as a destination param alongside `check_cgroup_oom_kills`. If neither is done, add one sentence to the PR saying why a destination param was chosen over a `cgroup` instrumenter option (natefoo asked for a destination option). That rationale is reasonable; it just needs stating.

### P3 4: The Pulsar finish duplicates the generic check→commit→handle→finish sequence

`pulsar.py:885-912` vs `runners/__init__.py:839-893`. Factoring `_handle_detected_failure` out is good. The surrounding sequence is still duplicated: `check_tool_output` → flush job → `_handle_detected_failure` → `finish(check_output_detected_state=…)`. The generic path commits unconditionally; the Pulsar path commits only on failure. A `BaseJobRunner._check_output_and_finish(job_state, tool_stdout, tool_stderr, exit_code, job_stdout, job_stderr, **finish_kwds)` used by both would give you one place for the P1 guard. Optional.

### P3 5: FINISHING recovery can resubmit tool errors but can't detect OOM

`pulsar.py:937`. `_finish_staged_job` passes `job_stderr=None`, so on recovery the new OOM detection can't fire. The new `_handle_detected_failure` call still applies to other tool errors, so recovery can now resubmit non-OOM failures but not OOM ones. Nothing regresses, but persisting `job_stderr` before the metadata step, or noting the limitation in the debrief/PR, would close the gap.

### P3 6: On streaming runners, tool stderr is part of job stderr

`lib/galaxy/jobs/command_factory.py:381-399`. With `stream_stdout_stderr=True` (kubernetes, gcp_batch), the tool's stderr is teed onto the job stderr. On those runners, a tool that echoes input lines to stderr can match `^slurmstepd: error: Exceeded job memory limit$` and fail or resubmit the job. That is unlikely, and the patterns are anchored, but it's worth a sentence in the sample conf or a code comment.

### P3 7: Pulsar unit tests overlap the embedded-Pulsar integration test

`test/unit/app/jobs/test_pulsar_runner.py:56-117`. `_staged_job` builds a runner with `object.__new__`, a `Mock` wrapper and `MethodType(JobWrapper.check_tool_output, wrapper)`, which ties the test to internals. `test_staged_job_oom_kill_is_resubmitted` duplicates what `TestJobResubmissionPulsarJobStderrOomKillIntegration` proves end to end. Keep the two branch-only tests (fail-without-resubmit, success skips handlers), which also make a good home for the P1 test, and drop the resubmit one, or keep it and accept the overlap.

### P3 8: Typing nits

- `slurm.py:208`: `check_memory_limit(...) -> str | bool`. `False` is only a sentinel, so `str | None` is clearer now that the function is public.
- `runners/__init__.py:720`: `check_output_detected_state: str` could be `DETECTED_JOB_STATE`.

## Not raised

- Imports are all at module top. Comments are short and non-obvious. The sample-conf block is long but it is documentation.
- `oom_kill_job_messages` builds its own `RegexJobMessage` rather than going through `check_output_regex` with a synthetic `ToolStdioRegex`. Reusing it would mean `(?m)` patterns, the `IGNORECASE` that `check_output_regex` forces, and a fake regex object, which is not clearly better.
- The tasks runner doesn't pass `job_stderr`, so it gets no detection. That runner is legacy and doesn't matter here.

</details>
