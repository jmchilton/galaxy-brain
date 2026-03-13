# Plan: CWL `loadContents` for Workflow Inputs and Step Inputs

## Problem

3 CWL conformance tests fail across v1.1 and v1.2:

- `workflow_input_inputBinding_loadContents` — `loadContents` on workflow input's `inputBinding`
- `workflow_input_loadContents_without_inputBinding` — `loadContents` directly on workflow input
- `workflow_step_in_loadContents` — `loadContents` on `WorkflowStepInput`

All 3 use a file containing `"42"` with `valueFrom: $(parseInt(self.contents))`. Galaxy never populates `self.contents` so the expression fails.

## CWL Spec Behavior

When `loadContents: true` is set on an input, the engine must read the file's content (up to 64KB) and set `self.contents` before evaluating `valueFrom` expressions. Three places it can appear:

1. **Workflow input `inputBinding.loadContents`** (`wf-loadContents.cwl`)
2. **Workflow input `loadContents`** (`wf-loadContents2.cwl`)
3. **WorkflowStepInput `loadContents`** (`wf-loadContents4.cwl`)

In all cases, `self.contents` must be available when `valueFrom` is evaluated at the step level.

## Existing Infrastructure

Galaxy already has `load_contents` for tool data parameters:
- `basic.py:2108` — `self.load_contents = int(input_source.get("load_contents", 0))`
- `wrapped_json.py:136` — reads file and sets `json_value["contents"]` when `load_contents > 0`

This only works for tool execution, not workflow step input evaluation.

## Architecture

The cleanest approach: handle `loadContents` entirely in `evaluate_cwl_value_from_expressions()` and `to_cwl()`. When converting an HDA to a CWL File dict for expression evaluation, check if `loadContents` is set for that input and read file contents into the `contents` field.

Two sources of `loadContents`:
- **Step input level** (variant 3): stored on `WorkflowStepInput`, directly available during `evaluate_cwl_value_from_expressions()`
- **Workflow input level** (variants 1 & 2): declared on the workflow input, but consumed at the step level when the step references that input. cwltool resolves this by checking `loadContents` on both the step input AND propagating from workflow inputs. Galaxy needs to propagate this through the parser.

## Implementation

### 1. Add `load_contents` column to `WorkflowStepInput` model

**File**: `lib/galaxy/model/__init__.py` (~line 9083)

Add after `default_value_set`:
```python
load_contents: Mapped[Optional[bool]] = mapped_column(default=False)
```

Update `copy()` (~line 9105):
```python
copied_step_input.load_contents = self.load_contents
```

### 2. Alembic migration

**New file**: `lib/galaxy/model/migrations/alembic/versions_gxy/<hash>_add_load_contents_to_workflow_step_input.py`

Add nullable boolean `load_contents` column to `workflow_step_input` table.

### 3. Parse `loadContents` from CWL step inputs

**File**: `lib/galaxy/tool_util/cwl/parser.py`

In `InputProxy.to_dict()` (~line 1210), add after the `default` handling:
```python
if self._cwl_input.get("loadContents", False):
    as_dict["load_contents"] = True
```

### 4. Parse `loadContents` from CWL workflow inputs and propagate to step inputs

**File**: `lib/galaxy/tool_util/cwl/parser.py`

The tricky variant. When a workflow input has `loadContents: true` (either directly or via `inputBinding`), any step input that sources from that workflow input should inherit `loadContents`.

In `WorkflowProxy.to_dict()` or the step proxy code, after parsing workflow inputs, build a set of input labels that have `loadContents`:
```python
load_contents_inputs = set()
for inp in self._workflow.tool["inputs"]:
    if inp.get("loadContents") or (inp.get("inputBinding") or {}).get("loadContents"):
        label = self.jsonld_id_to_label(inp["id"])
        load_contents_inputs.add(label)
```

Then in `InputProxy.to_dict()`, check if the source references a workflow input with `loadContents`:
```python
# Check if source workflow input has loadContents
if not self._cwl_input.get("loadContents", False):
    if self.cwl_source_id:
        source_refs = split_step_references(
            listify(self.cwl_source_id), multiple=True,
            workflow_id=self.step_proxy.cwl_workflow_id
        )
        for step_name, _ in source_refs:
            if step_name in self.workflow_proxy.load_contents_inputs:
                as_dict["load_contents"] = True
                break
```

Store `load_contents_inputs` as an attribute on `WorkflowProxy`.

### 5. Import `load_contents` during workflow import

**File**: `lib/galaxy/managers/workflows.py` (~line 2002)

After `step_input.value_from = value_from`:
```python
step_input.load_contents = input_dict.get("load_contents", False)
```

### 6. Export `load_contents` during workflow export

**File**: `lib/galaxy/managers/workflows.py` (in the export section, near where `value_from` is exported)

Include `load_contents` in the exported step input dict when True.

### 7. Populate `contents` in `to_cwl()` when `loadContents` is set

**File**: `lib/galaxy/workflow/modules.py` (~line 165)

Add a `load_contents_for` parameter (set of input names) to `to_cwl()`, or handle it at the call site.

In `evaluate_cwl_value_from_expressions()` (~line 378), build the set of inputs needing `loadContents`:
```python
load_contents_set = set()
for step_input in step.inputs:
    if step_input.load_contents:
        load_contents_set.add(step_input.name)
```

When converting refs to CWL format (~line 400-401), after `_ref_to_cwl()` returns a File dict, check if the input needs contents loaded:
```python
for key, value in cwl_input_dict.items():
    cwl_value = _ref_to_cwl(value, hda_references, trans, step)
    if key in load_contents_set and isinstance(cwl_value, dict) and cwl_value.get("class") == "File":
        path = cwl_value.get("path")
        if path:
            with open(path, "r") as f:
                cwl_value["contents"] = f.read(64 * 1024)  # CWL 64KB limit
    step_state[key] = cwl_value
```

### 8. Serialize/deserialize `load_contents` in WorkflowStepInput

**File**: `lib/galaxy/model/__init__.py`

In `WorkflowStepInput._serialize()` (if it exists) or wherever step inputs are serialized for workflow format2/ga export, include `load_contents`.

## Testing

### Red-to-green
Run the 3 failing conformance tests after implementation:
```bash
pytest -s -v lib/galaxy_test/api/cwl/test_cwl_conformance_v1_1.py::TestCwlConformance::test_conformance_v1_1_workflow_input_inputBinding_loadContents
pytest -s -v lib/galaxy_test/api/cwl/test_cwl_conformance_v1_1.py::TestCwlConformance::test_conformance_v1_1_workflow_input_loadContents_without_inputBinding
pytest -s -v lib/galaxy_test/api/cwl/test_cwl_conformance_v1_1.py::TestCwlConformance::test_conformance_v1_1_workflow_step_in_loadContents
```

### Order of implementation for red-to-green
1. Start with variant 3 (step input `loadContents`) — simplest, no propagation needed
2. Then variant 2 (workflow input `loadContents`) — requires propagation
3. Then variant 1 (workflow input `inputBinding.loadContents`) — same propagation, different parse location

## Unresolved Questions

- Should `load_contents` default to `False` or `None` in the DB? `False` is simpler, `None` distinguishes "not set" from "explicitly false" but CWL doesn't need that distinction.
- The 64KB content limit — should we enforce it or just read the whole file? cwltool enforces it. Probably match cwltool.
- Do any other CWL features reference `self.contents` outside of `valueFrom`? (e.g. `when` expressions?) If so, the contents population logic may need to be broader than just `evaluate_cwl_value_from_expressions`.
