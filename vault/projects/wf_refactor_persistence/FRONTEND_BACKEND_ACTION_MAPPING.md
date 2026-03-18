# Frontend-Backend Action Mapping: Workflow Editor Undo/Redo Persistence

## 1. Frontend Action Inventory

### Base Classes

| Class | File | Type | Purpose |
|-------|------|------|---------|
| `UndoRedoAction` | `undoRedoStore/undoRedoAction.ts:3` | Abstract | Base for all actions |
| `LazyUndoRedoAction` | `undoRedoStore/undoRedoAction.ts:40` | Abstract | Base for batching/deferred actions |
| `FactoryAction` | `undoRedoStore/index.ts:230` | Immediate | Generic inline action builder |

### Step Actions (`Actions/stepActions.ts`)

| Class | Line | Type | Key Fields | dataAttributes |
|-------|------|------|------------|----------------|
| `LazyMutateStepAction<K>` | 15 | Lazy | `stepId`, `key`, `fromValue`, `toValue` | `{ type: "step-mutate", what: key }` |
| `LazySetLabelAction` | 91 | Lazy | `stepId`, `stateStore`, label sync | `{ type: "set-label" }` |
| `LazySetOutputLabelAction` | 136 | Lazy | `stepId`, `fromLabel`, `toLabel` | (inherited) |
| `UpdateStepAction` | 179 | Immediate | `stepId`, `fromPartial`, `toPartial` | `{}` |
| `SetDataAction` | 241 | Immediate | Extends UpdateStepAction, diffs two Steps | `{}` |
| `InsertStepAction` | 266 | Immediate | `stepData: InsertStepData` | `{ type: "step-insert", "step-type": ... }` |
| `RemoveStepAction` | 322 | Immediate | `step` (cloned), `connections` (cloned) | `{ type: "step-remove" }` |
| `CopyStepAction` | 364 | Immediate | `step: NewStep` | `{ type: "step-copy" }` |
| `ToggleStepSelectedAction` | 403 | Immediate | `stepId`, `toggleTo` | `{}` |
| `AutoLayoutAction` | 444 | Immediate | `workflowId`, positions map | `{}` |

### Workflow Actions (`Actions/workflowActions.ts`)

| Class | Line | Type | Key Fields | dataAttributes |
|-------|------|------|------------|----------------|
| `LazySetValueAction<T>` | 16 | Lazy | `fromValue`, `toValue`, `what` | `{ type: "set-${what}" }` if what set |
| `CopyIntoWorkflowAction` | 115 | Immediate | `data: Partial<Workflow>`, `position` | `{}` |
| `LazyMoveMultipleAction` | 184 | Lazy | `steps[]`, `comments[]`, positions | `{}` |
| `ClearSelectionAction` | 287 | Immediate | `selectionState` | `{}` |
| `AddToSelectionAction` | 344 | Immediate | `selection` | `{}` |
| `RemoveFromSelectionAction` | 353 | Immediate | `selection` | `{}` |
| `DuplicateSelectionAction` | 362 | Immediate | extends CopyIntoWorkflowAction | `{}` |
| `DeleteSelectionAction` | 390 | Immediate | stored sub-actions, connections | `{}` |

### Comment Actions (`Actions/commentActions.ts`)

| Class | Line | Type | Key Fields | dataAttributes |
|-------|------|------|------------|----------------|
| `AddCommentAction` | 33 | Immediate | `comment` (cloned) | `{ type: "comment-add", "comment-type": ... }` |
| `DeleteCommentAction` | 51 | Immediate | `comment` (cloned) | `{ type: "comment-delete" }` |
| `ChangeColorAction` | 69 | Immediate | `commentId`, `toColor`, `fromColor` | `{ type: "comment-color" }` |
| `LazyMutateCommentAction<K>` | 102 | Lazy | `commentId`, `key`, `startData`, `endData` | (abstract) |
| `LazyChangeDataAction` | 151 | Lazy | extends LazyMutateCommentAction<"data"> | `{}` |
| `LazyChangePositionAction` | 187 | Lazy | extends LazyMutateCommentAction<"position"> | `{}` |
| `LazyChangeSizeAction` | 198 | Lazy | extends LazyMutateCommentAction<"size"> | `{}` |
| `ToggleCommentSelectedAction` | 209 | Immediate | `commentId`, `toggleTo` | `{}` |
| `RemoveAllFreehandCommentsAction` | 241 | Immediate | `comments[]` (cloned) | `{}` |

### Connection Actions (via FactoryAction in `modules/terminals.ts`)

| Action Name | Line | Type | dataAttributes |
|-------------|------|------|----------------|
| `"connect steps"` | 96 | Immediate | `{ type: "connect" }` |
| `"disconnect steps"` | 109 | Immediate | `{ type: "disconnect" }` |

### SetValueActionHandler Instances (`Index.vue`)

| Handler | Line | `what` | Needs Fix? |
|---------|------|--------|------------|
| `setNameActionHandler` | 370 | `"name"` | No |
| `setLicenseHandler` | 387 | `"license"` | No |
| `setCreatorHandler` | 402 | `"creator"` | No |
| `setDoiHandler` | 415 | `null` | **Yes** -> `"doi"` |
| `setAnnotationHandler` | 426 | `"annotation"` | No |
| `setReadmeHandler` | 442 | `null` | **Yes** -> `"readme"` |
| `setHelpHandler` | 468 | `null` | **Yes** -> `"help"` |
| `setLogoUrlHandler` | 481 | `null` | **Yes** -> `"logoUrl"` |
| `setTagsHandler` | 495 | `null` | **Yes** -> `"tags"` |

---

## 2. Backend Refactor Action Inventory

### Action Classes (`refactor/schema.py`)

| Class | Line | `action_type` | Fields | Has Executor? |
|-------|------|---------------|--------|---------------|
| `UpdateStepLabelAction` | 95 | `"update_step_label"` | `step`, `label: str` | Yes (L85) |
| `UpdateStepPositionAction` | 101 | `"update_step_position"` | `step`, `position_shift: Position` | Yes (L89) |
| `AddStepAction` | 107 | `"add_step"` | `type`, `tool_state?`, `label?`, `position?` | Yes (L118) |
| `ConnectAction` | 125 | `"connect"` | `input: input_ref`, `output: output_ref` | Yes (L188) |
| `DisconnectAction` | 131 | `"disconnect"` | `input: input_ref`, `output: output_ref` | Yes (L167) |
| `AddInputAction` | 137 | `"add_input"` | `type`, `label?`, `position?`, etc. | Yes (L134) |
| `ExtractInputAction` | 150 | `"extract_input"` | `input: input_ref`, `label?`, `position?` | Yes (L212) |
| `ExtractUntypedParameter` | 157 | `"extract_untyped_parameter"` | `name`, `label?`, `position?` | Yes (L255) |
| `RemoveUnlabeledWorkflowOutputs` | 164 | `"remove_unlabeled_workflow_outputs"` | (none) | Yes (L359) |
| `UpdateNameAction` | 168 | `"update_name"` | `name: str` | Yes (L103) |
| `UpdateAnnotationAction` | 173 | `"update_annotation"` | `annotation: str` | Yes (L106) |
| `UpdateLicenseAction` | 178 | `"update_license"` | `license: str` | Yes (L109) |
| `UpdateCreatorAction` | 183 | `"update_creator"` | `creator: Any` | Yes (L112) |
| `UpdateReportAction` | 192 | `"update_report"` | `report: Report` | Yes (L115) |
| `UpdateOutputLabelAction` | 197 | `"update_output_label"` | `output: output_ref`, `output_label` | Yes (L95) |
| `FillStepDefaultsAction` | 203 | `"fill_step_defaults"` | `step` | Yes (L208) |
| `FileDefaultsAction` | 208 | `"fill_defaults"` | (none) | Yes (L201) |
| `UpgradeSubworkflowAction` | 212 | `"upgrade_subworkflow"` | `step`, `content_id?` | Yes (L370) |
| `UpgradeToolAction` | 220 | `"upgrade_tool"` | `step`, `tool_version?` | Yes (L387) |
| `UpgradeAllStepsAction` | 226 | `"upgrade_all_steps"` | (none) | Yes (L408) |

### Step Reference Types (`schema.py:25-57`)

| Type | Fields | Used In |
|------|--------|---------|
| `StepReferenceByOrderIndex` | `order_index: int` | step_reference_union |
| `StepReferenceByLabel` | `label: str` | step_reference_union |
| `InputReferenceByOrderIndex` | `order_index`, `input_name` | input_reference_union |
| `InputReferenceByLabel` | `label`, `input_name` | input_reference_union |
| `OutputReferenceByOrderIndex` | `order_index`, `output_name?` (default "output") | output_reference_union |
| `OutputReferenceByLabel` | `label`, `output_name?` | output_reference_union |

**No `StepReferenceById` exists yet.** Frontend uses numeric step IDs; backend only supports order_index and label.

### Position Model (`schema.py:60-69`)

```python
class Position(BaseModel):
    left: float
    top: float
```

Only supports relative shift currently. No absolute positioning.

### Request Model (`schema.py:267-269`)

```python
class RefactorActions(BaseModel):
    actions: list[union_action_classes]
    dry_run: bool = False
```

No `title` or `source_action_type` fields yet.

### Step Resolution (`execute.py:419-435`)

`_find_step` does:
1. `StepReferenceByLabel` → linear scan of steps matching label
2. Else assumes `StepReferenceByOrderIndex` → direct dict lookup
3. Validates order_index < len(steps)

**Problem:** The else branch assumes anything non-label is order_index. Adding `StepReferenceById` requires explicit `isinstance` checks.

---

## 3. Frontend → Backend Action Mapping

### Direct Mappings (Ready to Serialize)

| Frontend Action | Backend Action | Notes |
|----------------|----------------|-------|
| `LazySetLabelAction` | `UpdateStepLabelAction` | Direct: step ref + label |
| `LazySetOutputLabelAction` | `UpdateOutputLabelAction` | Direct: output ref + output_label |
| `InsertStepAction` | `AddStepAction` | Direct: type, label?, position? |
| `LazySetValueAction` (what="name") | `UpdateNameAction` | Direct |
| `LazySetValueAction` (what="annotation") | `UpdateAnnotationAction` | Direct |
| `LazySetValueAction` (what="license") | `UpdateLicenseAction` | Direct |
| `LazySetValueAction` (what="creator") | `UpdateCreatorAction` | Direct |
| FactoryAction "connect steps" | `ConnectAction` | Direct: input ref + output ref |
| FactoryAction "disconnect steps" | `DisconnectAction` | Direct: input ref + output ref |

### Needs Backend Enhancement

| Frontend Action | Backend Action Needed | Required Changes |
|----------------|----------------------|------------------|
| `LazyMutateStepAction<"position">` | `UpdateStepPositionAction` | Add `position_absolute` field |
| `LazyMoveMultipleAction` | `UpdateStepPositionAction[]` + `UpdateCommentPositionAction[]` | Absolute position + new comment actions |
| `RemoveStepAction` | **NEW** `RemoveStepAction` | New schema + executor |

### Needs New Backend Actions (Comments)

| Frontend Action | Backend Action Needed |
|----------------|----------------------|
| `AddCommentAction` | `AddCommentAction` |
| `DeleteCommentAction` | `DeleteCommentAction` |
| `ChangeColorAction` | `UpdateCommentColorAction` |
| `LazyChangeDataAction` | `UpdateCommentDataAction` |
| `LazyChangePositionAction` | `UpdateCommentPositionAction` |
| `LazyChangeSizeAction` | `UpdateCommentSizeAction` |
| `RemoveAllFreehandCommentsAction` | `RemoveAllFreehandCommentsAction` |

### No Backend Equivalent Needed (UI-Only)

| Frontend Action | Reason |
|----------------|--------|
| `UpdateStepAction` | Generic partial update; serializer inspects changed keys to emit specific backend actions |
| `SetDataAction` | Subclass of UpdateStepAction; captures tool form diffs |
| `CopyStepAction` | Composite: AddStep + copy data |
| `ToggleStepSelectedAction` | UI selection state only |
| `AutoLayoutAction` | Decomposes to N position updates |
| `ClearSelectionAction` | UI selection state only |
| `AddToSelectionAction` | UI selection state only |
| `RemoveFromSelectionAction` | UI selection state only |
| `DuplicateSelectionAction` | Composite: multiple AddStep + AddComment |
| `DeleteSelectionAction` | Composite: multiple RemoveStep + DeleteComment |
| `CopyIntoWorkflowAction` | Composite: multiple adds |
| `ToggleCommentSelectedAction` | UI selection state only |
| `LazyMoveMultipleAction` | Decomposes to N position updates (steps + comments) |

---

## 4. RemoveStepAction Specification

### Frontend Behavior (`stepActions.ts:322-362`)

On run:
1. `stepStore.removeStep(stepId)` which:
   - Removes all connections for step (both incoming/outgoing) via connectionStore
   - Deletes step from steps dict
   - Cleans up extra inputs, multi-select state, mapOver state, positions, terminals
2. Sets `activeNodeId = null`
3. Marks `hasChanges = true`

On undo:
1. `stepStore.addStep(step)` — restores cloned step
2. Re-adds all saved connections via `connectionStore.addConnection()`
3. Marks `hasChanges = true`

### Backend Requirements

```python
class RemoveStepAction(BaseAction):
    action_type: Literal["remove_step"]
    step: step_reference_union = step_target_field
```

Executor `_apply_remove_step` must:
1. Resolve step reference via `_find_step()`
2. Get step's order_index
3. Find all connections where this step is referenced:
   - As output: scan all steps' `input_connections` for entries where `connection["id"] == removed_step["id"]`
   - As input: remove `input_connections` from the step itself
4. For each dropped connection → emit `connection_drop_forced` message
5. For each workflow_output on removed step → emit `workflow_output_drop_forced` message
6. Remove step from `self._as_dict["steps"]`
7. **Tolerate order_index gaps** — do NOT re-index remaining steps

### Connection Cleanup Algorithm

```python
removed_step_id = step["id"]
for other_order_index, other_step in self._as_dict["steps"].items():
    if other_order_index == order_index:
        continue
    input_connections = other_step.get("input_connections", {})
    for input_name, connections in input_connections.items():
        connections = _listify_connections(connections)
        for conn in connections:
            if conn["id"] == removed_step_id:
                # emit connection_drop_forced message
        input_connections[input_name] = [c for c in connections if c["id"] != removed_step_id]
```

---

## 5. Position Handling Strategy

### Current State
- Backend `UpdateStepPositionAction` only supports `position_shift` (relative delta)
- Frontend stores/operates on absolute positions (`{left, top}`)

### Required Changes

```python
class UpdateStepPositionAction(BaseAction):
    action_type: Literal["update_step_position"]
    step: step_reference_union = step_target_field
    position_shift: Optional[Position] = None
    position_absolute: Optional[Position] = None

    @model_validator(mode='after')
    def validate_position_exactly_one(self):
        if self.position_shift is None and self.position_absolute is None:
            raise ValueError("Must provide either position_shift or position_absolute")
        if self.position_shift is not None and self.position_absolute is not None:
            raise ValueError("Cannot provide both position_shift and position_absolute")
        return self
```

Executor change:
```python
def _apply_update_step_position(self, action, execution):
    step = self._find_step_for_action(action)
    if action.position_absolute:
        step["position"] = action.position_absolute.to_dict()
    elif action.position_shift:
        # existing relative logic
        step["position"]["left"] += action.position_shift.left
        step["position"]["top"] += action.position_shift.top
```

### Serialization Strategy
- Frontend always serializes with `position_absolute` (simpler, no delta calc needed)
- `position_shift` retained for backward compat with existing callers

---

## 6. Step Reference Strategy

### Current State
- Backend supports: `StepReferenceByOrderIndex`, `StepReferenceByLabel`
- Frontend references steps by numeric `id` (database PK)
- Connection storage uses step `"id"` field (which equals `order_index` in workflow dict)

### ID Semantics

| Context | "id" means | Stable? |
|---------|-----------|---------|
| `WorkflowStep.id` (DB model) | Auto-increment PK | Yes across saves |
| `step_dict["id"]` in workflow JSON | order_index value | Positional, changes if reordered |
| Frontend `Step.id` | Loaded from step_dict["id"] | Matches workflow dict "id" |
| Connection `{"id": N}` | Output step's dict "id" | Same as above |

### Required Changes

```python
class StepReferenceById(BaseModel):
    id: int  # Database PK of WorkflowStep

class InputReferenceById(StepReferenceById):
    input_name: str

class OutputReferenceById(StepReferenceById):
    output_name: Optional[str] = output_name_field
```

Update unions:
```python
step_reference_union = Union[StepReferenceByOrderIndex, StepReferenceByLabel, StepReferenceById]
input_reference_union = Union[InputReferenceByOrderIndex, InputReferenceByLabel, InputReferenceById]
output_reference_union = Union[OutputReferenceByOrderIndex, OutputReferenceByLabel, OutputReferenceById]
```

Update `_find_step` to use explicit `isinstance` checks for all three types instead of the current if/else that assumes non-label = order_index.

### Open Question

The frontend's `Step.id` is loaded from `step_dict["id"]` which is `order_index`. The database `WorkflowStep.id` (auto-increment PK) is a different value. Which "id" should `StepReferenceById` use? The plan says database PK, but the frontend doesn't currently have access to it during editing. **Resolution needed.**

---

## 7. Comment Persistence

### Storage Architecture

**Database model** (`model/__init__.py:9188-9269`):
- Table: `workflow_comment`
- `id` (PK, auto-increment) — internal, not exposed
- `order_index` — stable identifier exposed as `"id"` in JSON
- `workflow_id` (FK to Workflow)
- `type` ("text", "markdown", "frame", "freehand")
- `position` (MutableJSONType) — `[x, y]`
- `size` (JSONType) — `[width, height]`
- `color` (String(16))
- `data` (JSONType) — type-specific content
- `parent_comment_id` (FK, self-referential) — frame nesting

**Pydantic schema** (`schema/workflow/comments.py`):
- `BaseComment`: id, color, position, size
- `TextComment`: data = {bold?, italic?, size, text}
- `MarkdownComment`: data = {text}
- `FrameComment`: data = {title}, child_comments?, child_steps?
- `FreehandComment`: data = {thickness, line: [[x,y]...]}

### ID Management

- Frontend assigns: `highestCommentId + 1` (commentStore)
- Backend stores: `order_index` (mapped as "id" in JSON)
- IDs are **stable across saves** — preserved in export/import
- Deletion does NOT renumber remaining comment IDs
- FrameComment.child_comments references other comments by this stable ID

### Export/Import

- Exported in `_workflow_to_dict_editor()` and `_workflow_to_dict_instance()` as `[comment.to_dict() for comment in workflow.comments]`
- Imported via `WorkflowComment.from_dict(dict)` which maps `dict["id"]` → `order_index`
- Parent-child relationships restored during import (L900-909 of workflows.py)

### Position/Size Format Difference

| Field | Frontend | Backend JSON | Backend Model |
|-------|----------|-------------|---------------|
| position | `[x, y]` tuple | `[x, y]` | MutableJSONType |
| size | `[width, height]` tuple | `[width, height]` | JSONType |

Comment actions use tuples, NOT `Position` model's `{left, top}` dict. The executor must handle this format.

### New Size Model Needed

```python
class Size(BaseModel):
    width: float
    height: float

    def to_dict(self):
        return {"width": self.width, "height": self.height}
```

Do NOT reuse `Position` — `left`/`top` fields are misleading for width/height. Note: comment size in workflow JSON is `[width, height]` tuple, not `{width, height}` dict. Executor converts between formats.

---

## 8. Connection Handling

### Architecture

- **Frontend**: Connections are separate entities in `workflowConnectionStore`, synced bidirectionally to `step.input_connections`
- **Backend**: Connections are properties of input steps (`step["input_connections"][input_name]`)
- **Backend actions exist**: `ConnectAction` and `DisconnectAction` are fully implemented

### Frontend Connection Flow

```
Terminal.connect(other)
  → FactoryAction("connect steps")
    → onRun: connectionStore.addConnection(connection)
      → stepStore.addConnection(connection)  // sync to input_connections
    → onUndo: connectionStore.removeConnection(connectionId)
```

### Backend Connection Format

```python
# In step dict:
step["input_connections"]["input_name"] = [
    {"id": output_step_id, "output_name": "output"},
    ...
]
```

### Frontend → Backend Mapping

```
Frontend Connection:
  input: {stepId: 1, name: "input_file"}
  output: {stepId: 0, name: "output"}

→ Backend ConnectAction:
  input: {order_index: 1, input_name: "input_file"}  # or by label
  output: {order_index: 0, output_name: "output"}      # or by label
```

### Recommendation: Typed Frontend Action Classes

Replace anonymous FactoryActions with typed classes for type-safe serialization:

```typescript
class ConnectStepAction extends UndoRedoAction {
    constructor(
        private input: InputTerminal,
        private output: OutputTerminal,
        private connectionStore: WorkflowConnectionStore
    ) { ... }
}

class DisconnectStepAction extends UndoRedoAction { ... }
```

This enables `instanceof` routing in the serializer instead of matching on `action.name === "connect steps"`.

---

## 9. Implementation Scope

### Core Scope (Iteration 2-3)

**Backend (Iteration 2):**
1. `RemoveStepAction` schema + executor
2. `position_absolute` on `UpdateStepPositionAction`
3. `StepReferenceById` + union updates + `_find_step` fix
4. `Size` model
5. All 7 comment action schemas + executors
6. `CommentReference` model with `_find_comment` helper
7. Unit tests + integration tests

**Frontend Serializer (Iteration 3):**
1. Fix 5 null `what` values in SetValueActionHandler instances
2. Serializer for each mappable action type
3. Dispatcher routing by `instanceof`
4. Comprehensive serializer test suite

### Deferred (Future)

1. Tool state serialization (complex, needs more research)
2. Action compaction/optimization
3. Concurrent editing / optimistic locking
4. Typed ConnectStepAction/DisconnectStepAction classes (recommended but can serialize FactoryAction by name initially)

---

## 10. Unresolved Questions

1. **Step ID semantics**: Frontend `Step.id` comes from `step_dict["id"]` which is `order_index`. `StepReferenceById` in plan says "database ID" but frontend doesn't have DB PKs during editing. Should we use `order_index` as the "id" for now, or expose DB PKs to frontend?
2. **Order_index gaps after removal**: Backend `_apply_add_step` uses `len(steps)` for new order_index. If steps are sparse (gaps from removal), does this create collisions? May need `max(keys) + 1` instead.
3. **Comment position format**: Comments use `[x, y]` tuples in JSON. Should `AddCommentAction` schema use `Position` model (with `left`/`top`) and have executor convert, or use a separate tuple-based model?
4. **Workflow outputs on removed steps**: Backend just removes the step dict (which contains `workflow_outputs`). Is that sufficient, or do we need to clean references from other steps/report markdown?
5. **Connection FactoryAction serialization**: Serialize by `action.name === "connect steps"` initially, or require typed classes first? Name-based is fragile but faster to implement.
6. **LazySetValueAction for doi/readme/help/logoUrl/tags**: These have no backend action equivalents. Should they return no-op from serializer, or do we need new backend actions?
7. **Shared workflow access**: Can shared-with users create journal entries, or owner-only? Depends on Galaxy's access model.
