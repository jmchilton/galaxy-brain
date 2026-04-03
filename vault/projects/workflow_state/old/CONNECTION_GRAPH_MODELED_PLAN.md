# Plan: Migrate connection_graph.py to NormalizedNativeWorkflow

## Goal

Replace raw dict manipulation in `connection_graph.py` with gxformat2's `NormalizedNativeWorkflow` / `NormalizedNativeStep` Pydantic models. This is the biggest remaining consumer of raw `step_def.get(...)` patterns in the workflow_state package.

## Context

- **Branch**: `wf_tool_state`
- **Worktree**: `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state`
- **File**: `lib/galaxy/tool_util/workflow_state/connection_graph.py`
- **Tests**: `test/unit/tool_util/workflow_state/` (run with `source .venv/bin/activate && PYTHONPATH=lib python -m pytest test/unit/tool_util/workflow_state/ -x -q`)
- **IWC sweep tests**: Set `GALAXY_TEST_IWC_DIRECTORY` to run against real IWC workflows

### Prior art

Recent commits migrated `validation_native.py` and `convert.py` to a `StepLike = Union[NormalizedNativeStep, NativeStepDict]` pattern. The shared helpers live in `_util.py`:
- `StepLike` type alias
- `step_tool_id()`, `step_tool_version()`, `step_tool_state()`, `step_input_connections()`, `step_as_dict()`
- `decode_double_encoded_values()`

### What NormalizedNativeStep provides

```python
class NormalizedNativeStep(BaseModel):
    id: int
    type_: NativeStepType = Field(alias="type")  # enum with .tool, .subworkflow, .data_input, etc.
    tool_id: str | None
    tool_version: str | None
    tool_state: dict[str, Any]  # guaranteed parsed dict, never JSON string
    input_connections: dict[str, list[NativeInputConnection]]  # always-list (normalized)
    inputs: list[NativeStepInput]
    outputs: list[NativeStepOutput]
    workflow_outputs: list[NativeWorkflowOutput]
    subworkflow: NormalizedNativeWorkflow | None
    when: str | None
    # ... other fields

    # Properties: is_tool_step, is_subworkflow_step, is_input_step, is_pause_step
```

`NativeInputConnection` has typed fields: `.id`, `.output_name`, `.input_subworkflow_step_id`.

`NativeWorkflowOutput` has typed fields: `.output_name`, `.label`.

## What changes

### Dict access → model property mapping

| Current raw dict access | Model equivalent |
|---|---|
| `step_def.get("type", "tool")` | `step.type_` (NativeStepType enum, compare with `NativeStepType.tool`, `.subworkflow`, etc.) |
| `step_def.get("tool_id")` | `step.tool_id` |
| `step_def.get("tool_version")` | `step.tool_version` |
| `step_def.get("tool_state")` + `json.loads` | `step.tool_state` (already parsed dict) |
| `step_def.get("input_connections", {})` | `step.input_connections` (already dict with always-list values) |
| `step_def.get("subworkflow")` | `step.subworkflow` (typed `NormalizedNativeWorkflow | None`) |
| `step_def.get("when")` | `step.when` |
| `step_def.get("workflow_outputs", [])` | `step.workflow_outputs` (typed list) |
| `isinstance(conn, dict) and "id" in conn` | `conn.id` (typed `NativeInputConnection`) |
| `conn.get("output_name", "output")` | `conn.output_name` |
| `conn.get("input_subworkflow_step_id")` | `conn.input_subworkflow_step_id` |
| `wo.get("output_name")` | `wo.output_name` |
| `wo.get("label")` | `wo.label` |

### Functions to change

1. **`build_workflow_graph()`** — change signature from `workflow_dict: dict` to `workflow: Union[NormalizedNativeWorkflow, dict]`. Normalize on entry with `gxformat2.normalized.normalized_native()` if given a dict.

2. **`_get_tool_state()`** — **delete entirely**. Model guarantees `step.tool_state` is a parsed dict. Callers just use `step.tool_state` directly.

3. **`_parse_connections()`** — **simplify heavily**. The model's `input_connections` is already `dict[str, list[NativeInputConnection]]` (always-list). No need for `if not isinstance(conn_info, list): conn_info = [conn_info]`. Just map `NativeInputConnection` → `ConnectionRef`.

4. **`_resolve_input_step()`** — change `step_def: NativeStepDict` to `step: NormalizedNativeStep`. Use `step.type_`, `step.tool_state`.

5. **`_resolve_tool_step()`** — same pattern. Use `step.tool_id`, `step.tool_version`, `step.tool_state`, `step.when`.

6. **`_resolve_subworkflow_step()`** — use `step.subworkflow` (already typed `NormalizedNativeWorkflow | None`). The `isinstance(subworkflow, dict)` check becomes `step.subworkflow is not None`. Recursive call to `build_workflow_graph` passes the model directly.

7. **`_build_subworkflow_output_map()`** — change to accept `NormalizedNativeWorkflow`. Use `workflow.steps` (typed dict of `NormalizedNativeStep`), `step.workflow_outputs` (typed list of `NativeWorkflowOutput`).

### Caller: connection_validation.py

`connection_validation.py` calls `build_workflow_graph(workflow_dict, get_tool_info)` on lines 102 and 112 with raw dicts. After migration, the Union signature means these calls still work. No changes needed in connection_validation.py if the Union approach is used.

## Steps

1. Add `NormalizedNativeWorkflow`, `NormalizedNativeStep` imports and `normalized_native` factory to connection_graph.py
2. Change `build_workflow_graph` to accept `Union[NormalizedNativeWorkflow, dict]`, normalize on entry
3. Update the step loop to iterate over `NormalizedNativeStep` objects
4. Rewrite `_resolve_input_step`, `_resolve_tool_step`, `_resolve_subworkflow_step` to accept `NormalizedNativeStep`
5. Simplify `_parse_connections` to map `NativeInputConnection` → `ConnectionRef`
6. Rewrite `_build_subworkflow_output_map` to use typed workflow/step models
7. Delete `_get_tool_state`
8. Remove `import json` if no longer needed (check `_collect_inputs` which also does json.loads for container states — these may still need it since `tool_state` values can still be double-encoded strings)
9. Run tests: `source .venv/bin/activate && PYTHONPATH=lib python -m pytest test/unit/tool_util/workflow_state/ -x -q`

## Important note on _collect_inputs

`_collect_inputs` (line 326) walks the tool_state for conditionals/repeats/sections and does `json.loads` on string values inside the state dict. Even though the outer `tool_state` is guaranteed to be a parsed dict by the model, inner values like conditional states and repeat instances can still be JSON-encoded strings (the double-encoding pattern). This is the same issue `decode_double_encoded_values` in `_util.py` handles. Consider using that helper on `step.tool_state` before passing it to `_collect_inputs`, which would let you remove the `json.loads` calls inside `_collect_inputs`.

## Testing

- All 230 existing unit tests must pass
- If `GALAXY_TEST_IWC_DIRECTORY` is set, the sweep tests (480 parametrized) should also pass
- Connection validation tests are in `test/unit/tool_util/workflow_state/test_connection_validation.py`

## Unresolved questions

- Should `NativeStepType` enum values be imported or compared as strings? Check what the enum exposes.
- Does `_collect_inputs` need refactoring too, or just the outer step-level functions? It works with `tool_state` internals rather than step-level fields, so it may be fine as-is with a `decode_double_encoded_values` call at the top.
