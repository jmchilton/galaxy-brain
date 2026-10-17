# Scope evaluation

**Recommendation: expand modestly.** Keep the run-form fix as implemented. Add three small changes to the same code path: (1) give the editor's Default Value field the step's bounds; the issue deferred this, but the editor already rebuilds the module on every change, so the hard part the issue flagged (reacting to edited bounds) comes for free. (2) Turn a saved `min > max` into a clear request error instead of the `AssertionError` / 500 it raises in `get_runtime_inputs`, which this branch now feeds directly. (3) Make the implicit range message substitute a rejected value of `0` (`if value_to_show and ...` leaves `%s` in place). Each is a few lines with a unit test and fits a 26.0 fix. Leave the lossy validator collapse, the validator-to-bounds refactor (T1) and tool-wide bound derivation (T6) as follow-ups.

## Possible Decompositions

The branch has about 114 changed lines (+103/-11), most of them tests, so it is only just over the threshold. Natural pieces, in landing order:

1. Baseline tests (`01a8f0c4783`), which pin today's server validation and `FormNumber` single-bound warnings.
2. Client only: the `FormNumber` helper refactor (`22d2cef086d`), the min-only snap-to-null fix (the one-line `onInputChange` change in `220c6107a4b`) and the clear-optional guard (`bfe5dc0e49f`). Each of these also affects bounded tool inputs, so this piece stands alone as a general `FormNumber` fix.
3. Server: send bounds through `get_runtime_inputs` (the `modules.py` and `test_modules.py` part of `220c6107a4b`). Without piece 2 it would expose the min-only and clear-optional bugs on workflow forms, so it lands after piece 2 or together with it.
4. If the expansion is taken: Default Value bounds, then the `min > max` error, then the `%s` message fix. The `%s` fix sits in `tool_util_models`, is independent of everything else, and could land anywhere.

## Scopes considered

### A. As implemented

Workflow integer/float runtime fields get `min`/`max` from the editor's `in_range` validator, and the validator is dropped because the parameter rebuilds an equivalent implicit one. `FormNumber` fixes min-only correction and lets optional bounded fields be cleared.

| Pros | Cons |
| --- | --- |
| <ul><li>Fixes the issue's reproduction exactly (integer and float here; multiple integer on dev, already checked after forward-merge).</li><li>Small, reviewed three times (normal, codex, thermo-nuclear) and red-to-green.</li><li>Client fixes also help bounded tool inputs.</li></ul> | <ul><li>Leaves the editor's Default Value unbounded, so an out-of-range default only surfaces at run time.</li><li>Leaves two bugs next to the touched lines: `min > max` gives a 500, and a rejected `0` shows a raw `%s`.</li></ul> |

### B. + Editor Default Value bounds (recommended)

In `InputParameterModule.get_inputs`, when building the integer or float case for the current type, pass the parsed bounds into `get_default_parameter` (or set `min`/`max` on the parameter it returns).

| Pros | Cons |
| --- | --- |
| <ul><li>The issue names this as the related follow-up, and reviewers would likely ask for it.</li><li>The editor already calls `getModule` / build-module on every form change (`FormDefault.onChange` → `Index.onSetData`). Edited bounds therefore show up on the Default field without any client work. That was the issue's stated reason to defer.</li><li>Reuses the same `FormNumber` behavior this branch just fixed, including empty optional values.</li></ul> | <ul><li>Touches `get_inputs`, which is shared by the editor build and state recovery. In `recover_state`, `get_inputs` runs before the state is populated, so bounds are absent there. That is harmless because `decode` does not validate, but it needs a test.</li><li>Changing bounds does not auto-correct an existing out-of-range default. `FormNumber` only corrects on input change, so the user sees the default but no warning until they edit it.</li></ul> |

<details><summary>Notes</summary>

`get_default_parameter` (`lib/galaxy/workflow/workflow_parameter_input_definitions.py`) takes only the type. Two options: add optional `min`/`max` arguments there, or set them on the returned parameter in `get_inputs` for `param_type == parameter_type`. The second is more local. Setting `min`/`max` after construction would not add the implicit validator, and that is fine for an editor field. A unit test can check that `get_inputs()`'s Default field in `to_dict` carries the bounds, mirroring the run-form test.

</details>

### C. + Clear error for saved `min > max` (recommended)

Persisted `min > max` makes `IntegerToolParameter`/`FloatToolParameter` construction raise `AssertionError` from `InRangeValidator`, which turns the run form and invocation into a 500. Check the order in `get_runtime_inputs`, where the bounds are now unpacked, and raise a typed request error that names the input.

| Pros | Cons |
| --- | --- |
| <ul><li>This is a pre-existing bug, but it now fails on the exact lines this branch adds, so a reviewer is likely to notice it.</li><li>The change is a few lines and the unit test is easy (the normal review's parity probe already builds this case).</li></ul> | <ul><li>Fixes the symptom at run time only. The editor still accepts `min > max`; also blocking it there (for example through `get_errors` on the step) would be a slightly larger change.</li><li>A typed exception hides the error from Sentry. Pair it with a log line, per the vault note on `MessageException`.</li></ul> |

### D. + Substitute `0` in validator messages (recommended, independent)

In `raise_error_if_validation_fails`, `if value_to_show and "%s" in message` skips substitution when the value is `0`. Change the check to `value_to_show is not None`.

| Pros | Cons |
| --- | --- |
| <ul><li>`0` is the most common out-of-range value for bounds like `min: 1`, so this message shows up in exactly this feature.</li><li>It is a one-line fix and the existing baseline tests can cover it (they currently avoid `0`).</li></ul> | <ul><li>The fix is in `tool_util_models`, a shared package, so it changes the message for every tool validator. This is strictly a fix, but it widens the review surface.</li><li>It could equally go in its own tiny PR.</li></ul> |

### E. Preserve full `in_range` semantics (negate, exclusive, repeated)

Stop `_parse_state_into_dict` / `step_state_to_tool_state` collapsing persisted validators into one inclusive range, and handle the exotic cases conservatively, as the issue's approach section describes.

| Pros | Cons |
| --- | --- |
| <ul><li>Fixes a real silent data loss: `negate`, `exclude_*` and `message` are dropped on round-trip.</li></ul> | <ul><li>It changes the persisted and export contract (`get_export_state`), which is too much for a 26.0 point release.</li><li>The issue's concern is unreachable today because the collapse happens first, so this branch is correct without it.</li></ul> |

Follow-up, not this PR.

### F. Pass bounds as bounds, never as a validator (T1)

Refactor `_parse_state_into_dict` so it carries `min`/`max` directly instead of building an `in_range` validator that `get_runtime_inputs` then splits back apart.

| Pros | Cons |
| --- | --- |
| <ul><li>Cleaner model, with no find-and-strip.</li></ul> | <ul><li>Same persisted-contract concern as E, and best done together with E.</li></ul> |

Follow-up.

### G. Derive `min`/`max` from `in_range` validators for all tool parameters (T6)

| Pros | Cons |
| --- | --- |
| <ul><li>One general mechanism.</li></ul> | <ul><li>Changes shared tool-parameter behavior. Tool XML already sets `min`/`max` directly, so there is no demonstrated need.</li><li>The workflow module is the right place for this conversion.</li></ul> |

Reject.

### H. Range help text on the run form

| Pros | Cons |
| --- | --- |
| <ul><li>Makes the range visible before the user types.</li></ul> | <ul><li>The issue lists it only as a complement. The slider and warning already show the range, so it adds UI surface for little gain.</li></ul> |

Skip.

### I. Contract: server change only, no `FormNumber` changes

| Pros | Cons |
| --- | --- |
| <ul><li>Smaller diff.</li></ul> | <ul><li>With server bounds alone, min-only inputs would snap to `null`, and optional bounded inputs could not be cleared. Both are regressions this branch would introduce on workflow forms.</li></ul> |

Reject.

### J. Multiple integer inputs

The multiple-integer case is dev-only (#23802, #23939). On dev, the issue's reproduction, including `[1, 7]`, passes with this fix after a forward-merge, and `FormNumberList` already forwards bounds. Nothing to add on 26.0. When forward-merging, re-check that the slider fits next to a row's remove button, which the issue's approach section also mentions.
