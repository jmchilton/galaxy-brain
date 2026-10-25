# workflow_run_exposed_step_params

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:workflow_run_exposed_step_params?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/workflow_run_exposed_step_params)

## Status

Spike, do not PR as is. Head `147dac7222a`, stacked on `issue_24177_rerun_step_params_full_form` (`46db8f9d5b6`) → #24176 → #24178 → `dev`.

No PR.

API probes, vitest and 5 E2E tests pass locally; no CI.

## Context

- Spike of [RERUN_ISSUE.md](../../../../../projects/workflow_applications/RERUN_ISSUE.md) / [RERUN_UX.md](../../../../../projects/workflow_applications/RERUN_UX.md): expose individual step parameters in the simple workflow run form.
- Findings with screenshots: [LESSONS_LEARNED.md](../../../../../projects/workflow_applications/LESSONS_LEARNED.md). Debrief: [spike_debrief.md](spike_debrief.md).
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/workflow_run_exposed_step_params` (its `.venv` and `client/node_modules` are symlinks into the #24177 worktree).

## Decision

File the issue with the suggested edits in LESSONS_LEARNED.md? Then split into PRs (G1 strict keys, G2+G4 API, client), or abandon the spike once the issue is filed.
