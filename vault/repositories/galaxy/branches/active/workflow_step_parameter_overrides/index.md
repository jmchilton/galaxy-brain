---
upstream_base_branch: dev
parent_branch: issue_24177_rerun_step_params_full_form
related_records: galaxy/branches/workflow_run_exposed_step_params
---
# workflow_step_parameter_overrides

- [Open PR](https://github.com/galaxyproject/galaxy/compare/issue_24177_rerun_step_params_full_form...jmchilton:galaxy:workflow_step_parameter_overrides?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/workflow_step_parameter_overrides)

## Status

Implementation in progress, branched from `issue_24177_rerun_step_params_full_form` `46db8f9d5b6`.

No PR.

No CI yet.

## Context

- Implements [#24454](https://github.com/galaxyproject/galaxy/issues/24454) with the nested `step_parameter_overrides` invocation field proposed in [this comment](https://github.com/galaxyproject/galaxy/issues/24454#issuecomment-6592278488).
- Promotes the [`workflow_run_exposed_step_params`](../workflow_run_exposed_step_params/index.md) spike and its graph picker alt into one branch: tree picker by default, with a pop-out workflow graph view.
- API commits come first so they can be extracted into their own PR.
- Worktree: `/home/ubuntu/projects/worktrees/galaxy/branch/workflow_step_parameter_overrides`.
