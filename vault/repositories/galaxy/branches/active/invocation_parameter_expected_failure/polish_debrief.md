# Polish debrief

2026-10-15. Started at `2bbeefcc889` on `dev`; handed off at `3e2bc827a99` on `release_26.1`.

## Rebase

At John's request, rebased the single commit onto `origin/release_26.1` (`92e66c53394`) with `git rebase --onto`. There were no conflicts. Force-pushed with `--force-with-lease` to `jmchilton`.

## CI

The `dev`-based head was green except `Test Galaxy packages`. That red is an unrelated mypy `no-untyped-call` in `galaxy/security/ssh_util.py`. CI on `3e2bc827a99` is pending at handoff.

## Checklist (GENERAL + WORKFLOW_RELATED)

The first pass on `e6f7bb114c4` passed. It cited `test_run_with_validated_parameter_connection_invalid` as reaching this reason, but running it showed the workflow schedules and the job errors.

To capture a real log line for the pitch, I built a reproducer: a parent `text` input feeding a subworkflow `text` parameter with a regex validator. A native export is patched, since format2 inputs can't carry validators. It showed the branch's tuple entry never took effect on this path. `InputParameterModule.execute` passed the unflushed `invocation_step.workflow_step_id` (`None`), the pydantic failure model raised, and the invocation ended `unexpected_failure` with an ERROR traceback.

Fixed in `3e2bc827a99` (`invocation_step.workflow_step.id`) and added `test_subworkflow_parameter_validator_failure`. It's red on the unfixed code at the bug's assertion and green with the fix. The workflow unit suite passes (120, 2 skipped), and so do ruff and the pinned black 26.1.0 hook. The second checklist pass on `3e2bc827a99` passed.

## Strengthening (one round)

Applied:

- Regression context: #20980 ([25.0], `656d5a1051c`) changed #19092's `step.id` to the unflushed id. It's in release_25.0 through 26.1. Verified with git.
- The orphaned child invocation was verified by an API probe: it ends `failed` / `unexpected_failure` while the parent shows the real reason. The description now says so in bold, along with the remaining child re-run ERROR.
- Table: badge labels (`2:nested → 1:inner_text`), log text (`FailureReason.workflow_parameter_invalid`), and both base ERROR lines.
- The manual-test expectation now includes the child re-run ERROR.
- Bold #1 is scoped to the list entry.
- Corrected `checklist_evaluation.md` and `scope_evaluation.md`.

Not done:

- Screenshots of the parent and child invocation messages. Moderate cost; the table is text.
- No new tests beyond the API test. A log-level test would be overkill.

## Questions for John

- Close out the orphaned child subworkflow invocation here (fail it with the parent's message, or clear its handler)? It would remove the remaining ERROR and the child's `unexpected_failure`. It affects every subworkflow failure reason, so it's probably a separate PR.
- Target: the regression is in `release_25.0` onward. Is `release_26.1` the right oldest branch?
