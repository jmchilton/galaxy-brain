# K1 review debrief

Acted on 1 (K1 commit message now says "editor load and import warn" — editor save drops the errors list; reworded via amend, `0aa0cdac8a4`) and 3 (API test `test_numeric_input_inverted_bounds_flagged_in_editor` checks the editor view's step `errors` after gxformat2 import, `8df2892c73f`; 4 numeric-input API tests pass).

Not acted on:
- 2 Editing a node clears the warning until reload: live feedback through `build_module` is K2, a follow-up. Mention in PR text.
- 4 Exported `.ga` carries the `errors` string: matches tool steps; import ignores it.

<details><summary>Full review</summary>

# K1 review: `InputParameterModule.get_errors()` for inverted bounds (513ffc31bbc)

Verdict: correct, small, and reuses the existing abstraction. It blocks nothing it shouldn't. No security issues. One wording problem (the claim about saving) and one cheap test gap.

Unit suite: `PYTHONPATH=lib python -m pytest test/unit/workflows/` gives 112 passed, 1 skipped.

## Findings (ranked)

### 1. "save ... warn" is not true from the editor (commit message, scope_evaluation K1, implementation_debrief:7)

- `lib/galaxy/managers/workflows.py:881-882`: `__module_from_dict` sets `workflow.has_errors = True`, and `:785` adds "Some steps in this workflow have validation errors" to the `errors` that `update_workflow_from_raw_description` returns.
- `lib/galaxy/webapps/galaxy/api/workflows.py:510-525`: the PUT handler unpacks `workflow, errors = ...` and then drops `errors`, returning `workflow_to_dict(..., style="instance")`.
- `client/src/components/Workflow/Editor/modules/services.js:44-62` (`saveWorkflow`) does not read any errors field either.
- Scenario: a user sets min=5 and max=1 in the editor, then saves. The save succeeds with no message. The node error appears only after a reload (`_loadCurrent` → editor dict `:1303` → `Node.vue:101` and the `getStateUpgradeMessages` panel).
- Where it does surface: on editor load (node error and messages panel), on API/file import (`api/workflows.py:610`, `status: "error"` with the "Imported, but some steps ... validation errors" message), and in the persisted `has_errors` flag. The flag has no client consumer; I grepped `client/src` for `has_errors`.
- Fix: reword the commit message ("so editor load and import warn"), and the debrief line too. Do not plumb save errors to the client. That pre-existing gap affects tool steps as well, and the live feedback belongs to K2.

### 2. Editing any field on the node clears the warning until reload (Low, expected, K2 territory)

`client/src/components/Workflow/Editor/Index.vue:1037-1048` (`onSetData`) replaces `step.errors` with `build_module`'s `errors`. Those come from the `populate_state` param dict (`api/workflows.py:544-558`), not from `module.get_errors()`. So after any edit the K1 message disappears, even if the bounds are still inverted, and it comes back after save and reload. This matches the "not live" con in scope_evaluation. Mention it in the PR text and leave the fix as a follow-up (K2).

### 3. Test gap: no API assertion on the real consumer path (Low)

The unit tests call `get_errors()` directly. Nothing checks the gxformat2 → persisted → editor-dict round trip, which is the path K1 exists for. `lib/galaxy_test/api/test_workflows.py` already has `_upload_bounded_integer_workflow(5, 1)` in `test_numeric_input_inverted_bounds_rejected_on_run_form`. Adding one line there, or a sibling test, would cover it:

```python
editor = self._download_workflow(workflow_id, style="editor")
assert "has a minimum (5) greater than its maximum (1)" in editor["steps"]["0"]["errors"]
```

That would also confirm that state with real YAML-typed values reaches `get_errors`. Optionally also assert the import response `status == "error"`, if the populator exposes it.

`test_parameter_input_ordered_bounds_have_no_errors` is close to trivial, but it guards the `None` contract that callers depend on (`if module.get_errors():`). Keep it. It could become a parametrize, but that is only a nit.

### 4. `.ga` export now carries the message (Info, no action)

`managers/workflows.py:1566` (`_workflow_to_dict_export`) writes `"errors": module.get_errors()` for every step and strips it only from non-internal subworkflow steps (`:1604`). A downloaded `.ga` for an inverted-bounds workflow now has `"errors": "Workflow input 'x' has a minimum ..."` on the parameter_input step. Tool steps already behave this way, import ignores the key, and the data really is bad, so this is consistent. No change needed.

## Callers checked: nothing new is blocked

| Caller | Effect of a non-None return from parameter_input | Blocks? |
|---|---|---|
| `managers/workflows.py:881` (`__module_from_dict`, save and import) | `has_errors = True`, so the import response gets `status: "error"` and the warning text | No. The workflow is still stored. |
| `:1045` (`_workflow_to_dict_run`) | Only reached for `tool`/`subworkflow`/`None` types. A subworkflow containing the inverted input adds the message to `errors[...]`, but that dict is never returned (dead local) | No |
| `:1231` (preview, subworkflow branch) | `step_dict["errors"]` lists the inner message | No. The top-level inverted input in preview already 400s through `get_runtime_inputs`, as the branch intends. |
| `:1303` (editor dict) | Node error and messages panel | No. `Index.vue:537` `hasErrors` counts only connections and duplicate outputs. |
| `:1566` (export) | See #4 | No |
| `modules.py:802` (`SubWorkflowModule.get_errors`) | Calls `get_errors(include_tool_id=True)`, which `**kwargs` absorbs; the string is appended to the list | No |
| Invocation and scheduling | No `get_errors` or `has_errors` calls in `lib/galaxy/workflow/run*.py` or the scheduler | No |

## Robustness probe (scratch script against real `from_workflow_step`)

| Persisted `tool_inputs` | `get_errors()` |
|---|---|
| string bounds `"10"`/`"9"` | message. `state.decode` → `IntegerToolParameter` coerces to int, so there is no lexicographic or TypeError risk. |
| `"9"`/`"10"` | None |
| float, mixed `"5"`/`1` | message (5.0 > 1.0) |
| `""`/`1`, min only | None |
| 19.0X state (no validators) | None |
| text type with a stray `in_range` | None (`split_numeric_bounds` type gate) |
| regex validator only | None |
| no label | "A workflow input has ..." |
| `0.5`/`0` | message, and the 0 renders correctly |
| `tool_inputs=None` | `KeyError` in `step_state_to_tool_state` (`modules.py:1789`) during module construction. Pre-existing, before `get_errors` is reached; not introduced here. |

## REVIEW_FOCUS checklist

- Reuse: good. It extends the existing `WorkflowModule.get_errors` hook (which Tool and Subworkflow modules already override) and shares `_inverted_bounds_error` with `get_runtime_inputs`, so one message lives in one place.
- Imports: `numeric_bounds_type` is added to the module-level import. OK.
- Typing: `_inverted_bounds_error -> Optional[str]` is fine. `get_errors` itself is untyped, matching the base class.
- No obvious comments, and no weakened tests.

</details>
