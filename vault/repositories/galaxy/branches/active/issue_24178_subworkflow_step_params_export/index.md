# issue_24178_subworkflow_step_params_export

Fixes [galaxyproject/galaxy#24178](https://github.com/galaxyproject/galaxy/issues/24178): the invocation request export (`GET /api/invocations/{id}/request`) keyed subworkflow step params by inner step db id, so posting it back 500'd.

- Branch: `jmchilton/issue_24178_subworkflow_step_params_export`, base `dev` (`5bf7abf5e32` since the 2026-10-16 rebase). Could be a `release_26.2` backport candidate; not acted on.
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24178_subworkflow_step_params_export`
- Origin: spike `workflow_rerun_step_parameters` item 1 ([spike debrief](../workflow_rerun_step_parameters/spike_debrief.md)).
- [Implementation debrief](implementation_debrief.md): **STATUS READY**, head `57bf3eebd77`. Includes docs-only expansion D (schema descriptions + `schema.ts` regen), approved by John after the second scope evaluation.
- Re-scope (2026-10-16): [re-scope debrief](implementation_rescope_debrief.md). Original scope kept as `jmchilton/issue_24178_subworkflow_step_params_export_alt_original_scope` @ `a171dbed419`.
- [Normal review (re-scope)](subagents/normal_review.md), [Normal review (D)](subagents/normal_review_expansion_d.md), [Test challenges](test_challenges_debrief.md), [Codex review](codex_review.md), [Thermo-nuclear review](thermo_nuclear_review.md), [Scope evaluation](scope_evaluation.md)
- [Initial implementation debrief](initial_implementation_debrief.md)
- Pre-re-scope: [implementation debrief](earlier_drafts/1/implementation_debrief.md) (head `5cf81e75c12`); [normal review](earlier_drafts/1/subagents/normal_review.md), [test challenges](earlier_drafts/1/test_challenges_debrief.md), [Codex review](earlier_drafts/1/codex_review.md), [thermo-nuclear review](earlier_drafts/1/thermo_nuclear_review.md), [scope evaluation](earlier_drafts/1/scope_evaluation.md)

## Decisions

- One of four deliberate sibling branches: #24178 (this), #24175 import re-keying, #24176 run-form seeding, #24177 client. #24175 and #24176 stack on this branch and reuse its `WorkflowStep` helpers.
- Re-scope (John approved, 2026-10-16): (A) `param_map` lookup fixed to `.get(step.id)`; (B) unknown outer index → 400 on normalized invokes; (C) shared `WorkflowRequestInputParameter.resolve_step_parameters()` lives here (None = unknown outer/inner step, ValueError = malformed row incl. non-dict JSON) — #24175 drops its copy, #24176 delegates. Stack stays on `dev`; backport decided after merge; "step params lost" notice out.
- Behaviour change: unknown/non-numeric inner subworkflow index (`9|x`, `x|y`) was silently ignored, key without `|` was a 500; all now 400. Unknown outer index now also a 400 (re-scope B).
- Inner `parameter_input` "must specify 'input'" check kept via recursive validation (Codex finding).
- D (John approved, 2026-10-16, after the second scope evaluation): schema descriptions document the subworkflow key form and unknown-key 400s; typo fix; `schema.ts` regenerated.

## Morning refresh — 2026-10-16

Rebased onto `origin/dev` and published `a171dbed4194a2de0e93b488381129c75a7dad1d` only to jmchilton with an exact old-head lease. Resolved only the import/additive fixture conflict; a fresh human read is required, with no approval carried forward. Kept both workflow fixture imports; changed Python syntax and whitespace checks pass. Fresh fork CI is pending. Existing local development worktrees were left at their original heads; use the new fork head when resuming.
