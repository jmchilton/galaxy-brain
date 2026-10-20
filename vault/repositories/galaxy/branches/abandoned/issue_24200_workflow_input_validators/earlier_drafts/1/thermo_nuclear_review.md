# Thermo-nuclear review debrief

Acted on the main structural finding in commit `407afd3ead1` ("Move workflow parameter validator form codec next to parameter input definitions"). The validator form code now lives in `lib/galaxy/workflow/workflow_parameter_input_definitions.py` as one pair of inverse functions plus a pure check; `modules.py` keeps only the call sites. The two-predicate split now runs off a single shape table. Strengthened one unit assertion to check the full message. Smaller findings are noted below and were not acted on.

Not acted on:
- Form builder (`InputParameterModule.get_inputs`) still hardcodes `param_type == "text"` / `"directory_uri"` / `("integer", "float")`, so it restates `FORM_VALIDATOR_SHAPES`. Changing pre-existing form-building code is out of scope for a release-branch fix. Follow-up: drive the regex repeat and min/max fields from the shape table.
- Cross-group validator order (shown before hidden): already decided in the normal review and documented there.
- Validator/parameter-type compatibility: already deferred. Follow-up: share `PARAMETER_VALIDATOR_TYPE_COMPATIBILITY` from `tool_util_models`.
- `_form_values` in the unit test copies the client's `visitInputs`: already decided, and the E2E test covers the gap.
- Each validator is parsed by its model twice, once in the split and once in the check. The cost is small and it keeps the two functions independent.
- `_load_extra_validators` raises a request exception from the export path when stored state is corrupt. Only a hand-corrupted `extra_validators` hits this; left as is.

<details><summary>Full review</summary>

Scope: `git diff origin/release_26.2...c2314684470` (core: `modules.py` +131, `parameter_validators.py` +16, tests).

1. **Structural: feature logic in a general 3.7k-line module, with the round trip split.** The branch added about 110 lines of validator-specific helpers to `modules.py`. They were five module-level functions, two type-tuple constants, `_check_validators` and a `NoReturn` helper, plus three imports used only by them (`ValidationError`, `DiscriminatedAnyValidatorModel`, `NoReturn`). Source→form lived in `step_state_to_tool_state` and form→source in `_parse_state_into_dict`, about 400 lines apart. The integer-truncation rule exists only because the integer `min`/`max` fields are `IntegerToolParameter`; it can only be checked by reading both directions together. **Fix:** move it into `workflow_parameter_input_definitions.py`, which already owns parameter-input form definitions, as `validators_to_form` / `validators_from_form`. The methods shrink to one call each. `modules.py` goes from +131 to about +15 net over base.
2. **Code judo: two predicates and two type tuples become one table.** `_is_form_regex`/`_is_form_range` re-checked `validator["type"]`, while the caller also checked `parameter_type in FORM_*_PARAMETER_TYPES`. That made two parallel conditions per branch. **Fix:** `FORM_VALIDATOR_SHAPES` maps parameter type to (validator type, form fields), and a single `_form_can_show` reads it. The split loop is now: not showable → extra; regex → row; first range → min/max; any other → extra.
3. **Boundary: `_check_validators` + `_invalid_validator(...) -> NoReturn`.** The `NoReturn` helper existed only to share a message between two except branches. **Fix:** `check_validators` is pure and raises `ValueError(problem)`. `save_to_step` wraps it with the label once, so the `NoReturn` import and helper are gone. The pydantic `ctx["error"]` unwrapping is kept unchanged.
4. **File size:** `modules.py` was already over 1k lines on base. After the move it is 3660 lines, about 15 over base.
5. **Form-builder duplication** (not acted on, see above).
6. **Model validators** (`check_expression_compiles`, `check_min_le_max`): in the right layer, since tools and workflows share them. Nothing to change.
7. **Tests:** the parametrized invalid-validator test matches only the message prefix. The unsafe-validator test now asserts the full message, so the AssertionError path of the pure check is pinned. The full ValidationError message stays pinned by the API test.

Verification: the unit suites (test/unit/workflows, test_parameter_validator_models, test_tool_linters, test_parameter_validation) gave 383 passed, 1 skipped. The two branch API tests (`test_imported_negated_parameter_validator_is_kept`, `test_import_rejects_parameter_range_with_min_greater_than_max`) passed. mypy found no errors in the changed files, and pre-commit (black/ruff/flake8) passed.

</details>
