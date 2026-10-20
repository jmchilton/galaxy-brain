# Implementation debrief

**STATUS: READY.** Head `57e1cb42c05` on `jmchilton/issue_24200_workflow_input_validators`, base `release_26.2`. Fixes [#24200](https://github.com/galaxyproject/galaxy/issues/24200). Fork CI has not run yet.

## Final implementation
- **Validators kept as declared.** Workflow parameter input validators survive import, storage, export, run and editor re-save as declared.
  - The editor form shows non-negated regex rows (text, directory_uri) and the first plain in_range (integer, float; integer only with integer bounds).
  - Everything else travels in one hidden form field, `extra_validators`, as `[position, validator]` pairs, so the declared order and the first reported error are kept.
  - Changing the parameter type in the editor drops hidden validators.
- **Converter moved to a reusable spot.** Form conversion lives in `workflow_parameter_input_definitions.py` as `validators_to_form`, `validators_from_form` and `check_validators`. `modules.py` keeps only the call sites.
- **Invalid validators rejected on save (400, naming the input).** `InputParameterModule.save_to_step` (import, editor save, refactor) rejects:
  - validators that cannot be built at runtime: malformed lists or entries, unsafe types, `min > max` (in_range and length), uncompilable regex;
  - validator types that don't suit the parameter type. This uses the tool linter's table, moved to `tool_util_models`. Boolean and color allow none.
  - Loading stored workflows does not check, so existing ones still open.
- **Validator models.** `InRangeParameterValidatorModel` rejects `min > max`; `RegexParameterValidatorModel` rejects expressions that don't compile. Both apply to tools as well. A bad tool already failed at parameter construction; it now fails at parse/lint time. No regex in the repo's tool XML fails to compile.
- **No-op range dropped.** Empty min/max fields no longer store an `in_range {min: null, max: null}`.

## Commit layout
1. `4a685def277` Baseline tests: they pass on base.
2. `9aaf33da41d` and `b61f90bd39a`: no-behavior refactors (form converter move; compatibility table move).
3. Feature, test and E2E commits. The old→new SHA map is in [baseline_refactor.md](baseline_refactor.md).

## Validation (final tree)
- **Unit:** ~404 related unit tests pass (workflows, linters, validator models, parameter validation). Every non-baseline case is red on base.
- **API:** `test_imported_negated_parameter_validator_is_kept` and `test_import_rejects_parameter_range_with_min_greater_than_max` pass and are red on base.
- **E2E:** `test_parameter_editor_save_keeps_validators_the_form_cannot_show` passes under Playwright (headless) and Selenium after the last contract change.

## Process
- Normal review.
- Hardening round 1: test challenge, E2E polish, Codex (2 fixed), thermo-nuclear (code move), refactor baseline.
- Scope evaluation: recommended expanding.
- Re-scope: added the type-compatibility check. The original is kept as `_alt_original_scope`.
- Re-scope review: boolean/color fixed.
- Re-harden: test challenge, E2E polish, Codex (order kept, malformed entries now 400), thermo-nuclear (one hidden field).
- Refactor baseline: the table move went ahead of the fix.
- Second scope evaluation: **keep**.

## Open items / decisions for John
- **#24199 merge order.** That branch (BLOCKED on K1) lifts the first in_range into run-form bounds and ignores `negate`/`message`/`exclude_*`. Whichever branch lands second must lift only form-showable ranges. Existing tests go red on a naive merge, so it is detectable.
- **Hidden validators** are not visible in the editor. An invalid one blocks re-save until it is fixed by re-import or a type change. Existing stored workflows can't hold such validators.
- **Follow-ups, not in this branch:**
  - `raise_error_if_validation_fails` leaves a literal `%s` in the message when rejecting a falsy value such as `0`. This is pre-existing and suits a one-line PR on `release_26.0`.
  - `POST /api/workflows/upload` returns 500 for a `.ga` without `annotation`.
  - A `get_errors()` editor warning for stored invalid validators should be decided with #24199's K1.
  - The `get_inputs` form builder could be driven by `FORM_VALIDATOR_SHAPES`.
- **PR split:** the scope evaluation lists options of 1, 2 or 4 PRs.
