# Component: `pick_value` Workflow Module

## Overview

The `pick_value` module is a first-class workflow control-flow primitive that selects among outputs from conditional branches. It sits alongside `pause`, input modules, and `when` expressions in Galaxy's workflow module system. Users wire N conditional branch outputs as inputs, configure a selection mode, and get one output — no expression tools required.

The module is the Galaxy-native equivalent of CWL v1.2's `pickValue` on workflow outputs. Once CWL import integration is added, it will unblock 27+ CWL v1.2 conditional conformance tests.

## Motivation

Galaxy workflows support conditional step execution via `when` expressions (23.0+). When multiple conditional branches produce the same logical output, there was no built-in way to say "take whichever branch actually produced a result." Users had to wire a `pick_value` expression tool — error-prone and obscures intent. See [PROBLEM_AND_GOAL.md](PROBLEM_AND_GOAL.md) for full context.

## Architecture

### No Database Migration

The module uses existing Galaxy tables exclusively:

- `WorkflowStep` with `type = "pick_value"`
- `tool_state` JSON stores `{"mode": "first_non_null", "num_inputs": 2}`
- Input connections via `WorkflowStepConnection`
- Output via `WorkflowOutput`

### Selection Modes

| Mode | Behavior | Output Type |
|------|----------|-------------|
| `first_non_null` | First non-null input; **error** if all null | Single dataset |
| `first_or_skip` | First non-null input; **skip** if all null | Single dataset (or skipped HDA) |
| `the_only_non_null` | The single non-null input; **error** if count != 1 | Single dataset |
| `all_non_null` | All non-null inputs as collection (may be empty) | `list` HDCA |

### Null/Skip Detection

`_is_null_or_skipped()` checks two conditions:
1. `NO_REPLACEMENT` sentinel (no upstream output connected/available)
2. HDA with `extension == "expression.json"` and `blurb == "skipped"` (Galaxy's convention for skipped conditional outputs)

## Backend

### Module Class

**File:** `lib/galaxy/workflow/modules.py` — `PickValueModule(WorkflowModule)`

Registered in `module_types` dict (one line: `pick_value=PickValueModule`). The `module_factory` singleton picks it up automatically.

Key methods:

- **`get_all_inputs()`** — Returns N+1 input terminal dicts (`input_0` through `input_{N}`). The extra terminal enables grow-on-connect in the editor. Terminal count is `max(2, num_inputs from state, num connections)`.
- **`get_all_outputs()`** — Returns one output. For `all_non_null` mode: `collection=True, collection_type="list"`. For other modes: single dataset.
- **`execute()`** — Gathers replacements from input terminals, partitions into non-null vs null/skipped, applies mode logic, calls `progress.set_step_outputs()`.
- **`_create_skipped_output()`** — Creates a skipped HDA for `first_or_skip` when all inputs are null. Uses `hda.set_skipped()` with `ObjectStorePopulator`.
- **`_create_collection_from_list()`** — Creates an HDCA from non-null HDAs for `all_non_null` mode via `dataset_collection_manager.create()`.

### API Wiring

**File:** `lib/galaxy/webapps/galaxy/api/workflows.py`

One-line change: excludes `pick_value` from `from_tool_form` processing (same treatment as `data_collection_input`). State is managed by the frontend Vue component, not backend tool forms.

### Parameter Default Fix

**File:** `lib/galaxy/workflow/run.py`

Unwraps `parameter_input` default values from `{"src": "json", "value": X}` dict format to just `X`. This was a pre-existing bug exposed when testing pick_value with parameter inputs.

## Frontend

### Editor Form

**File:** `client/src/components/Workflow/Editor/Forms/FormPickValue.vue`

Single `<FormElement type="select">` for mode selection. Options use `[label, value]` tuple format (required by `FormSelection.vue`'s `currentOptions` computed).

**Grow-on-connect:** A `watch` on `step.input_connections` detects when the last empty terminal (`input_{num_inputs}`) gets connected, then increments `num_inputs` and emits `onChange`. This creates a new empty terminal — same UX pattern as input collection steps.

**Initial emit:** `emit("onChange", cleanToolState())` on mount resets the `initialChange` guard in the parent form (same pattern as `FormInputCollection`).

### Wiring Touchpoints

| File | Change |
|------|--------|
| `Forms/FormDefault.vue` | Routes `type == "pick_value"` to `FormPickValue` |
| `modules/inputs.ts` | Palette entry: `moduleId: "pick_value"`, icon: `faCodeBranch` |
| `modules/itemIcons.ts` | Step icon: `pick_value: faCodeBranch` |
| `Workflow/icons.js` | Legacy icon map: `pick_value: "fa-code-branch"` |
| `stores/workflowStepStore.ts` | Added `"pick_value"` to `Step.type` union |
| `stores/workflowNodeInspectorStore.ts` | Exhaustive match: `pick_value: () => "pick_value"` |
| `WorkflowStepIcon.vue` | Added `"pick_value"` to `stepType` prop union |

### State Flow

```
FormPickValue emits onChange({ mode, num_inputs })
  → FormDefault receives, calls step store update
    → Backend build_module API returns updated inputs/outputs
      → Editor re-renders node terminals
```

The `useToolState` composable handles JSON-encoded values from the API (the build_module endpoint may return `tool_state` values as JSON strings).

## Tests

### API Tests

**File:** `lib/galaxy_test/api/test_workflows.py`

- `test_run_workflow_pick_value_bam_pja` — Runs the existing `pick_value` expression tool with a PJA (post-job action) that changes datatype to BAM, verifying metadata propagation. (This tests the expression tool, not the module — serves as a regression guard.)

### Unit Tests

**File:** `client/src/components/Workflow/Editor/Forms/FormPickValue.test.ts`

7 tests covering:
- Mode defaults (empty state → `first_non_null`)
- Mode persistence from `tool_state`
- Mode change emissions
- `num_inputs` preservation across mode changes
- Grow-on-connect terminal increment
- Non-last terminal connection (no increment)
- JSON-string-encoded `tool_state` handling

### E2E Tests (Playwright)

**File:** `lib/galaxy_test/selenium/test_workflow_editor.py`

7 tests:

| Test | Exercises |
|------|-----------|
| `test_pick_value_add_from_palette` | Module appears in palette, creates node |
| `test_pick_value_mode_selection` | Mode dropdown → save → download → verify `tool_state` |
| `test_pick_value_terminals` | Default terminals: `input_0`, `input_1`, `output` |
| `test_pick_value_connect_inputs` | Programmatic node creation + `workflow_editor_connect` |
| `test_pick_value_grow_on_connect` | 2 connections → 3rd empty terminal appears |
| `test_pick_value_conditional_workflow_roundtrip` | YAML with `when` conditions → connections + state preserved |
| `test_pick_value_output_type_changes_with_mode` | Change mode to `all_non_null` → save → verify |

Helper: `_pick_value_select_mode(label)` uses JS to click vue-multiselect options by `textContent` match (Playwright can't use `inner_text()` on these elements).

## Not Yet Implemented

- **CWL import integration.** `WorkflowProxy.to_dict()` injection of pick_value steps from CWL `pickValue` + multiple `outputSource`. Planned for CWL branch integration.
- **Scatter + pickValue (Pattern B).** Single-source `all_non_null` on scattered steps — filtering skipped collection elements.
- **`first_or_default` mode.** Fallback to user-configured default when all null. Requires type-aware default value field in editor.
- **CWL export round-trip.** Module → CWL `pickValue` syntax.

## Dependencies

- Galaxy `when` expression support (23.0+)
- Galaxy skip/null output handling (`expression.json` with `null` content, `blurb = "skipped"`)
- `gxformat2` pick_value branch (for YAML format `type: pick_value` in workflow definitions)
