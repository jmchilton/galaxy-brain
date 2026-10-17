Two refactor commits now sit right after Baseline tests: the existing form-conversion move (`9aaf33da41d`, unchanged) and the `PARAMETER_VALIDATOR_TYPE_COMPATIBILITY` move from the tool linter into `tool_util_models/parameter_validators.py` (`b61f90bd39a`, pulled forward from `329ca110e1a`). The fix/feature commits replay on top.

## How the work was restructured

- **`9aaf33da41d` kept as is.** It is the move of the validator form conversion from `modules.py` into `workflow_parameter_input_definitions.py`, from the earlier round (see `earlier_drafts/1/baseline_refactor.md`).
- **`b61f90bd39a`: Move validator/parameter type compatibility map to tool_util_models (moved earlier).**
  - Pure move of the linter table out of `lib/galaxy/tool_util/linters/inputs.py`, exported via `__all__`; the linter imports it. No behavior change.
  - Folded in the table's final shape so later commits don't churn it: placed after `DiscriminatedAnySafeValidatorModel`, typed `dict[str, list[ValidatorType]]`. Those bits came from `3541af648f6` and `bff93eaaa87` and are type/layout only.
  - So the replayed `3541af648f6` and `bff93eaaa87` no longer touch `parameter_validators.py`.
- **Re-evaluated, left in place:**
  - `b3ad4e8708d` / `3541af648f6`: they change behavior (save-time type-compat rejection).
  - `7f54a696daa` / `bff93eaaa87`: they change feature-only code (hidden `extra_validators` field, ordering) that does not exist on the base.
  - `1066395348f` / `abf8cb6cde8`: test-only, serving new tests.
  - Earlier-round items (`min <= max`, regex compile check, `parameter_type` hoist, fixture, Selenium helper): same reasoning as before.

## Old → new SHA map

| old | new | subject |
|---|---|---|
| 4a685def277 | 4a685def277 | Baseline tests for workflow parameter input validators |
| 9aaf33da41d | 9aaf33da41d | Move workflow parameter validator form conversion next to parameter input definitions |
| 329ca110e1a | b61f90bd39a | Move validator/parameter type compatibility map to tool_util_models (moved earlier, final shape) |
| 6c344310e3a | 5056fb88a4f | Keep workflow parameter input validators as declared |
| f05583dc8b0 | b9832becd58 | Build workflow parameter validators at save; derive form shape from models |
| 3e44475c896 | fad8d5cf135 | Tighten workflow parameter validator unit tests |
| b184de66754 | dc6f2030ae1 | Share parameter input workflow fixture; assert exact import error |
| 1f35a68b14f | 45796c881b7 | E2E: editor save keeps parameter validators the form cannot show |
| b8a0a715dda | fd41c025473 | E2E: share editor open-by-name helper; screenshot validator form |
| 10eee00396f | 578b3048f9e | Keep fractional integer bounds; reject regex validators that do not compile |
| 3a0384164ee | 32602bf0331 | Pure check_validators beside the form codec; one form-shape table |
| b3ad4e8708d | 30c1bc91aab | Reject workflow parameter validators that do not suit the input type |
| 3541af648f6 | 00f3667f756 | Check validator types for every workflow parameter type (table annotation hunk now in `b61f90bd39a`) |
| 1066395348f | 6c3e7a1d1a6 | Assert full validator type error; test malformed hidden validators |
| 7f54a696daa | 36b0954ce68 | Keep declared workflow parameter validator order; reject malformed lists |
| abf8cb6cde8 | 704fd961686 | E2E: editor-added validator follows the declared hidden one |
| bff93eaaa87 | 57e1cb42c05 | One hidden field for form-hidden validators and their declared positions (blank-line hunk now in `b61f90bd39a`) |

## Verification

- `git diff bff93eaaa87 57e1cb42c05` is empty.
- Each replayed commit differs from its original only in `parameter_validators.py` (and, before the original move point, `linters/inputs.py`), in the table region.
- Pre-commit passed on the new and amended commits. mypy on the two touched files shows the same 23 errors (all elsewhere) as the old head.
- Unit suites run on every new commit and on the originals from the move point onward. Suites: `test_parameter_input_validators.py`, `test_tool_linters.py`, `test_parameter_validator_models.py`, `test_parameter_validation.py`. All passed. Each pair had the same count (e.g. `329ca110e1a` and `32602bf0331` 189; the final head and the old head 210). The new refactor commit alone passed 164.
- API and Selenium tests were not rerun: the final tree is unchanged and their test edits were cherry-picked verbatim.

Pushed to `jmchilton/issue_24200_workflow_input_validators` with `--force-with-lease` on `bff93eaaa87`. New head `57e1cb42c05`.
