# issue_24200_workflow_input_validators

Status: READY, needs fork CI (2026-10-17). Head `57e1cb42c05`.

Keeps workflow parameter input validators as declared through import, export, run and editor re-save. Rejects invalid ones at import with a 400: `min > max`, uncompilable regex, unsafe types, and types unsuited to the input. Fixes [#24200](https://github.com/galaxyproject/galaxy/issues/24200).

Worktree: `~/projects/worktrees/galaxy/branch/issue_24200_workflow_input_validators`. Remote: `jmchilton/issue_24200_workflow_input_validators`. Alt: [original scope](alts/original_scope.md).

Base: `release_26.2`. The bug dates to #19092, so older releases are affected too. The fix still targets a recent release, per John's preference for intricate fixes: it carries an editor round trip (a hidden form field) and changes the published `tool_util_models` package.

[Implementation](implementation_debrief.md) · [Initial implementation](implementation_initial_debrief.md) · [Re-scope](implementation_rescope_debrief.md) · [Normal review](subagents/normal_review_debrief.md) · [Re-scope review](subagents/rescope_review_debrief.md) · [Test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Codex](codex_review.md) · [Thermo-nuclear](thermo_nuclear_review.md) · [Refactor baseline](baseline_refactor.md) · [Scope evaluation](scope_evaluation.md) · [First hardening round](earlier_drafts/1/)

## Dependency: #24199 branch

`issue_24199_workflow_numeric_bounds_26.0` sends the first `in_range` to the run form as plain min/max. It ignores `negate`, `message` and `exclude_*`. Once this branch keeps those fields, that would invert a negated range. Whichever branch lands second must change this:
- lift only ranges the form can show (`_form_can_show` / `FORM_VALIDATOR_SHAPES`);
- add a negated-range runtime test.

Both branches edit `workflow_parameter_input_definitions.py`.
