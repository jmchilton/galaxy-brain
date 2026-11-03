---
upstream_base_branch: dev
parent_branch: issue_24177_rerun_step_params_full_form
related_records: galaxy/branches/workflow_run_exposed_step_params
---
# workflow_step_parameter_overrides

- [Open PR](https://github.com/galaxyproject/galaxy/compare/issue_24177_rerun_step_params_full_form...jmchilton:galaxy:workflow_step_parameter_overrides?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/workflow_step_parameter_overrides)

## Status

Hardened and READY at head `0c57368d1d5`, 9 commits on `issue_24177_rerun_step_params_full_form` `46db8f9d5b6`.

No PR.

Fork CI is pending on the first push.

## Context

- Implements [#24454](https://github.com/galaxyproject/galaxy/issues/24454) with the nested `step_parameter_overrides` field from [this comment](https://github.com/galaxyproject/galaxy/issues/24454#issuecomment-6592278488) ([api_design.md](api_design.md)).
- Merges the [`workflow_run_exposed_step_params`](../workflow_run_exposed_step_params/index.md) spike and its graph-picker alt into one picker. The list view is the default, and the workflow view pops out.
- **[Implementation debrief](implementation_debrief.md)** (STATUS READY), plus the [re-scope debrief](implementation_rescope_debrief.md), the [initial debrief](initial_implementation_debrief.md) and the [screenshots](screenshot_debrief.md).
- Worktree: `/home/ubuntu/projects/worktrees/galaxy/branch/workflow_step_parameter_overrides`.

## Branches

- **Extractable API series.** The bottom 5 commits are the baseline tests, a refactor and 3 API commits. They can be extracted onto `dev`, and are cherry-picked as `jmchilton/workflow_step_parameter_overrides_api` (`0d5448ef3c8`, on `dev` `38dc259318c`). [Open API PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:workflow_step_parameter_overrides_api?expand=1).
- **Alt.** [original_scope](alts/original_scope.md) is the branch before the re-scope.
