---
type: project
title: "WF Refactor Persistence"
tags:
  - project
  - galaxy/workflows
  - galaxy/api
  - galaxy/client
  - galaxy/models
status: draft
created: 2026-02-21
revised: 2026-02-21
revision: 1
ai_generated: true
related_issues:
  - "[[galaxyproject/galaxy#9166]]"
  - "[[galaxyproject/galaxy#21113]]"
related_prs:
  - "[[galaxyproject/galaxy#17774]]"
branch: wf_refactor_persistence
---

# Plan: Persisted Undo/Redo and Workflow CHANGELOG by Bridging Frontend Actions to Backend Refactor API

Leverages tests in #21113 - is a more concrete plan for implementing #9166 in lieu of all the infrastructure added in https://github.com/galaxyproject/galaxy/pull/17774. I spent a few hours doing research with Claude to come up with this plan but as with any plan I think it is a little front-end heavy in quality. After Iteration 3 - I've got some real questions but I do think if we implemented iteration 2 and 3 we could keep the editor and backend capabilities in sync and then work to come up with a more detailed plan for the integration of the two. The E2E tests outlined in #21113 would be really helpful also in terms of ensuring there are no regressions as we implement the integration.

## Goal

Serialize client-side atomic actions to the refactor API, apply them incrementally, and record a durable action journal that:
- Enables undo/redo across browser sessions.
- Drives a user-visible workflow CHANGELOG.
- Aligns TypeScript actions with Python refactor schema safely and incrementally.

## Important Notes

- **Frontend and backend actions are not a bijection**: The frontend actions and backend refactor actions were designed by different people at different times. Some frontend actions will map to backend actions, some won't, and some backend actions won't have frontend equivalents. This is expected and acceptable.
- **Connections don't need explicit actions**: Connections are properties of steps, not separate entities. They will be handled through step update actions on the backend.

## Scope anchors

- Frontend actions live in:
  - `client/src/components/Workflow/Editor/Actions/` (stepActions, workflowActions, commentActions; tests in `actions.test.ts`)
  - Undo/redo infra in `client/src/stores/undoRedoStore/`
- Backend refactor API lives in:
  - `lib/galaxy/workflow/refactor/` (`schema.py`, `execute.py`)
  - API router in `lib/galaxy/webapps/galaxy/api/workflows.py` (`PUT /api/workflows/{id}/refactor`)
  - Service layer in `lib/galaxy/webapps/galaxy/services/workflows.py` (delegates to managers which call the ``execute.py`` layer)

---

## Step 0 — Comprehensive Undo/Redo Selenium Test Suite

**GitHub Issue**: https://github.com/galaxyproject/galaxy/issues/21113

Before implementing any backend changes or serialization, establish comprehensive test coverage for all existing undo/redo functionality in the workflow editor. This serves as both documentation of current behavior and regression prevention.

**Summary**: Create `lib/galaxy_test/selenium/test_workflow_editor_undo_redo.py` with ~30 comprehensive tests covering:
- Step operations: label changes, position moves, add/remove/duplicate, annotations, output labels, tool state, auto-layout
- Comment operations: add/delete/modify for all comment types (text, markdown, frame, freehand), color changes, position/size changes
- Selection operations: toggle selection, clear selection, duplicate selection, delete selection
- Workflow metadata: name, annotation, license changes
- Connections: add/remove connections with undo/redo
- Complex scenarios: multiple action sequences, undo/redo after save

**Deliverables**:
- New test file with ~30 tests
- Helper methods for common undo/redo assertions
- All existing undo/redo behavior documented and tested
- Foundation for regression prevention during backend implementation

**Acceptance Criteria**:
- All tests pass independently
- High code coverage for undo/redo store and action classes
- Consistent test patterns
- Tests serve as living documentation

See the GitHub issue for detailed test specifications.

---

## Step 1 — Inventory, gaps, and architecture decisions

Before implementing anything, thoroughly research and document the current state, gaps, and required changes.

### Step 1.0.1: Create action mapping inventory document
- **File**: Create `FRONTEND_BACKEND_ACTION_MAPPING.md` in project root
- **Actions**:
  1. Document all frontend actions from `stepActions.ts`, `workflowActions.ts`, `commentActions.ts`
  2. Document all backend actions from `schema.py` (line 232-253 has the union)
  3. Create mapping table showing frontend → backend relationships
  4. Mark actions as: ✅ Direct mapping, 🔄 Needs enhancement, ❌ Missing, ⚠️ No backend equivalent needed
  5. Include action class names, file locations, and line numbers for easy reference

### Step 1.0.2: Research RemoveStepAction semantics
- **Goal**: Define exact behavior for removing steps
- **Research tasks**:
  1. Check how `RemoveStepAction` (frontend) handles step removal in `stepActions.ts:310-346`
  2. Review how `removeStep` in step store handles connections
  3. Document required backend behavior:
     - Remove step from `_as_dict["steps"]`
     - Remove all incoming connections to this step
     - Remove all outgoing connections from this step
     - Check if step has workflow_outputs and emit `workflow_output_drop_forced` messages
     - Emit `connection_drop_forced` messages for each dropped connection
  4. ~~Write specification document: `docs/REMOVE_STEP_ACTION_SPEC.md`~~ — consolidated into `FRONTEND_BACKEND_ACTION_MAPPING.md` Section 4

### Step 1.0.3: Research absolute position support
- **Goal**: Determine how to add `position_absolute` to `UpdateStepPositionAction`
- **Research tasks**:
  1. Review current `UpdateStepPositionAction` in `schema.py:103-106` (only has `position_shift`)
  2. Review executor method `_apply_update_step_position` in `execute.py:89`
  3. Understand how frontend stores positions (absolute left/top coordinates)
  4. Define schema change: Add optional `position_absolute: Optional[Position]` field
  5. Define validation: Exactly one of `position_shift` or `position_absolute` must be provided
  6. Write specification: Add to mapping document under "Position Handling Strategy"

### Step 1.0.4: Research comment storage and serialization
- **Goal**: Understand how comments are stored in workflow JSON
- **Research tasks**:
  1. Search codebase for workflow JSON comment structure:
     ```bash
     grep -r "comments" lib/galaxy/workflow/modules.py lib/galaxy/managers/workflows.py
     ```
  2. Find example workflows with comments in test fixtures
  3. Document comment schema: id, type, position, size, color, data
  4. Check if comments are included in workflow export/import
  5. Identify any gaps in serialization/deserialization
  6. ~~Write specification: `docs/COMMENT_PERSISTENCE_SPEC.md`~~ — consolidated into `FRONTEND_BACKEND_ACTION_MAPPING.md` Section 7

### Step 1.0.5: Research step ID references
- **Goal**: Determine feasibility of adding ID-based step references
- **Research tasks**:
  1. Review current step reference types in `schema.py:27-37`
  2. Check how step IDs are assigned and persisted in workflow JSON
  3. Determine if step IDs are stable across saves/loads
  4. Research ID stability when steps are reordered
  5. Define new reference types:
     - `StepReferenceById(id: int)`
     - `InputReferenceById(id: int, input_name: str)`
     - `OutputReferenceById(id: int, output_name: str)`
  6. Define validation strategy when both `id` and `label` provided
  7. Document in mapping file under "Step Reference Strategy"

### Step 1.0.6: Locate connection action handling
- **Goal**: Confirm connections work through step updates, not separate actions
- **Research tasks**:
  1. Search for connection add/remove in workflow editor:
     ```bash
     grep -n "addConnection\|removeConnection" client/src/stores/workflowStepStore.ts
     ```
  2. Verify `addConnection` in `workflowStepStore.ts` calls step update callbacks
  3. Confirm connections are properties of steps in backend
  4. Document that connections handled via `ConnectAction`/`DisconnectAction` in backend
  5. Note in mapping: "Frontend connection changes → Backend ConnectAction/DisconnectAction"

### Step 1.0.7: Create comprehensive frontend→backend action mapping
- **File**: Update `FRONTEND_BACKEND_ACTION_MAPPING.md` with final mapping
- **Content**:

#### Direct Mappings (✅ Ready to serialize):
| Frontend Action | Frontend File | Backend Action | Notes |
|----------------|---------------|----------------|-------|
| `LazySetLabelAction` | stepActions.ts:83 | `UpdateStepLabelAction` | Direct mapping |
| `LazySetOutputLabelAction` | stepActions.ts:124 | `UpdateOutputLabelAction` | Direct mapping |
| `LazySetValueAction` (name) | workflowActions.ts:16 | `UpdateNameAction` | Direct mapping |
| `LazySetValueAction` (annotation) | workflowActions.ts:16 | `UpdateAnnotationAction` | Direct mapping |
| `LazySetValueAction` (license) | workflowActions.ts:16 | `UpdateLicenseAction` | Direct mapping |
| `InsertStepAction` | stepActions.ts:254 | `AddStepAction` | Direct mapping |

#### Needs Enhancement (🔄 Backend changes required):
| Frontend Action | Frontend File | Backend Action | Required Changes |
|----------------|---------------|----------------|------------------|
| `setPosition` / `LazyMoveMultipleAction` | stepActions.ts:598 | `UpdateStepPositionAction` | Add `position_absolute` support |
| `RemoveStepAction` | stepActions.ts:310 | ❌ `RemoveStepAction` | **NEW**: Must implement in backend |

#### Comment Actions (❌ All new backend actions needed):
| Frontend Action | Frontend File | Backend Action Needed | Priority |
|----------------|---------------|----------------------|----------|
| `AddCommentAction` | commentActions.ts:33 | `AddCommentAction` | High |
| `DeleteCommentAction` | commentActions.ts:47 | `DeleteCommentAction` | High |
| `ChangeColorAction` | commentActions.ts:61 | `UpdateCommentColorAction` | Medium |
| `LazyChangeDataAction` | commentActions.ts:139 | `UpdateCommentDataAction` | High |
| `LazyChangePositionAction` | commentActions.ts:175 | `UpdateCommentPositionAction` | Medium |
| `LazyChangeSizeAction` | commentActions.ts:186 | `UpdateCommentSizeAction` | Medium |
| `RemoveAllFreehandCommentsAction` | commentActions.ts:229 | `RemoveAllFreehandCommentsAction` | Low |

#### No Backend Equivalent Needed (⚠️ UI-only actions):
| Frontend Action | Frontend File | Reason |
|----------------|---------------|---------|
| `UpdateStepAction` | stepActions.ts:167 | Generic step update; serializer inspects changed keys to emit specific backend actions (e.g. position → `UpdateStepPositionAction`). Connection changes do NOT flow through this action. |
| `SetDataAction` | stepActions.ts:229 | Subclass of `UpdateStepAction` for tool form diffs. Connection changes do NOT flow through this action. |
| `CopyStepAction` | stepActions.ts:348 | Combination of AddStep + copy data |
| `ToggleStepSelectedAction` | stepActions.ts:383 | UI state only |
| `AutoLayoutAction` | stepActions.ts:424 | Results in position updates |
| `ClearSelectionAction` | workflowActions.ts:287 | UI state only |
| `AddToSelectionAction` | workflowActions.ts:344 | UI state only |
| `RemoveFromSelectionAction` | workflowActions.ts:353 | UI state only |
| `DuplicateSelectionAction` | workflowActions.ts:362 | Combination of multiple adds |
| `DeleteSelectionAction` | workflowActions.ts:390 | Combination of multiple removes |
| `ToggleCommentSelectedAction` | commentActions.ts:197 | UI state only |
| `CopyIntoWorkflowAction` | workflowActions.ts:115 | Combination of multiple adds |
| `LazyMoveMultipleAction` | workflowActions.ts:184 | Results in multiple position updates |

#### Connection Handling:
- **Frontend**: Connection changes use anonymous `FactoryAction` instances in `terminals.ts`:
  - `connect()` (line 96) → `FactoryAction` named `"connect steps"` → calls `connectionStore.addConnection(connection)`
  - `disconnect()` (line 108) → `FactoryAction` named `"disconnect steps"` → calls `connectionStore.removeConnection(id)`
  - These are **NOT** `UpdateStepAction` or `SetDataAction`. The store mutation of `input_connections` happens underneath but is not captured as a typed undo action.
  - When steps are removed/undone, `RemoveStepAction` saves and restores connections separately.
- **Backend**: `ConnectAction` and `DisconnectAction` **already exist and are fully implemented** in `refactor/schema.py` (lines 125-134) and `refactor/execute.py` (lines 167-197). They take `input` (step ref + input_name) and `output` (step ref + output_name) references.
- **Strategy**: Map frontend `FactoryAction` instances to existing backend `ConnectAction`/`DisconnectAction`:
  - Serializer identifies connection actions by `action.name === "connect steps"` / `"disconnect steps"`
  - The `Connection` object (`{input: {stepId, name}, output: {stepId, name}}`) maps directly to the backend schema
  - **Recommended**: Create typed `ConnectStepAction`/`DisconnectStepAction` classes in frontend (replacing anonymous FactoryActions in `terminals.ts`) for type-safe `instanceof` serialization

### Step 1.0.8: Define implementation scope
- **File**: Add to `FRONTEND_BACKEND_ACTION_MAPPING.md`
- **Core Scope (All major workflow editing actions)**:
  1. Step label changes
  2. Step position changes (with absolute position support)
  3. Add step
  4. Remove step (new backend action)
  5. Output label changes
  6. Step annotation changes
  7. Workflow name/annotation/license/report
  8. **All comment actions** (add, delete, move, resize, change color, change data, remove all freehand)

- **Future Enhancements (Not in initial implementation)**:
  1. Step ID-based references (can use label/order_index initially)
  2. Tool state updates (complex, can be added later)
  3. ~~Explicit connection actions~~ — use existing `ConnectAction`/`DisconnectAction` from the start; only frontend work is creating typed action classes in `terminals.ts` (belongs in Core Scope)
  4. Action compaction and optimization

### Deliverables for Iteration 1:
- `FRONTEND_BACKEND_ACTION_MAPPING.md` - Complete action inventory, mapping, and all specifications (RemoveStep spec in Section 4, comment persistence in Section 7, position handling in Section 5, step ID references in Section 6)
- Clear decision on Phase 1 scope
- Research findings documented for position_absolute and step ID references

### Acceptance Criteria for Iteration 1:
- All research questions answered with code references
- Single consolidated mapping document (`FRONTEND_BACKEND_ACTION_MAPPING.md`) reviewed and approved
- No ambiguity about what needs to be built in each phase
- Phase 1 scope is clear and minimal
- Unresolved questions documented for discussion

---

## Iteration 2 — Backend schema and executor enhancements ✅ COMPLETE

Implement all backend changes needed to support core workflow editing actions. This includes step operations, absolute positions, and all comment operations.

**Status**: All sub-steps complete. 33 unit tests passing. Integration tests added. API docs updated.

### Step 2.1: Implement RemoveStepAction schema
- **File**: `lib/galaxy/workflow/refactor/schema.py`
- **Actions**:
  1. Add `RemoveStepAction` class after `AddStepAction` (around line 126):
     ```python
     class RemoveStepAction(BaseAction):
         action_type: Literal["remove_step"]
         step: step_reference_union = step_target_field
     ```
  2. Add to `union_action_classes` (line 232)
  3. Verify action_type automatically registers in `ACTION_CLASSES_BY_TYPE`

### Step 2.2: Implement RemoveStepAction executor
- **File**: `lib/galaxy/workflow/refactor/execute.py`
- **Method**: `_apply_remove_step(self, action: RemoveStepAction, execution: RefactorActionExecution)`
- **Logic**:
  1. Resolve step reference to get step dict
  2. Get step's order_index
  3. Find all connections where this step is input or output
  4. For each dropped connection, emit `connection_drop_forced` message
  5. Check if step has workflow_outputs
  6. For each workflow output, emit `workflow_output_drop_forced` message
  7. Remove step from `self._as_dict["steps"]`
  8. **Tolerate order_index gaps** — do NOT re-index remaining steps. Step 2.5 adds ID-based references, so subsequent in-batch operations can use IDs instead of order_indices. Re-indexing would break any in-batch references by order_index.
- **Tests** (`test/unit/workflow/refactor/test_remove_step.py`):
  1. Test removing unconnected step
  2. Test removing step with one connection
  3. Test removing step with multiple connections
  4. Test removing step with workflow outputs
  5. Test execution messages are correct
  6. Test referencing by label
  7. Test referencing by order_index
  8. Test error: step not found

### Step 2.3: Add absolute position support to schema
- **File**: `lib/galaxy/workflow/refactor/schema.py`
- **Changes to `UpdateStepPositionAction`** (line 103):
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

### Step 2.4: Implement absolute position support in executor
- **File**: `lib/galaxy/workflow/refactor/execute.py`
- **Update**: `_apply_update_step_position` method (around line 89)
- **Logic**:
  ```python
  def _apply_update_step_position(self, action: UpdateStepPositionAction, execution: RefactorActionExecution):
      step = self._resolve_step(action.step)

      if action.position_absolute:
          # Set absolute position
          step["position"] = action.position_absolute.to_dict()
      elif action.position_shift:
          # Apply relative shift (existing behavior)
          current_position = step.get("position") or {"left": 0, "top": 0}
          step["position"] = {
              "left": current_position["left"] + action.position_shift.left,
              "top": current_position["top"] + action.position_shift.top,
          }
  ```
- **Tests** (`test/unit/workflow/refactor/test_position.py`):
  1. Test position_shift (existing functionality)
  2. Test position_absolute
  3. Test error: neither provided
  4. Test error: both provided
  5. Test backward compatibility with existing workflows

### Step 2.5: Implement step reference resolution strategy

The frontend references steps by ID — all backend actions that allow
referencing steps by order_index or label should be augmented to also allow
referencing steps by id.

- **File**: `lib/galaxy/workflow/refactor/schema.py`
- **Changes**:
  1. Add `StepReferenceById`:
     ```python
     class StepReferenceById(BaseModel):
         id: int = Field(description="The database ID of the step being referenced.")
     ```
  2. Add corresponding input/output reference types:
     ```python
     class InputReferenceById(StepReferenceById):
         input_name: str = input_name_field

     class OutputReferenceById(StepReferenceById):
         output_name: Optional[str] = output_name_field
     ```
  3. Update all three union types:
     ```python
     step_reference_union = Union[StepReferenceByOrderIndex, StepReferenceByLabel, StepReferenceById]
     input_reference_union = Union[InputReferenceByOrderIndex, InputReferenceByLabel, InputReferenceById]
     output_reference_union = Union[OutputReferenceByOrderIndex, OutputReferenceByLabel, OutputReferenceById]
     ```
- **File**: `lib/galaxy/workflow/refactor/execute.py`
- **Changes to `_find_step`**: The current `else` branch assumes anything that isn't `StepReferenceByLabel` is `StepReferenceByOrderIndex`. Must change to explicit `isinstance` checks for all three types, raising `ValueError` for unknown reference types.

### Step 2.6: Add Size model and comment action schemas
- **File**: `lib/galaxy/workflow/refactor/schema.py`
- **Actions**:
  1. Add `Size` model (do NOT reuse `Position` — `left`/`top` fields are misleading for width/height):
     ```python
     class Size(BaseModel):
         width: float
         height: float

         def to_dict(self):
             return {"width": self.width, "height": self.height}
     ```
  2. Add comment actions after workflow metadata actions (around line 197):
     ```python
     class CommentReference(BaseModel):
         comment_id: int  # The comment's "id" field (order_index in DB), NOT an array index.
                          # Matches BaseComment.id in schema/workflow/comments.py.
                          # Looked up by scanning the comments array for matching "id".

     class AddCommentAction(BaseAction):
         action_type: Literal["add_comment"]
         type: str  # "text", "markdown", "frame", "freehand"
         position: Position
         size: Size
         color: str
         data: dict[str, Any]

     class DeleteCommentAction(BaseAction):
         action_type: Literal["delete_comment"]
         comment: CommentReference

     class UpdateCommentPositionAction(BaseAction):
         action_type: Literal["update_comment_position"]
         comment: CommentReference
         position: Position

     class UpdateCommentSizeAction(BaseAction):
         action_type: Literal["update_comment_size"]
         comment: CommentReference
         size: Size

     class UpdateCommentColorAction(BaseAction):
         action_type: Literal["update_comment_color"]
         comment: CommentReference
         color: str

     class UpdateCommentDataAction(BaseAction):
         action_type: Literal["update_comment_data"]
         comment: CommentReference
         data: dict[str, Any]

     class RemoveAllFreehandCommentsAction(BaseAction):
         action_type: Literal["remove_all_freehand_comments"]
     ```
  3. Add all to `union_action_classes`
- **Note**: Frontend comments use `[x,y]` tuples for position and `[width,height]` for size. The executor must convert between `{left,top}`/`{width,height}` dicts and these tuple representations.
- **Note**: Comment `id` in the workflow JSON (mapped from `WorkflowComment.order_index`)
  is a **stable identifier**, not an array index. `FrameComment.child_comments` references
  other comments by this `id`. Deleting a comment removes it from the array but does NOT
  renumber remaining comments' `id` values, so batch operations are safe without
  reverse-ordering tricks.

### Step 2.7: Implement comment action executors
- **File**: `lib/galaxy/workflow/refactor/execute.py`
- **Methods**: Add executor methods for each comment action
- **Helper**: Add `_find_comment(self, comment_ref: CommentReference)` that scans
  `self._as_dict["comments"]` for the dict whose `"id"` field matches
  `comment_ref.comment_id`. Raises `RequestParameterInvalidException` if not found.
  Analogous to `_find_step` but for comments.
- **Logic**:
  1. `_apply_add_comment`: Append comment dict to array. Assign `"id"` as
     `max(c["id"] for c in existing) + 1` (or 0 if empty).
  2. `_apply_delete_comment`: Call `_find_comment`, remove matching dict. Does NOT
     shift other comments' `"id"` values — IDs are stable, only the array shrinks.
  3. `_apply_update_comment_position`: Call `_find_comment`, update `"position"`
  4. `_apply_update_comment_size`: Call `_find_comment`, update `"size"`
  5. `_apply_update_comment_color`: Call `_find_comment`, update `"color"`
  6. `_apply_update_comment_data`: Call `_find_comment`, update `"data"`
  7. `_apply_remove_all_freehand_comments`: Filter array to remove all with `"type" == "freehand"`
- **Batch safety**: Because comments are referenced by their `"id"` field (not array
  index), deleting comment id=2 does NOT invalidate a subsequent reference to comment id=5.
  No reverse-ordering or snapshot-then-apply needed.
- **Tests** (`test/unit/workflow/refactor/test_comments.py`):
  1. Test each comment action independently
  2. Test comment id assignment on add
  3. Test error: comment not found (invalid comment_id)
  4. Test round-trip: add → update → delete
  5. Test batch stability: delete comment id=1, then update comment id=3 in same
     batch — verify id=3 is correctly found despite array shifting
  6. Test that delete does not reassign IDs of remaining comments

### Step 2.8: Verify workflow JSON comment persistence
- **Research Task**: Confirm comments are stored in workflow JSON
- **Files to check**:
  - `lib/galaxy/managers/workflows.py`
  - `lib/galaxy/workflow/modules.py`
- **Verify**:
  1. Comments are included in workflow export
  2. Comments are restored on workflow import
  3. Comment schema matches frontend expectations
- **Document findings** in `FRONTEND_BACKEND_ACTION_MAPPING.md` Section 7

### Step 2.9: Add backend integration tests for core actions
- **File**: `test/integration/test_workflow_refactor_api.py`
- **Tests**:
  1. Test step label change via refactor API
  2. Test step position change (absolute and relative)
  3. Test add step via refactor API
  4. Test remove step via refactor API
  5. Test step annotation changes
  6. Test output label changes
  7. Test workflow name/annotation/license changes
  8. Test add comment via refactor API
  9. Test delete comment via refactor API
  10. Test comment modifications (color, position, size, data)
  11. Test remove all freehand comments
  12. Test action batching (multiple actions in one request)
  13. Test dry_run mode
  14. Test execution messages are returned

### Step 2.10: Update API documentation
- **File**: `lib/galaxy/webapps/galaxy/api/workflows.py`
- **Actions**:
  1. Update docstring for refactor endpoint
  2. Document new `RemoveStepAction`
  3. Document `position_absolute` on `UpdateStepPositionAction`
  4. Document all comment actions
  5. Add examples for all core actions (steps, comments, workflow metadata)
  6. Document execution messages

### Deliverables for Iteration 2:
- `RemoveStepAction` implemented in schema and executor
- `position_absolute` support added to `UpdateStepPositionAction`
- All comment action schemas defined and implemented
- All comment action executors implemented
- All step references can be by ID.
- Comprehensive backend tests for all actions (steps, comments, workflow metadata)
- Integration tests for refactor API
- Updated API documentation

### Acceptance Criteria for Iteration 2:
- All backend unit tests pass
- Integration tests pass
- RemoveStepAction works correctly with connections and workflow outputs
- Both position_absolute and position_shift work correctly
- All comment actions work correctly (add, delete, modify)
- Workflow metadata actions work correctly
- Backend is ready for frontend integration in Iteration 4


## Iteration 3 — Define cross-layer action contract and serializer in the client

Create a pure serialization layer that converts frontend undo/redo actions into backend refactor API actions. This iteration has NO API calls - just type-safe serialization with comprehensive tests.

### Step 3.0: Add `what` field to all SetValueActionHandler instances
- **File**: `client/src/components/Workflow/Editor/Index.vue`
- **Problem**: 6 of 9 `SetValueActionHandler` instances have `what = null`, making serialization routing on `action.what` impossible.
- **Fix**: Add `what` parameter to all 6 missing handlers:
  | Handler | Current `what` | Add `what` |
  |---------|---------------|------------|
  | `setNameActionHandler` | `null` | `"name"` |
  | `setDoiHandler` | `null` | `"doi"` |
  | `setReadmeHandler` | `null` | `"readme"` |
  | `setHelpHandler` | `null` | `"help"` |
  | `setLogoUrlHandler` | `null` | `"logoUrl"` |
  | `setTagsHandler` | `null` | `"tags"` |
- **Already set** (no change needed): `setLicenseHandler` (`"license"`), `setCreatorHandler` (`"creator"`), `setAnnotationHandler` (`"annotation"`)

### Step 3.1: Create serializer module structure and import types
- **File**: `client/src/components/Workflow/Editor/Actions/refactorSerialization.ts`
- **Actions**:
  1. Create module with clear JSDoc documentation
  2. Import existing TypeScript types from auto-generated schema:
     ```typescript
     import type { components } from "@/api/schema";

     type UpdateStepLabelAction = components["schemas"]["UpdateStepLabelAction"];
     type UpdateStepPositionAction = components["schemas"]["UpdateStepPositionAction"];
     type UpdateOutputLabelAction = components["schemas"]["UpdateOutputLabelAction"];
     type AddStepAction = components["schemas"]["AddStepAction"];
     type RemoveStepAction = components["schemas"]["RemoveStepAction"]; // Will add in Iteration 2
     type UpdateNameAction = components["schemas"]["UpdateNameAction"];
     type UpdateAnnotationAction = components["schemas"]["UpdateAnnotationAction"];
     type UpdateLicenseAction = components["schemas"]["UpdateLicenseAction"];
     // ... etc for all action types

     type RefactorAction = components["schemas"]["RefactorRequest"]["actions"][number];
     ```
  3. Create base serialization interface:
     ```typescript
     interface SerializationResult {
       actions: RefactorAction[];
       title: string; // For changelog
       success: boolean;
       error?: string;
     }
     ```
  4. Create main function signature:
     ```typescript
     export function serializeAction(
       action: UndoRedoAction,
       context: SerializationContext
     ): SerializationResult
     ```
  5. Define `SerializationContext` type with step store, state store references

### Step 3.2: Remove - types already exist in generated schema
- **Note**: We're using auto-generated types from `client/src/api/schema/schema.ts`
- These are generated from the backend OpenAPI schema
- When we add new backend actions (like `RemoveStepAction`, comment actions), we'll need to:
  1. Add them to backend `schema.py`
  2. Regenerate TypeScript schema
  3. Import the new types in our serializer

### Step 3.3: Implement label change serialization
- **Function**: `serializeLabelChange(action: LazySetLabelAction): RefactorAction[]`
- **Logic**:
  1. Get step from store using `action.stepId`
  2. Resolve step reference
  3. Return `UpdateStepLabelAction` with new label
- **Tests**:
  1. Test with unique label
  2. Test with step referenced by order_index
  3. Test error case: step not found

### Step 3.4: Implement output label change serialization
- **Function**: `serializeOutputLabelChange(action: LazySetOutputLabelAction): RefactorAction[]`
- **Logic**:
  1. Get step from store
  2. Resolve step reference
  3. Determine which output changed (compare fromValue/toValue)
  4. Return `UpdateOutputLabelAction` with output reference
- **Tests**:
  1. Test setting output label
  2. Test clearing output label
  3. Test multiple outputs

### Step 3.5: Implement position change serialization (absolute positions)
- **Function**: `serializePositionChange(action: LazyMutateStepAction<'position'>): RefactorAction[]`
- **Logic**:
  1. Get step from store
  2. Use `action.toValue` as absolute position
  3. Return `UpdateStepPositionAction` with `position_absolute`
- **Function**: `serializeMoveMultiple(action: LazyMoveMultipleAction): RefactorAction[]`
- **Logic**:
  1. `LazyMoveMultipleAction` moves BOTH steps AND comments
  2. Iterate action's step list → emit `UpdateStepPositionAction[]` with `position_absolute` for each
  3. Iterate action's comment list → emit `UpdateCommentPositionAction[]` for each
  4. Return combined array of all position actions
- **Tests**:
  1. Test single step move
  2. Test move with position calculation
  3. Test LazyMoveMultipleAction with steps only
  4. Test LazyMoveMultipleAction with steps AND comments
  5. Test LazyMoveMultipleAction with comments only

### Step 3.6: Implement add step serialization
- **Function**: `serializeAddStep(action: InsertStepAction): RefactorAction[]`
- **Logic**:
  1. Extract contentId, name, type, position from `action.stepData`
  2. Build `AddStepAction`:
     - `type`: from stepData
     - `label`: from stepData or undefined
     - `position`: absolute position
     - `tool_state`: null for now (comes later)
  3. Return action
- **Tests**:
  1. Test adding data input
  2. Test adding tool step with label
  3. Test adding tool step without label
  4. Test position is included

### Step 3.7: Implement workflow metadata serialization
- **Function**: `serializeWorkflowMetadata(action: LazySetValueAction): RefactorAction[]`
- **Logic**:
  1. Route on `action.what` (all 9 handlers now have `what` set per Step 3.0):
     - `what === "name"` → `UpdateNameAction`
     - `what === "annotation"` → `UpdateAnnotationAction`
     - `what === "license"` → `UpdateLicenseAction`
     - `what === "creator"` → `UpdateCreatorAction`
     - `what === "doi"` / `"readme"` / `"help"` / `"logoUrl"` / `"tags"` → future backend actions or no-op
  2. For metadata types without a backend action yet, return `{ actions: [], success: false, error: "not yet supported" }`
- **Tests**:
  1. Test name change
  2. Test annotation change
  3. Test license change
  4. Test creator change
  5. Test unsupported metadata type returns graceful error

### Step 3.8: Implement comment action serialization
- **Functions**: Create serializers for all comment actions
  1. `serializeAddComment(action: AddCommentAction): RefactorAction[]`
  2. `serializeDeleteComment(action: DeleteCommentAction): RefactorAction[]`
  3. `serializeChangeCommentColor(action: ChangeColorAction): RefactorAction[]`
  4. `serializeChangeCommentData(action: LazyChangeDataAction): RefactorAction[]`
  5. `serializeChangeCommentPosition(action: LazyChangePositionAction): RefactorAction[]`
  6. `serializeChangeCommentSize(action: LazyChangeSizeAction): RefactorAction[]`
  7. `serializeRemoveAllFreehand(action: RemoveAllFreehandCommentsAction): RefactorAction[]`
- **Logic**: Similar pattern to step actions - extract data and build backend action
- **Tests**: Comprehensive tests for each comment action type

### Step 3.9: Implement remove step serialization
- **Function**: `serializeRemoveStep(action: RemoveStepAction): RefactorAction[]`
- **Logic**:
  1. Get step from action
  2. Resolve step reference
  3. Return `RemoveStepAction` with step reference
- **Tests**:
  1. Test removing step by label
  2. Test removing step by order_index
  3. Test removing connected step (connections handled by backend)

### Step 3.10: Implement main serialization dispatcher
- **Function**: `serializeAction(action: UndoRedoAction, context: SerializationContext): SerializationResult`
- **Logic**:
  1. Use `instanceof` checks to route to specific serializers:
     ```typescript
     if (action instanceof LazySetLabelAction) {
       return serializeLabelChange(action);
     } else if (action instanceof LazySetOutputLabelAction) {
       return serializeOutputLabelChange(action);
     } else if (action instanceof AddCommentAction) {
       return serializeAddComment(action);
     } else if (action instanceof RemoveStepAction) {
       return serializeRemoveStep(action);
     }
     // ... etc for ALL action types
     ```
  2. For unsupported actions, return:
     ```typescript
     {
       actions: [],
       title: action.name,
       success: false,
       error: "Action type not yet supported for serialization"
     }
     ```
  3. Wrap in try/catch for robust error handling
- **Tests**:
  1. Test routing to each serializer (steps, comments, workflow metadata)
  2. Test unsupported action handling
  3. Test error case handling

### Step 3.11: Create comprehensive serializer test suite
- **File**: `client/src/components/Workflow/Editor/Actions/refactorSerialization.test.ts`
- **Test Structure**:
  ```typescript
  describe('refactorSerialization', () => {
    describe('Step Actions', () => {
      describe('serializeLabelChange', () => { ... });
      describe('serializeOutputLabelChange', () => { ... });
      describe('serializePositionChange', () => { ... });
      describe('serializeAddStep', () => { ... });
      describe('serializeRemoveStep', () => { ... });
    });
    describe('Comment Actions', () => {
      describe('serializeAddComment', () => { ... });
      describe('serializeDeleteComment', () => { ... });
      describe('serializeChangeCommentColor', () => { ... });
      describe('serializeChangeCommentData', () => { ... });
      describe('serializeChangeCommentPosition', () => { ... });
      describe('serializeChangeCommentSize', () => { ... });
      describe('serializeRemoveAllFreehand', () => { ... });
    });
    describe('Workflow Metadata Actions', () => {
      describe('serializeWorkflowMetadata', () => { ... });
    });
    describe('Dispatcher', () => {
      describe('serializeAction', () => { ... });
      describe('resolveStepReference', () => { ... });
    });
  });
  ```
- **Test Coverage Goals**:
  - All serializer functions >95% branch coverage
  - Edge cases: missing data, null values, invalid references
  - Schema validation: ensure output matches backend schema

### Step 3.12: Add serialization documentation
- **File**: `client/src/components/Workflow/Editor/Actions/README_SERIALIZATION.md`
- **Content**:
  1. Overview of serialization architecture
  2. Mapping table: Frontend action → Backend action
  3. Step reference resolution strategy
  4. Position handling strategy
  5. Error handling patterns
  6. Examples of serialized output
  7. Future enhancements (tool state, action batching)

### Deliverables for Iteration 3:
- `refactorSerialization.ts` - Pure serialization logic (no API calls, imports types from auto-generated schema)
- `refactorSerialization.test.ts` - Comprehensive test suite
- `README_SERIALIZATION.md` - Documentation
- All tests passing with >95% coverage
- **Note**: TypeScript types come from `client/src/api/schema/schema.ts` (auto-generated from backend OpenAPI)

### Acceptance Criteria for Iteration 3:
- **All core actions can be serialized**:
  - Step actions: label, position, add, remove, output label, annotation
  - Comment actions: add, delete, color, data, position, size, remove all freehand
  - Workflow metadata: name, annotation, license
- Serialization produces valid JSON matching backend schema
- Comprehensive test coverage
- Zero API dependencies (pure functions)
- Can be used independently for testing/validation
- Clear error messages for unsupported actions

---

## Iteration 4 — Persisted action journal and CHANGELOG endpoints

Create database persistence for workflow refactoring actions by extending the existing `PUT /refactor` endpoint, and add new endpoints for changelog and revert.

**Key architectural decisions** (from review):
- **One code path**: Extend `PUT /api/workflows/{id}/refactor` with optional journal fields instead of creating a parallel `POST /refactor_actions` endpoint. Journal entries are recorded when `title` is present; otherwise existing behavior is unchanged.
- **Atomic transaction**: Journal entry and workflow version share one DB transaction.
- **FK to StoredWorkflow**: Journal tracks changes across versions of the logical workflow container.
- **Layer split**: Thin `WorkflowActionJournalManager` for CRUD; orchestration stays in `WorkflowsService`/`WorkflowContentsManager`.

### Step 4.1: Design action journal database schema
- **File**: New migration in `lib/galaxy/model/migrations/`
- **Table**: `workflow_action_journal_entry`
- **Columns**:
  - `id` (integer, primary key)
  - `stored_workflow_id` (integer, FK → `stored_workflow.id`, indexed) — the logical workflow container, NOT `workflow.id`
  - `user_id` (integer, FK → `galaxy_user.id`)
  - `create_time` (timestamp, indexed) — use `UsesCreateAndUpdateTime` mixin
  - `title` (varchar 255) — human-readable action title for changelog
  - `source_action_type` (varchar 255, nullable) — frontend action class name (e.g. `"LazySetLabelAction"`)
  - `action_payloads` (JSONType) — array of refactor action objects as serialized dicts
  - `workflow_id_before` (integer, FK → `workflow.id`) — DB PK of `Workflow` revision before this action
  - `workflow_id_after` (integer, FK → `workflow.id`) — DB PK of `Workflow` revision after this action
  - `execution_messages` (JSONType) — array of execution message dicts
  - `is_revert` (boolean, default False)
  - `reverted_entry_id` (integer, FK → `workflow_action_journal_entry.id`, nullable) — if revert, references original entry
- **Note**: Use `Workflow.id` (stable DB PK) for version references, NOT positional version indices which shift on revert. Use `JSONType` (not `JSON` or `MutableJSONType`) for immutable JSON columns.

### Step 4.2: Create SQLAlchemy model
- **File**: `lib/galaxy/model/__init__.py`
- **Class**: `WorkflowActionJournalEntry`
- **Inherits**: `Base`, `UsesCreateAndUpdateTime`
- **Fields**: Match database schema above
- **Relationships**:
  - `stored_workflow` — Many-to-one with `StoredWorkflow`
  - `user` — Many-to-one with `User`
  - `workflow_before` — Many-to-one with `Workflow` (via `workflow_id_before`)
  - `workflow_after` — Many-to-one with `Workflow` (via `workflow_id_after`)
  - `reverted_entry` — self-referential Many-to-one
- **Methods**:
  - `to_dict()` — serialize for API response; use `security.encode_id()` for all IDs in output

### Step 4.3: Create database migration
- **File**: New alembic migration
- **Actions**:
  1. Create `workflow_action_journal_entry` table
  2. Add indices on `stored_workflow_id`, `create_time`
  3. Add foreign key constraints (stored_workflow, user, workflow_before, workflow_after, self)
  4. Test upgrade/downgrade

### Step 4.4: Implement WorkflowActionJournalManager (thin CRUD)
- **File**: `lib/galaxy/managers/workflow_action_journal_manager.py` (new)
- **Class**: `WorkflowActionJournalManager`
- **Constructor**: `__init__(self)` — no special deps; methods receive `sa_session` via `trans.sa_session`
- **Methods** (all take `sa_session` as first arg, following Galaxy convention):
  1. `create_entry(sa_session, stored_workflow, user, title, source_action_type, actions, workflow_before, workflow_after, messages)` → `WorkflowActionJournalEntry`
     - Creates model instance, adds to session (does NOT commit — caller manages transaction)
  2. `list_entries(sa_session, stored_workflow, limit=50, offset=0)` → `tuple[list[WorkflowActionJournalEntry], int]`
     - Returns `(entries, total_count)` for pagination
  3. `get_entry(sa_session, entry_id)` → `WorkflowActionJournalEntry`
  4. `create_revert_entry(sa_session, stored_workflow, user, workflow_before, workflow_after, target_workflow)` → `WorkflowActionJournalEntry`
     - Sets `is_revert=True`, `reverted_entry_id=None`, `title="Reverted to version N"` (N from `stored_workflow.version_of(target_workflow)`)
     - `action_payloads=[]`, `execution_messages=[]`
     - Does NOT commit — caller manages transaction

### Step 4.5: Register in DI container
- **File**: `lib/galaxy/app.py`
- **In** `GalaxyManagerApplication.__init__()` (near line 637 where `workflow_manager` is registered):
  ```python
  self._register_singleton(WorkflowActionJournalManager)
  ```
- **File**: `lib/galaxy/webapps/galaxy/services/workflows.py`
- **In** `WorkflowsService.__init__()`: Add `workflow_action_journal_manager: WorkflowActionJournalManager` parameter (lagom auto-resolves)

### Step 4.6: Extend PUT /refactor with journal support
- **File**: `lib/galaxy/workflow/refactor/schema.py`
- **Changes to `RefactorActions`** (the request body model):
  ```python
  class RefactorActions(BaseModel):
      actions: list[Annotated[union_action_classes, Field(discriminator="action_type")]]
      dry_run: bool = False
      title: Optional[str] = None  # When present, creates a journal entry
      source_action_type: Optional[str] = None  # Frontend action class name
  ```
- **No new endpoint** — the existing `PUT /api/workflows/{workflow_id}/refactor` handles everything
- **Response**: Unchanged `RefactorResponse` (already returns full workflow dict + action_executions + dry_run)

### Step 4.7: Wire journal writing into refactor flow (atomic transaction)
- **File**: `lib/galaxy/managers/workflows.py`
- **Changes to `do_refactor()`** (around line 2027):
  1. Before calling `update_workflow_from_raw_description()`, capture `workflow_before = stored_workflow.latest_workflow`
  2. Pass `defer_commit=True` to `update_workflow_from_raw_description()` so it flushes but does NOT commit
  3. After `update_workflow_from_raw_description()` returns `refactored_workflow`:
     - If `refactor_request.title` is not None and not `dry_run`:
       - Call `journal_manager.create_entry(trans.sa_session, stored_workflow, trans.user, ...)`
       - This adds the journal entry to the same session
     - Then `trans.sa_session.commit()` — one transaction for both workflow version + journal entry
  4. If `title` is None, commit immediately (existing behavior)
- **Changes to `update_workflow_from_raw_description()`** (line 773):
  - Add `defer_commit: bool = False` parameter
  - When `defer_commit=True`: call `trans.sa_session.flush()` instead of `trans.sa_session.commit()`
  - When `defer_commit=False`: existing behavior (commit)
- **Auth**: Use existing `get_stored_workflow(trans, workflow_id)` pattern which validates ownership

### Step 4.8: Implement GET /api/workflows/{id}/changelog endpoint
- **File**: `lib/galaxy/webapps/galaxy/api/workflows.py`
- **Route**: `GET /api/workflows/{workflow_id}/changelog`
- **Query Params**: `limit` (default 50), `offset` (default 0)
- **Logic**:
  1. `stored_workflow = self._workflows_manager.get_stored_workflow(trans, workflow_id)`
  2. `entries, total = journal_manager.list_entries(trans.sa_session, stored_workflow, limit, offset)`
  3. Return entries as JSON array; set `total_matches` response header (Galaxy pagination convention)
- **Response** (array, with `total_matches` header):
  ```json
  [
    {
      "id": "encoded_id",
      "title": "Change step label",
      "source_action_type": "LazySetLabelAction",
      "create_time": "2025-01-15T10:30:00Z",
      "user_id": "encoded_user_id",
      "workflow_id_before": "encoded_wf_id",
      "workflow_id_after": "encoded_wf_id",
      "execution_messages": [],
      "is_revert": false
    }
  ]
  ```

### Step 4.9: Implement POST /api/workflows/{id}/revert endpoint
- **File**: `lib/galaxy/webapps/galaxy/api/workflows.py`
- **Route**: `POST /api/workflows/{workflow_id}/revert`
- **Request Body**:
  ```json
  {
    "target_workflow_id": "encoded_workflow_id"
  }
  ```
  `target_workflow_id` is the `Workflow.id` (DB PK, encoded) of the revision to restore.
  The caller can pass either `workflow_id_before` or `workflow_id_after` from a changelog
  entry — the endpoint is agnostic; it just needs a valid `Workflow.id` belonging to this
  `StoredWorkflow`. The frontend renders "Undo everything from this point forward" using
  `workflow_id_before`, or "Restore this version" using `workflow_id_after`.

- **Semantics**: Revert always creates a **new `Workflow` row** (append-only). It does NOT
  re-point `latest_workflow` to the old row. Rationale:
  - Preserves the append-only version history invariant used everywhere in Galaxy.
  - Old `Workflow` rows may be referenced by `WorkflowInvocation.workflow_id`.
  - The revert journal entry needs a distinct `workflow_id_after` (new row) that
    differs from `workflow_id_before` (current `latest_workflow` before revert).

- **Logic** (in `WorkflowContentsManager`, following the `do_refactor` pattern):
  1. `stored_workflow = self.get_stored_workflow(trans, workflow_id)` — validates ownership
  2. `target_workflow = stored_workflow.get_internal_version_by_id(decoded_target_id)` —
     validates target belongs to this StoredWorkflow; raises error otherwise
  3. **No-op check**: If `target_workflow.id == stored_workflow.latest_workflow.id`, raise
     `RequestParameterInvalidException("Target version is already the current version")`
  4. `workflow_before = stored_workflow.latest_workflow` — capture for journal entry
  5. Export target workflow to dict via `_workflow_to_dict_export(trans, stored_workflow, workflow=target_workflow, internal=True)`
  6. `raw_description = self.normalize_workflow_format(trans, as_dict)`
  7. `workflow_update_options = WorkflowUpdateOptions(fill_defaults=False, allow_missing_tools=True)`
  8. `new_workflow, errors = self.update_workflow_from_raw_description(trans, stored_workflow, raw_description, workflow_update_options, defer_commit=True)`
  9. Create revert journal entry:
     ```python
     journal_manager.create_revert_entry(
         sa_session=trans.sa_session,
         stored_workflow=stored_workflow,
         user=trans.user,
         workflow_before=workflow_before,
         workflow_after=new_workflow,
         target_workflow=target_workflow,
     )
     ```
  10. `trans.sa_session.commit()` — one transaction for version + journal entry
  11. Return full `RefactorResponse` (includes workflow dict)

- **Edge cases**:
  - **Target is current version**: Rejected at step 3 with 400 error.
  - **Target belongs to different StoredWorkflow**: `get_internal_version_by_id` raises error at step 2.
  - **Target Workflow.id doesn't exist**: Raises `ObjectNotFound` at step 2.
  - **Missing tools in target version**: `allow_missing_tools=True` handles this; warnings in response.

- **Note**: Uses `Workflow.id` (stable DB PK), not positional version index

### Step 4.10: Add backend tests for journal persistence
- **File**: `test/unit/managers/test_workflow_action_journal_manager.py`
- **Tests**:
  1. Test create_entry stores all fields correctly
  2. Test list_entries with pagination (limit/offset)
  3. Test list_entries returns total_count
  4. Test get_entry by id
  5. Test create_revert_entry sets is_revert=True, records correct workflow_before/workflow_after, generates version-based title
  6. Test ordering (newest first)
  7. Test entries use encoded IDs in to_dict()

### Step 4.11: Add API integration tests
- **File**: `test/integration/test_workflow_changelog_api.py`
- **Tests**:
  1. Test PUT /refactor with title creates journal entry
  2. Test PUT /refactor without title does NOT create journal entry (backward compat)
  3. Test GET /changelog returns list with total_matches header
  4. Test pagination works correctly
  5. Test revert endpoint creates new version and journal entry
  6. Test unauthorized access is blocked
  7. Test dry_run doesn't create journal entry
  8. Test execution messages are persisted in journal
  9. Test atomic transaction: if refactor fails, no journal entry created
  10. Test response includes full workflow dict

### Step 4.12: Add API documentation
- **File**: Update `lib/galaxy/webapps/galaxy/api/workflows.py` docstrings
- **Content**:
  1. Document new optional fields on PUT /refactor (`title`, `source_action_type`)
  2. Document GET /changelog endpoint
  3. Document POST /revert endpoint
  4. Add request/response examples
  5. Document error cases
  6. Explain revert behavior (creates new version, doesn't delete history)

### Deliverables for Iteration 4:
- Database migration for `workflow_action_journal_entry` table
- SQLAlchemy model `WorkflowActionJournalEntry`
- `WorkflowActionJournalManager` for journal CRUD
- DI registration in `app.py`
- Extended `PUT /refactor` with optional journal fields
- `defer_commit` support in `update_workflow_from_raw_description()`
- Two new endpoints: `GET /changelog`, `POST /revert`
- Comprehensive backend tests (unit + integration)
- API documentation

### Acceptance Criteria for Iteration 4:
- All database tests pass
- All API integration tests pass
- PUT /refactor with `title` creates atomic journal entry + workflow version
- PUT /refactor without `title` is identical to current behavior (backward compat)
- GET /changelog returns paginated list with `total_matches` header
- Revert creates new version without deleting history
- All API responses use encoded IDs
- Auth uses `get_stored_workflow` ownership pattern
- Transaction atomicity: refactor failure → no orphaned journal entry

---

## Iteration 5 — Frontend integration (opt-in behind feature flag)

Wire up the serializer to the undo/redo store and create UI for changelog viewing. This is behind a feature flag for gradual rollout.

### Step 5.1: Add feature flag configuration
- **File**: `lib/galaxy/config/__init__.py`
- **Setting**: `enable_workflow_action_persistence` (default: False)
- **Frontend Config**: Expose via `config.ts`
- **Documentation**: Add to admin configuration docs

### Step 5.2: Create workflow action persistence service
- **File**: `client/src/services/workflowActionPersistence.ts`
- **Class**: `WorkflowActionPersistenceService`
- **Methods**:
  1. `submitBatch(workflowId, actions, title, sourceActionType?)` → `Promise<RefactorResponse>`
     - Calls `PUT /api/workflows/{id}/refactor` with `title` field set
  2. `getChangelog(workflowId, limit, offset)` → `Promise<{entries, totalMatches}>`
     - Calls `GET /api/workflows/{id}/changelog`, reads `total_matches` from response header
  3. `revertToVersion(workflowId, targetWorkflowId)` → `Promise<RefactorResponse>`
     - Calls `POST /api/workflows/{id}/revert`
- **Error Handling**:
  - Network failures: show error toast, allow manual retry
  - Validation errors: show user-friendly message
  - Server error (500): show error, allow manual retry

### Step 5.3: Integrate serializer with undo/redo store (batch-on-save)
- **File**: `client/src/stores/undoRedoStore/index.ts`
- **Default mode**: Batch on save — actions accumulate locally and are sent as one batch when the user saves.
- **Changes**:
  1. Add `persistenceEnabled` property (reads from feature flag)
  2. Add `pendingActions: SerializationResult[]` array — accumulates serialized actions locally
  3. Modify `applyAction`:
     ```typescript
     applyAction(action: UndoRedoAction) {
       // Apply locally (unchanged)
       this.applyActionLocally(action);

       // If persistence enabled, serialize and queue (do NOT send yet)
       if (this.persistenceEnabled) {
         const result = serializeAction(action, context);
         if (result.success) {
           this.pendingActions.push(result);
         }
       }
     }
     ```
  4. `flushLazyAction` just finalizes the lazy action locally, does NOT trigger API call
  5. Add `hasPendingActions` computed property for UI indicators

### Step 5.4: Implement batch submission on save
- **File**: `client/src/stores/undoRedoStore/index.ts`
- **Logic**:
  1. On save: flatten `pendingActions` into a single `RefactorActions` payload
  2. Generate batch `title` summarizing the actions (e.g. "Changed label, moved 3 steps, added comment")
  3. Call `persistenceService.submitBatch(workflowId, allActions, title)`
  4. On success: clear `pendingActions`, clear local undo stack, update changelog
  5. On failure: show error, keep `pendingActions` for retry
  6. Single API call = single workflow version = clean changelog

### Step 5.5: Create changelog panel component
- **File**: `client/src/components/Workflow/Editor/ChangelogPanel.vue`
- **Features**:
  1. Display list of journal entries from server
  2. Show entry title, timestamp, user
  3. Show execution messages (warnings, errors)
  4. Click entry to see details
  5. Pagination controls
  6. Revert button per entry
- **Design**: Side panel similar to history panel

### Step 5.6: Add changelog panel to workflow editor
- **File**: `client/src/components/Workflow/Editor/Index.vue`
- **Changes**:
  1. Add "Changelog" tab to right panel
  2. Only show if feature flag enabled
  3. Load changelog on workflow open
  4. Refresh after save completes
  5. Show loading states

### Step 5.7: Implement revert functionality
- **File**: `client/src/components/Workflow/Editor/Actions/revertActions.ts`
- **Function**: `revertToVersion(workflowId, targetWorkflowId)`
- **Logic**:
  1. Confirm with user (modal dialog)
  2. Call `POST /api/workflows/{id}/revert` with `target_workflow_id`
  3. Reload workflow from server response (full workflow dict returned)
  4. Clear local undo/redo stack and pending actions
  5. Show success toast
  6. Refresh changelog panel
- **UI**: Add "Revert to this version" button in changelog

### Step 5.8: Handle persistence errors gracefully
- **File**: `client/src/stores/undoRedoStore/persistenceErrorHandler.ts`
- **Scenarios** (simpler than per-action mode since we only send on save):
  1. Network failure on save: Show error toast, keep pending actions, allow retry
  2. Validation error: Show error details, allow editing before retry
  3. Server error (500): Show error, allow manual retry
- **No retry queue needed** — user explicitly triggers save, so retry is manual

### Step 5.9: Add unsaved-changes indicator
- **File**: `client/src/components/Workflow/Editor/UnsavedIndicator.vue`
- **States**:
  - No pending actions: nothing shown
  - Has pending actions: show count badge near save button (e.g. "3 unsaved changes")
  - Save in progress: show spinner
  - Save failed: show error indicator with retry
- **Location**: Top toolbar near save button

### Step 5.10: Add E2E tests for persistence
- **File**: `lib/galaxy_test/selenium/test_workflow_editor_persistence.py`
- **Tests**:
  1. `test_batch_persistence_on_save`:
     - Enable feature flag
     - Make multiple changes (label, position, add step)
     - Verify unsaved indicator shows count
     - Click save
     - Verify single changelog entry created with all changes
     - Reload page, verify all changes persisted
  2. `test_persistence_revert`:
     - Make and save changes A, then changes B
     - Revert to version after A
     - Verify workflow state matches post-A state
     - Verify revert appears in changelog
  3. `test_persistence_save_failure`:
     - Make changes
     - Simulate save failure
     - Verify pending actions preserved
     - Retry save, verify success

### Step 5.11: Add feature flag toggle in admin panel
- **File**: `client/src/components/admin/Settings.vue`
- **Setting**: "Enable Workflow Action Persistence"
- **Description**: "Persist workflow editing actions to database for changelog and cross-session undo/redo"
- **Warning**: "Beta feature - creates additional workflow versions on save"

### Step 5.12: Update user documentation
- **File**: `doc/source/admin/workflow_editor.rst`
- **Content**:
  1. Document feature flag
  2. Explain batch-on-save behavior
  3. Document changelog panel usage
  4. Explain revert functionality
  5. Note: each save creates one changelog entry regardless of number of edits

### Deliverables for Iteration 5:
- Feature flag configuration
- Persistence service (batch submission, changelog, revert)
- Batch-on-save integration with undo/redo store
- Changelog panel component
- Revert functionality
- Unsaved-changes indicator
- E2E tests for persistence features
- Admin configuration UI
- User documentation

### Acceptance Criteria for Iteration 5:
- Feature flag works (can enable/disable)
- Actions accumulate locally and are batched on save
- Single save = single API call = single changelog entry
- Changelog panel shows action history
- Revert functionality works correctly
- Error handling covers save failure scenarios
- E2E tests pass
- No disruption to existing workflow editor when flag disabled
- Performance is acceptable (save adds minimal overhead)

---


## Iteration 6 — Expand E2E test coverage and add observability

Add comprehensive E2E tests for all persisted actions and debugging/monitoring tools.

### Step 6.1: Add E2E tests for step action persistence
- **File**: `lib/galaxy_test/selenium/test_workflow_editor_persistence.py`
- **New Tests**:
  1. `test_persist_label_change`: Change step label, verify in changelog, reload and verify
  2. `test_persist_position_change`: Move step, verify in changelog, reload and verify
  3. `test_persist_add_step`: Add new tool step, verify in changelog, reload and verify
  4. `test_persist_remove_step`: Remove step with connections, verify connection drop messages, reload, revert
  5. `test_persist_output_label`: Set output label, verify in changelog, reload and verify
  6. `test_persist_step_annotation`: Set step annotation, verify in changelog, reload and verify

### Step 6.2: Add E2E tests for comment action persistence
- **File**: `lib/galaxy_test/selenium/test_workflow_editor_persistence.py`
- **New Tests**:
  1. `test_persist_add_comment`: Add text comment, verify in changelog, reload and verify
  2. `test_persist_delete_comment`: Add and delete comment, verify both in changelog, revert delete
  3. `test_persist_comment_modifications`: Change color/text/position, verify in changelog, reload and verify
  4. `test_persist_remove_all_freehand`: Add multiple freehand, remove all, verify in changelog

### Step 6.3: Add E2E tests for workflow metadata persistence
- **File**: `lib/galaxy_test/selenium/test_workflow_editor_persistence.py`
- **New Tests**:
  1. `test_persist_workflow_name`: Change name, verify in changelog, reload and verify
  2. `test_persist_workflow_annotation`: Change annotation, verify in changelog, reload and verify
  3. `test_persist_workflow_license`: Change license, verify in changelog, reload and verify

### Step 6.4: Add E2E tests for complex scenarios
- **File**: `lib/galaxy_test/selenium/test_workflow_editor_persistence.py`
- **New Tests**:
  1. `test_persist_multiple_actions_batch`: Make several changes, save, verify single changelog entry, reload and verify all
  2. `test_persist_revert_middle_version`: Save changes A, save changes B, save changes C, revert to post-A version, verify state
  3. `test_persist_auto_layout`: Run auto-layout (emits N position updates), save, verify all positions persisted correctly

### Step 6.5: Add observability and debugging tools
- **File**: `client/src/components/Workflow/Editor/Actions/serializationDebugger.ts`
- **Features**:
  1. Log all serialization attempts (dev mode only)
  2. Show serialization errors in console with context
  3. Dev tools panel showing: last 10 actions, success rate, pending count
  4. Export serialization history as JSON for bug reports

### Step 6.6: Update all documentation
- **Note**: `test/unit/workflow/refactor/` will need `__init__.py` files for Python test discovery
- **Files**:
  - `client/src/stores/undoRedoStore/README.md` - Add "Persisted Actions and Refactor API" section
  - `client/src/components/Workflow/Editor/Actions/README_SERIALIZATION.md` - Update with all action types
  - `doc/source/dev/workflow_persistence_architecture.rst` - Architecture documentation
- **Content**: Full documentation of persistence architecture, serialization, batching, error handling

### Deliverables for Iteration 6:
- Comprehensive E2E tests for all action types (steps, comments, workflow metadata)
- E2E tests for complex scenarios (batch save, revert, auto-layout)
- Debugging and observability tools
- Complete documentation

### Acceptance Criteria for Iteration 6:
- All E2E tests pass
- Tests cover all core action types
- Debugging tools help troubleshoot issues
- Documentation is complete and accurate

---


## Iteration 7 — Governance, performance optimization, and production rollout

Prepare for production deployment with governance policies, performance monitoring, and gradual rollout strategy.

### Step 7.1: Implement journal retention policy
- **File**: `lib/galaxy/managers/workflow_action_journal_manager.py`
- **Feature**: Configurable retention
- **Settings**:
  - `workflow_action_journal_retention_days` (default: 90)
  - `workflow_action_journal_max_entries_per_workflow` (default: 1000)
- **Logic**:
  - Automatic cleanup job runs daily
  - Deletes entries older than retention period
  - Keeps last N entries regardless of age
  - Admin can manually trigger cleanup

### Step 7.2: Add journal cleanup command
- **File**: `lib/galaxy/scripts/cleanup_workflow_journal.py`
- **Command**: `galaxyadm cleanup-workflow-journal`
- **Options**:
  - `--days`: Override retention period
  - `--workflow-id`: Clean specific workflow
  - `--dry-run`: Show what would be deleted
  - `--force`: Skip confirmation
- **Report**: Number of entries deleted, disk space freed

### Step 7.3: Add telemetry and monitoring
- **File**: `lib/galaxy/managers/workflow_action_journal_manager.py`
- **Metrics to track**:
  1. Number of actions per day
  2. Average actions per workflow
  3. Serialization success rate
  4. API endpoint latency
  5. Database table size growth
  6. Failed persistence attempts
- **Integration**: Statsd/Prometheus metrics
- **Alerting**: Alert if error rate > 5%

### Step 7.4: Optimize database queries
- **File**: `lib/galaxy/managers/workflow_action_journal_manager.py`
- **Optimizations**:
  1. Add database indices for common queries
  2. Use query result caching for changelog
  3. Implement efficient pagination
  4. Bulk insert for batched actions
  5. Connection pooling optimization
- **Testing**: Load test with 10k actions

### Step 7.5: Add per-user access controls
- **File**: `lib/galaxy/managers/workflow_action_journal_manager.py`
- **Rules**:
  1. Users can view actions on workflows they have access to
  2. Users can only revert their own actions (configurable)
  3. Admin can view/revert any actions
  4. Changelog shows user who made each change
- **Settings**: `allow_revert_others_actions` (default: true)
- **Note**: Concurrent editing and optimistic locking deferred to future iteration.

### Step 7.6: Implement action compaction (optional)
- **File**: `lib/galaxy/managers/workflow_action_journal_manager.py`
- **Feature**: Compact old actions to save space
- **Logic**:
  - Combine multiple position updates into one
  - Combine multiple label changes into one
  - Keep compacted entry with "compacted from N actions" note
  - Preserve essential history, reduce storage
- **Setting**: `enable_action_journal_compaction` (default: false)
- **Command**: `galaxyadm compact-workflow-journal`

### Step 7.7: Add admin dashboard for journal monitoring
- **File**: `client/src/components/admin/WorkflowJournalDashboard.vue`
- **Features**:
  1. Total actions in database
  2. Actions per workflow (top 10)
  3. Database size and growth rate
  4. Error rate over time
  5. Most active users
  6. Cleanup job status and schedule
- **Actions**: Trigger cleanup, adjust retention policy

### Step 7.8: Create migration guide for existing users
- **File**: `doc/source/admin/workflow_action_persistence.rst`
- **Content**:
  1. Benefits of enabling persistence
  2. Performance impact assessment
  3. Database sizing guide
  4. Enabling the feature flag
  5. Monitoring and troubleshooting
  6. Retention policy configuration
  7. Backup recommendations
  8. Rollback procedure

### Step 7.9: Implement gradual rollout strategy
- **File**: `lib/galaxy/config/__init__.py`
- **Additional Settings**:
  - `workflow_action_persistence_rollout_percentage` (default: 0)
  - `workflow_action_persistence_user_whitelist` (list of user emails)
- **Logic**:
  - Random X% of users get feature enabled
  - Whitelist always gets feature
  - Admin can adjust percentage gradually (0% → 10% → 50% → 100%)

### Step 7.10: Add comprehensive logging
- **File**: `lib/galaxy/managers/workflow_action_journal_manager.py`
- **Log Events**:
  1. Action created (info level)
  2. Action failed to persist (warning level)
  3. Revert performed (info level)
  4. Cleanup job run (info level)
  5. Serialization errors (error level)
- **Log Format**: Structured logging with workflow_id, user_id, action_type

### Step 7.11: Create troubleshooting guide
- **File**: `doc/source/admin/workflow_persistence_troubleshooting.rst`
- **Sections**:
  1. Common errors and solutions
  2. Performance issues
  3. Database migration issues
  4. Feature flag not working
  5. Actions not appearing in changelog
  6. Revert failures
  7. Debugging serialization errors
  8. Checking logs

### Step 7.12: Production readiness checklist
- **File**: `PRODUCTION_READINESS_CHECKLIST.md`
- **Checklist**:
  - [ ] All tests passing (unit, integration, E2E)
  - [ ] Performance benchmarks met
  - [ ] Database migration tested
  - [ ] Rollback procedure tested
  - [ ] Monitoring and alerting configured
  - [ ] Documentation complete
  - [ ] Security review passed
  - [ ] Load testing completed
  - [ ] Retention policy configured
  - [ ] Admin dashboard functional
  - [ ] Gradual rollout plan approved

### Deliverables for Iteration 7:
- Journal retention and cleanup system
- Telemetry and monitoring
- Database optimizations
- Access controls
- Optional action compaction
- Admin dashboard
- Migration and troubleshooting guides
- Gradual rollout strategy
- Production readiness checklist

### Acceptance Criteria for Iteration 7:
- Retention policy works correctly
- Cleanup command deletes old entries
- Monitoring shows accurate metrics
- Database queries are performant under load
- Access controls are enforced
- Admin dashboard is functional
- Documentation is complete
- Gradual rollout can be controlled
- System is production-ready

---

## Action mapping details (initial)

Frontend → Backend
- `LazySetLabelAction` → `UpdateStepLabelAction` (step: by ID, label, or order_index)
- `LazySetOutputLabelAction` → `UpdateOutputLabelAction` (output: by step ref + output_name)
- `setPosition`/`LazyMoveMultipleAction` → `UpdateStepPositionAction` (use `position_absolute`) + `UpdateCommentPositionAction` (for comments in multi-move)
- `InsertStepAction` → `AddStepAction` (type, label?, position, tool_state? [TBD])
- `RemoveStepAction` → `RemoveStepAction` (new; tolerates order_index gaps)
- `LazySetValueAction` → routes on `action.what`: `UpdateNameAction` / `UpdateAnnotationAction` / `UpdateLicenseAction` / `UpdateCreatorAction` / etc.
- Comment actions:
  - `AddCommentAction` → `AddCommentAction`
  - `DeleteCommentAction` → `DeleteCommentAction`
  - `LazyChangePositionAction` → `UpdateCommentPositionAction`
  - `LazyChangeSizeAction` → `UpdateCommentSizeAction` (uses `Size` model, not `Position`)
  - `ChangeColorAction` → `UpdateCommentColorAction`
  - `LazyChangeDataAction` → `UpdateCommentDataAction`
  - `RemoveAllFreehandCommentsAction` → `RemoveAllFreehandCommentsAction`
- `FactoryAction` (name: "connect steps") in `terminals.ts:96` → `ConnectAction` (input: step ref + input_name, output: step ref + output_name)
- `FactoryAction` (name: "disconnect steps") in `terminals.ts:108` → `DisconnectAction` (same reference format)
  - Recommended: replace FactoryActions with typed `ConnectStepAction`/`DisconnectStepAction` for type-safe serialization

---

## Concrete file touchpoints

Client
- `client/src/components/Workflow/Editor/Index.vue` — add `what` to 6 `SetValueActionHandler` instances
- New serializer: `client/src/components/Workflow/Editor/Actions/refactorSerialization.ts`
- Batch-on-save in `client/src/stores/undoRedoStore/index.ts`
- Persistence service: `client/src/services/workflowActionPersistence.ts`
- Changelog panel: `client/src/components/Workflow/Editor/ChangelogPanel.vue`
- Tests next to `client/src/components/Workflow/Editor/Actions/actions.test.ts`

Server
- Schema additions: `lib/galaxy/workflow/refactor/schema.py` (remove step, absolute position, `Size` model, comment actions, `StepReferenceById`, optional `title`/`source_action_type` on `RefactorActions`)
- Executor: `lib/galaxy/workflow/refactor/execute.py` (remove step, absolute position handling, comment actions, explicit `isinstance` checks in `_find_step`)
- Journal model: `lib/galaxy/model/__init__.py` (`WorkflowActionJournalEntry`)
- Journal manager: `lib/galaxy/managers/workflow_action_journal_manager.py` (thin CRUD)
- DI registration: `lib/galaxy/app.py` (`_register_singleton(WorkflowActionJournalManager)`)
- Transaction wiring: `lib/galaxy/managers/workflows.py` (`defer_commit` flag in `update_workflow_from_raw_description`, journal write in `do_refactor`)
- Service wiring: `lib/galaxy/webapps/galaxy/services/workflows.py` (inject `WorkflowActionJournalManager`)
- API: `lib/galaxy/webapps/galaxy/api/workflows.py` (extended PUT /refactor, new GET /changelog, new POST /revert)
- Migration: `lib/galaxy/model/migrations/` (new `workflow_action_journal_entry` table)

---

## Risk management

- Step reference drift: mitigate by preferring step IDs (stable DB PKs); fall back to labels then order_index.
- Position mismatches: use absolute positions exclusively; `position_shift` retained for backward compat only.
- Comment identity: `CommentReference.comment_id` matches the comment's `"id"` field (stable `order_index`-based identifier). Deletion does not renumber remaining IDs, so batch operations are safe. See Step 2.7 batch safety note.
- Redo after divergence: disable or prompt; document behavior.
- Concurrent editing: deferred to future iteration. No optimistic locking in initial implementation.

---

## Test strategy

- Frontend unit tests: serialization of each supported action using fixtures from `actions.test.ts` (including comments, absolute positions, multi-move with steps+comments).
- Backend unit/integration tests: new actions (remove step, comment actions), refactor application, journal append/list, revert, atomic transaction (journal + version), `defer_commit` behavior.
- E2E: batch-on-save flow, changelog verification, revert, auto-layout persistence.

---

## Resolved questions

1. ~~Extend existing PUT /refactor or create separate endpoint?~~ → **Extend PUT /refactor** with optional `title`/`source_action_type` fields
2. ~~Store Workflow.id (DB PK) or positional version index in journal?~~ → **Workflow.id (DB PK)** — stable across reverts
3. ~~Should journal FK point to stored_workflow or workflow?~~ → **stored_workflow** — journal tracks the logical workflow container
4. ~~How to route LazySetValueAction serialization when what is null?~~ → **Add `what` to all handlers** — 6 one-line changes in Index.vue
5. ~~Re-index steps after removal or tolerate gaps?~~ → **Tolerate gaps** — ID-based refs (Step 2.5) make gaps safe
6. ~~Default mode: persist immediately per action, or batch on save?~~ → **Batch on save** — fewer versions, simpler error handling
7. Shared-with users: can they create journal entries, or owner-only? → **Open** — depends on Galaxy's access model (currently ownership-only for writes)
