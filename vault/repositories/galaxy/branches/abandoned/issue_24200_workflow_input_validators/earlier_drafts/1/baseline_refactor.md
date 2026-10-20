One refactor commit (`9aaf33da41d`) now sits right after Baseline tests. It moves the persisted-to-form validator conversion out of `InputParameterModule` (`modules.py`) into `validators_to_form` / `validators_from_form` in `lib/galaxy/workflow/workflow_parameter_input_definitions.py`, with base behavior unchanged.

## How the work was restructured

- **`9aaf33da41d`: Move workflow parameter validator form conversion next to parameter input definitions.**
  - Pure move.
  - Base semantics kept exactly:
    - every `in_range` sets min/max, so the last one wins;
    - non-regex/range validators are dropped;
    - empty min/max fields still store a no-op `in_range`, because the check is on key presence;
    - `["type"]` / `["regex_doc"]` key access and the dict field order are unchanged.
  - `modules.py` keeps the call sites and the persisted-vs-form comment.
  - Passes the baseline tests and all of `test/unit/workflows/` (201 passed, 1 skipped).
- **Feature commits replayed on top.** Their codec changes now land in the definitions module instead of `modules.py`, so the feature diffs show only behavior changes.
  - Save-time checking stayed in `modules.py` (`_check_validators`) until the last commit, as in the original history.
  - Imports arrive and leave in the commit that first uses or stops using them. Pre-commit (black, ruff, flake8) passed on each rebuilt commit.
- **The last commit shrank.** It was "Move workflow parameter validator form codec next to parameter input definitions". The move is now done by the refactor commit, so it is renamed "Pure check_validators beside the form codec; one form-shape table". It covers the `check_validators` move, `FORM_VALIDATOR_SHAPES` / `_form_can_show`, and the full unsafe-message assertion.
- **Final tree is identical** to the old head `407afd3ead1`: `git diff 407afd3ead1 3a0384164ee` is empty.

## Old → new SHA map

| old | new | subject |
|---|---|---|
| 4a685def277 | 4a685def277 | Baseline tests for workflow parameter input validators |
| — | 9aaf33da41d | Move workflow parameter validator form conversion next to parameter input definitions (new) |
| 03fd85e66b8 | 6c344310e3a | Keep workflow parameter input validators as declared |
| aa9c800d947 | f05583dc8b0 | Build workflow parameter validators at save; derive form shape from models |
| 268792420f2 | 3e44475c896 | Tighten workflow parameter validator unit tests |
| d97b82b214c | b184de66754 | Share parameter input workflow fixture; assert exact import error |
| 62e1cffa585 | 1f35a68b14f | E2E: editor save keeps parameter validators the form cannot show |
| 85c6410c28d | b8a0a715dda | E2E: share editor open-by-name helper; screenshot validator form |
| c2314684470 | 10eee00396f | Keep fractional integer bounds; reject regex validators that do not compile |
| 407afd3ead1 | 3a0384164ee | Pure check_validators beside the form codec; one form-shape table (was "Move ... codec ...") |

Pushed to `jmchilton/issue_24200_workflow_input_validators` with `--force-with-lease` on `407afd3ead1`. New head `3a0384164ee`.

## Verification

- Each rebuilt commit and its original was run against these suites:
  - `test_parameter_input_validators.py`
  - `test_tool_linters.py`
  - `test_parameter_validator_models.py`
  - `test_parameter_validation.py`
  - `test_validation_parsing.py`
- Every pair gave identical counts.
- API and Selenium tests were not rerun. The final tree is unchanged, and the intermediate API/E2E test edits were cherry-picked verbatim.

## Considered, left in place

- `InRangeParameterValidatorModel` `min <= max` check and `RegexParameterValidatorModel` compile check: these change behavior (stricter tool parsing), so they are not refactors.
- `parameter_type` hoist in `step_state_to_tool_state`: trivial, and it only exists to feed the new `validators_to_form(parameter_type, ...)` argument. It stays with the feature.
- `parameter_input_workflow` fixture in `workflow_fixtures.py` and the API test sharing: test-only, serving the new tests.
- `workflow_editor_open_with_name` Selenium helper (`b8a0a715dda`): it also rewrites the pre-existing `open_in_workflow_editor`. It was left in place so an unverified Selenium change would not move into the base.
