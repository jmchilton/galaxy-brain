# issue_24177_rerun_step_params_full_form

Status: `branches_implemented_needs_ci`. Head: `46db8f9d5b69ec9498e6987416ca58375f38b44c` (re-scoped, 4 commits). Fork CI pending.

Fixes [galaxyproject/galaxy#24177](https://github.com/galaxyproject/galaxy/issues/24177): rerunning from the simplified form silently dropped the tool step parameters the original run set. Also fixes issue footnote ¹: the simple form sent `replacement_dict`, so `${...}` renames never applied on simple-form or landing runs.

- Branch: `jmchilton/issue_24177_rerun_step_params_full_form`, **stacked on `issue_24176_rerun_full_form_prefill`** at `ced412c6248` ([parent record](../issue_24176_rerun_full_form_prefill/index.md)), itself on `issue_24178_subworkflow_step_params_export` `57bf3eebd77` ([record](../issue_24178_subworkflow_step_params_export/index.md)) → `dev`.
- Original scope: `jmchilton/issue_24177_rerun_step_params_full_form_alt_original_scope` (`7f57142acd3`). It has no worktree and is not tracked.
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24177_rerun_step_params_full_form`
- Origin: spike `workflow_rerun_step_parameters` item 3 ([spike debrief](../workflow_rerun_step_parameters/spike_debrief.md)).
- **[Implementation debrief](implementation_debrief.md)** (STATUS READY), [re-scope debrief](implementation_rescope_debrief.md), [initial debrief](initial_implementation_debrief.md)
- Round 2 process: [normal review](subagents/rescope_normal_review.md), [test challenges](test_challenges_debrief.md), [E2E polish](polish_e2e_tests_debrief.md), [codex](codex_review.md), [thermo-nuclear](thermo_nuclear_review.md), [baseline refactor](baseline_refactor.md), [scope evaluation](scope_evaluation.md) (keep), [screenshots](screenshot_debrief.md)
- Round 1: [earlier_drafts/1](earlier_drafts/1/implementation_debrief.md)

## Decisions

- One of four deliberate sibling branches (#24178 → #24176 → this; #24175 sibling). Coordinator settled this split.
- Predicate unchanged from #24176 (`rerunHasStepParameters`: export `parameters` non-empty). Not narrowed to tool-only rows: subworkflow step rows are dropped by the simple form too and #24176 seeds them in the expanded form.
- Out of scope: object stores in the expanded form (no UI); latent `param_map` keyed-by-id bug; server seeding (#24176); import (#24175); export re-keying (#24178).
- Re-scope 2026-10-16 (coordinator-approved, from round 1's scope evaluation): fold in the footnote ¹ `replacement_params` key fix, and reuse #24176's shared `withRerunValues` and `mountRerun`.

## Stack/CI repair — 2026-10-16 (pre-re-scope, historical)

Base: `issue_24176_rerun_full_form_prefill` at `d10e8cfbf414a35f3e3362406f1dc190c049d206`.

Carried the existing child commit onto the integrated prefill parent without conflicts. Range-diff marks the child patch identical. Kept the established expanded-form guard, explanation and simple-form prefill behavior. The pre-existing helper-reuse follow-up is outside this mechanical integration; no new design decision was introduced.

Validation: the final stack's Workflow/Run client suite passes **83 tests in 12 files**. Parent server coverage passes 11 API cases. Isort and diff whitespace checks pass. No browser test rerun is claimed. This conflict-free child rebase retains its previous needs-CI classification.

Published `7f57142acd377019b6924d27d2196c93fc30ea9d` to `jmchilton/issue_24177_rerun_step_params_full_form`. Fresh fork CI is pending. No approval or new PR was inferred.

## Re-scope — 2026-10-16

- Rebased onto #24176's re-scoped tips: `88d38744136`, then `b5c7505e1b3`, then the final `ced412c6248`. None of the rebases conflicted.
- Implemented the round-1 scope expansion, then reran the full "After your plan is done" list.
- Pushed `46db8f9d5b6`. Fresh fork CI is pending. No PR is opened.
- Details: [re-scope debrief](implementation_rescope_debrief.md), [implementation debrief](implementation_debrief.md).
