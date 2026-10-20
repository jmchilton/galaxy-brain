# issue_24199_workflow_numeric_bounds_26.0

Status: `ready` — PR [#24212](https://github.com/galaxyproject/galaxy/pull/24212) undrafted by John 2026-10-19 (opened as draft 2026-10-17, title option 1, labels from pr_tags.md; screenshots on `pr-assets-issue_24199_workflow_numeric_bounds_26.0`); CI green on `8df2892c73f` (61 checks), mergeable. Polish: [debrief](polish_debrief.md). Base: `release_26.0` (`a6544be047d`). Head: `8df2892c73f`. Fork: `jmchilton/issue_24199_workflow_numeric_bounds_26.0`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24199_workflow_numeric_bounds_26.0`.

Fixes [#24199](https://github.com/galaxyproject/galaxy/issues/24199): integer/float workflow input bounds were validated server-side but never sent to the run form, so no slider or range warning. Also bounds the editor's Default Value field; inverted saved bounds give a clear 400 and an editor step error.

[PR description](pr_description.md) · [PR titles](pr_titles.md) · [PR tags](pr_tags.md) · [Polish debrief](polish_debrief.md) · [Implementation](implementation_debrief.md) · [Initial implementation](implementation_initial_debrief.md) · [Rescope](implementation_rescope_debrief.md) · [Normal review](subagents/normal_review.md) · [Rescope review](subagents/rescope_review.md) · [K1 review](subagents/k1_review.md) · [Test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Refactor baseline](baseline_refactor.md) · [Scope evaluation](scope_evaluation.md) · [Screenshots](screenshot_debrief.md) · [Alt: original scope](alts/original_scope.md) · [Earlier hardening](earlier_drafts/1/)

## Decisions

- Base `release_26.0`: oldest supported branch with the bug; `FormNumber.vue` and `InputParameterModule.get_runtime_inputs` match 26.1. Fix is small, so no case for a newer base.
- Multiple integer inputs (#23802, #23939) are dev-only. Not tested here; the issue's repro, multiple case included, passes on `origin/dev` with the original-scope fix applied. Forward-merge conflicts are trivial: `parameter_kwds` annotation in `modules.py` (dev) and imports in `test_modules.py` (26.1).
- Expanded scope per scope evaluation: Default Value bounds + inverted-bounds error. Original scope kept as alt branch. `%s` message for rejected `0` left for a separate PR (shared `tool_util_models`).

- Two existing Selenium editor tests now assert FormNumber's clamp + alert instead of the server run error (behavior change from the fix). Needs John's OK.
- John chose K1 (second scope evaluation): `get_errors()` flags inverted bounds in the editor.

## Follow-ups

- K2: live inverted-bounds feedback via `build_module`; editor save drops step errors.
- `step_state_to_tool_state` collapses persisted `in_range` validators (drops `negate`, `exclude_*`, `message`; last wins).
- Rejected value `0` leaves `%s` in validator messages.
- Merge order with [#24282](https://github.com/galaxyproject/galaxy/pull/24282) (keeps declared validators — negate, multiple ranges; absorbed the abandoned `issue_24200_workflow_input_validators`): `split_numeric_bounds` assumes one collapsed inclusive `in_range`; whichever lands second must handle the other.
