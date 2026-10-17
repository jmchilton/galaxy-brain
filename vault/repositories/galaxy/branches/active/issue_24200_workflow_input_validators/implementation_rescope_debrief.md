# Re-scope debrief

The scope evaluation recommended expanding modestly, with two items:

- **E1: reconcile with the #24199 branch.** `issue_24199_workflow_numeric_bounds_26.0` lifts the first `in_range` into run-form min/max and ignores `negate`/`message`/`exclude_*`. Once this branch keeps those fields, a negated range would become plain bounds, inverting the input's meaning. That code is not on `release_26.2`, so this branch cannot change it. I recorded it as a merge-order dependency in `index.md`:
  - Whichever lands second must lift only form-showable ranges (`_form_can_show` / `FORM_VALIDATOR_SHAPES`).
  - It must add a runtime test with a negated range.
  - Both branches also edit `workflow_parameter_input_definitions.py`, so expect textual conflicts too.
- **E2: check that each validator type suits the parameter type at save.** Implemented.

Original implementation is kept as `issue_24200_workflow_input_validators_alt_original_scope` (`3a0384164ee`); see [alts/original_scope.md](alts/original_scope.md).

Re-scope commits:
- `329ca110e1a` moves `PARAMETER_VALIDATOR_TYPE_COMPATIBILITY` from the tool linter into `tool_util_models`. This is a pure move; the linter imports it, and the old import path still resolves.
- `b3ad4e8708d` makes `check_validators(parameter_type, validators)` reject unsuited types.
- The third commit (head) covers every workflow parameter type: boolean and color allow none, and the error message lists the allowed types.

Normal review of the re-scope: [subagents/rescope_review_debrief.md](subagents/rescope_review_debrief.md). Its should-fix (boolean/color unchecked) is fixed.

Tests: 391 unit tests passed (workflows, linters, validator models, parameter validation). Both API tests passed at `b3ad4e8708d`. The head commit changed only the type map and the error message, so those API tests were not rerun on it.
