# Codex review debrief

Ran `/codex-review` on `2365fc3` (`codex exec`, read-only, base `402a8f8`) and acted on its only finding: it was confirmed and fixed in `6d2c696`. Thermo-nuclear review skipped: the branch is 38 changed lines and touches two lines of job-script plumbing.

Not acted on: nothing.

<details><summary>Full review</summary>

**P1 (confirmed, fixed): a command that exits nonzero can be reported as successful.**

When exit handlers are set, an `exit N` in the job command only left the subshell. The parent then ran `$instrument_post_commands`, which set the script's status, so the script could exit 0. That `exit` also skips the return-code write that `_expand_command_line` appends. `BaseUnqueuedManager._monitor_execution` (`pulsar/managers/unqueued.py:177`) then falls back to the script's exit status, so a failed job is recorded as successful.

Verified red to green:

- The new `test_command_exit_status_kept_with_exit_handlers` (`exit 7` plus a post command) passes on the base `job_script` and failed on `2365fc3` with status 0.
- The fix appends `|| exit $?` after the subshell.

Remaining divergence from base: a command whose last statement fails without calling `exit` now ends the script too. Through Pulsar's managers this can't happen, because the appended return-code `echo` is always the last statement.

Codex coverage: the diff, plus `directory.py`, `unqueued.py`, `cvmfsexec.py` and the tests.

</details>
