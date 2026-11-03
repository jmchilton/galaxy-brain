Fix 🎯 #24545: fail jobs whose processes were OOM-killed, even when the job exits 0.

On usegalaxy.org and VGP, a 512 MiB job whose `sort` was killed in the middle of a pipe finished **green, exit 0, with 0 of 16,434,823 lines in its output**. Slurm said exactly what happened, on the job's own stderr:

```
slurmstepd: error: Detected 1 oom-kill event(s) in StepId=5726054.batch. Some of your processes may have been killed by the cgroup out-of-memory handler.
```

Nothing in Galaxy reads that. `check_output` only sees the tool's streams. **Galaxy's own Slurm runner misses it too:** `slurm.py` scans stderr only for `CANCELLED` jobs, and only for the older `Exceeded job memory limit` wording. Pulsar jobs never reached the resubmission handlers even when Galaxy did detect an OOM. With this branch, the same job ends in error with:

```
Out of memory error: slurmstepd: error: Detected 1 oom-kill event(s) in StepId=5726054.batch. ...
```

and `memory_limit_reached` resubmission rules apply, on Galaxy's own runners and on Pulsar. Integration tests exercise both: an exit-0 job whose job stderr carries this line is resubmitted once, on the local runner and on embedded Pulsar. Both tests fail on `dev`.

**This needs no Pulsar change or release.** Pulsar already returns the DRM stderr as `job_stderr`, so the reporter's Pulsar → Slurm jobs are covered as soon as Galaxy is.

**The job-stderr check is on for every runner, with no opt-out; only the cgroup check below is opt-in.** **It doesn't touch `set -e`/`pipefail` (#5884). The resource manager's kill report fails the job, so pipelines ending in an early-closing consumer such as `head` don't get the false exit-141 failures `pipefail` would cause.**

<details><summary>What changed</summary>

1. **Job stderr check.** `oom_kill_line()` / `oom_kill_job_messages()` in `galaxy.tool_util.output_checker` are called from `JobWrapper.check_tool_output`, the one place the generic runner path and Pulsar both pass `job_stderr`. A match yields `DETECTED_JOB_STATE.OUT_OF_MEMORY_ERROR` and a `regex` job message on stream `job_stderr`, so the API schema doesn't change. The rest is the existing `FATAL_OOM` → `MEMORY_LIMIT_REACHED` path. An OOM kill wins over a generic tool error, so memory resubmission can fire even when the tool also wrote to stderr.
2. **Slurm.** The `CANCELLED` post-mortem in `slurm.py` reuses the same patterns, so it now also recognizes `Detected N oom-kill event(s)`. The "at some point" warnings stay a Slurm-only *probable* tier. These are `slurm.py`'s first unit tests.
3. **Pulsar resubmission.** The detected-state handling in `_finish_or_resubmit_job` is now `_handle_detected_failure`, and Pulsar's staged finish path (including FINISHING recovery) calls it. Recovery now keeps the job streams beside the `.ec` file, so a restart during external metadata doesn't lose the kill.
4. **Opt-in `check_cgroup_oom_kills` destination param.** For resource managers that kill silently, the job script compares its memory cgroup's `oom_kill` counter (v2 `memory.events`, v1 `memory.oom_control`) before and after the tool. If it rose, the script writes `galaxy: Detected N oom-kill event(s) in the job's memory cgroup.` to the job's stderr, where check 1 catches it. Nothing new travels between job and Galaxy, and the tool's exit status is kept. A real-kernel run (Docker, `--memory=128m`, cgroup v2) of a pipeline whose first process is killed: the job script exits 0, writes that line, and `oom_kill_job_messages` turns it into an `Out of memory error` message. The reporter's records show the same counter moving on usegalaxy.org. Inside the tool's biocontainer, under Slurm's `job_5726054/step_batch/user/task_0` cgroup, `memory.events` read `oom_kill 0` before the `sort` and `oom_kill 1` after, so the container shared the job's Slurm cgroup.

</details>

**Only definite-kill wording fails a job.** The two Slurm kill messages and the probe's own line do. Slurm's `Exceeded job memory limit at some point.` warning can appear when nothing was killed, so successful jobs that print it stay `ok`, as #1426/#2309 decided, and a test pins that. Patterns are anchored to the start of the line.

**Pulsar jobs now go through the same failure handlers as every other runner.** That means `tool_detected_failure` and `any_failure` rules also start firing for Pulsar tool errors, not just OOM. **Stopped, deleted and already-errored jobs are never resubmitted from a detected failure, on any runner.** That closes a gap the generic path already had for a stopped DRMAA job.

**`check_cgroup_oom_kills` is opt-in, per natefoo on #24545.** Only enable it where the resource manager gives each job its own cgroup (e.g. Slurm's cgroup task plugin). In a shared cgroup, such as local jobs under one systemd unit, another process's kill would be blamed on the job. Docker tool containers get their own cgroup outside the job's, so their kills aren't seen. Containers that stay in the job's cgroup, as the reporter's did, are covered.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `test/unit/tool_util/test_output_checker.py`: kill lines detected; partial warnings, quoted lines and empty stderr ignored.
- `test/unit/app/jobs/test_runner_output_collection.py`: exit-0 job with the kill line reaches the failure handler as `MEMORY_LIMIT_REACHED` (with and without tool stderr); fails as OOM when not resubmitted; partial warning alone finishes `ok`; stopped/errored jobs are not resubmitted.
- `test/unit/app/jobs/test_slurm_runner.py`: `check_memory_limit` tiers, tail-only reading, missing file.
- `test/unit/app/jobs/test_pulsar_runner.py`: staged finish fails as OOM, skips handlers for stopped/deleting/deleted/errored jobs, success path untouched; FINISHING recovery keeps the kill.
- `test/unit/app/jobs/test_job_script_oom_kills.py`: fake v1/v2 cgroup mounts under `bash` and `sh` (also `dash` locally). Reports a kill during the job, keeps exit code 3, ignores earlier kills, silent without a readable cgroup, off by default.
- `test/unit/app/jobs/test_runner_local.py`: the destination param reaches the local runner's job script and keeps the exit code.
- `test/integration/test_job_resubmission.py`: `TestJobResubmissionJobStderrOomKillIntegration` (local) and `TestJobResubmissionPulsarJobStderrOomKillIntegration` (embedded Pulsar). A destination `env` `execute` writes the Slurm line to the job script's stderr, and the exit-0 job must be resubmitted once. Both fail on `dev`.

</details>

## Risks

The default-on check changes outcomes: jobs that used to finish `ok` with a resource-manager kill line on their stderr now fail. That's the point, but it's visible to users and to resubmission rules.

<details><summary>Risk Details</summary>

- A job whose stderr legitimately contains a line starting `slurmstepd: error: Detected N oom-kill event(s)` or `galaxy: Detected N oom-kill event(s)` now fails. On k8s/GCP Batch, tool stderr is copied into job stderr, so a tool that printed such a line verbatim would trip it.
- Pulsar destinations with `tool_detected_failure` or `any_failure` resubmit rules start acting on Pulsar tool errors.
- `check_cgroup_oom_kills` on a destination whose jobs share a cgroup fails jobs for unrelated kills.
- FINISHING recovery writes `galaxy_<id>.job_stdout`/`.job_stderr` into the job working directory.

</details>

<details><summary>Risk Review Advice</summary>

The load-bearing choice is to treat job (DRM) stderr as authoritative for OOM kills regardless of the tool's own `<stdio>` rules. Check that the anchored patterns are narrow enough for your runners. Also check whether admins want an opt-out destination param for the default-on check. For Pulsar deployments with broad resubmit rules (TPV), the new `tool_detected_failure` behavior is the part to watch.

</details>

## Context

Companion Pulsar branch 🌿[`cgroup-oom-kills-408`](https://github.com/jmchilton/pulsar/tree/cgroup-oom-kills-408) carries the same opt-in cgroup check into Pulsar-rendered job scripts (`CGROUP_OOM_KILLS_STATEMENT.sh` is byte-identical), with a manager default and per-job override from this destination param. **This PR works without it. Per-job control of the check on Pulsar destinations needs that Pulsar release and a `pulsar-galaxy-lib` bump.** Related Pulsar issues: galaxyproject/pulsar#75, galaxyproject/pulsar#408. Wider DRM-state classification (walltime etc.) is galaxyproject/pulsar#492's plan, which this doesn't touch.

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Approve after small cleanups; the design reuses the existing <code>FATAL_OOM</code> → <code>MEMORY_LIMIT_REACHED</code> path.</summary>

Four behavior-preserving commits:

- split the line finder (`oom_kill_line`) from the job-message builder, so `slurm.py` no longer builds a message just to test it;
- typed `check_output`/`check_tool_output` as returning `DETECTED_JOB_STATE`;
- built Pulsar's staged `.ec` and stream file paths in one place;
- dropped a `setUp` the base class now provides.

No file crosses 1k lines because of the branch.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24545_oom_kill_detection/thermo_nuclear_review/). Run via claude-opus-5-5.

</details>

### ✅ Second Frontier Model Review

<details><summary>One P2 confirmed and fixed: FINISHING recovery lost the job streams.</summary>

Galaxy restarting during a Pulsar job's external metadata step rebuilt the result without job stdout/stderr, so a kill line was lost and the job finished `ok`. Both streams are now saved beside the exit code file before the metadata step and read back on recovery, and a test covers it, red before the fix.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24545_oom_kill_detection/codex_review/). Run via gpt-6-sol at medium effort.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
