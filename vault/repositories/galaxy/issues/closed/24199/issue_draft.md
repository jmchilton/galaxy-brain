# Workflow integer/float parameter min/max is enforced but never reaches the run form (no slider, no inline range warning)

Filed from: gx_branches session 2026-10-08. Found while recording screenshots for `issue_21015_multiple_text_param`, where the new Selenium test `test_multiple_integer_parameter_with_range` sets min 1 / max 5 in the editor.

## Behaviour

When an integer or float workflow input has "Set a minimum/maximum value for this input" filled in the editor:
- **Server side, the range is enforced.** Out-of-range values are rejected at submit. A probe of the runtime parameter on dev `65421d5f420`:
  - `IntegerToolParameter` built with validators `[{"type": "in_range", "min": 1, "max": 5}]` rejects `7` with "Value ('7') must fulfill (1 <= value <= 5)".
  - With `multiple`, it rejects `[1, 7]` the same way.
- **Client side, nothing shows the range.**
  - The run form has no range slider and no inline "N is out of range! (…)" warning while typing. The user learns only from the rejected submission.
  - The same applies to the editor's own "Default Value" field for that input.

## Why

- **Saving (`modules.py` ~1922-1935 on dev):** the editor converts `parameter_definition.min`/`max` into a persisted `in_range` source validator. They are not stored as `min`/`max` on the parameter definition. The reverse conversion back into the form is at ~1875-1877.
- **Building the runtime field (`get_runtime_inputs`, ~1729 and ~1753):**
  - `parameter_kwds["validators"] = parameter_def["validators"]` passes the validators, so enforcement works.
  - `min`/`max` are never put in `parameter_kwds`, so `IntegerToolParameter.min`/`max` (`basic.py:518`) and `FloatToolParameter.min`/`max` (`basic.py:622`) stay `None`.
- **Rendering:** `to_dict` sends `min: None, max: None`. `FormNumber.vue`'s `isRangeValid()` (~L116) needs both to be numbers, so neither the slider nor the out-of-range warning renders.
- **Editor default field:** `get_default_parameter` in `workflow_parameter_input_definitions.py` builds the default field without the range either.

## History

`d8b980b3e6b` (John, 2024-10-31, "Improvements to workflow parameter validators. Allow specifying a min/max for integer and float parameters") added min/max as `in_range` validators. The runtime `min`/`max` attributes were never populated, so this was never wired rather than being a regression.

## Scope / affected

- **Inputs:** every integer and float workflow input with a range, single or multiple. The multiple case renders through `FormValueList` → `FormNumber` (#23939; generalized in `issue_21015_multiple_text_param`), which already forwards `attrs.min`/`attrs.max`. It would pick the range up for free.
- **gxformat2:** `min`/`max` on an input are dropped by the converter (`python_to_workflow` output has no validators). So only editor- or API-built workflows carry a range today. That may be a separate gxformat2 issue worth noting.

## Suggested fix

In `InputParameterModule.get_runtime_inputs`, when `parameter_type` is integer or float and an `in_range` validator is present, also set `parameter_kwds["min"]`/`["max"]` from it. Keep passing the validator, which stays the source of truth for enforcement. Optionally, give the editor's default field the same range when building the config form.

Tests:
- **Unit:** the runtime input's `to_dict(trans)` has numeric `min`/`max` for a saved integer input with a range. It should be red on dev.
- **Selenium/Playwright:** extend `test_multiple_integer_parameter_with_range` (once `issue_21015_multiple_text_param` merges), or add a single-value twin, to assert the slider is present in the run form.

## Design caveats

- **Slider layout.** With a slider, each `FormValueList` row becomes input + slider + remove ×. Check the row layout, especially if `FormValueList` moves to `align-items-center` (pending polish on that branch).
- **Partial ranges.** A range with only one bound gives `isRangeValid()` false, so there's still no slider. The out-of-range warning should still work if one bound is passed. Check `FormNumber` for that.

No @-mentions without John's OK.
