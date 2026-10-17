# Thermo-nuclear review debrief (post-rescope)

Acted on R5 only: the unit-test helper now picks editor-form conditional cases by value instead of by `cases[0]`. That change is in commit `ac2955ddb08`, pushed to `jmchilton`. `test/unit/workflows/` 111 passed and 1 skipped, and ruff/black are clean. I found no structural blockers. The rescope added two small shared helpers in the module that already owns `get_default_parameter`, and there's no spaghetti growth beyond one bounded block in each caller.

Not acted on:
- R1: the round trip from `min`/`max` state to an `in_range` validator and back to `min`/`max`. This is still the main missed simplification, but `_parse_state_into_dict` is also the export/persisted contract. **Follow-up**, carried over from the earlier T1.
- R2: both callers run `split_numeric_bounds` and then `numeric_bounds_inverted`. The callers need different policies (the editor ignores inverted bounds, the run form raises), so folding the check into the split would add a mode flag. Left as is.
- R3: the inverted-bounds raise sits inline in the already busy `get_runtime_inputs`. Moving it into a helper would only relocate those 6 lines. The fix that would actually delete complexity is decomposing `get_runtime_inputs`, which is pre-existing code. **Follow-up.**
- R4: the `is not None` filter in `get_default_parameter` repeats an invariant the parameter already has. It is needed to satisfy `default_source_type`, which doesn't allow `None`. Left as is.
- R6: file sizes. `modules.py` (2.9k lines) and `test_workflow_editor.py` (1.7k lines) were already over 1k before this branch, and the branch adds little to either. Splitting `InputParameterModule` out of `modules.py` remains a **follow-up**.
- R7: `parameter_kwds: dict[str, Any]`. This is the honest type, same reasoning as the earlier T4.

<details><summary>Full review</summary>

Scope: `git diff a6544be047d...dfd50d5c087`, 9 files, +281/-40. The earlier review (`earlier_drafts/1/thermo_nuclear_review.md`) covered the pre-rescope diff. This pass re-reviewed everything, focusing on the rescope additions: `split_numeric_bounds`, `numeric_bounds_inverted`, the `bounds` parameter on `get_default_parameter`, the inverted-bounds exception, `download_workflow_raw`, and the shared Selenium helper.

## R1: validator round trip (missed judo, deferred)
`_parse_state_into_dict` builds `{"type": "in_range", min, max}` from the form's `min`/`max` state. `split_numeric_bounds` then finds that validator again and splits it back out. The rescope made this round trip happen in two places (`get_inputs` and `get_runtime_inputs`) instead of one. The cleanest model would carry the bounds as bounds from the start, so no validator would need to be found and stripped. It is blocked for the same reason as before: the same dict is what `get_export_state` returns, so changing its shape is a contract change. That is too much for a 26.0 point fix. Follow-up.

## R2: split + inverted check repeated (not acted)
`get_inputs`:
```python
bounds, _ = split_numeric_bounds(parameter_def)
if bounds and numeric_bounds_inverted(bounds):
    bounds = None
```
`get_runtime_inputs` does the same split but raises on inverted bounds. One helper that returns only valid bounds would need a raise/ignore flag, which is the kind of one-off mode this review argues against. Both policies are deliberate (the editor must still open so the author can fix the bounds), so two explicit three-line blocks is the better shape.

## R3: raise inline in `get_runtime_inputs` (not acted)
The new block includes a label-or-generic phrase conditional inside a function that already handles restrictions, connection-restricted options and defaults. Moving it into a `_runtime_numeric_bounds()` method would move complexity around without removing any. The real cleanup is breaking `get_runtime_inputs` into per-concern kwds builders (options, bounds, defaults), and all of those concerns except bounds come from pre-existing code. Follow-up.

## R4: `get_default_parameter` None filter (not acted)
`{key: value for key, value in bounds.items() if value is not None}` is redundant at runtime, because `IntegerToolParameter`/`FloatToolParameter` already treat a `None` bound as unbounded. The earlier T2 removed the same kind of filter from the run-form path. Here, though, `default_source_type` excludes `None`, so dropping the filter would trade it for a type widening or a cast. Left as is.

## R5: test helper picks cases by position (acted)
`__editor_default_parameter` used `.cases[0]` twice, which silently depends on `when_true` and `when_specify_default_true` being listed first. I added `__case(conditional, value)` and used it for the type, optional and specify_default lookups, so all three use the same idiom and the helper no longer depends on case order. No assertions changed.

## R6: file size (not acted)
`modules.py` went from about 2.9k to 2.9k lines (+23/-3), and `test_workflow_editor.py` is about 1.7k lines with a net reduction from this branch. Neither crosses the 1k threshold because of this PR. `workflow_parameter_input_definitions.py` is 71 lines, and `FormNumber.vue` grew only slightly.

## R7: types (not acted)
`numeric_bounds_type = dict[str, Optional[Union[int, float]]]` is a loose shape for what is really a `{min, max}` pair. A TypedDict or a NamedTuple would be more precise, but `parameter_kwds.update(bounds)` relies on the dict shape. For two keys, the alias is acceptable. `parameter_kwds: dict[str, Any]`: see the earlier T4.

## Verified fine
- `download_workflow_raw` / `download_workflow` follows the existing `*_raw` → `Response` convention in populators (`run_tool_raw`, `create_from_store_raw`, ...).
- The Selenium helper `_workflow_run_assert_number_clamped` removes the duplicated run/enter/assert sequence and the `sleep_for`. `simplified_input_alert` targets a new `data-description` hook instead of a CSS class.
- `FormNumber.vue`: the range logic is symmetric (`isAboveMax`/`isBelowMin`), and empty is handled once in `isOutOfRange` through the canonical `isDefined`.
- Layering: the bounds helpers live next to `get_default_parameter`, the client change stays inside `FormNumber`, and no shared tool-parameter code is touched.

</details>
