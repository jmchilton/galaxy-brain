# Scope evaluation

**Recommendation: expand modestly.** Keep the branch as implemented and add two things. (E1) Reconcile with the sibling #24199 branch (`issue_24199_workflow_numeric_bounds_26.0`). Its `split_numeric_bounds` lifts the first `in_range` into plain `min`/`max` and ignores `negate`, `message` and `exclude_*`. Today that is harmless, because import strips those fields. Once this branch keeps them, a negated range would become plain bounds when #24199 merges forward, and the input's meaning would invert. Lift only a range the form can show (reuse `_form_can_show` / `FORM_VALIDATOR_SHAPES`), and land a runtime test with a negated range. (E2) Check at save that each validator type suits the workflow parameter type (e.g. reject `in_range` on text or boolean, and regex on integer). Share the tool linter's `PARAMETER_VALIDATOR_TYPE_COMPATIBILITY` map from `tool_util_models`, extended with workflow-only types. This closes the same gap gxformat2#266 tracks on the Format2 side and reuses the save-time check this branch already adds. Keep the editor UI for hidden validators, cross-group order, the form-builder refactor and the `/api/workflows/upload` missing-`annotation` 500 out of this branch.

## Possible Decompositions

About 480 added lines (+479/-45). Of these, about 190 are non-test code: `workflow_parameter_input_definitions.py` +112, `modules.py` net +16, `parameter_validators.py` +16, plus test fixtures and helpers. Not a recommendation; for John to decide later.

**Option 1: three PRs, in order**
1. *Validator model checks* (`tool_util_models`): `min <= max` on `InRangeParameterValidatorModel`, a compile check on `RegexParameterValidatorModel`, and the two invalid XML samples. This makes tool parsing and linting stricter, so it stands alone and is reviewable by tool-util people.
2. *Workflow round trip*: Baseline tests, the pure move (`9aaf33da41d`), then the keep-as-declared codec, the hidden `extra_validators` field, `check_validators` at save, and the unit and API tests. Without piece 1, an inverted range is still caught at save, because `to_validators` asserts on it. A regex that does not compile is not caught.
3. *E2E*: the Selenium/Playwright editor-save test, the `workflow_editor_open_with_name` helper and the screenshot.

**Option 2: two PRs.** First the Baseline tests and the pure move, as a no-behavior refactor. Then everything else.

**Option 3: one PR** (as is), with the commits already ordered so that options 1 and 2 can be cut later.

If E1/E2 are taken, each goes on top of piece 2 as its own commit.

## Scopes considered

### A. As implemented

Persisted validators round-trip unchanged through import, export, runtime and editor re-save. The editor form shows what it can, and everything else goes into a hidden JSON field. Invalid or unsafe validators give a 400 at import. The model layer now rejects `min > max` and regexes that do not compile.

| Pros | Cons |
| --- | --- |
| <ul><li>Fixes every row of the issue table, plus the `min > max` gap and two Codex finds (fractional integer bounds, regexes that do not compile).</li><li>Reviewed four times (normal, test challenge, Codex, thermo-nuclear), red-to-green, with E2E proof that the real client posts the hidden field.</li><li>Stored workflows still load. Only new saves are checked.</li></ul> | <ul><li>Collides with the #24199 branch: both change `get_runtime_inputs` and `workflow_parameter_input_definitions.py`, and #24199's bound split ignores `negate` (see E1).</li><li>Accepts validators that do not suit the parameter type, e.g. `in_range` on text, which fails oddly at run time.</li><li>Hidden validators are invisible in the editor, and an invalid one blocks re-save.</li></ul> |

### E1. + Reconcile with #24199 bound lifting (recommended)

Whichever branch lands second on 26.2 makes `split_numeric_bounds` lift only a showable range: non-negated, no `message`, no `exclude_*`, and integer bounds for integer inputs. Other ranges stay validators. Add a `get_runtime_inputs` test showing a negated `in_range` still rejects in-range values and still sends no `min`/`max`.

| Pros | Cons |
| --- | --- |
| <ul><li>Prevents a real inversion bug that only shows up once both fixes are merged. Reviewers would expect the branch that preserves `negate` to own this.</li><li>Small: reuse `_form_can_show`, so the two splits cannot drift.</li><li>The existing `test_imported_validators_are_kept` rows already go red on a naive merge, so the gap is detectable. Adding the test makes the intent explicit.</li></ul> | <ul><li>Depends on merge order: #24199 targets 26.0, this branch 26.2. The fix lands either as a forward-merge resolution or as a follow-up commit here once 26.0 has been merged into 26.2.</li><li>Also overlaps #24199's runtime `min > max` error. With this branch's save-time 400, that error only fires for stored workflows. Keep both.</li></ul> |

<details><summary>Details</summary>

#24199 (head `2f7bb5d3251`) adds `split_numeric_bounds(parameter_def)`. It takes `next(v for v in validators if v["type"] == "in_range")`, removes it from the list and passes `{min, max}` as parameter kwargs. The parameter then rebuilds a plain `InRangeValidator.simple_range_validator`. A stored `{in_range 1-5, negate: true}`, which this branch now preserves, would become "must be 1-5", the opposite of what is declared. A range's `message` and `exclude_*` would be lost the same way. The same split feeds the editor Default Value bounds in `get_inputs`. Predicate to reuse: `_form_can_show(parameter_type, v)` in `workflow_parameter_input_definitions.py`, which already encodes "plain range the min/max fields can carry". Both branches change `workflow_parameter_input_definitions.py` in neighbouring places, so a textual merge conflict is likely anyway.

</details>

### E2. + Validator/parameter-type compatibility at save (recommended)

`check_validators` also takes the parameter type and rejects validator types that do not suit it. The map moves from `tool_util/linters/inputs.py` into `tool_util_models` (the linter imports it back), with entries added for `directory_uri`, `color` and `boolean`.

| Pros | Cons |
| --- | --- |
| <ul><li>Finishes "reject invalid validators at import", which the branch already claims. Mismatched types are the main invalid input it still lets through.</li><li>Matches gxformat2#266 ("min/max on non-numeric inputs is accepted"). Galaxy and Format2 then reject the same things.</li><li>Gives the map one home that the linter and workflows share, instead of a second copy.</li></ul> | <ul><li>Needs decisions about what `directory_uri`, `color` and `boolean` accept. `length` on directory_uri is the one unclear case.</li><li>A second published-package change in `tool_util_models` (a move plus re-export).</li><li>Adds about 30-50 lines with tests. Moderate for a release branch.</li></ul> |

### E3. + `/api/workflows/upload` 500 on missing `annotation` (not recommended here)

`build_workflow_from_raw_description` does `data["annotation"]` (managers/workflows.py ~924). A `.get` turns the 500 into a normal import.

| Pros | Cons |
| --- | --- |
| <ul><li>One line, found while writing this branch's API tests.</li></ul> | <ul><li>Not in touched code and not about validators. It would muddy the PR.</li><li>Better as its own tiny PR or queued issue (via `GX_QUEUING_ISSUE_CREATION.md`).</li></ul> |

### E4. + Show or edit hidden validators in the editor (not recommended)

Show `extra_validators` in the editor as a read-only list, or make them editable (negate toggle, multiple ranges, messages).

| Pros | Cons |
| --- | --- |
| <ul><li>Removes the "invisible validator blocks re-save" trap.</li><li>Makes Format2 `validators` (gxformat2#265) authorable in the UI.</li></ul> | <ul><li>A client feature with new form components. Too much for a 26.2 bug fix.</li><li>Low current risk: editor-made workflows only hold form-shaped validators.</li></ul> |

### E5. + Keep cross-group validator order (not recommended)

Record positions so that shown and hidden validators keep the order they had.

| Pros | Cons |
| --- | --- |
| <ul><li>Exact `.ga` fidelity.</li></ul> | <ul><li>Only changes which failure message is shown first. The accept/reject result is unaffected.</li><li>Needs a position-tracking scheme in the hidden field: complexity for little gain.</li></ul> |

### E6. + Build the editor form from `FORM_VALIDATOR_SHAPES` (optional, not recommended)

`InputParameterModule.get_inputs` would read the regex repeat and min/max fields from the shape table instead of hardcoded `param_type` checks.

| Pros | Cons |
| --- | --- |
| <ul><li>Removes the last duplicated copy of "what the form shows" (thermo-nuclear follow-up).</li></ul> | <ul><li>A pure refactor of pre-existing form building, with no user-visible fix.</li><li>Fits a dev follow-up better.</li></ul> |

### C1. Contract: drop the `tool_util_models` model checks

Leave out `check_min_le_max` and `check_expression_compiles`, and rely on `to_validators` at workflow save.

| Pros | Cons |
| --- | --- |
| <ul><li>No stricter tool parsing on a release branch, and no published-package change.</li></ul> | <ul><li>Regexes that do not compile would again pass import and fail at run time (Codex P2).</li><li>Tools would keep failing late, at parameter construction, instead of at lint time.</li><li>Removes a reusable check from the layer tools and workflows share.</li></ul> |

### C2. Contract: fix import/export only, without the editor round trip

Keep validators off the form state on import (no hidden field), and leave editor re-save as it is.

| Pros | Cons |
| --- | --- |
| <ul><li>Smaller server diff, with no client-facing field.</li></ul> | <ul><li>Any editor save (even a label change) would still drop `negate`, which is the same inversion bug.</li><li>Leaves the issue only half fixed. Not viable.</li></ul> |
