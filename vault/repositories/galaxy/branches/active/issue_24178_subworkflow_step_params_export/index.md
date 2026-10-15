# issue_24178_subworkflow_step_params_export

Fixes [galaxyproject/galaxy#24178](https://github.com/galaxyproject/galaxy/issues/24178): the invocation request export (`GET /api/invocations/{id}/request`) keyed subworkflow step params by inner step db id, so posting it back 500'd.

- Branch: `jmchilton/issue_24178_subworkflow_step_params_export`, base `dev` (88127f42979). Could be a `release_26.2` backport candidate; not acted on.
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24178_subworkflow_step_params_export`
- Origin: spike `workflow_rerun_step_parameters` item 1 ([spike debrief](../workflow_rerun_step_parameters/spike_debrief.md)).
- [Implementation debrief](implementation_debrief.md): STATUS READY, head `5cf81e75c12`.
- [Initial implementation debrief](initial_implementation_debrief.md)
- [Normal review debrief](subagents/normal_review.md)
- [Test challenges](test_challenges_debrief.md), [Codex review](codex_review.md), [Thermo-nuclear review](thermo_nuclear_review.md), [Scope evaluation](scope_evaluation.md)

## Decisions

- One of four deliberate sibling branches: #24178 (this), #24175 import re-keying, #24176 run-form seeding, #24177 client. #24175 and #24176 stack on this branch and reuse its `WorkflowStep` helpers.
- Latent `param_map` keyed-by-id vs `order_index` lookup in `workflow_run_config_to_request`: noted, not fixed (per coordinator).
- Behaviour change: unknown/non-numeric inner subworkflow index (`9|x`, `x|y`) was silently ignored, key without `|` was a 500; all now 400. Unknown outer index is still ignored, as on dev.
- Inner `parameter_input` "must specify 'input'" check kept via recursive validation (Codex finding).
