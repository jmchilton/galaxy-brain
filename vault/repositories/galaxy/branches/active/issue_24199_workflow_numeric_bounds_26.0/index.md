# issue_24199_workflow_numeric_bounds_26.0

Status: BLOCKED — scope decision (see [implementation debrief](implementation_debrief.md)). Base: `release_26.0` (`a6544be047d`). Head: `564b40c3839`. Fork: `jmchilton/issue_24199_workflow_numeric_bounds_26.0`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24199_workflow_numeric_bounds_26.0`.

Fixes [#24199](https://github.com/galaxyproject/galaxy/issues/24199): integer/float workflow input bounds were validated server-side but never sent to the run form, so no slider or range warning. Also bounds the editor's Default Value field and turns inverted saved bounds into a clear 400.

[Implementation](implementation_debrief.md) · [Initial implementation](implementation_initial_debrief.md) · [Rescope](implementation_rescope_debrief.md) · [Normal review](subagents/normal_review.md) · [Rescope review](subagents/rescope_review.md) · [Test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Refactor baseline](baseline_refactor.md) · [Scope evaluation](scope_evaluation.md) · [Alt: original scope](alts/original_scope.md) · [Earlier hardening](earlier_drafts/1/)

## Decisions

- Base `release_26.0`: oldest supported branch with the bug; `FormNumber.vue` and `InputParameterModule.get_runtime_inputs` match 26.1. Fix is small, so no case for a newer base.
- Multiple integer inputs (#23802, #23939) are dev-only. Not tested here; the issue's repro, multiple case included, passes on `origin/dev` with the original-scope fix applied. Forward-merge conflicts are trivial: `parameter_kwds` annotation in `modules.py` (dev) and imports in `test_modules.py` (26.1).
- Expanded scope per scope evaluation: Default Value bounds + inverted-bounds error. Original scope kept as alt branch. `%s` message for rejected `0` left for a separate PR (shared `tool_util_models`).

- Two existing Selenium editor tests now assert FormNumber's clamp + alert instead of the server run error (behavior change from the fix). Needs John's OK.
- Decision pending: add `get_errors()` override for inverted bounds (K1), ship as is, or ship alt original scope.

## Follow-ups

- Editor saves min > max without warning (needs `get_errors()` + `build_module` merge).
- `step_state_to_tool_state` collapses persisted `in_range` validators (drops `negate`, `exclude_*`, `message`; last wins).
- Rejected value `0` leaves `%s` in validator messages.
