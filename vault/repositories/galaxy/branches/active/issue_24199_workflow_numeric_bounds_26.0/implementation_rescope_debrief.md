# Rescope debrief

Scope evaluation recommended expanding modestly (Default Value bounds, clear min > max error, `%s` substitution for a rejected `0`).

- Original scope kept as alt `issue_24199_workflow_numeric_bounds_26.0_alt_original_scope` (`bfe5dc0e49f`, pushed); see [alts/original_scope.md](alts/original_scope.md).
- Took items 1 and 2 together: inverted bounds would otherwise crash the editor once the Default field gets bounds.
  - Shared helpers `split_numeric_bounds` / `numeric_bounds_inverted` in `workflow_parameter_input_definitions.py`; `get_default_parameter` takes optional bounds. Run form and editor both use them.
  - Run form: inverted bounds → `RequestParameterInvalidException` naming the input (was `AssertionError` / 500 before and after the original fix).
  - Editor: inverted bounds → Default field unbounded, so the step can still be opened and fixed.
- Skipped item 3: shared `tool_util_models` change touching every tool validator message; separate PR.
- Verified risk the advisor flagged: the editor's `build_module` validates against bound-less inputs (client sends no `tool_state`), so out-of-range defaults are kept with no errors; bounds only reach the returned `config_form`. Load/save/encode don't validate.
- Editor baseline test (state round-trip with bounds, out-of-range default, inverted bounds) folded into the "Baseline tests" commit via autosquash; history rewritten, pushed with `--force-with-lease`.
- Post-rescope normal review: [subagents/rescope_review.md](subagents/rescope_review.md).

Commits (base `a6544be047d`): `1dfbd1a315e` baseline tests · `0b669d05e24` FormNumber helpers · `29632626da8` run-form bounds · `0f19170699f` clear optional fields · `2f7bb5d3251` Default Value bounds + inverted error · `4b85664fbe9` review fixes.
