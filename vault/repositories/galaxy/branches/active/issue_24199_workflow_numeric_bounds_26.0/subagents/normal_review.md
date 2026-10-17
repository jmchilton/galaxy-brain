# Normal review debrief

Acted on M1 (optional bounded field could not be cleared: `""`/null compared as 0 against `min`; early return in `isOutOfRange` + red→green test), N1 (to_dict test no longer takes unused params; added float-with-int-bounds and None/None cases), N2 (comment says "implicit range validator"). Commit `fbd661aa2cb`.

Not acted on:
- L1 multiple-integer on dev: already checked — issue repro (incl. `[1, 7]`) passes on `origin/dev` with fix applied.
- N1 `min`/`max` param names shadow builtins: matches module's own naming (`_parse_state_into_dict` uses `min`/`max`); left.
- N3 saved min > max breaks parameter build: pre-existing, both paths; follow-up candidate.

<details><summary>Full review</summary>

# Normal review (raw) — issue_24199_workflow_numeric_bounds_26.0

Reviewed `git diff a6544be047d..HEAD` (7d7eed1097a baseline tests, ed2a963057a fix). Branch tests pass (`test_modules.py -k range`: 8 passed; `FormNumber.test.js`: 10 passed).

Verdict: fix is correct and small. Server-side validation parity holds in every case probed. One client behavior newly reaches workflow inputs and is worth fixing in this PR; the rest are nits.

## Server-side parity probe

I built each case two ways: the old path (persisted validators → `get_input_source(validators=…)`) and the new path (`get_runtime_inputs`). Then I compared `min`/`max`, the validator count, and `validate()` results or messages. Both paths go through the same `step_state_to_tool_state` → `_parse_state_into_dict` collapse. All cases matched:

- int 1..5, int 0..0, float 0..0.5 (int 0 coerces to 0.0 in the message on both paths), float 1..5, float "1.5".."2.5" strings, int "1".."5" strings: identical messages and results.
- `None`/`None` bounds: old had one no-op validator; new has none. Both accept everything.
- `""` min with max 5: new `min=None, max=5`, same validation.
- min > max (5, 1): both raise the same `AssertionError` at build time. No worse than before, but see N3.
- negate / exclude_min / custom message / repeated `in_range` / regex on an integer type: the collapse already reduces these to one plain inclusive range before this code runs (the debrief is right). No difference.
- int with a 1.5 bound: identical, because the collapse already coerces.

Every caller of `get_runtime_inputs` uses the returned parameter object, so they all inherit the same validators: run form (`managers/workflows.py:1081`), instance/editor dict (`:1239`), `run_request.py:382`, runtime state encode/decode (`modules.py:513-544`), `modules.py:1704`, and subworkflows (through the inner module). Export (`get_export_state`) and the editor build (`get_inputs`) are untouched. `get_default_parameter` still has no bounds, which the issue says is out of scope.

## Findings

### M1 (medium): clearing a bounded optional workflow number now snaps it to a bound
`client/src/components/Form/Elements/FormNumber.vue:136-140` and `:187-190`

`BFormInput` emits the raw string on `change`. Clearing the field emits `""`, and JS compares `"" < 1` and `null < 1` as true (node confirms both). So with the bounds the server now sends, an **optional** integer workflow input with min 1 behaves like this:

- The user clears the field to leave the input unset.
- The form shows " is out of range! ( < 1)" and forces the value to 1.
- The user cannot leave the input empty.

The same happens with a negative max (`"" > -2` is true). Before this branch, workflow inputs always got null bounds, so this never fired for them. Tool params with bounds already have this problem, but the branch now exposes it on workflow run forms. The comment at `:188` ("If value=null, then value is within range") states the intended behavior, and the code does not do it.

Fix: in `isOutOfRange`, return false early when `value === "" || value === null || value === undefined`. Add a FormNumber test: `{ min: 1, max: 5, optional: true }`, set `""`, trigger `change`, expect no alert and `""` emitted. The PR already edits this function, so the fix is in scope.

### L1 (low): multiple-integer inputs are not covered (merge-forward note)
`lib/galaxy/workflow/modules.py:1638-1648`

On `release_26.0`, integer inputs have no `multiple` option, and `FormNumberList.vue` does not exist, so nothing breaks here. The issue's third case (multiple integer `[1, 7]`) is dev-only. When this merges forward, check two things on dev:
- `to_dict` for a multiple integer returns the bounds.
- `FormNumberList` passes them on correctly.

Validating `[1, 7]` against the range fails with "could not be evaluated" on both old and new paths here, so this branch adds no regression. Consider rerunning the issue's own repro on dev after the merge; the debrief says this was done before the merge.

### N1 (nit): unused parametrize args and shadowed builtins in the tests
`test/unit/workflows/test_modules.py:138-151`

`test_parameter_input_range_reaches_run_form` takes `invalid_value` and `message` but never uses them, because it reuses `NUMERIC_RANGE_CASES`. Both tests and `__numeric_runtime_parameter` name their params `min`/`max`, which shadows the builtins. Suggested fixes:
- Rename them to `min_value`/`max_value`.
- Give the to_dict test its own `(type, min, max)` list. That list could add the float-with-integer-bounds case (`float`, 1, 5 → 1.0, 5.0) and a `None`/`None` case (→ `(None, None)`, no validator), which would pin down the "no bounds" branch.

### N2 (nit): comment wording
`lib/galaxy/workflow/modules.py:1639`. "the parameter rebuilds the same range validator" is accurate. It could say "implicit range validator" to point readers at `simple_range_validator`. Optional.

### N3 (info, pre-existing): min > max fails the whole build
On both old and new paths, a persisted min > max raises `AssertionError` from the validator model when the parameter is built. The run form and invocation for that workflow would then 500. The editor can probably save this state. The branch does not change it, so it's not in scope, but it's worth a follow-up issue next to the debrief's lossy-collapse and `'%s'` message notes.

## Test level

A unit test on `get_runtime_inputs(...).to_dict()` is the right level. `_workflow_to_dict_run` is a thin loop over those same calls, so an API test (`GET /api/workflows/{id}/download?style=run`) would mostly re-cover Python already exercised here at much higher cost. The baseline tests (one validator, exact message) are meaningful guards against double validation or message drift. The FormNumber test is genuinely red-to-green: on the old code, `value > null` picked `null`. Both test files are the right places.

</details>
