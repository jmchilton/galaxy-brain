# Initial review — #24409 (default profile)

- Profile: `default`
- Model: claude-opus-5-5, effort: medium
- Reviewed commit: `234b345ca41` (diff `origin/release_26.1...HEAD`)

## Verdict

Small, well-targeted fix with good red-to-green API tests. One real bug: the PR puts an existing parsing path onto the default import path, and that path can raise `KeyError` on tools whose top-level conditional or section names end in `_<digit>`. One cleanup item: the new default-filling duplicates `Repeat.get_initial_value` but drops data inputs and the parent context. No security findings.

## Summary of change

`ToolModule.recover_state` now calls `augment_tool_state_for_input_connections` even when `fill_defaults` is false, as long as the step has `input_connections`. Repeat instances that are created without `fill_defaults` get their non-data children filled from `get_initial_value`. After that, `WorkflowContentsManager.__module_from_dict` marks the connected data inputs as connected (`add_dummy_datasets`, `lib/galaxy/managers/workflows.py:2064-2068`). There are two API tests (`cat1`, and `__BUILD_LIST__` 1.2.0 with a conditional beside the repeat's data input).

## Findings

### P2 1: `augment` now raises `KeyError` on the default import path for top-level groups named `<x>_<digit>`

`augment()` treats any connection key shaped like `<prefix>_<N>|rest` as a repeat reference and then does `repeat = self.tool.inputs[repeat_name]` (`lib/galaxy/workflow/modules.py:2816`). Take a tool with a top-level conditional or section named, for example, `opts_1`, whose data param is connected. The key `opts_1|input` is parsed as repeat `opts` index 1, and `self.tool.inputs["opts"]` raises `KeyError`. The `isinstance(repeat, Repeat)` guard comes too late to catch it.

The bug is not new, but before this PR it could only be hit with `fill_defaults=True`. The PR now runs `augment` for every `ToolModule.from_dict` call that has `input_connections`. That includes plain API and format2 imports (where `fill_defaults` defaults to false), workflow updates, and `build_module`. So an import that used to succeed becomes a 500, and this is on a release branch. Galaxy has already fixed this naming pattern once in another place (`b7341edae9c`, `test/functional/tools/conditional_name_digit_suffix.xml`), though in that test tool the `_N` conditionals are nested, so this path never reaches them.

Suggested fix: look the input up softly, then keep the type guard:

```python
repeat = self.tool.inputs.get(repeat_name)
if not isinstance(repeat, Repeat):
    return
```

A test for this would need a test tool with a top-level conditional or section named `*_N` that has a connected data input, imported with `fill_defaults=False`. The existing `conditional_name_digit_suffix` tool nests its `_N` conditionals under `outer`, so it can't be reused as-is.

### P3 1: New-instance defaults duplicate `Repeat.get_initial_value` and diverge from it and from the `fill_defaults` path

The new loop (`modules.py:2827-2833`) copies the per-instance body of `Repeat.get_initial_value` (`lib/galaxy/tools/parameters/grouping.py:175-180`) but differs from it in two ways:

- **Data children are skipped.** At import and update, `trans.workflow_building_mode` is `ENABLED` (`managers/workflows.py:751`, `:812`). In that mode `BaseDataToolParameter.get_initial_value` returns `RuntimeValue()` without scanning the history (`basic.py`, `BaseDataToolParameter.get_initial_value`). So skipping data buys nothing, and an unconnected data input in an added instance ends up as a missing key. The `fill_defaults` path (`check_and_update_param_values(..., workflow_building_mode=True)`) and `Repeat.get_initial_value` both store `RuntimeValue` there. The filter is also only one level deep: data inside a conditional or section child still goes through `get_initial_value`. Connected inputs are overwritten by `add_dummy_datasets` either way.
- **The context has no parent.** The loop uses `ExpressionContext(repeat_instance_state)` with no parent, whereas `Repeat.get_initial_value` uses `ExpressionContext(rval_dict, context)`. Any child whose initial value depends on outer state sees an empty context.

Suggested fix: pull the per-instance construction out of `Repeat.get_initial_value` into a small reusable helper, for example `Repeat.get_initial_instance(trans, context, index)`. Have `get_initial_value` call it, and call it here for every child (no data filter) with `ExpressionContext(self.state.inputs)` or the enclosing state as parent. That removes the copy and keeps the no-`fill_defaults` result the same as the `fill_defaults` one.

## Notes (no action needed)

- The tests are real red-to-green API tests. The assertions are specific: exact concatenated content, and `element_count == 2`. They follow the existing `upload_yaml_workflow(..., fill_defaults=False)` pattern.
- Nested repeats (#23895), and repeats inside a top-level conditional or section (`cond|queries_0|x` returns early at `"_" not in prefix`), are still not augmented. The PR description already calls out nested repeats as out of scope.
- The `augment_tool_state_for_input_connections` docstring ("run before check_and_update_param_values ... so non-data parameters are properly populated") no longer describes the no-`fill_defaults` path. It's optional to touch, but if P3 1 is taken up, a one-line update would help.
