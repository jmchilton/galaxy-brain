# Thermo-nuclear review debrief

Acted on T2 and T3, two small simplifications in commit `bdcb548a9a9`, pushed to `jmchilton`. The server now passes range bounds straight through. `FormNumber` gains `isBelowMin` to pair with `isAboveMax`, and its empty-value guard reuses the existing `isDefined` helper. Behavior is unchanged: `test_modules.py` 70 passed, `src/components/Form/` vitest 116 passed, and ruff/black/eslint/prettier are clean. No structural blockers.

Not acted on:
- T1: `_parse_state_into_dict` builds an `in_range` validator from `min`/`max` state, and `get_runtime_inputs` then splits it back into `min`/`max`. Reading the bounds from the state directly would be cleaner, but `_parse_state_into_dict` is also the persisted/export contract. Changing it means a broader refactor of pre-existing code, which is too much for a 26.0 point fix. **Follow-up.**
- T4: `parameter_kwds` was widened to `dict[str, Any]`. This is honest: the dict already held bools and the defaults are `Any`. A precise union adds noise without catching anything. Left as is.
- T5: `modules.py` is about 2.9k lines, but that is pre-existing and the diff only adds net +9. Splitting the parameter-module code out of `modules.py` is a broader follow-up, not something for this PR.
- T6: `NumberToolParameter.to_dict` could derive `min`/`max` from an `in_range` validator for every tool. That would change a shared tool path, so it was rejected; the workflow module is the right layer for this fix.

<details><summary>Full review</summary>

Scope: `git diff a6544be047d...HEAD`, 4 files, +103/-11.

## T1: round-trip through validator form (missed judo, deferred)
`lib/galaxy/workflow/modules.py` `_parse_state_into_dict` turns `parameter_definition.min/max` into `{"type": "in_range", ...}` and always puts it first in the list. `get_runtime_inputs` then finds that validator again and turns it back into `min`/`max` kwargs. The cleanest model would hand the bounds through as bounds and never build the validator. That isn't safe to do locally, though: `get_export_state` returns the same dict, so it is the persisted shape, and the issue also asks for conservative handling of exotic `in_range` validators. The current find-and-strip approach is the least invasive way to keep that contract. Logged as a follow-up, together with the existing lossy-collapse follow-up (negate/exclusive dropped).

## T2: bound loop + `is not None` filter (acted)
```python
for bound in ["min", "max"]:
    if range_validator.get(bound) is not None:
        parameter_kwds[bound] = range_validator[bound]
```
`IntegerToolParameter` and `FloatToolParameter` already treat a `None` bound as unbounded: they add the implicit validator only when one bound is not None. So the filter duplicates the parameter's own invariant. Replaced it with two direct assignments. The `None`/`None` and single-bound tests still pass.

## T3: FormNumber range helpers asymmetric; empty guard bespoke (acted)
The diff added `isAboveMax` but left the min check inline. It also wrote out `value === "" || value === null || value === undefined` even though the file already imports `isDefined` from `@/utils/validation`. Added `isBelowMin` and collapsed `isOutOfRange` to a single expression that uses `isDefined`, with a one-line comment explaining why empty counts as unset.

## T4: `parameter_kwds: dict[str, Any]` (not acted)
The type was widened from `Union[str, list[dict]]`. The old annotation was already wrong, since `multiple`, `checked` and `value` are bool/Any. `Any` is the honest type at this boundary.

## T5: file size (not acted)
`modules.py` was already about 2.9k lines before this branch, which adds net +9, so the 1k-threshold rule doesn't trigger. `FormNumber.vue` is 222 lines.

## T6: canonical layer (no change)
The fix stays in the workflow module, which owns the conversion from workflow parameter to tool parameter. It doesn't touch shared tool-parameter code. The client change stays inside `FormNumber`'s own range logic. No logic leaks into shared paths.

## Tests
The tests go through public APIs (`to_dict`, `validate`, emitted events) and reuse the shared `MockTrans` and the existing mount helpers. Nothing to restructure.

</details>
