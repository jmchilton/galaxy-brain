# planemo's stop rule after a failed job is undocumented, so a debug report can't say which units the run never reached

- Target: galaxyproject/foundry (`content/research/planemo-workflow-test-architecture/index.md`, `debug-galaxy-workflow-output`). Planemo behaves as designed. Foundry tracking needed: no (this is the Foundry issue).
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-chipseq-v0-2026-10-30, phase 10 attempt 1 and phase 11 (debug), planemo master 2a815808, 2026-10-30. Ledger `planemo-arch-note-silent-on-early-exit` (minor).
- Existing issues/PRs: none. Related: finding [31](31-dependency-resolver-environment-surface.md) (same failed attempt), finding [05](05-debug-mold-green-handoff.md), Foundry #662.

## Symptom
gtftobed12 errored at 21:19:28; planemo reported it and stopped at 21:34:12. The invocation was still `ready`, with 136 of 260 steps scheduled, 1 job running and 5 queued, so peak calling onward was never observed. The debug report couldn't tell from the bundle why the report came 15 minutes later or which workflow units were never exercised.

## Root cause
Confirmed in planemo master 2a815808, `planemo/galaxy/invocations/`:
- Without `--fail_fast`, `workflow_in_error_message` (`polling.py:209-249`) prints job errors but returns no error, so polling continues.
- Polling ends when `WorkflowProgress.terminal` (`progress.py:90-107`): scheduling counts as terminal when the invocation state is terminal, or when it is `ready` with paused and errored jobs; and all counted jobs are terminal. Downstream jobs of the failed one pause, so planemo waits for the remaining in-flight jobs to finish, then stops with the invocation still `ready` and steps beyond the paused frontier unscheduled.
- `summary_job_state` (`polling.py:252-266`) then reports the error state.
Confidence: medium. The rule explains the stop with the invocation `ready`, but the ledger also says 1 job was running and 5 queued at the stop, which `jobs_terminal` (`progress.py:102-104`) should not allow. Either those counts were read after planemo's last poll, or planemo's job count lags the invocation's. Not reproduced.
Nothing in `planemo-workflow-test-architecture` describes this, or `--fail_fast`.

## Evidence
`workflow-debug-report.md` (attempt 1), ledger entry 22 (timestamps, 136/260 scheduled).

## Proposed fix
1. Architecture note: document the stop rule (no `--fail_fast`: wait until in-flight jobs settle and the rest pause; `--fail_fast`: stop at the first errored job), and that the invocation stays `ready`.
2. Debug Mold: record the coverage frontier on failure: last scheduled step, units never reached, and that their behaviour is unobserved. Route "rerun after fix" to cover them.

## Draft issue
**Title:** planemo-workflow-test-architecture: document when planemo stops after a failed job, and record the coverage frontier in debug reports

In a wb2g nf-core/chipseq run (2026-10-30), one job errored at 21:19 and planemo stopped at 21:34 with the invocation still `ready`, 136/260 steps scheduled, and 6 jobs in flight. Planemo (master, no `--fail_fast`) keeps polling until in-flight jobs settle and the rest pause (`invocations/progress.py` `terminal`, `polling.py` `workflow_in_error_message`). The architecture note doesn't say this, so the debug report couldn't explain the delay or list which units were never observed.

Proposal: document the rule and `--fail_fast`; have debug reports record the last scheduled step and unreached units as part of the failure evidence.
