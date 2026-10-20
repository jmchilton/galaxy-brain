# Thermo-nuclear review debrief (re-harden)

Acted on the one structural finding in `bff93eaaa87`. The parallel hidden fields `extra_validators` + `extra_validator_positions` are now a single `extra_validators` field holding `[position, validator]` pairs, parsed strictly. This commit also makes three small cleanups. **The client round-trip contract changed:** `extra_validator_positions` is gone and the shape of `extra_validators` changed. No client code names either field, and the Selenium test doesn't either, but E2E should be rerun. Pre-existing and previously decided items were not acted on.

Not acted on:
- The form builder (`InputParameterModule.get_inputs`) still hardcodes the param types that get regex rows and min/max, which restates `FORM_VALIDATOR_SHAPES`. This was decided in the prior round as pre-existing code outside a release-branch fix. Follow-up.
- Each validator is still parsed twice, once in `_non_default_keys` and once in `check_validators`. Prior decision: the cost is small and the functions stay independent.
- Shown-then-hidden ordering when new rows are added. Prior decision; the E2E test pins it.
- `_form_values` in the unit test copies the client's `visitInputs`. Prior decision; E2E covers the gap.
- The codec raises `RequestParameterInvalidException` in `validators_to_form`/`_load_extra_validators`, while `check_validators` raises `ValueError` and the caller wraps it. Both are rejections of request data at import or save, and `check_validators` needs the step label added by its caller. Left as is.
- `min > max` and non-compiling regex are now rejected at the model layer for tools too. This is intended (sample_data covers it) and was reviewed in earlier rounds.

<details><summary>Full review</summary>

Scope: `git diff origin/release_26.2...abf8cb6cde8`. The core is `workflow_parameter_input_definitions.py` (+143), `modules.py` (+~15 net), `parameter_validators.py` (+76, mostly the moved compatibility table), and `linters/inputs.py` (-57). The rest is tests.

1. **Structural / boundary: two parallel hidden arrays with inconsistent failure handling.** `extra_validators` (a list of validators) and `extra_validator_positions` (a list of ints) had to agree by index. A malformed extras list returned a 400. Malformed, missing or length-mismatched positions silently fell back to `sys.maxsize`, so the validators went last. That is a silent fallback papering over an invariant. **Fix:** one field of `[position, validator]` pairs, rejected whole with one 400 message if malformed. This deletes `_load_positions`, the `sys` import, the second `HiddenToolParameter` in `modules.py`, the `zip` and the length check. The fields are new on this branch and never reach persisted state, because `_parse_state_into_dict` emits only `validators`. So there is no compatibility concern.
2. **Spaghetti: an integer special case in `_form_can_show`.** `parameter_type != "integer" or all(isinstance(..., int) ...)` named a parameter type inside a predicate that is otherwise table-driven. **Fix:** a `field_value_type` on `_FormValidatorShape` (`int` for integer, `object` otherwise), checked uniformly. Behavior is identical: bools still pass as ints, and float bounds stay unchecked.
3. **Type contract: `cast(INPUT_PARAMETER_TYPES, parameter_type)` in `check_validators`.** **Fix:** type the parameter as `INPUT_PARAMETER_TYPES` and drop the cast and its import.
4. **Noise:** a stray blank line was added between the two `TypeAdapter`s in `parameter_validators.py`. Removed.
5. **Layering:** the move of `PARAMETER_VALIDATOR_TYPE_COMPATIBILITY` to `tool_util_models` is right, since the linter and workflows now share it. The model validators (`check_expression_compiles`, `check_min_le_max`) are in the right layer. The regex check uses the same `regex`/`re` fallback as runtime.
6. **File size:** `modules.py` was already over 1k lines on base (3660 now, about 12 lines net over base). `workflow_parameter_input_definitions.py` is under 200 lines.
7. **Not acted on:** see the list above.

Tests:
- `test_unsafe_hidden_validator_rejected_at_save` and `test_malformed_hidden_validators_rejected_at_save` hand-build hidden form state. Their inputs were updated to the new contract and no assertion was weakened.
- The malformed-message constant now names the pair shape.
- The malformed cases grew from 3 to 8. New cases: a bare validator entry, a short pair, a string position, a non-dict validator, and a 3-element entry.

Verification:
- Unit suites (test/unit/workflows, test_parameter_validator_models, test_tool_linters, test_parameter_validation): 404 passed, 1 skipped.
- The two branch API tests passed.
- mypy reports no errors in changed files. The only errors are 2 pre-existing ones in `tool_util/parser/parameter_validators.py`, which this branch does not touch.
- Pre-commit (black, ruff, flake8) passed.

</details>
