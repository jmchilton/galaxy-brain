---
type: research
subtype: component
tags:
  - research/component
  - galaxy/workflows
status: draft
created: 2026-02-19
revised: 2026-02-19
revision: 1
ai_generated: true
component: CWL Workflow State
galaxy_areas: [workflows]
---

# CWL Workflow State: Loading, Persistence, and Execution Trace

## 1. Summary

CWL workflows go through three distinct phases where state is created, persisted, and recovered:

1. **Import** — CWL file is parsed by `WorkflowProxy`, converted to a Galaxy-format dict, and loaded into `WorkflowStep` model objects. Each tool step gets a minimal `tool_inputs` dict (nulls for connected inputs).

2. **Invocation Request Creation** — `populate_module_and_state()` injects modules and computes runtime state, then `workflow_run_config_to_request()` calls `encode_runtime_state()` to serialize each step's state into `WorkflowRequestStepState.value`.

3. **Execution** — The scheduler recovers state via `decode_runtime_state()`, then `ToolModule.execute()` builds the actual input dict from live step connections and dispatches jobs.

For CWL tools, the `tool_inputs` persisted in the database is essentially a placeholder — it contains `{input_name: None}` entries. The real input data comes from step connections at execution time. The problem is that `encode_runtime_state()` and `decode_runtime_state()` use `params_to_strings`/`params_from_strings` which assume Galaxy parameter objects (which CWL tools don't have).

---

## 2. Detailed Trace

### Phase 1: CWL Workflow Import

#### Entry Point

API receives a CWL file path. The workflow manager normalizes it:

- `WorkflowsManager.normalize_workflow_format()` — `/lib/galaxy/managers/workflows.py:622`
  - Detects `workflow_class == "Workflow"` (CWL class) at line 653
  - Creates `WorkflowProxy` via `workflow_proxy(workflow_path)` — line 662/668
  - Calls `wf_proxy.to_dict()` — line 673 — to get Galaxy-format dict

#### WorkflowProxy.to_dict()

`/lib/galaxy/tool_util/cwl/parser.py:697`

Iterates over CWL workflow inputs (creating data_input/parameter_input steps) and CWL workflow steps (creating tool/subworkflow steps).

For each tool step, calls `ToolStepProxy.to_dict(input_connections)`:

```python
# /lib/galaxy/tool_util/cwl/parser.py:1103-1126
def to_dict(self, input_connections):
    tool_state: ToolStateType = {}
    for input_name in input_connections.keys():
        tool_state[input_name] = None     # <-- null entries for connected inputs

    return {
        "id": self._index,
        "tool_uuid": self.tool_proxy.uuid,
        "label": self.label,
        "type": "tool",
        "input_connections": input_connections,
        "inputs": self.inputs_to_dicts(),  # <-- scatter, valueFrom, defaults
        "workflow_outputs": outputs,
    }
```

**Key point**: The `tool_state` dict in the step dict only contains `{input_name: None}` for connected inputs. No `"tool_state"` key is set in the returned dict at all — the variable is created but not included in the return value `rval`. So `d.get("tool_state")` in `from_dict()` will return `None`.

Wait — re-reading more carefully. The variable `tool_state` is created but indeed NOT included in the `rval` dict at line 1113. So `d.get("tool_state")` returns `None` during `from_dict()`.

#### Step Inputs (separate from tool_state)

The `"inputs"` key at line 1121 contains `InputProxy.to_dict()` dicts:

```python
# /lib/galaxy/tool_util/cwl/parser.py:1021-1036
def to_dict(self):
    as_dict = {"name": self.input_name}
    # merge_type, scatter_type, value_from, default
```

These get stored as `WorkflowStepInput` objects (line 1916-1929 in workflows.py), including `default_value`, `value_from`, and `scatter_type`.

#### Module and Step Creation

`__module_from_dict()` — `/lib/galaxy/managers/workflows.py:1880`

1. Creates `model.WorkflowStep()` — line 1892
2. Creates module via `module_factory.from_dict(trans, step_dict, ...)` — line 1899
3. Calls `module.save_to_step(step, ...)` — line 1901

#### from_dict for ToolModule

`ToolModule.from_dict()` — `/lib/galaxy/workflow/modules.py:2194`
- Calls `super().from_dict(trans, d, ...)` which is `WorkflowModule.from_dict()` at line 481
- This calls `module.recover_state(d.get("tool_state"), ...)` — line 484
- For CWL steps, `d.get("tool_state")` is `None` (not included in `ToolStepProxy.to_dict()`)

#### recover_state for CWL

`ToolModule.recover_state()` — `/lib/galaxy/workflow/modules.py:2476`
- Calls `super().recover_state(state, **kwds)` — `WorkflowModule.recover_state()` at line 543
- `from_tool_form` defaults to `False`, so `state = self.step_state_to_tool_state(state or {})` — line 562
  - `state` is `None`, so becomes `{}`
- `get_inputs()` returns `self.tool.inputs` — for CWL tools with `has_galaxy_inputs=False`, this is `{}`
- `if inputs:` is `False` (empty dict), so takes the else branch — line 567-570:
  ```python
  inputs = safe_loads(state) or {}  # safe_loads({}) returns {}, or {} -> {}
  self.validate_state(inputs)        # no-op for ToolModule
  self.state.inputs = inputs          # state.inputs = {}
  ```

#### save_to_step

`ToolModule.save_to_step()` — line 2271 calls `super().save_to_step()` (line 497):
```python
step.tool_inputs = self.get_state()
```

`get_state()` — line 523:
- `get_inputs()` returns `{}` for CWL
- `if inputs:` is False
- Returns `self.state.inputs` — which is `{}`

**Result: `step.tool_inputs` in the database = `{}` (empty dict) for CWL tool steps.**

The step's `WorkflowStepInput` objects (with default_value, value_from, scatter_type) are stored separately in the `workflow_step_input` table.

---

### Phase 2: Invocation Request Creation

#### Entry Point

`queue_invoke()` — `/lib/galaxy/workflow/run.py:128`
1. `populate_module_and_state(trans, workflow, param_map, ...)` — line 138
2. `workflow_run_config_to_request(trans, workflow_run_config, workflow)` — line 144

#### populate_module_and_state

`/lib/galaxy/workflow/modules.py:3163`
1. `module_injector.inject_all(workflow, param_map=param_map)` — line 3171
   - For each step: `module_injector.inject(step, ...)` — line 3101
     - `module = step.module = module_factory.from_workflow_step(trans, step)` — line 3120
     - This calls `WorkflowModule.from_workflow_step()` — line 489:
       ```python
       module.recover_state(step.tool_inputs, from_tool_form=False)
       ```
     - For CWL: `step.tool_inputs` is `{}`, `recover_state({})` sets `self.state.inputs = {}`

2. For each step: `module_injector.compute_runtime_state(step, step_args=step_args)` — line 3174
   - Calls `step.module.compute_runtime_state(trans, step, step_args)` — line 3154
   - `ToolModule.compute_runtime_state()` — line 2559:
     - Calls `super().compute_runtime_state(trans, step, step_updates, replace_default_values=False)`
     - Parent `WorkflowModule.compute_runtime_state()` — line 627:
       - `state = self.get_runtime_state()` → `state.inputs = self.state.inputs` → `{}`
       - `visit_input_values(self.get_runtime_inputs(step, ...), state.inputs, update_value, ...)` — line 659
       - `get_runtime_inputs()` for CWL returns `{}` → **visit is a no-op** (no inputs to visit)
     - Result: `state.inputs = {}`, `step_errors = {}`
   - `step.state = state` — line 3155

**After populate_module_and_state, each CWL step has `step.state.inputs = {}`.**

#### workflow_run_config_to_request

`/lib/galaxy/workflow/run_request.py:544`

For every step:
```python
serializable_runtime_state = step.module.encode_runtime_state(step, step.state)
step_state = WorkflowRequestStepState()
step_state.value = serializable_runtime_state
```

`encode_runtime_state()` — `/lib/galaxy/workflow/modules.py:682`:
```python
def encode_runtime_state(self, step, runtime_state: DefaultToolState):
    return runtime_state.encode(Bunch(inputs=self.get_runtime_inputs(step)), self.trans.app)
```

`DefaultToolState.encode()` — `/lib/galaxy/tools/__init__.py:831`:
```python
def encode(self, tool, app, nested=False):
    value = params_to_strings(tool.inputs, self.inputs, app, nested=nested)
    value["__page__"] = self.page
    value["__rerun_remap_job_id__"] = self.rerun_remap_job_id
    return value
```

For CWL: `tool.inputs` = `{}` (from `get_runtime_inputs()`), `self.inputs` = `{}`.

`params_to_strings({}, {}, app)` — `/lib/galaxy/tools/parameters/__init__.py:330`:
- Iterates over `param_values.items()` — empty dict — so returns `{}`
- Then `value["__page__"] = 0`, `value["__rerun_remap_job_id__"] = None`

**Result: `WorkflowRequestStepState.value = {"__page__": 0, "__rerun_remap_job_id__": None}`**

This currently WORKS when `state.inputs` is empty (no `NoReplacement` values). But it would FAIL if `compute_runtime_state` populated any `NoReplacement` values into `state.inputs`.

**When does NoReplacement appear?** In the `replace_default_values=True` path (line 640-641 in `compute_runtime_state`):
```python
if replace_default_values and step:
    state.inputs = step.state.inputs
```
This is called with `replace_default_values=True` during EXECUTION (line 2642-2643 in ToolModule.execute). But during invocation request creation, `replace_default_values` defaults to `False`, so `NoReplacement` values are NOT injected during this phase — the issue described in the research doc would only arise if `compute_runtime_state` was called differently.

Actually, re-reading the code more carefully: the `update_value` callback at line 646 returns `NO_REPLACEMENT` when no step input or no default. But this is used with `no_replacement_value=NO_REPLACEMENT` in `visit_input_values` — which means those values are NOT stored in `state.inputs` when the return value matches the sentinel. So the state stays clean of `NoReplacement` during this phase. The `encode_runtime_state` crash described in the research doc must happen in a different scenario — perhaps when `replace_default_values=True` is used with default values that resolve to `NoReplacement`, or in a case where CWL step inputs DO have some Galaxy runtime inputs.

Let me re-examine: for CWL tools, `get_runtime_inputs()` returns `{}`, so `visit_input_values()` visits nothing. The only way `NoReplacement` could appear is if `state.inputs` already contained them from a prior operation. Since `state.inputs = {}` for CWL, and `visit_input_values` with empty params is a no-op, **the encode path currently works for CWL steps with empty state**.

The real question is: if/when `state.inputs` contains actual values (e.g., from step defaults that were loaded differently), those would be passed through `params_to_strings` with empty `params`, and `json.dumps` would be called on them. Most values would survive this, but complex objects or sentinels would not.

---

### Phase 3: Workflow Execution

#### Entry Point — Scheduler Picks Up Invocation

`schedule()` — `/lib/galaxy/workflow/run.py:66`
- Creates `WorkflowInvoker(trans, workflow, workflow_run_config, workflow_invocation)` — line 91
- `invoker.invoke()` — line 100

#### WorkflowInvoker.invoke() — Recovering State

`remaining_steps()` — `/lib/galaxy/workflow/run.py:434`:

1. `module_injector.inject_all(workflow, ...)` — line 445
   - For each step: `module_factory.from_workflow_step(trans, step)` — creates module, `recover_state(step.tool_inputs, ...)` → `state.inputs = {}`

2. `module_injector.compute_runtime_state(step, step_args=step_args)` — line 449
   - Same as Phase 2: for CWL, `state.inputs = {}`

3. **Decode the persisted runtime state** — line 455-457:
   ```python
   runtime_state = step_states[step_id].value  # from WorkflowRequestStepState
   step.state = step.module.decode_runtime_state(step, runtime_state)
   ```

`ToolModule.decode_runtime_state()` — line 2578:
```python
state = super().decode_runtime_state(step, runtime_state)
```

`WorkflowModule.decode_runtime_state()` — line 686:
```python
state = DefaultToolState()
state.decode(runtime_state, Bunch(inputs=self.get_runtime_inputs(step)), self.trans.app)
return state
```

`DefaultToolState.decode()` — line 840:
```python
values = safe_loads(values) or {}
self.page = values.pop("__page__") if "__page__" in values else 0
self.rerun_remap_job_id = values.pop("__rerun_remap_job_id__") ...
self.inputs = params_from_strings(tool.inputs, values, app, ignore_errors=True)
```

For CWL: `runtime_state` = `{"__page__": 0, "__rerun_remap_job_id__": None}`. After popping those keys, `values = {}`. `params_from_strings({}, {}, app)` returns `{}`.

**Result: `step.state.inputs = {}` after decode.**

#### _invoke_step → ToolModule.execute()

`_invoke_step()` — line 364:
```python
invocation_step.workflow_step.module.execute(trans, progress, invocation_step, ...)
```

`ToolModule.execute()` — line 2626:

First, it recomputes runtime state with `replace_default_values=True`:
```python
self.state, _ = self.compute_runtime_state(
    trans, step, step_updates=progress.param_map.get(step.id), replace_default_values=True
)
step.state = self.state
```

This time `replace_default_values=True`, so line 640-641: `state.inputs = step.state.inputs` (still `{}`). The `visit_input_values` with empty runtime inputs is still a no-op. `step.state.inputs` remains `{}`.

Then checks `use_cwl_path`:
```python
use_cwl_path = tool.tool_type in CWL_TOOL_TYPES and not tool.has_galaxy_inputs
```

**CWL path** (line 2657-2698):

1. `cwl_input_dict = build_cwl_input_dict(step, progress, trans)` — line 2660
   - Builds dict from **live step connections** (not from persisted state!)
   - For each `input_connections_by_name`, resolves the replacement from `progress`
   - Fills defaults from `step.inputs[].default_value`
   - Result: `{"input1": {"src": "hda", "id": 5}, "threshold": 0.5, ...}`

2. `evaluate_cwl_value_from_expressions(...)` — line 2663

3. `find_cwl_scatter_collections(...)` → scatter expansion — line 2666

4. Build `param_combinations` — line 2680-2693:
   - Each slice_dict is a dict like `{"input1": {"src": "hda", "id": 5}, "__when_value__": true}`

5. **Creates MappingParameters WITHOUT validated_param_combinations**:
   ```python
   mapping_params = MappingParameters(param_template, param_combinations)
   ```
   — line 2872

6. Calls `execute(trans, tool, mapping_params, ...)` — line 2882

#### execute() → _execute() → job creation

`/lib/galaxy/tools/execute.py:176`

In `execute_single_job()` — line 213:
```python
if execution_slice.validated_param_combination:
    tool_state = execution_slice.validated_param_combination.input_state
    job.tool_state = tool_state
```

Since `validated_param_combinations` was not provided (None), `validated_param_combination` is None for every slice. **`job.tool_state` is never set — remains None.**

#### Job Execution — CwlToolEvaluator

`set_compute_environment()` — `/lib/galaxy/tools/evaluation.py:167`

Since `UserToolEvaluator.param_dict_style = "json"` (not "regular"), takes the else branch at line 227:
```python
tool_state: Optional[JobInternalToolState] = None
if job.tool_state:          # <-- None, so False
    tool_state = JobInternalToolState(job.tool_state)
self.param_dict = self.build_param_dict(
    incoming, inp_data, out_data,
    output_collections=out_collections,
    validated_tool_state=tool_state,    # <-- None
)
```

`UserToolEvaluator.build_param_dict()` — line 1122:
```python
if validated_tool_state is not None:
    # runtimeify() path — the correct new path
    ...
else:
    # deprecated to_cwl() fallback
    from galaxy.workflow.modules import to_cwl
    log.info("Building CWL style inputs using deprecated to_cwl function...")
    cwl_style_inputs = to_cwl(incoming, hda_references=hda_references, compute_environment=compute_environment)
```

**Result: Falls back to deprecated `to_cwl()` path because `job.tool_state` was never set.**

---

## 3. Assessment of CWL_WORKFLOW_STATE_VALIDATION_RESEARCH.md

### Accuracy of the Research Doc

The research doc's analysis is **largely correct** with some refinements:

#### 1. The encode_runtime_state crash

The doc states `NoReplacement` in `state.inputs` causes the crash. Based on my trace:

- During invocation request creation (`populate_module_and_state` then `workflow_run_config_to_request`), `compute_runtime_state` is called with `replace_default_values=False`. For CWL tools, `get_runtime_inputs()` returns `{}`, so `visit_input_values` is a no-op and `state.inputs` stays as `{}`. No `NoReplacement` sentinels appear.

- The current code actually **does not crash** for CWL steps with empty state. The crash would only happen if:
  - CWL steps somehow got `NoReplacement` values in their state (perhaps via a different code path I haven't traced)
  - Or if `state.inputs` contained complex non-JSON-serializable objects

**If the encode path currently works for CWL steps**, then the first problem is actually just that `WorkflowRequestStepState.value` contains `{"__page__": 0, "__rerun_remap_job_id__": None}` — a meaningless placeholder. This is harmless but wasteful.

However, if future changes populate CWL step state with actual values (or if some CWL workflows already do this through paths I haven't traced), the crash IS a real risk.

#### 2. The missing validated_param_combinations

The doc is **exactly right**. `ToolModule.execute()` CWL path (line 2872) creates `MappingParameters(param_template, param_combinations)` without `validated_param_combinations`. This means `job.tool_state` is never set, and `CwlToolEvaluator` falls back to `to_cwl()`.

#### 3. The state flow diagram

The doc's "Workflow Path (broken)" diagram is accurate. The CWL workflow path:
- Does NOT produce `JobInternalToolState` instances
- Does NOT set `job.tool_state`
- Falls back to deprecated `to_cwl(incoming)` in `CwlToolEvaluator`

### Impact on Path B Proposal

The research doc's Path B proposal is sound. Based on my trace, here are additional details:

#### What `step.tool_inputs` contains for CWL

The persisted `step.tool_inputs` = `{}` (empty dict). The CWL step proxy's `to_dict()` creates a `tool_state` variable but does NOT include it in the returned dict. So `d.get("tool_state")` in `from_dict()` returns `None`, which becomes `{}` after `or {}` in `step_state_to_tool_state`.

This means **no CWL parameter state is persisted in `tool_inputs`** — it's entirely reconstructed from step connections at execution time by `build_cwl_input_dict()`.

#### Additional considerations for Path B

1. **`compute_runtime_state` is a no-op for CWL** — `get_runtime_inputs()` returns `{}`, so `visit_input_values` never visits anything. Path B's `encode_runtime_state`/`decode_runtime_state` overrides don't need to worry about values coming from `compute_runtime_state` — the state will be `{}` or whatever was in `step.state.inputs` from `recover_state`.

2. **`step.state.inputs` vs actual execution inputs** — There's a fundamental disconnect: `step.state.inputs` is always `{}` for CWL, while the actual inputs are built dynamically by `build_cwl_input_dict()` from step connections. The `WorkflowRequestStepState.value` for CWL steps is effectively unused. Path B should acknowledge that the persisted state for CWL is informational/empty, and the real execution inputs come from the workflow graph.

3. **The `__when_value__` key** — The CWL execution path adds `__when_value__` to `param_combinations` at line 2692. If `JobInternalToolState.validate()` doesn't allow extra keys, this needs to be stripped before validation. The legacy path also adds this key at line 2829.

4. **`to_cwl()` fallback for `incoming` param** — In the legacy fallback path (line 1156-1162), `incoming` comes from `job.parameters` (line 175 in `set_compute_environment`). This is populated by the `handle_single_execution` → tool action chain. For CWL workflow jobs, `incoming` contains Galaxy-style refs, which `to_cwl()` converts to CWL File/Directory objects. The new runtimeify path gets the same data from `job.tool_state`. If `job.tool_state` is set correctly, the `to_cwl()` fallback is eliminated.

### Additional State Read/Write Locations

The doc doesn't mention these:

1. **`check_and_update_state`** — `ToolModule.check_and_update_state()` (line 2438) calls `self.tool.check_and_update_param_values(self.state.inputs, ...)`. For CWL tools with `tool.inputs = {}`, this should be a no-op but is worth verifying. Called during inject at line 3158.

2. **`add_dummy_datasets`** — `module.add_dummy_datasets(connections=step.input_connections, steps=steps)` at line 3124. For CWL tools with `tool.inputs = {}`, `visit_input_values` is a no-op. No issue.

3. **`get_config_form`** — `ToolModule.get_config_form()` (line 2431) calls `params_to_incoming(incoming, self.tool.inputs, self.state.inputs, self.trans.app)`. With empty `tool.inputs` and empty `state.inputs`, this is a no-op. Used for editor rendering, not execution.

4. **Workflow export** — `save_to_step` → `get_state()` persists `state.inputs = {}` to `tool_inputs`. When re-exporting, this empty dict is preserved. CWL workflows can be round-tripped through Galaxy's native format, but the CWL-specific information (step inputs, defaults, valueFrom) lives in `WorkflowStepInput` objects, not `tool_inputs`.

5. **`step.state` attribute** — This is a **non-persistent, transient attribute** (line 8818: `self.state: Optional[DefaultToolState]`). It's only populated during module injection and used during the current request/scheduling cycle. It is NOT stored in the database directly — `tool_inputs` (the persistent column) is separate.

---

## 4. Unresolved Questions

- **Is the `NoReplacement` crash actually reachable today?** Based on my trace, CWL steps get `state.inputs = {}` throughout invocation request creation, so `encode_runtime_state` with empty inputs should not crash. Under what scenario does `NoReplacement` end up in CWL step state? Perhaps when a CWL workflow has runtime-settable parameters?

- **What about CWL `parameter_input` steps?** These are created by `cwl_input_to_galaxy_step()` (line 734) and use `ParameterModule`, not `ToolModule`. They have their own `get_runtime_inputs()` and `encode/decode` paths. Do they also hit problems?

- **What does `tool.check_and_update_param_values({}, ...)` do?** For CWL tools with empty `inputs`, this might still try to add default values or produce upgrade messages. Could cause unexpected behavior during inject.

- **Are there CWL tools where `has_galaxy_inputs = True`?** If a CWL tool somehow gets Galaxy inputs populated (perhaps through a hybrid tool definition), it would take the legacy path instead of `use_cwl_path`, and the analysis would be different.

- **What happens with CWL subworkflow steps?** `SubworkflowStepProxy.to_dict()` also doesn't include `tool_state`. The `SubWorkflowModule` class has its own `save_to_step`, `recover_state`, etc. The state handling for subworkflows within CWL workflows may have similar or different issues.

---

## File References

| File | Key Lines | Purpose |
|------|-----------|---------|
| `lib/galaxy/tool_util/cwl/parser.py` | 697-719 | `WorkflowProxy.to_dict()` — CWL → Galaxy dict |
| `lib/galaxy/tool_util/cwl/parser.py` | 1103-1126 | `ToolStepProxy.to_dict()` — CWL step → Galaxy step dict (tool_state NOT included) |
| `lib/galaxy/tool_util/cwl/parser.py` | 1021-1036 | `InputProxy.to_dict()` — step input metadata (scatter, valueFrom, default) |
| `lib/galaxy/managers/workflows.py` | 622-675 | `normalize_workflow_format()` — CWL import entry point |
| `lib/galaxy/managers/workflows.py` | 808-944 | `_workflow_from_raw_description()` — creates Workflow + steps from dict |
| `lib/galaxy/managers/workflows.py` | 1880-1980 | `__module_from_dict()` — creates WorkflowStep + module from dict |
| `lib/galaxy/workflow/modules.py` | 481-486 | `WorkflowModule.from_dict()` — calls `recover_state(d.get("tool_state"))` |
| `lib/galaxy/workflow/modules.py` | 489-493 | `WorkflowModule.from_workflow_step()` — calls `recover_state(step.tool_inputs)` |
| `lib/galaxy/workflow/modules.py` | 497-499 | `WorkflowModule.save_to_step()` — `step.tool_inputs = self.get_state()` |
| `lib/galaxy/workflow/modules.py` | 523-535 | `WorkflowModule.get_state()` — returns `state.inputs` when `get_inputs()` is empty |
| `lib/galaxy/workflow/modules.py` | 543-570 | `WorkflowModule.recover_state()` — takes else branch for CWL (empty inputs) |
| `lib/galaxy/workflow/modules.py` | 627-680 | `WorkflowModule.compute_runtime_state()` — no-op for CWL (empty runtime inputs) |
| `lib/galaxy/workflow/modules.py` | 682-690 | `encode_runtime_state` / `decode_runtime_state` — uses params_to/from_strings |
| `lib/galaxy/workflow/modules.py` | 2313-2314 | `ToolModule.get_inputs()` — returns `tool.inputs` (empty for CWL) |
| `lib/galaxy/workflow/modules.py` | 2556-2557 | `ToolModule.get_runtime_inputs()` — returns `get_inputs()` (empty for CWL) |
| `lib/galaxy/workflow/modules.py` | 2626-2944 | `ToolModule.execute()` — CWL path builds inputs from connections |
| `lib/galaxy/workflow/modules.py` | 245-288 | `build_cwl_input_dict()` — builds live CWL input dict from step connections |
| `lib/galaxy/workflow/modules.py` | 3093-3160 | `WorkflowModuleInjector` — inject, compute_runtime_state |
| `lib/galaxy/workflow/modules.py` | 3163-3186 | `populate_module_and_state()` — called during invocation request creation |
| `lib/galaxy/workflow/run_request.py` | 544-651 | `workflow_run_config_to_request()` — serializes step states |
| `lib/galaxy/workflow/run.py` | 128-151 | `queue_invoke()` — API entry point for workflow invocation |
| `lib/galaxy/workflow/run.py` | 434-463 | `remaining_steps()` — recovers state via `decode_runtime_state` |
| `lib/galaxy/workflow/run.py` | 364-372 | `_invoke_step()` — calls `module.execute()` |
| `lib/galaxy/tools/__init__.py` | 810-857 | `DefaultToolState` — encode/decode via params_to/from_strings |
| `lib/galaxy/tools/__init__.py` | 1717-1728 | `parse_inputs()` — sets `has_galaxy_inputs` |
| `lib/galaxy/tools/execute.py` | 77-91 | `MappingParameters` — includes optional `validated_param_combinations` |
| `lib/galaxy/tools/execute.py` | 254-256 | `execute_single_job()` — sets `job.tool_state` only if validated |
| `lib/galaxy/tools/evaluation.py` | 167-237 | `set_compute_environment()` — recovers `JobInternalToolState` from `job.tool_state` |
| `lib/galaxy/tools/evaluation.py` | 1122-1163 | `UserToolEvaluator.build_param_dict()` — runtimeify vs to_cwl fallback |
| `lib/galaxy/tools/evaluation.py` | 1194-1200 | `CwlToolEvaluator` — extends UserToolEvaluator |
| `lib/galaxy/tools/parameters/__init__.py` | 330-353 | `params_to_strings()` — fails on non-JSON values when params is empty |
| `lib/galaxy/model/__init__.py` | 8762 | `WorkflowStep.tool_inputs` — JSONType column |
| `lib/galaxy/model/__init__.py` | 10471-10492 | `WorkflowRequestStepState` — persists encoded runtime state |
