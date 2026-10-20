Fix 🎯 #24199 - workflow integer/float input bounds now reach the run form, so users get the slider and range warning instead of a failed submission.

A workflow author can set a minimum and maximum on an integer or float input in the editor. Galaxy enforces them on the server, but the run form never receives them. The user sees a plain number box, types `7` into a 1–5 input, and only learns it was wrong when submission fails:

| Before (`release_26.0`) | After |
|---|---|
| ![before](screenshots/before_run_form_bounds_1_5_submit_error.png) | ![after](screenshots/after_run_form_bounds_1_5_out_of_range.png) |
| No slider, no warning. `7` is accepted until **Run Workflow** returns `Value ('7') must fulfill (1 <= value <= 5)`. | Slider beside the field. `7` triggers "7 is out of range! (7 > 5)" and the value is corrected to `5` before submitting. |

***Server validation is unchanged: API and invocation requests get an equivalent range check with the same messages. This PR only gives the form the bounds Galaxy was already enforcing.*** The one server-side difference is saved inverted bounds (min > max), which now get a 400 naming the input instead of a 500.

***Out-of-range values are corrected on blur with a visible "N is out of range!" alert, which is how bounded tool inputs already behave.*** ***Bounds are still stored and exported as an `in_range` validator; only the form receives them as `min`/`max`.*** ***Tool forms change only at two `FormNumber` edge cases: a min-only field now corrects to the min instead of emptying, and clearing a bounded field no longer snaps it to a bound.***

<details><summary>More before/after</summary>

**Minimum only (min 4).** Before: `2` accepted with no warning. After: "2 is out of range! (2 < 4)", corrected to `4`. No slider, which needs both bounds.

| Before | After |
|---|---|
| ![](screenshots/before_run_form_min_only.png) | ![](screenshots/after_run_form_min_only_clamped.png) |

**Editor Default Value field (bounds 1–5).** Before: the Default field holds `9`. After: the field is bounded like the run form and corrects `9` to `5`.

| Before | After |
|---|---|
| ![](screenshots/before_editor_default_value_out_of_range.png) | ![](screenshots/after_editor_default_value_out_of_range.png) |

**Saved inverted bounds (min 5, max 1).** Before: the editor loads it with no sign of a problem, and the run form fails with "Uncaught exception in exposed API method:" (a 500). After: the editor's existing "Issues loading this workflow" step error names the input, and the run form returns a 400 with the same message. While editing, the node shows the same error as soon as min > max is entered and clears it once fixed.

| Before | After |
|---|---|
| ![](screenshots/before_editor_inverted_bounds_load.png) | ![](screenshots/after_editor_inverted_bounds_load_modal.png) |
| ![](screenshots/before_run_form_inverted_bounds.png) | ![](screenshots/after_run_form_inverted_bounds.png) |

</details>

<details><summary>What changed</summary>

- **Run form** (`InputParameterModule.get_runtime_inputs`): the editor's `in_range` validator is passed to the integer/float parameter as `min`/`max`. The parameter adds an equivalent implicit range validator, so validation runs once with the same messages (`test_parameter_input_range_is_validated_once` pins them).
- **Editor Default Value** (`get_inputs` → `get_default_parameter`): the same bounds, using shared helpers `split_numeric_bounds` / `numeric_bounds_inverted` in `workflow_parameter_input_definitions.py`.
- **Inverted bounds**: `get_runtime_inputs` raises `RequestParameterInvalidException` naming the input. `InputParameterModule.get_errors()` returns the same message, so the editor's existing step-error path (load modal, red node, import validation errors) reports it. `build_module` now falls back to `module.get_errors()` when the form has no parameter errors, so the node flags it live; load already sent these step errors as a string, so the client needs no change. The editor's Default field falls back to unbounded so the author can still open and fix the step.
- **`FormNumber.vue`**, two fixes needed once workflows send one-sided bounds and optional bounded fields:
  - Min-only fields corrected an out-of-range value to `null` (`value > this.max` with `max: null` picked the wrong branch). They now correct to the minimum.
  - Clearing a bounded field warned and snapped to a bound, because `""` compared as 0. An empty field is now treated as unset; a required field stays empty and the form's required-value check reports it.

  Both also apply to tool inputs with these bounds.

</details>

## Risks

The main one-way risk is behavioral: existing bounded workflow inputs now correct out-of-range values in the browser, and workflows with saved inverted bounds are flagged with a step error in the editor and on import.

<details><summary>Risk Details</summary>

- Every existing workflow whose integer/float input has bounds gets the alert and value correction on its run form, and a slider if both bounds are set. A user who typed an out-of-range value used to get a server error; now the value is corrected to the bound on blur, with an alert that dismisses itself after 4 seconds.
- Workflows with saved `min > max` now show a step error in the editor and on import (`has_errors`, a warning that blocks nothing). They could not run before either: the run form returned a 500. After the load modal, the editor also marks the workflow "(unsaved changes)".
- `split_numeric_bounds` reads the first `in_range` validator as plain inclusive `min`/`max`. On `release_26.0`, `step_state_to_tool_state` already reduces persisted range validators to that shape (dropping `negate`/`exclude_*`), so the form shows what the server enforces. `issue_24200_workflow_input_validators` (in progress) preserves those flags, so whichever of the two lands second has to reconcile them.
- The `FormNumber` fixes reach tool inputs: a tool parameter with only a `min` now corrects to the min instead of emptying the field, and clearing a bounded tool field no longer snaps it to a bound.
- `build_module` now returns `module.get_errors()` for every step type while editing (e.g. a tool that isn't installed, or a subworkflow's step errors). These are the messages the editor already shows on load; they now also appear after an edit instead of being cleared until reload.

</details>

<details><summary>Risk Review Advice</summary>

Check that silent correction on blur is the right UX for workflow inputs. It is what bounded tool inputs already do, and it is why two existing Selenium tests changed (see the checklist). Also check the `get_runtime_inputs` change in `modules.py`, which now strips the `in_range` validator and passes it as `min`/`max`; validation and its messages should be identical.

</details>

## Context

Range bounds for workflow inputs came from 🔀 #19092, which saved them as validators but never passed them to the run-form field. Found while recording screenshots for 🌿 [`issue_21015_multiple_text_param`](https://github.com/jmchilton/galaxy/tree/issue_21015_multiple_text_param). ***Targets `release_26.0`, the oldest supported release with the bug; the touched code is the same on 26.1.*** Multiple integer inputs (🔀 #23802, 🔀 #23939) exist only on `dev` and have the same gap. The issue's repro, including the multiple-integer case, passes on `dev` with this PR's run-form change applied; the merge conflicts are trivial. Alternative kept on 🌿 [`issue_24199_workflow_numeric_bounds_26.0_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/issue_24199_workflow_numeric_bounds_26.0_alt_original_scope): the run-form fix and `FormNumber` fixes only, without the editor Default Value bounds and the inverted-bounds error.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Expanded slightly: inverted bounds are now also flagged where they are entered (the editor), not only where they fail.</summary>

- Kept: run-form bounds, the `FormNumber` fixes, the editor Default Value bounds the issue names as a related follow-up, and a 400 instead of a 500 for inverted bounds.
- Added: `get_errors()` reports inverted bounds through the existing step-error path, in about 10 lines that reuse the branch's helpers. Review follow-up: `build_module` reports it live while editing.
- Deferred:
  - surfacing step errors in the editor's save response (save drops them today)
  - `%s` left in validator messages when the rejected value is `0` (shared `tool_util_models`)
  - flagging or correcting out-of-range saved defaults (would change behavior on existing data; `FormNumber` only range-checks on change, so a saved `9` with bounds 1–5 shows `9` beside a slider at `5`)
  - carrying bounds as bounds instead of round-tripping through a validator (export-contract change)
- Contracting to the original scope was rejected: it keeps the 500 and doesn't avoid the Selenium assertion change.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural blockers; one test-helper fix applied.</summary>

- Applied: the unit-test helper picks editor-form conditional cases by value instead of position.
- Not acted on:
  - The `min`/`max` → `in_range` → `min`/`max` round trip is the main missed simplification, but it is the persisted/export contract, so it's a follow-up.
  - Decomposing the pre-existing `get_runtime_inputs` and splitting `InputParameterModule` out of `modules.py` are follow-ups.
- The two callers' split-then-check blocks stay separate on purpose: the editor ignores inverted bounds, while the run form raises.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Every bug-asserting unit test fails on the base at its own assertion; API tests added; two Selenium tests updated for the new behavior.</summary>

- Head `test_modules.py` against base lib, re-run on the final head: 10 failures, each at its bounds assertion (`(None, None)`, or base's `AssertionError: min must be less than or equal to max` for inverted bounds). The rest pass, including the no-errors check for ordered bounds. Head `FormNumber.test.js` against base: 2 failures (min-only `[null]` vs `[5]`; alert shown on clear).
- The API tests' base failures were traced through the code (`(None, None)` bounds; `AssertionError` → 500), not run.
- Added `test_numeric_input_bounds_reach_run_form`, `test_numeric_input_inverted_bounds_rejected_on_run_form` and an editor-view inverted-bounds test, using gxformat2 `tool_state.validators`.
- Unit tests go through public module outputs (`to_dict`, `validate`, `get_export_state`, `get_inputs`, `get_errors`); the only mock is the shared `MockTrans`.

</details>

### ✅ Second Frontier Model Review

<details><summary>Codex reviewed the branch after the rescope, before the inverted-bounds step error was added: no findings.</summary>

It ran the workflow module and `FormNumber` tests (78 and 11 passed). API and Selenium were run separately.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Baseline tests, the FormNumber helper extraction and the populator helper land as behavior-preserving leading commits.</summary>

1. Baseline tests (pass on base).
2. Extract `FormNumber` range-bound helpers.
3. Add the `download_workflow_raw` populator helper.

The fix commits follow. `split_numeric_bounds` couldn't be extracted first because stripping the validator changes behavior on base.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? An "N is out of range!" alert with the value corrected to the bound; for saved inverted bounds, a 400 and an editor step error naming the input and both bounds.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes - they go through `get_runtime_inputs`/`to_dict`/`validate`, `get_inputs`, `get_errors`; vitest checks emitted values and the rendered alert.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes - `ff63ec6ce77`, test-only, passes on base.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? Bounded integer/float inputs get run-form correction (and a slider with both bounds); inverted-bounds workflows get a 400 instead of a 500 and an editor step error. See Risks.
- [x] Who hits this in practice and what is the evidence? Any workflow with input bounds, since #19092. No outside report: it was found while recording screenshots for another branch, and the issue has a module-level repro.
- [x] Were simpler or existing approaches considered? Yes - see details.

<details><summary>Alternatives considered</summary>

- **Interpret validators in the client.** This would be a second copy of validator semantics (negation, exclusive ends) for something `FormNumber` already supports through `min`/`max`.
- **Range help text only.** It helps discoverability, but there's still no warning or correction.
- **Original scope only** (alt branch above). It leaves the editor Default field unbounded and keeps the 500 for inverted bounds.

</details>

<details><summary>Two existing Selenium tests changed assertions</summary>

`test_int_parameter_minimum_validation` and `test_float_parameter_maximum_validation` asserted the server's run error (`Value ('3') must fulfill (4 <= value <= +infinity)`). With bounds on the run form, `FormNumber` corrects the value on blur, so that error can't be reached from the UI any more. They now assert the alert ("3 is out of range! (3 < 4)") and the corrected value, which makes them the feature's end-to-end tests. The exact server messages are still pinned by `test_parameter_input_range_is_validated_once`.

</details>

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
  <details><summary>Tests</summary>

  - `test/unit/workflows/test_modules.py`: bounds reach the run form (int, float, single-bound, coerced float), are validated once with unchanged messages, bound the editor Default field (including after bounds are edited, in `build_module` order), inverted bounds raise / flag `get_errors()`, and cleared bounds count as unbounded (`split_numeric_bounds`).
  - `lib/galaxy_test/api/test_workflows.py`: run-form bounds, the inverted-bounds 400, and inverted bounds flagged in the editor view and `.ga` export.
  - `lib/galaxy_test/api/test_workflow_build_module.py`: `build_module` flags inverted bounds and clears the error once fixed.
  - `FormNumber.test.js`: single-bound correction and clearing an optional or required bounded field.
  - `lib/galaxy_test/selenium/test_workflow_editor.py`: the two updated editor-to-run-form tests above, with screenshots.

  </details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
