---
upstream_base_branch: dev
parent_branch: issue_24177_rerun_step_params_full_form
related_records: galaxy/branches/workflow_step_parameter_overrides
---
# workflow_run_exposed_step_params

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:workflow_run_exposed_step_params?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/workflow_run_exposed_step_params)

## Status

Spike, do not PR as is. Head `a6e08520821` (tree row polish), stacked on `issue_24177_rerun_step_params_full_form` (`46db8f9d5b6`) → #24176 → #24178 → `dev`.

No PR.

API probes, vitest and 5 E2E tests pass locally; no CI.

## Context

- Spike of [RERUN_ISSUE.md](../../../../../projects/workflow_applications/RERUN_ISSUE.md) / [RERUN_UX.md](../../../../../projects/workflow_applications/RERUN_UX.md): expose individual step parameters in the simple workflow run form.
- Findings with screenshots: [LESSONS_LEARNED.md](../../../../../projects/workflow_applications/LESSONS_LEARNED.md). Debrief: [spike_debrief.md](spike_debrief.md).
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/workflow_run_exposed_step_params`, currently checked out on the graph picker alt. It has its own bootstrapped `.venv` and `client/node_modules`, which replaced the dangling symlinks into the #24177 worktree.
- Alt: [graph_picker](alts/graph_picker.md) picks parameters from the workflow graph; subworkflow parameters are locked.

## Decision

Filed as [#24454](https://github.com/galaxyproject/galaxy/issues/24454). Split into PRs, or abandon the spike?

2026-11-03: after pushback on `|`-joined subworkflow keys, the API plan is a dedicated nested `step_parameter_overrides` field (21.01-style tool state, subworkflows nested, applied on top of `parameters`), replacing exposure keys and `exposed_step_parameters` ([comment](https://github.com/galaxyproject/galaxy/issues/24454#issuecomment-6592278488)). The spike's payload, exposure keys and G1/G4 code predate this.

2026-11-03: being promoted, merged with the graph picker alt, into the tracked branch [`workflow_step_parameter_overrides`](../workflow_step_parameter_overrides/index.md).
