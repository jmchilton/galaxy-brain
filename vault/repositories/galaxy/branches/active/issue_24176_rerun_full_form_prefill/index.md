# issue_24176_rerun_full_form_prefill

Fixes [galaxyproject/galaxy#24176](https://github.com/galaxyproject/galaxy/issues/24176): a workflow rerun that opens (or is switched to) the expanded run form ignored the original run and started from the workflow's saved values.

- Branch: `jmchilton/issue_24176_rerun_full_form_prefill`, **stacked on `issue_24178_subworkflow_step_params_export`** ([parent record](../issue_24178_subworkflow_step_params_export/index.md)), which is based on `dev` (88127f42979).
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24176_rerun_full_form_prefill`
- Origin: spike `workflow_rerun_step_parameters` item 4 ([spike debrief](../workflow_rerun_step_parameters/spike_debrief.md)).
- **Status: READY** — head `8141bfccf87` on `jmchilton`, parent tip `5cf81e75c12`. [Implementation debrief](implementation_debrief.md)
- [Initial implementation debrief](initial_implementation_debrief.md) (includes the normal review outcome) · [Test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Scope evaluation](scope_evaluation.md) · [Screenshots](screenshot_debrief.md) (local `screenshots/`)

## Decisions

- One of four deliberate sibling branches: #24178 (parent), #24175 import re-keying (sibling), #24176 (this), #24177 forced expanded form + simple-form prefill (stacks on this).
- Server seeding (`GET /api/workflows/{id}/download?style=run&invocation_id=…`), per the issue's proposed approach. Client merge of the request export kept as a reviewer question.
- Out of scope: object stores in the expanded form; latent `param_map` keyed-by-id lookup in `workflow_run_config_to_request` (noted, not fixed); forcing the expanded form (#24177); import re-keying (#24175).
- Coordinator: no branch in the stack may regress alone, so the minimal `rerunHasStepParameters` guard lives here (expanded form when the export has tool step params); message/hidden toggle/simple-form prefill stay in #24177.
- Overlap with #24175's `resolve_step_parameters()`: `recover_step_parameters()` shaped to delegate to it; whichever lands second reconciles (see implementation debrief).
- E2E rerun test lives here; #24177's rerun test should extend it, not duplicate.
