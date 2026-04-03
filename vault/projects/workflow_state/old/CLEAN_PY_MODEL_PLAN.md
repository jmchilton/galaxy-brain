# Plan: Use NormalizedNativeWorkflow for reading in clean.py

## Goal

Simplify clean.py's reading path by using `NormalizedNativeWorkflow` / `NormalizedNativeStep` models to access step fields and tool_state, eliminating manual JSON decode and `step_def.get(...)` patterns. The mutation/write-back path stays dict-based (the whole point of cleaning is to mutate and re-serialize the workflow dict).

## Context

- **Branch**: `wf_tool_state`
- **Worktree**: `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state`
- **File**: `lib/galaxy/tool_util/workflow_state/clean.py`
- **Tests**: `source .venv/bin/activate && PYTHONPATH=lib python -m pytest test/unit/tool_util/workflow_state/ -x -q`

### What clean.py does

1. **`clean_stale_state(workflow_dict, get_tool_info)`** — iterates steps in a raw dict, resolves tool definitions, calls `strip_stale_keys` per step. Mutates `workflow_dict` in place.
2. **`strip_stale_keys(step, parsed_tool)`** — extracts `tool_state` from a step dict, calls `_strip_recursive` to remove undeclared keys, writes cleaned state back to `step["tool_state"]`.
3. **`strip_bookkeeping_from_workflow(workflow_dict)`** — removes bookkeeping keys without needing tool definitions.
4. **`_strip_recursive(state, tool_inputs, ...)`** — recursive dict walker that deletes undeclared keys in place.

### The reading problem

`clean_stale_state` (lines 308-370) does a lot of manual work to read step fields:
- `step_def.get("type")` for subworkflow detection (line 321)
- `step_def.get("tool_id")` (line 328)
- `step_def.get("tool_state")` + JSON string detection + `json.dumps` roundtrip (lines 332-338)
- `step_def.get("tool_version")` for error reporting (line 347)

`strip_stale_keys` (lines 261-305) repeats this:
- `step.get("tool_id", "?")` (line 265)
- `step.get("tool_version")` (line 266)
- `step.get("tool_state")` + `isinstance(str)` + `json.loads` (lines 268-289)

### What NormalizedNativeStep provides

All of the above is available as typed properties on the model:
- `step.type_` / `step.is_subworkflow_step` / `step.is_tool_step`
- `step.tool_id`, `step.tool_version`
- `step.tool_state` — guaranteed parsed dict
- `step.subworkflow` — typed `NormalizedNativeWorkflow | None`

### Shared helpers in _util.py

Already available: `StepLike`, `step_tool_id()`, `step_tool_version()`, `step_tool_state()`, `step_input_connections()`, `decode_double_encoded_values()`.

## Design constraint

**clean.py must mutate the original raw dict.** The output is a modified `.ga` file (JSON). The model is read-only for our purposes — we use it to understand the structure, but mutations go through the raw dict. This means:

- `clean_stale_state` must continue accepting `NativeWorkflowDict` since it writes back to it
- `strip_stale_keys` must continue writing `step["tool_state"] = tool_state`
- We can use models for **reading** (step type, tool_id, tool_state) but write to the original dict

## Strategy

Use models to simplify the **reading** side of `clean_stale_state` while keeping dict mutation for writes. Two approaches:

### Approach A: Normalize once, use model for dispatch, dict for mutation

```python
def clean_stale_state(workflow_dict, get_tool_info, ...):
    from gxformat2.normalized import normalized_native
    workflow_model = normalized_native(workflow_dict)

    for step_id, step in workflow_model.steps.items():
        step_def = workflow_dict["steps"][step_id]  # raw dict for mutation

        if step.is_subworkflow_step and step.subworkflow:
            sub_result = clean_stale_state(step_def["subworkflow"], ...)
            ...
            continue

        if not step.tool_id:
            continue

        parsed_tool = get_tool_info.get_tool_info(step.tool_id, step.tool_version)
        ...

        # strip_stale_keys still operates on raw dict
        step_result = strip_stale_keys(step_def, parsed_tool, policy=policy)
```

This eliminates:
- The `step_def.get("type") == "subworkflow"` check → `step.is_subworkflow_step`
- The `step_def.get("tool_id")` call → `step.tool_id`
- The JSON encode/decode dance on lines 332-338 (model already has parsed tool_state)

### Approach B: Use StepLike in strip_stale_keys

Make `strip_stale_keys` accept `StepLike` to read tool_id/version/tool_state via the shared helpers, but still write back to the raw dict passed separately:

```python
def strip_stale_keys(step: StepLike, raw_step: NativeStepDict, parsed_tool, ...):
    tool_id = step_tool_id(step)
    tool_state = step_tool_state(step)  # already parsed
    ...
    raw_step["tool_state"] = tool_state  # write back to raw dict
```

This is more awkward (two step references). **Approach A is recommended.**

## Steps

1. In `clean_stale_state`, add `normalized_native()` call at the top to create a model from the input dict
2. Replace the step iteration loop to use `workflow_model.steps` for reading and `workflow_dict["steps"]` for mutation
3. Remove the JSON encode/decode dance (lines 332-338) — the model already has parsed tool_state, and `strip_stale_keys` handles its own decode
4. Use `step.is_subworkflow_step` instead of `step_def.get("type") == "subworkflow"`
5. Use `step.tool_id` / `step.tool_version` instead of `step_def.get(...)`
6. Simplify `strip_stale_keys` — use `step_tool_state()` from `_util.py` for reading, keep dict mutation
7. Consider whether `strip_bookkeeping_from_workflow` can also benefit (it doesn't need tool definitions, just walks dicts — model benefit is smaller here since it's purely structural)
8. Run tests

## What NOT to change

- **`_strip_recursive()`** — this operates on raw state dicts, mutating them in place. It's purely internal and doesn't need model awareness.
- **`strip_bookkeeping_from_workflow()`** — works without tool definitions, just removes known keys. Low value from model migration.
- **Formatters** (`format_dry_run`, `format_tree_clean_*`) — consume `CleanResult` objects, not workflow dicts.
- **`clean_tree()`** and `run_clean()` — these are entry points that load workflows as dicts. They'd call `normalized_native()` internally.

## Current dict access inventory in clean_stale_state

| Line | Dict access | Model equivalent |
|---|---|---|
| 316 | `workflow_dict.get("steps", {})` | `workflow_model.steps` |
| 321 | `step_def.get("type") == "subworkflow"` | `step.is_subworkflow_step` |
| 321 | `"subworkflow" in step_def` | `step.subworkflow is not None` |
| 328 | `step_def.get("tool_id")` | `step.tool_id` |
| 332-338 | `step_def.get("tool_state")` + JSON roundtrip | `step.tool_state` (parsed) |
| 347 | `step_def.get("tool_version")` | `step.tool_version` |

## Testing

- All 230 existing unit tests must pass
- If `GALAXY_TEST_IWC_DIRECTORY` is set, sweep tests should pass (especially `TestIWCSweepClean`)
- Clean-specific tests are in `test/unit/tool_util/workflow_state/test_clean.py` and `test_stale_keys.py`

## Unresolved questions

- The recursive subworkflow call `clean_stale_state(step_def["subworkflow"], ...)` passes a raw dict. Should this also be normalized on entry (it will be, since `clean_stale_state` normalizes at the top), or should we pass the model's `.subworkflow` for reading and the dict for mutation?
- `strip_stale_keys` currently receives a single `step: NativeStepDict` and both reads from and writes to it. With the model approach, it might be cleaner to receive `(model_step, raw_step)` or just keep it dict-based since it's a low-level mutator. Simplest path: keep `strip_stale_keys` dict-based, use models only in `clean_stale_state` dispatch loop.
