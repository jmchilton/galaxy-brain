Toward 🎯 #75: let Pulsar job scripts report processes the kernel OOM-killed, so Galaxy can fail jobs that still exited 0.

A memory-limited container runs a Pulsar `command.sh` whose pipeline gets OOM-killed. The job script exits 0, records return code 0, and on master leaves nothing on its stderr. With `check_cgroup_oom_kills: true` the same run reports:

```
$ docker run --memory=128m --memory-swap=128m --cgroupns=private ... sh command.sh
# command: python3 -c 'bytearray(512 * 1024 * 1024)' | cat > out.txt
# job script exit: 0, recorded return_code: 0
# job stderr:
galaxy: Detected 1 oom-kill event(s) in the job's memory cgroup.
```

This is the failure galaxyproject/galaxy#24545 measured on usegalaxy.org and VGP: a `sort` killed mid-pipe, the job green, the outputs empty. Those jobs ran on Slurm, which prints its own `slurmstepd: error: Detected N oom-kill event(s)` line. **Pulsar already returns the DRM stderr as `job_stderr`, so Slurm's message needs nothing from this PR. This PR is for resource managers that kill without saying so.** The check compares the job cgroup's `oom_kill` counter before and after the command.

**Galaxy decides what the line means.** The companion Galaxy branch fails exit-0 jobs whose job stderr carries this line or Slurm's, as out of memory errors, so `memory_limit_reached` resubmission works. Its `TestJobResubmissionPulsarJobStderrOomKillIntegration` drives embedded Pulsar end to end: a kill line on the Pulsar job script's stderr is resubmitted once.

**Off by default, and only for managers whose jobs get their own cgroup.** `queued_python`/unqueued jobs share Pulsar's cgroup, where another process's kill would be blamed on the job. Docker tool containers get their own cgroup outside the job's, so their kills aren't seen.

<details><summary>How it is configured</summary>

- Manager option in `app.yml`: `check_cgroup_oom_kills: true`.
- Per job: a Galaxy job destination param of the same name overrides the manager default. It travels exactly like `cvmfsexec`: client launch parameter (REST and message queue) → `submit_job` merges it into `setup_params` without triggering job setup → `DirectoryBaseManager` resolves it against the manager default.
- **`cvmfsexec` and the new option now share one list, `PER_JOB_MANAGER_OPTIONS` in `pulsar/client/destination.py`, and one resolver, `_per_job_option`.** The next per-job option is a one-line addition. Wire keys are unchanged.
- The check reads cgroup v2 `memory.events`, or v1 `memory.oom_control` (Linux ≥ 4.13). It does nothing when neither is readable, and it keeps the command's exit status.

</details>

<details><summary>Where it doesn't apply</summary>

- Docker tool containers, as above. Singularity/Apptainer stay in the job's cgroup and are seen.
- Coexecution (Kubernetes, TES, GCP) tool containers don't write to `metadata/job_stderr`, so the line never reaches Galaxy.
- Systemd hybrid hosts take the v1 branch, because `cgroup.controllers` is absent at the mount root.

</details>

<details><summary>Mirror with Galaxy</summary>

`pulsar/managers/util/job_script/CGROUP_OOM_KILLS_STATEMENT.sh` is byte-identical to the Galaxy branch's copy. The `job_script()` handling and the two template slots (`$oom_kill_setup_statement`, `$oom_kill_report_statement`) match it line for line. The rest of the two `job_script` trees had already drifted (formatting, Pulsar's `cvmfsexec_setup`/`exit_handler_setup`).

</details>

<details><summary>Tests</summary>

- Job script: a fake v1 and v2 cgroup mount whose counter the command bumps, run under `bash` and `sh` (also `dash` locally). It must report the kill and keep exit code 3. Kills from before the job and an unreadable cgroup must report nothing. The real-kernel run above is recorded separately; it is not a CI test.
- Manager: off by default, `app.yml` default, and per-job override in both directions (`False` and `"false"`). A real unqueued job with the check on completes with return code 4 and empty job stderr.
- Wire: REST client parameter, MQ setup message (for both per-job options), the `submit_job` merge not triggering setup, a WSGI end-to-end submit whose `command.sh` has the check, and a route test that keeps `routes.submit` accepting every `PER_JOB_MANAGER_OPTIONS` name.

</details>

## Risks

Risks are minimal. **The option is off by default.** A 0.16.0 or older server ignores the new launch parameter, and an older client leaves the manager default in place (a two-way door).

<details><summary>Risk Details</summary>

- Enabled on a manager whose jobs share a cgroup, the check fails jobs for unrelated OOM kills that happen while they run.
- A Galaxy without the companion branch treats the line as ordinary job stderr. The job still finishes `ok`, as it does today.
- The report runs after `$command`, like `$instrument_post_commands`. A command that `exit`s the job shell itself skips it. Galaxy's command builder never does this.

</details>

<details><summary>Risk Review Advice</summary>

Check that the `app.yml.sample` guidance on which managers suit the option is clear enough that admins won't turn it on for `queued_python`. The per-job plumbing refactor moves `cvmfsexec` onto the shared list. Its existing manager tests and the new parametrized client/endpoint tests cover that move.

</details>

## Context

Companion to Galaxy branch 🌿[`issue_24545_oom_kill_detection`](https://github.com/jmchilton/galaxy/tree/issue_24545_oom_kill_detection), which owns detection and resubmission. **Galaxy catches Slurm's message without this PR. Merged alone, this PR adds a line nothing acts on yet.** **Per-job control from a Galaxy destination also needs a Pulsar release with this change and a `pulsar-galaxy-lib` bump in Galaxy, which pins 0.16.0. The `app.yml` default works with any client.** **Covers the memory half of #75 and the OOM part of #408. Walltime and other DRM-state classification belong to #492's `runner_state` plan, which this doesn't touch.**

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Approvable; the per-job resolver now owns the override-else-default policy.</summary>

`_per_job_option` takes the manager default and a parser, so `cvmfsexec` and `check_cgroup_oom_kills` resolve the same way. The disable-override test now also covers a real `False`, which a truthiness bug would let through. A new route test makes "one route parameter per per-job option" an enforced rule. The mirrored `job_script` files are untouched and the statement is still byte-identical to Galaxy's.

[Full report](https://galaxy-brain.jmchilton.net/repositories/pulsar/branches/cgroup-oom-kills-408/thermo_nuclear_review/). Run via claude-opus-5-5.

</details>

### ✅ Second Frontier Model Review

<details><summary>Two P2 findings, both refuted on inspection; no code changes.</summary>

The two refuted findings: an early `exit` in the command skipping the report (the job script never runs a command that exits the shell, and `$instrument_post_commands` has the same contract), and hybrid cgroup hosts reading the wrong counter (in systemd hybrid mode `cgroup.controllers` is absent at the mount root, so the v1 branch is taken).

[Full report](https://galaxy-brain.jmchilton.net/repositories/pulsar/branches/cgroup-oom-kills-408/codex_review/). Run via gpt-6-sol at medium effort.

</details>
