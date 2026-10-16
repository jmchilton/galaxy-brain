# issue_24177_rerun_step_params_full_form

Fixes [galaxyproject/galaxy#24177](https://github.com/galaxyproject/galaxy/issues/24177): rerunning from the simplified form silently dropped the tool step parameters the original run set.

- Branch: `jmchilton/issue_24177_rerun_step_params_full_form`, **stacked on `issue_24176_rerun_full_form_prefill`** ([parent record](../issue_24176_rerun_full_form_prefill/index.md)), itself on `issue_24178_subworkflow_step_params_export` ([record](../issue_24178_subworkflow_step_params_export/index.md)) → `dev`.
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24177_rerun_step_params_full_form`
- Origin: spike `workflow_rerun_step_parameters` item 3 ([spike debrief](../workflow_rerun_step_parameters/spike_debrief.md)).
- **[Implementation debrief](implementation_debrief.md)** (STATUS READY), [initial debrief](initial_implementation_debrief.md)
- Reviews: [normal](subagents/normal_review.md), [codex](codex_review.md), [thermo-nuclear](thermo_nuclear_review.md); [test challenges](test_challenges_debrief.md), [E2E polish](polish_e2e_tests_debrief.md), [scope evaluation](scope_evaluation.md), [screenshots](screenshot_debrief.md)

## Decisions

- One of four deliberate sibling branches (#24178 → #24176 → this; #24175 sibling). Coordinator settled this split.
- Predicate unchanged from #24176 (`rerunHasStepParameters`: export `parameters` non-empty). Not narrowed to tool-only rows: subworkflow step rows are dropped by the simple form too and #24176 seeds them in the expanded form.
- Out of scope: object stores in the expanded form (no UI); `replacement_dict` bug (issue footnote ¹) so simple-form workflow-param prefill has no effect yet; latent `param_map` keyed-by-id bug; server seeding (#24176); import (#24175); export re-keying (#24178).
- Pending coordinator decision: move #24176's `withRerunValues` into `model.js` and reuse it in the simple form (flagged by normal review, Codex, thermo).
