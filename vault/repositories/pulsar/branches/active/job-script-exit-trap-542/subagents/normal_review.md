# Normal review debrief

Reviewed `401bcdd` (Opus 5.5, high effort). The verdict was approve, with one P2. I acted on P3 2: the negative assertions in `test/manager_cvmfsexec_test.py` now check the specific command line instead of a bare `\n(\n` pattern (`2365fc3`). P2 1 (signal handling) is documented in the PR description, not changed in code.

Not acted on:

- **P2 1, signal handling.**
  - TERM sent only to the job-script PID orphans the subshell. Galaxy's `docker kill` doesn't run, while Pulsar's unmount does. On base it was the reverse.
  - TERM sent to the whole group or to all processes runs both traps, but the unmount can race `docker kill`. On base the unmount never ran at all.
  - The release_0.15 psutil `kill_pid` SIGKILLs, so no trap runs either way. DRMs usually signal the whole job (process group or cgroup).
  - So neither case gets worse than base for the unmount, which is what #542 is about.
  - The reviewer's own background-and-forward prototype lost Galaxy's trap on a second TERM. Making it robust needs a stdin/job-control redesign, and that belongs to Galaxy-side trap chaining and #541, not this fix.
- **P3 1, runtime metric includes `docker kill`.** Galaxy's container trap now fires before `$instrument_post_commands`. It's negligible, because the container has normally already exited.
- **Nit, unquoted `tmp_path` in the test shell.** It's harmless on CI paths.

<details><summary>Full review</summary>

Verdict: approve with one P2 to resolve or document. The fix is correct and well tested for a normal job exit (the #542 symptom). Galaxy's `_on_exit` stays inside the subshell, and Pulsar's `_galaxy_on_exit` (`umountrepo -a`) runs after it.

Verification:

- The red-to-green test fails against the base `402a8f8` and passes on the branch.
- The touched tests pass: 5 passed.
- `ruff`, `isort` and `mypy` are clean on the changed files.
- The `job_script()` doctest fails identically on base because it omits `metadata_directory`. CI doesn't collect doctests.

P2 1, signal handling. Tested on Linux bash 5.2 with a synthetic script.

- TERM sent only to the job-script PID orphans the subshell and the tool. `docker kill` never runs, and `umountrepo -a` runs while the container is still alive. Base did run `docker kill`.
- TERM sent to the group or to all processes runs both traps, but the parent's trap fires while the subshell's trap is still running. With a 0.5s delay, PULSAR logged about 0.5s before GALAXY.
- How each kill path behaves:
  - release_0.15 psutil `kill_pid`: SIGKILL everywhere, so there's no difference.
  - No psutil: `killpg` TERM, which is the racy case.
  - term-first-cancellation: TERM to all, which is the racy case.
- Suggested fix: background the subshell, forward TERM, and `wait`. Care is needed, because the prototype lost Galaxy's trap on a second TERM. Documenting the limitation is an acceptable alternative.

P3 1: runtime metric now includes `docker kill`.

P3 2: the negative `"\n(\n" not in contents` assertions are fragile.

Nit: unquoted test paths.

No issue found on any of these:

- `exit` inside the command. The rc capture is inside the subshell, and post-instrument commands still run.
- `cd` and variable leakage. Instrumenter post commands use absolute paths.
- Other consumers. `queued_cli` never passes exit handlers, Windows builds no script, and Galaxy's vendored `job_script` is unaffected.
- Placement. `job_script()` is where both template slots meet, and `string.Template` can't express the conditional.
- `(\n...\n)` syntax with a trailing `;`, a comment or a heredoc.
- Imports.

</details>
