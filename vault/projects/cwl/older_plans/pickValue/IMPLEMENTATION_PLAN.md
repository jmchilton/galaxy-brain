# PickValueModule Implementation Plan

## Overview

Add a `pick_value` workflow module type to Galaxy. Module lives in `lib/galaxy/workflow/modules.py`, renders via a Vue component in the editor (like `data_collection_input`), and uses existing DB tables (no migration).

All file paths relative to `/Users/jxc755/projects/worktrees/galaxy/branch/pick_value_module/`.

---

## Phase 1: Backend Module (Red-to-Green)

### Step 1.1: Write failing API test

**File:** `lib/galaxy_test/api/test_workflows.py`

Add test near existing `test_run_workflow_simple_conditional_step` (~line 3042). Pattern: two conditional branches with `when` expressions, wired into a `pick_value` step.

```python
def test_pick_value_first_non_null(self):
    with self.dataset_populator.test_history() as history_id:
        summary = self._run_workflow(
            """class: GalaxyWorkflow
inputs:
  input_data: data
outputs:
  picked:
    outputSource: pick/output
steps:
  branch_a:
    tool_id: cat1
    in:
      input1: input_data
    when: $(true)
  branch_b:
    tool_id: cat1
    in:
      input1: input_data
    when: $(false)
  pick:
    type: pick_value
    state:
      mode: first_non_null
    in:
      input_0: branch_a/out_file1
      input_1: branch_b/out_file1
""",
            test_data={"input_data": {"value": "1.bed", "type": "File"}},
            history_id=history_id,
        )
        invocation = self.workflow_populator.get_invocation(summary.invocation_id, step_details=True)
        # The picked output should be the non-skipped branch_a output
        output_details = self.dataset_populator.get_history_dataset_details(
            history_id, content_id=invocation["outputs"]["picked"]["id"]
        )
        assert output_details["state"] == "ok"
```

Add similar tests for: `first_or_skip` (all null -> skipped output), `the_only_non_null`, `all_non_null`.

**Test for `first_or_skip` all-null case:**
```python
def test_pick_value_first_or_skip_all_null(self):
    # Both branches skipped -> output should be skipped
    # Verify output HDA has blurb="skipped", extension="expression.json"
```

**Test for `the_only_non_null` error case:**
```python
def test_pick_value_the_only_non_null_error_on_multiple(self):
    # Both branches produce output -> should fail invocation
```

**Test for `all_non_null`:**
```python
def test_pick_value_all_non_null_produces_collection(self):
    # Multiple non-null inputs -> output is a list collection
```

### Step 1.2: Register the module type

**File:** `lib/galaxy/workflow/modules.py`, line 2729

```python
module_types = dict(
    data_input=InputDataModule,
    data_collection_input=InputDataCollectionModule,
    parameter_input=InputParameterModule,
    pause=PauseModule,
    pick_value=PickValueModule,  # ADD THIS
    tool=ToolModule,
    subworkflow=SubWorkflowModule,
)
```

### Step 1.3: Implement PickValueModule class

**File:** `lib/galaxy/workflow/modules.py`, insert before the `module_types` dict (~line 2729).

```python
class PickValueModule(WorkflowModule):
    type = "pick_value"
    name = "Pick Value"

    MODES = ("first_non_null", "first_or_skip", "the_only_non_null", "all_non_null")
```

#### 1.3a: State management

The module stores `mode` in `tool_state`. No backend form generation -- state managed directly (like `InputDataCollectionModule.get_inputs()` returning `{}`).

```python
def get_inputs(self):
    # Migrated to frontend Vue component
    return {}

def validate_state(self, state: dict[str, Any]) -> None:
    mode = state.get("mode")
    if mode and mode not in self.MODES:
        raise ValueError(f"Invalid pick_value mode: {mode}")

def get_export_state(self):
    return self._get_mode_dict()

def _get_mode_dict(self):
    mode = self.state.inputs.get("mode", "first_non_null")
    return {"mode": mode}

def save_to_step(self, step, detached=False):
    step.type = self.type
    step.tool_inputs = self._get_mode_dict()
```

#### 1.3b: Input/output terminal definitions

The module needs N data inputs (determined by connections) and 1 output. Each input is a named terminal (`input_0`, `input_1`, ...) so ordering is explicit and per-input null/skip detection is unambiguous.

**Design decision: N named terminals.** Ordering matters for `first_non_null` and `first_or_skip` — the user expects "first" to mean the topmost wired input. A single `multiple=True` terminal doesn't guarantee ordering and makes it harder to reason about which upstream step maps to which position. Named terminals make the ordering visible in the editor and deterministic at runtime.

The module determines how many inputs it has from `step.input_connections_by_name`. It always exposes at least 2 terminals, plus one extra empty terminal so the user can add more connections. The number of inputs is stored in `tool_state` as `num_inputs` and updated when connections change.

```python
@property
def _num_inputs(self):
    """Number of input terminals — at least 2, grows with connections."""
    num_from_state = self.state.inputs.get("num_inputs", 2)
    num_from_connections = 0
    if hasattr(self, 'workflow_step') and self.workflow_step:
        num_from_connections = len(self.workflow_step.input_connections_by_name)
    return max(2, num_from_state, num_from_connections)

def get_all_inputs(self, data_only=False, connectable_only=False):
    inputs = []
    # N connected terminals + 1 empty terminal for adding more
    for i in range(self._num_inputs + 1):
        inputs.append(dict(
            name=f"input_{i}",
            label=f"Input {i}",
            multiple=False,
            extensions=["input"],
            input_type="dataset",
            optional=True,
        ))
    return inputs

def get_all_outputs(self, data_only=False):
    mode = self.state.inputs.get("mode", "first_non_null")
    if mode == "all_non_null":
        return [
            dict(
                name="output",
                label="Picked values",
                extensions=["input"],
                collection=True,
                collection_type="list",
            )
        ]
    return [
        dict(
            name="output",
            label="Picked value",
            extensions=["input"],
        )
    ]
```

**Editor behavior:** When a user connects to the last empty terminal, the module increments `num_inputs` in `tool_state`, and the editor re-fetches the module definition, which now has one more terminal + a new empty one. This is the same "grow on connect" pattern used by repeat parameters in tools.

#### 1.3c: Null/skip detection helper

A helper to determine if a replacement value is a skipped/null output. Based on `set_skipped()` in `model/__init__.py` line 5237:

```python
@staticmethod
def _is_null_or_skipped(value) -> bool:
    """Check if a replacement value represents a skipped/null output."""
    if value is NO_REPLACEMENT:
        return True
    if isinstance(value, model.HistoryDatasetAssociation):
        if value.extension == "expression.json" and value.blurb == "skipped":
            return True
    return False
```

#### 1.3d: execute() method

Core logic. Reads input connections, applies mode, sets output.

```python
def execute(
    self, trans, progress: "WorkflowProgress", invocation_step, use_cached_job: bool = False
) -> Optional[bool]:
    step = invocation_step.workflow_step
    mode = step.tool_inputs.get("mode", "first_non_null") if step.tool_inputs else "first_non_null"

    # Gather replacements from each named input terminal, in order
    replacements = []
    for input_dict in self.get_all_inputs():
        replacement = progress.replacement_for_input(trans, step, input_dict)
        if replacement is not NO_REPLACEMENT:
            replacements.append(replacement)

    # Separate non-null from null, preserving order
    non_null = [r for r in replacements if not self._is_null_or_skipped(r)]

    if mode == "first_non_null":
        if not non_null:
            raise FailWorkflowEvaluation(
                why=InvocationFailureExpressionEvaluationFailed(
                    reason=FailureReason.expression_evaluation_failed,
                    workflow_step_id=step.id,
                )
            )
        output = non_null[0]

    elif mode == "first_or_skip":
        if not non_null:
            # Produce a skipped output
            output = self._create_skipped_output(trans, invocation_step)
        else:
            output = non_null[0]

    elif mode == "the_only_non_null":
        if len(non_null) != 1:
            raise FailWorkflowEvaluation(
                why=InvocationFailureExpressionEvaluationFailed(
                    reason=FailureReason.expression_evaluation_failed,
                    workflow_step_id=step.id,
                )
            )
        output = non_null[0]

    elif mode == "all_non_null":
        if not non_null:
            raise FailWorkflowEvaluation(
                why=InvocationFailureExpressionEvaluationFailed(
                    reason=FailureReason.expression_evaluation_failed,
                    workflow_step_id=step.id,
                )
            )
        output = self._create_collection_from_list(trans, invocation_step, non_null)

    else:
        raise ValueError(f"Unknown pick_value mode: {mode}")

    progress.set_step_outputs(invocation_step, {"output": output})
    return None
```

#### 1.3e: _create_skipped_output() helper

For `first_or_skip` when all inputs are null. Creates a skipped HDA like `set_skipped()` does:

```python
def _create_skipped_output(self, trans, invocation_step):
    invocation = invocation_step.workflow_invocation
    history = invocation.history
    hda = model.HistoryDatasetAssociation(
        name="Pick Value - skipped",
        history=history,
        create_dataset=True,
        flush=False,
    )
    object_store_populator = trans.app.object_store_populator
    hda.set_skipped(object_store_populator, replace_dataset=False)
    trans.sa_session.add(hda)
    return hda
```

#### 1.3f: _create_collection_from_list() helper

For `all_non_null` mode. Creates an HDCA from the list of non-null HDAs:

```python
def _create_collection_from_list(self, trans, invocation_step, hdas):
    invocation = invocation_step.workflow_invocation
    history = invocation.history
    elements = []
    for i, hda in enumerate(hdas):
        elements.append(
            dict(
                name=str(i),
                src="hda",
                id=hda.id,
            )
        )
    collection_manager = trans.app.dataset_collection_manager
    hdca = collection_manager.create(
        trans,
        history,
        collection_type="list",
        element_identifiers=elements,
    )
    return hdca
```

#### 1.3g: Runtime state methods

```python
def get_runtime_state(self):
    state = DefaultToolState()
    state.inputs = {}
    return state

def recover_mapping(self, invocation_step, progress):
    # Default recover_mapping from WorkflowModule base class handles this
    super().recover_mapping(invocation_step, progress)
```

### Step 1.4: Update InvocationFailure schema (if needed)

**File:** `lib/galaxy/schema/invocation.py`

May need a new `InvocationFailurePickValueFailed` class or we can reuse `InvocationFailureExpressionEvaluationFailed`. Check if the existing `FailureReason.expression_evaluation_failed` is descriptive enough. If not, add:

```python
class InvocationFailurePickValueFailed(InvocationFailureMessageBase):
    reason: Literal[FailureReason.expression_evaluation_failed]
    workflow_step_id: int
    details: Optional[str] = None
```

**Decision:** Start by reusing `InvocationFailureExpressionEvaluationFailed`. Add a dedicated failure type later if debugging is hard.

### Step 1.5: Update build_module API

**File:** `lib/galaxy/webapps/galaxy/api/workflows.py`, line 546

The `build_module` endpoint special-cases `data_collection_input` to skip backend form processing. Add `pick_value` to this check:

```python
from_tool_form = True if module_type not in ("data_collection_input", "pick_value") else False
```

This ensures the module's `tool_state` is passed through directly without backend form encoding.

### Step 1.6: Run tests, go green

Run the API tests from Step 1.1. Fix any issues with:
- `replacement_for_input` handling of `multiple=True` for non-tool modules
- Null detection on skipped HDAs
- Collection creation for `all_non_null`

---

## Phase 2: Frontend Editor Support

### Step 2.1: Add module to editor palette

**File:** `client/src/components/Workflow/Editor/modules/inputs.ts`

Add a new entry to `getWorkflowInputs()`. Need a suitable icon -- `faCodeBranch` (merge branches) or `faObjectUngroup` from font-awesome.

```typescript
import { faCodeBranch } from "@fortawesome/free-solid-svg-icons";

// In getWorkflowInputs():
{
    moduleId: "pick_value",
    title: "Pick Value",
    description: "Select among conditional branch outputs",
    icon: faCodeBranch,
},
```

### Step 2.2: Add icon mapping

**File:** `client/src/components/Workflow/icons.js`

```javascript
export default {
    // ... existing icons ...
    pick_value: "fa-code-branch",
};
```

**File:** `client/src/components/Workflow/Editor/modules/itemIcons.ts`

```typescript
import { faCodeBranch } from "font-awesome-6";

export const iconForType = {
    step: {
        // ... existing ...
        pick_value: faCodeBranch,
    },
    // ...
};
```

### Step 2.3: Create FormPickValue Vue component

**File:** `client/src/components/Workflow/Editor/Forms/FormPickValue.vue` (NEW)

Follow the pattern of `FormInputCollection.vue`. Renders mode selector + handles grow-on-connect for input terminals.

**How grow-on-connect works:** The component watches `step.input_connections`. When a connection is made to the last empty terminal (`input_N` where N = `num_inputs`), it increments `num_inputs` in `tool_state` and emits `onChange`. This triggers `Index.vue:onSetData()` → `getModule()` API call → backend `get_all_inputs()` returns N+1 named terminals + 1 new empty → `updateStep()` updates `step.inputs` reactively → `Node.vue` re-renders with the new terminal.

**Key architecture details (from editor research):**
- Connection creation: `NodeInput.vue:onDrop()` → `terminal.connect()` → `connectionStore.addConnection()` → `stepStore.addConnection()` → `updateStep()` — the step is reactive, so watchers fire.
- `build_module` re-fetch: only triggered by `onSetData` flow (form `onChange`), NOT by connection events. So the watcher must explicitly emit `onChange` to trigger re-fetch.
- `FormDefault.vue` has an `initialChange` guard — first `onChange` is suppressed. Must do a dummy initial emit (same as `FormInputCollection`).
- The `lastQueue` in `Index.vue` serializes `getModule` API calls, preventing race conditions.

```vue
<script setup lang="ts">
import { toRef, watch } from "vue";

import type { Step } from "@/stores/workflowStepStore";
import { useToolState } from "../composables/useToolState";
import FormElement from "@/components/Form/FormElement.vue";

interface ToolState {
    mode: string;
    num_inputs: number;
}

const props = defineProps<{
    step: Step;
}>();

const stepRef = toRef(props, "step");
const { toolState } = useToolState(stepRef);

function asToolState(ts: unknown): ToolState {
    const raw = ts as Record<string, unknown>;
    return {
        mode: (raw.mode as string) ?? "first_non_null",
        num_inputs: (raw.num_inputs as number) ?? 2,
    };
}

function cleanToolState(): ToolState {
    if (toolState.value) {
        return asToolState({ ...toolState.value });
    }
    return { mode: "first_non_null", num_inputs: 2 };
}

const emit = defineEmits(["onChange"]);

const modeOptions = [
    { value: "first_non_null", label: "First non-null (error if all null)" },
    { value: "first_or_skip", label: "First non-null (skip if all null)" },
    { value: "the_only_non_null", label: "The only non-null (error if != 1)" },
    { value: "all_non_null", label: "All non-null (as collection)" },
];

function onMode(newMode: string) {
    const state = cleanToolState();
    state.mode = newMode;
    emit("onChange", state);
}

// Grow-on-connect: watch step connections, add terminal when last empty one gets connected
watch(
    () => props.step.input_connections,
    (connections) => {
        const state = cleanToolState();
        const lastTerminalName = `input_${state.num_inputs}`;
        if (connections && connections[lastTerminalName]) {
            state.num_inputs = state.num_inputs + 1;
            emit("onChange", state);
        }
    },
    { deep: true }
);

// Dummy initial emit (same pattern as FormInputCollection — resets initialChange guard)
emit("onChange", cleanToolState());
</script>

<template>
    <div>
        <FormElement
            id="mode"
            :value="asToolState(toolState).mode"
            title="Selection Mode"
            type="select"
            :options="modeOptions"
            help="How to select among the connected inputs."
            @input="onMode" />
    </div>
</template>
```

### Step 2.4: Wire FormPickValue into FormDefault

**File:** `client/src/components/Workflow/Editor/Forms/FormDefault.vue`

Add conditional rendering for the pick_value module, following the pattern used for `data_collection_input` / `FormInputCollection`:

```vue
<!-- In template, add alongside the FormInputCollection conditional: -->
<FormPickValue
    v-if="type == 'pick_value'"
    :step="step"
    @onChange="onChange">
</FormPickValue>
<FormInputCollection
    v-else-if="type == 'data_collection_input'"
    :step="step"
    :datatypes="datatypes"
    :inputs="configForm?.inputs"
    @onChange="onChange">
</FormInputCollection>
<FormDisplay
    v-else-if="configForm?.inputs"
    :id="formDisplayId"
    :key="formKey"
    :inputs="configForm.inputs"
    @onChange="onChange" />
```

Add import:
```typescript
import FormPickValue from "@/components/Workflow/Editor/Forms/FormPickValue.vue";
```

### Step 2.5: Update workflow constants

**File:** `client/src/components/Workflow/constants.ts`

The `pick_value` module is NOT a workflow input, so `isWorkflowInput()` should NOT include it. No change needed here.

**File:** `client/src/components/Workflow/Editor/modules/labels.ts`

The `fromSteps()` function uses `isInput` check for step types. `pick_value` steps with labels should be treated as regular steps (not inputs). The current code already handles this correctly -- any step type not in the `WorkflowInputs` list gets `type: "step"`.

### Step 2.6: Terminal rendering and dynamics

**Input terminals:** The module's `get_all_inputs()` returns N+1 named terminals (`input_0` through `input_N`). Each is a single `InputTerminal` with `optional=True`. The editor renders them as separate connection points on the node. The last terminal is always empty (unconnected) — when it gets connected, the grow-on-connect watcher in `FormPickValue.vue` triggers a re-fetch that adds another empty terminal.

**Output terminal:** Depends on mode. `get_all_outputs()` returns either a `DataOutput` (for scalar modes) or a `CollectionOutput` with `collection_type: "list"` (for `all_non_null`). When the user changes mode, `onChange` → `build_module` re-fetches the output definition, and the editor reactively updates the output terminal. Existing downstream connections will be invalidated if the output type changes (e.g., scalar → collection).

**Step type union:** `workflowStepStore.ts:117` has a `NewStep.type` union that currently lists specific module types. Need to add `"pick_value"` to this union.

### Step 2.7: Disconnect behavior

When a user disconnects from a middle terminal (e.g., removes `input_1` but keeps `input_2`), the terminal stays in place as an empty slot. The module does NOT auto-shrink — `_num_inputs` is the max of `num_inputs` from state and the number of connected terminals. Gaps are cosmetic, not functional — the backend iterates all named terminals in order and skips `NO_REPLACEMENT` entries.

To manually reduce terminal count, the user could use an "Add/Remove Input" control in the form. This is a future UX improvement — for MVP, terminals only grow, never shrink.

---

## Phase 3: Workflow Format Support

### Step 3.1: gxformat2 YAML support

The gxformat2 workflow format (used in test YAML) needs to handle `type: pick_value` steps. The format already handles non-tool step types like `pause`. Check if the `type` field is passed through to `module_factory.from_dict()` correctly.

**File:** External `gxformat2` package handles conversion to native format. The key is that `type: pick_value` in the YAML becomes `{"type": "pick_value", "tool_state": {"mode": "..."}}` in the native dict. The `module_factory.from_dict()` at `modules.py` line 2718 dispatches on `type`, so as long as `"pick_value"` is in `module_types`, it works.

**Potential issue:** The gxformat2 converter may not pass through `type: pick_value` if it has hardcoded step type validation. Need to verify.

### Step 3.2: Native format (format1) export/import

**File:** `lib/galaxy/managers/workflows.py`

The `_workflow_to_dict_editor()` method (line 1288) already handles all module types generically via `module_factory.from_workflow_step()`. The step dict at line 1334 includes `type`, `tool_state`, `inputs`, `outputs`, etc. No special handling needed for `pick_value`.

The `_workflow_from_raw_description()` / `__module_from_dict()` at line 1952 calls `module_factory.from_dict(trans, step_dict)` which dispatches on `type`. Already works.

**Verify:** The `_workflow_to_dict_preview()` method (line 1248) has `else` branch at line 1274 that handles non-tool, non-subworkflow steps generically. Already works for `pick_value`.

### Step 3.3: Model store export/import

**File:** `lib/galaxy/model/store/__init__.py`

The export code at line 2840 only special-cases `type == "tool"`. Other step types are exported generically with their `tool_inputs`. Import uses `module_factory.from_dict()`. No changes needed.

---

## Phase 4: Tests

### Step 4.1: API workflow tests

**File:** `lib/galaxy_test/api/test_workflows.py`

Add tests near existing conditional step tests (~line 3042):

1. **`test_pick_value_first_non_null`** -- Two branches, one skipped. Verify correct output selected.
2. **`test_pick_value_first_non_null_error_all_null`** -- All branches skipped. Verify invocation fails.
3. **`test_pick_value_first_or_skip`** -- Two branches, one skipped. Verify correct output.
4. **`test_pick_value_first_or_skip_all_null`** -- All skipped. Verify output is skipped HDA.
5. **`test_pick_value_the_only_non_null`** -- Exactly one non-null. Verify correct output.
6. **`test_pick_value_the_only_non_null_error_zero`** -- All null. Verify failure.
7. **`test_pick_value_the_only_non_null_error_multiple`** -- Two non-null. Verify failure.
8. **`test_pick_value_all_non_null`** -- Multiple non-null. Verify output is list collection with correct count.
9. **`test_pick_value_all_non_null_filters_null`** -- Mix of null and non-null. Verify collection only has non-null.
10. **`test_pick_value_preserves_datatype`** -- Verify output inherits extension from input.
11. **`test_pick_value_three_branches`** -- Three conditional branches, verify N>2 works.

### Step 4.2: Editor unit tests (optional, stretch)

**File:** `client/src/components/Workflow/Editor/Forms/FormPickValue.test.ts` (NEW)

Test that the component emits correct state on mode changes. Follow patterns from existing form tests.

### Step 4.3: Integration test

**File:** `test/integration/test_workflow_invocation.py`

Add a test similar to `test_pick_value_preserves_datatype_and_inheritance_chain` (line 72) but using the module instead of the tool.

---

## Phase 5: Stretch Goal -- `first_or_default` Mode

### Design

`first_or_default`: Like `first_non_null` but falls back to a user-configured default value when all inputs are null. The default is stored in `tool_state` alongside `mode`.

### State shape

```json
{
    "mode": "first_or_default",
    "default_value": "some_value",
    "default_type": "text"  // "text" | "integer" | "float" | "boolean"
}
```

### Backend changes

**File:** `lib/galaxy/workflow/modules.py`

In `execute()`, add handler for `first_or_default`:

```python
elif mode == "first_or_default":
    if non_null:
        output = non_null[0]
    else:
        default_value = step.tool_inputs.get("default_value")
        default_type = step.tool_inputs.get("default_type", "text")
        # Create expression.json HDA with the default value
        output = self._create_default_output(trans, invocation_step, default_value, default_type)
```

The `_create_default_output` method creates an HDA with `expression.json` extension containing the serialized default value. This matches how Galaxy parameter tools produce their output.

### Frontend changes

**File:** `client/src/components/Workflow/Editor/Forms/FormPickValue.vue`

Add conditional fields shown when mode is `first_or_default`:
- Type selector: text/integer/float/boolean
- Default value field (type-appropriate input)

```vue
<FormElement
    v-if="asToolState(toolState).mode === 'first_or_default'"
    id="default_type"
    :value="asToolState(toolState).default_type || 'text'"
    title="Default value type"
    type="select"
    :options="defaultTypeOptions"
    @input="onDefaultType" />
<FormElement
    v-if="asToolState(toolState).mode === 'first_or_default'"
    id="default_value"
    :value="asToolState(toolState).default_value"
    title="Default value"
    :type="defaultFieldType"
    @input="onDefaultValue" />
```

### Validation

`validate_state()` should verify that when `mode == "first_or_default"`:
- `default_type` is one of `text`, `integer`, `float`, `boolean`
- `default_value` is set and type-compatible

### Output type

When `first_or_default` fires the default path, the output is an `expression.json` HDA (scalar value). The output terminal should be a `ParameterOutput` rather than `DataOutput` in this case. This means the output type may need to be dynamic based on what's connected -- or we accept that it's always a data output and downstream tools read it as expression.json.

**Decision:** Defer this complexity. For the stretch goal, always produce an `expression.json` HDA for the default case, and a pass-through HDA for the non-null case. This matches the existing `pick_value` tool behavior.

---

## Implementation Order

1. **Step 1.1**: Write failing API test for `first_non_null` mode
2. **Step 1.2-1.3**: Implement `PickValueModule` class and register it
3. **Step 1.5**: Update `build_module` API
4. Run test from 1.1, fix issues until green
5. **Step 1.1 (remaining)**: Add tests for other modes, go green
6. **Step 2.1-2.6**: Frontend editor support
7. **Step 3.1-3.3**: Verify format support
8. **Step 4.1-4.3**: Full test suite
9. **Phase 5**: Stretch goal (separate PR)

---

## Key File Summary

| File | Change |
|---|---|
| `lib/galaxy/workflow/modules.py` | `PickValueModule` class + register in `module_types` |
| `lib/galaxy/webapps/galaxy/api/workflows.py:546` | Add `pick_value` to `from_tool_form` bypass |
| `client/src/components/Workflow/Editor/modules/inputs.ts` | Add palette entry |
| `client/src/components/Workflow/icons.js` | Add icon |
| `client/src/components/Workflow/Editor/modules/itemIcons.ts` | Add icon |
| `client/src/components/Workflow/Editor/Forms/FormPickValue.vue` | NEW: mode selector + grow-on-connect watcher |
| `client/src/components/Workflow/Editor/Forms/FormDefault.vue` | Wire FormPickValue |
| `client/src/stores/workflowStepStore.ts:117` | Add `"pick_value"` to `NewStep.type` union |
| `lib/galaxy_test/api/test_workflows.py` | API tests |

---

## Unresolved Questions

1. ~~**Multiple=True vs named inputs**~~ **RESOLVED:** Using N named terminals (`input_0`, `input_1`, ...). Ordering matters for `first_non_null`/`first_or_skip`, and per-input null detection is cleaner with named terminals.

2. **gxformat2 step type validation:** Does the gxformat2 converter accept `type: pick_value` or does it have a hardcoded list of valid step types that would reject it? If hardcoded, need a gxformat2 PR too.

3. **Dynamic output type switching:** When the user changes mode in the editor (e.g., from `first_non_null` to `all_non_null`), the output terminal changes from DataOutput to CollectionOutput. Does the editor handle this correctly? It should, via the `getModule` re-fetch in the `onChange` flow, but need to verify that existing connections are invalidated/re-validated when the output type changes.

4. **Skipped HDA creation in execute():** The `_create_skipped_output` helper needs to create a new Dataset and HDA. The `set_skipped()` method on HDA calls `object_store.create(dataset)`. Need to verify the ObjectStorePopulator is accessible from the module's `execute()` context (`trans.app.object_store_populator` may or may not exist -- need to check).

5. **Collection creation permissions:** The `all_non_null` mode calls `collection_manager.create()`. This typically expects a `trans` with user context. Need to verify this works in the workflow execution context where `trans` may be a minimal/system context.

6. **Parameter (non-dataset) inputs:** The current design assumes dataset inputs. Can pick_value work with parameter outputs (text/int/float/boolean from expression tools)? The `_is_null_or_skipped` check looks at HDA properties, but parameter values may be passed as raw Python values (not HDAs) through `replacement_for_connection`. Need to handle both cases.

7. **Mapped-over execution:** What happens when a pick_value step is mapped over (e.g., one of its inputs is a collection)? The base `WorkflowModule.compute_collection_info()` should handle this, but need to verify that mapped-over execution slices each get the right null/non-null check.

8. **`all_non_null` with zero results:** Should `all_non_null` error on all-null (like `first_non_null`) or produce an empty collection? CWL spec says error on all-null. Current plan: error. But producing an empty collection might be more useful for Galaxy-native workflows.

9. ~~**Terminal growth on connect**~~ **RESOLVED:** Connection events don't trigger `build_module` natively, but `FormPickValue.vue` watches `step.input_connections` and emits `onChange` when the last empty terminal gets connected. This piggybacks on the existing `onSetData` → `getModule` flow. `lastQueue` in `Index.vue` serializes API calls preventing races.

10. **Undo/redo consistency:** When a user undoes a connection, the terminal won't auto-shrink (since `num_inputs` was already bumped via `onChange`). Acceptable for MVP but slightly inconsistent. Full fix would require the watcher to also detect disconnects and shrink.

11. **Input panel vs separate panel:** The `InputPanel` currently only shows workflow inputs. Should `pick_value` appear there, or in a separate "Control Flow" panel? Putting it in `InputPanel` is simplest but semantically it's not an input. Could rename to "Modules" panel or add a new panel. For MVP, just add it to the existing input panel.
