Fix 🎯 #542 - cvmfsexec `mountrepo` never unmounts for Docker jobs because Galaxy's container trap replaces the job script's EXIT handler.

Since 0.15.16, a Pulsar job script with exit handlers sets `trap _galaxy_on_exit EXIT` near the top. Galaxy's Docker command line, substituted into `$command`, then sets its own `trap _on_exit EXIT` in the same shell. Bash keeps one EXIT trap per shell, so the job's CVMFS mounts stay mounted after every Docker job:

```text
before                                after
------                                -----
trap _galaxy_on_exit EXIT   # umount  trap _galaxy_on_exit EXIT   # umount
...                                   ...
_on_exit() { docker kill ...; }       (
trap _on_exit EXIT          # wins    _on_exit() { docker kill ...; }
docker run ...                        trap _on_exit EXIT          # subshell only
                                      docker run ...
                                      ) || exit $?

on exit: docker kill                  on exit: docker kill, then umountrepo -a
```

When exit handlers are registered, `job_script()` now runs the command in a subshell. Traps the command sets stay inside the subshell, and the script's own handler still runs. `|| exit $?` keeps an `exit N` in the command ending the job script with status N, as before.

**Only cvmfsexec `mountrepo` jobs register exit handlers, so every other job script renders byte-identically to `release_0.15`.** That includes Singularity jobs, which set no trap, and namespace mode, which already runs the command in its own `bash -c`. **This fixes the normal job exit; it doesn't make the unmount run when a job is cancelled** (see Risks).

<details><summary>Tests</summary>

- `test_galaxy_docker_trap_does_not_replace_exit_handlers` builds the command with Galaxy's own `DockerContainer.containerize_command`, runs the rendered script with a stub `docker`, and checks that `docker kill` and then the unmount both run. On `release_0.15` it fails, because the unmount never runs.
- `test_command_exit_status_kept_with_exit_handlers` checks that an `exit 7` still ends the script with 7 and skips the post-instrument commands.
- `test_manager_return_code_written_with_exit_handlers` checks that the manager's appended return-code suffix still writes the command's status.
- `test_command_not_wrapped_without_exit_handlers` checks that the command is not wrapped when no exit handlers are registered.
- The last three tests pass on `release_0.15` too: they pin existing behaviour.
- `test/manager_cvmfsexec_test.py` checks that the subshell is present in `mountrepo` mode and absent when cvmfsexec is disabled or in namespace mode.

</details>

## Risks

Only `mountrepo` jobs change shape, and reverting the change in `job_script()` restores the old script. This is a two-way door, but signal handling around the subshell is the part to read closely.

<details><summary>Risk Details</summary>

- `cd` and variables set by the command no longer reach `$instrument_post_commands`. Galaxy's core and cgroup metric commands use absolute paths.
- A command whose last statement fails without calling `exit` now ends the script early. Pulsar's managers always append the return-code `echo` as the last statement, so this doesn't happen through them.
- Galaxy's `docker kill` trap now runs before the post-instrument commands, so the core runtime metric includes it.
- **TERM sent only to the job-script PID:** the unmount runs right away. Galaxy's `docker kill` doesn't run until the command finishes on its own. Before this change the unmount never ran.
- **TERM sent to the whole process group:**
  - On bash 5.2 both handlers run, but the unmount can race `docker kill`.
  - On macOS bash 3.2 the subshell's handler doesn't run.
- **Cancel on `release_0.15`:** `kill_pid` SIGKILLs, so no trap runs either way. #541 tracks making cancellation TERM-first.

</details>

<details><summary>Risk Review Advice</summary>

For signals, the real fix is Galaxy chaining any existing EXIT trap in `DockerContainer.containerize_command` instead of replacing it. This change stops the common case, a normal job exit, from leaking mounts in the meantime.

</details>

## Context

Builds on 🔀 #475, which added `ExitHandlers` and cvmfsexec `mountrepo` mode (shipped in 0.15.16 and 0.16.0). This targets `release_0.15`, which merges forward into `master`, so 0.16 picks it up. Related to #541 (cancellation should send TERM first so these traps can run). The general fix, chaining the trap Galaxy's Docker wrapper sets, belongs in Galaxy.

## Agentic Checks

### ✅ Second Frontier Model Review

<details><summary>Found that an <code>exit N</code> in the command could end the job script with status 0; fixed.</summary>

- In the first version, `exit N` only left the subshell. Post-instrument commands then set the script's exit status, so unqueued managers could record a failed job as successful.
- The fix adds `|| exit $?` after the subshell, with a regression test that passes on `release_0.15`.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
