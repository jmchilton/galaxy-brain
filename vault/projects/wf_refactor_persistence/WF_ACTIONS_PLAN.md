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
- **No database IDs in step references**: The refactoring API is a stateless document transformation — steps are referenced by `order_index` or `label` only. In the exported GA JSON, `"id"` IS `order_index` (see `managers/workflows.py:1552`). Database step IDs are server-specific, change every version (new `WorkflowStep` rows), and would break portability and batch composability (e.g. `add_step` assigns predictable `order_index` for later refs in same batch). See "Step References — No Database IDs by Design" in research notes.

## Scope anchors

- Frontend actions live in:
  - `client/src/components/Workflow/Editor/Actions/` (stepActions, workflowActions, commentActions; tests in `actions.test.ts`)
  - Undo/redo infra in `client/src/stores/undoRedoStore/`
- Backend refactor API lives in:
  - `lib/galaxy/workflow/refactor/` (`schema.py`, `execute.py`)
  - API router in `lib/galaxy/webapps/galaxy/api/workflows.py` (`PUT /api/workflows/{id}/refactor`)
  - Service layer in `lib/galaxy/webapps/galaxy/services/workflows.py` (delegates to managers which call the `execute.py` layer)

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

### Step 1.0.5: Research step reference strategy

- **Goal**: Confirm existing `order_index`/`label` references are sufficient
- **Research findings** (RESOLVED):
  1. The refactoring API is a stateless document transformation — no database access needed
  2. In GA JSON export, `"id"` IS `order_index` (`managers/workflows.py:1552: "id": step.order_index`)
  3. Database step IDs are server-specific and change every version (new `WorkflowStep` rows)
  4. `add_step` assigns predictable next `order_index` (`len(steps)`), so batch refs work
  5. `label` refs are more robust to hypothetical reordering
  6. **Decision**: Do NOT add `StepReferenceById` — use `order_index` and `label` only
  7. Frontend serializer should translate `stepId` (which is `order_index` in GA JSON) to `StepReferenceByOrderIndex`

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

| Frontend Action                   | Frontend File         | Backend Action            | Notes          |
| --------------------------------- | --------------------- | ------------------------- | -------------- |
| `LazySetLabelAction`              | stepActions.ts:83     | `UpdateStepLabelAction`   | Direct mapping |
| `LazySetOutputLabelAction`        | stepActions.ts:124    | `UpdateOutputLabelAction` | Direct mapping |
| `LazySetValueAction` (name)       | workflowActions.ts:16 | `UpdateNameAction`        | Direct mapping |
| `LazySetValueAction` (annotation) | workflowActions.ts:16 | `UpdateAnnotationAction`  | Direct mapping |
| `LazySetValueAction` (license)    | workflowActions.ts:16 | `UpdateLicenseAction`     | Direct mapping |
| `InsertStepAction`                | stepActions.ts:254    | `AddStepAction`           | Direct mapping |

#### Needs Enhancement (🔄 Backend changes required):

| Frontend Action                          | Frontend File      | Backend Action             | Required Changes                   |
| ---------------------------------------- | ------------------ | -------------------------- | ---------------------------------- |
| `setPosition` / `LazyMoveMultipleAction` | stepActions.ts:598 | `UpdateStepPositionAction` | Add `position_absolute` support    |
| `RemoveStepAction`                       | stepActions.ts:310 | ❌ `RemoveStepAction`      | **NEW**: Must implement in backend |

#### Comment Actions (❌ All new backend actions needed):

| Frontend Action                   | Frontend File         | Backend Action Needed             | Priority |
| --------------------------------- | --------------------- | --------------------------------- | -------- |
| `AddCommentAction`                | commentActions.ts:33  | `AddCommentAction`                | High     |
| `DeleteCommentAction`             | commentActions.ts:47  | `DeleteCommentAction`             | High     |
| `ChangeColorAction`               | commentActions.ts:61  | `UpdateCommentColorAction`        | Medium   |
| `LazyChangeDataAction`            | commentActions.ts:139 | `UpdateCommentDataAction`         | High     |
| `LazyChangePositionAction`        | commentActions.ts:175 | `UpdateCommentPositionAction`     | Medium   |
| `LazyChangeSizeAction`            | commentActions.ts:186 | `UpdateCommentSizeAction`         | Medium   |
| `RemoveAllFreehandCommentsAction` | commentActions.ts:229 | `RemoveAllFreehandCommentsAction` | Low      |

#### No Backend Equivalent Needed (⚠️ UI-only actions):

| Frontend Action               | Frontend File          | Reason                                                                                                                                                                                   |
| ----------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UpdateStepAction`            | stepActions.ts:167     | Generic step update; serializer inspects changed keys to emit specific backend actions (e.g. position → `UpdateStepPositionAction`). Connection changes do NOT flow through this action. |
| `SetDataAction`               | stepActions.ts:229     | Subclass of `UpdateStepAction` for tool form diffs. Connection changes do NOT flow through this action.                                                                                  |
| `CopyStepAction`              | stepActions.ts:348     | Combination of AddStep + copy data                                                                                                                                                       |
| `ToggleStepSelectedAction`    | stepActions.ts:383     | UI state only                                                                                                                                                                            |
| `AutoLayoutAction`            | stepActions.ts:424     | Results in position updates                                                                                                                                                              |
| `ClearSelectionAction`        | workflowActions.ts:287 | UI state only                                                                                                                                                                            |
| `AddToSelectionAction`        | workflowActions.ts:344 | UI state only                                                                                                                                                                            |
| `RemoveFromSelectionAction`   | workflowActions.ts:353 | UI state only                                                                                                                                                                            |
| `DuplicateSelectionAction`    | workflowActions.ts:362 | Combination of multiple adds                                                                                                                                                             |
| `DeleteSelectionAction`       | workflowActions.ts:390 | Combination of multiple removes                                                                                                                                                          |
| `ToggleCommentSelectedAction` | commentActions.ts:197  | UI state only                                                                                                                                                                            |
| `CopyIntoWorkflowAction`      | workflowActions.ts:115 | Combination of multiple adds                                                                                                                                                             |
| `LazyMoveMultipleAction`      | workflowActions.ts:184 | Results in multiple position updates                                                                                                                                                     |

#### Connection Handling: ✅ COMPLETE (Iteration 5)

- **Frontend**: Connection changes use dedicated typed action classes in `connectionActions.ts` (replaced anonymous `FactoryAction` instances):
  - `ConnectStepAction` — stores `connection: Connection` for serialization, delegates run/undo to Terminal callbacks
  - `DisconnectStepAction` — same pattern, reverse direction
  - Used via `terminals.ts` `connect()`/`disconnect()` methods
  - When steps are removed/undone, `RemoveStepAction` saves and restores connections separately.
- **Backend**: `ConnectAction` and `DisconnectAction` **already exist and are fully implemented** in `refactor/schema.py` (lines 125-134) and `refactor/execute.py` (lines 167-197). They take `input` (step ref + input_name) and `output` (step ref + output_name) references.
- **Serialization**: `instanceof ConnectStepAction`/`DisconnectStepAction` dispatches to `serializeConnect`/`serializeDisconnect` in `refactorSerialization.ts`

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
  1. Tool state updates (complex, can be added later)
  2. ~~Explicit connection actions~~ — use existing `ConnectAction`/`DisconnectAction` from the start; only frontend work is creating typed action classes in `terminals.ts` (belongs in Core Scope)
  3. Action compaction and optimization

### Deliverables for Iteration 1:

- `FRONTEND_BACKEND_ACTION_MAPPING.md` - Complete action inventory, mapping, and all specifications (RemoveStep spec in Section 4, comment persistence in Section 7, position handling in Section 5, step reference strategy in Section 6)
- Clear decision on Phase 1 scope
- Research findings documented for position_absolute and step reference strategy

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
  8. **Tolerate order_index gaps** — do NOT re-index remaining steps. Subsequent in-batch operations use `order_index` or `label` refs, which remain valid in a sparse dict. Re-indexing would break any in-batch references by order_index.
  9. **Fix `add_step` index assignment** — `_apply_add_step` must use `max(steps.keys(), default=-1) + 1` instead of `len(steps)`. Otherwise `remove_step` + `add_step` in the same batch can collide (e.g. remove step 1 from {0,1,2} → `len=2` → new step overwrites step 2). This also aligns the backend with the frontend, which uses `max(ids) + 1`.
- **Tests** (`test/unit/workflow/refactor/test_remove_step.py`):
  1. Test removing unconnected step
  2. Test removing step with one connection
  3. Test removing step with multiple connections
  4. Test removing step with workflow outputs
  5. Test execution messages are correct
  6. Test referencing by label
  7. Test referencing by order_index
  8. Test error: step not found
  9. Test `remove_step` then `add_step` in same batch — no key collision

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

### Step 2.5: Improve step reference resolution robustness ✅ COMPLETE

Improve `_find_step` to use explicit `isinstance` checks and support sparse step dicts (gaps left by `RemoveStepAction`).

- **File**: `lib/galaxy/workflow/refactor/execute.py`
- **Changes to `_find_step`**:
  1. Use explicit `isinstance` checks for `StepReferenceByLabel` and `StepReferenceByOrderIndex` (was implicit `else` branch)
  2. Raise `RequestParameterInvalidException` for unknown reference types
  3. Use `order_index not in self._as_dict["steps"]` instead of `len(steps) <= order_index` (supports sparse dicts after step removal)
  4. Use `step.get("label")` instead of `step["label"]` (steps may lack labels)
- **Note**: `StepReferenceById` was intentionally NOT added — the refactoring API is a stateless document transformation. Steps are referenced by `order_index` (which equals `"id"` in GA JSON) or `label`. See "Important Notes" at top of plan.

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
- Robust `_find_step` with explicit `isinstance` checks and sparse dict support
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

     type UpdateStepLabelAction =
       components["schemas"]["UpdateStepLabelAction"];
     type UpdateStepPositionAction =
       components["schemas"]["UpdateStepPositionAction"];
     type UpdateOutputLabelAction =
       components["schemas"]["UpdateOutputLabelAction"];
     type AddStepAction = components["schemas"]["AddStepAction"];
     type RemoveStepAction = components["schemas"]["RemoveStepAction"]; // Will add in Iteration 2
     type UpdateNameAction = components["schemas"]["UpdateNameAction"];
     type UpdateAnnotationAction =
       components["schemas"]["UpdateAnnotationAction"];
     type UpdateLicenseAction = components["schemas"]["UpdateLicenseAction"];
     // ... etc for all action types

     type RefactorAction =
       components["schemas"]["RefactorRequest"]["actions"][number];
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
       context: SerializationContext,
     ): SerializationResult;
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

## Iteration 5 — Connection Serialization + Action Coverage Gaps ✅ COMPLETE

Replace anonymous `FactoryAction` connect/disconnect in `terminals.ts` with dedicated action classes, add their serializers, and close remaining serialization coverage gaps.

**Status**: Complete. 2 commits, all tests passing.

**Commits**:

- `55404dc7f1` — Replace FactoryAction connect/disconnect with dedicated action classes.
- `1dfeb52e74` — Add connect/disconnect/report serializers and tests.

### Step 5.1: Create ConnectStepAction and DisconnectStepAction ✅

- **File**: `client/src/components/Workflow/Editor/Actions/connectionActions.ts` (new)
- Two action classes that store `connection: Connection` as a readonly property for serialization
- Delegate actual run/undo to callbacks from the Terminal layer (preserves Terminal's `resetMappingIfNeeded` cascade)
- `ConnectStepAction`: run = connect, undo = disconnect
- `DisconnectStepAction`: run = disconnect, undo = reconnect

**Key decision**: Callback pattern over reimplementing store operations. `BaseInputTerminal.resetMapping()` has complex cascade logic (propagates resets to connected output steps via `terminalFactory`) that can't be safely replicated outside the Terminal class.

### Step 5.2: Update terminals.ts ✅

- **File**: `client/src/components/Workflow/Editor/modules/terminals.ts`
- `Terminal.connect()` and `Terminal.disconnect()` now create `ConnectStepAction`/`DisconnectStepAction` with closures to `makeConnection`/`dropConnection`
- `makeConnection`/`dropConnection` unchanged — used by the callbacks

### Step 5.3: Add Connection Serializers ✅

- **File**: `client/src/components/Workflow/Editor/Actions/refactorSerialization.ts`
- `serializeConnect()`: maps `connection.input.stepId/name` → `order_index/input_name`, `connection.output.stepId/name` → `order_index/output_name`
- `serializeDisconnect()`: same structure, `action_type: "disconnect"`
- Added dispatcher entries via `instanceof ConnectStepAction` / `instanceof DisconnectStepAction`

### Step 5.4: Add update_report Serializer ✅

- **File**: `client/src/components/Workflow/Editor/Actions/refactorSerialization.ts`
- Added `case "readme"` to `serializeWorkflowMetadata` → `{ action_type: "update_report", report: { markdown: value } }`
- Maps to backend `UpdateReportAction` in `refactor/schema.py`

### Step 5.5: Tests ✅

- **File**: `client/src/components/Workflow/Editor/Actions/refactorSerialization.test.ts`
- Added "Connection Actions" describe block (connect + disconnect serialization)
- Added "Workflow Report" describe block (readme/report serialization)
- All 26 serialization tests pass, 193/194 broader editor tests pass (1 pre-existing timeout)

### Serialization Coverage After Iteration 5

| Category                                              | Before    | After     |
| ----------------------------------------------------- | --------- | --------- |
| Steps (add, remove, label, output label, position)    | 5/5       | 5/5       |
| Comments (all 7 types)                                | 7/7       | 7/7       |
| Connections (connect, disconnect)                     | **0/2**   | **2/2**   |
| Metadata (name, annotation, license, creator, report) | 4/5       | **5/5**   |
| Move multiple                                         | 1/1       | 1/1       |
| **Total serializable**                                | **17/20** | **20/20** |

Remaining unserialized actions are UI-only (selection, clear) or macro actions (copy-into, duplicate-selection, delete-selection, auto-layout) that decompose into serializable primitives.

---

## Iteration 5a — Close Serialization Gaps + Refactor-as-Save ✅ COMPLETE

Close all remaining serialization gaps (CopyStep, CopyIntoWorkflow, AutoLayout, readme/report split), fix ID mismatches and async timing, verify data shape fidelity.

**Status**: All 25 editor action types serialize. Refactor API is primary save mechanism when persistence enabled. All data shape questions resolved. See `REFACTOR_AS_SAVE_PLAN.md` for full details.

**Commits**:

- `9c4bd876a4` — Close remaining serialization gaps: readme/report split, CopyStep, CopyIntoWorkflow, AutoLayout
- `4eef402a3b` — Polish: type annotation, DRY step-to-payload helper, document frame comment limitation
- `61b4271b02` — Fix add_step integer IDs, defer async action serialization
- `d6fc7fcf6c` — Include content_id in InsertStepAction serialization

**What was done**:

- **Backend**: `UpdateReadmeAction` (separate from report). Extended `AddStepAction` with `annotation`, `post_job_actions`, `workflow_outputs`, `when`, `content_id`, `input_connections`. Fixed `_apply_add_step` to use integer `order_index` as ID (was string `"new_N"`).
- **Frontend serialization**: 4 new serializers (CopyStep, CopyIntoWorkflow, AutoLayout, readme). DRY `stepToAddStepPayload` helper. `InsertStepAction` now includes `content_id`.
- **Async deferral**: `applyAction` detects async `run()` (e.g. AutoLayout ELK), defers `trySerialize` until resolution. Tracks `asyncSerializationsInFlight` counter. `saveViaRefactor` waits for counter (5s timeout).
- **Data shape verification**: `tool_state` (dict vs string — safe), `post_job_actions` (exact match), `workflow_outputs` (exact match), `from_tool_form` flag (functionally equivalent), `InsertStepAction` fidelity (fixed via `content_id`).
- **Tests**: 70 backend, 16 undoRedoStore, 51 serialization — all passing.

**Outstanding**: `TIMEOUT_SAFETY_PLAN.md` — async timeout safety net (force fallback if timeout fires while still in-flight) + async-aware `redo()`.

---

## Iteration 6 — Frontend integration (opt-in behind feature flag) — MOSTLY COMPLETE

Wire up the serializer to the undo/redo store and create UI for changelog viewing. This is behind a feature flag for gradual rollout.

**Core functionality complete** (Steps 6.1-6.7, 6.4a). Remaining: timeout safety (6.4b), unsaved indicator (6.9), E2E tests (6.10), admin UI (6.11), docs (6.12).

**Steps 6.1-6.4 (Iteration 6a) ✅ COMPLETE** — feature flag, API functions, undo/redo store integration, batch-on-save wiring, report markdown action coverage. 64 tests passing.

**Steps 6.4a (Refactor-as-Save) ✅ COMPLETE** — All 25 action types serialize. Refactor API is sole save path when persistence enabled. Raw PUT fallback only. See `REFACTOR_AS_SAVE_PLAN.md`.

**Steps 6.5-6.7 (Changelog UI) ✅ COMPLETE** — Commit `8ef83ad177`. ChangelogPanel component, editor integration, revert handler, 12 unit tests. See `CHANGELOG_UI_PLAN.md`.

### Step 6.1: Add feature flag configuration ✅

- **Files**: `lib/galaxy/config/schemas/config_schema.yml`, `lib/galaxy/managers/configuration.py`
- **Setting**: `enable_workflow_action_persistence` (bool, default false)
- Exposed via `_use_config` pattern → frontend reads via `useConfigStore().config?.enable_workflow_action_persistence`

### Step 6.2: API functions ✅

- **File**: `client/src/api/workflows.ts`
- Updated `refactor()` with optional `title` and `sourceActionType` params (backward-compatible)
- Added `getChangelog(workflowId, limit, offset)` — pagination via `Total_matches` header
- Added `revertWorkflow(workflowId, targetWorkflowId)` — POST to revert endpoint
- Added `ChangelogEntry` type export from generated schema
- No separate service class — functions added directly to existing `workflows.ts` module

### Step 6.3: Integrate serializer with undo/redo store (batch-on-save) ✅

- **File**: `client/src/stores/undoRedoStore/index.ts`
- Added `PendingAction` interface (pairs `actionId` with `SerializationResult`)
- Added `pendingActions`, `hasPendingActions`, `persistenceEnabled` state
- `applyAction()`: eagerly serializes via `trySerialize()` and queues when persistence enabled
- `undo()`: removes matching entry from `pendingActions` by `actionId`
- `redo()`: re-serializes and re-adds to `pendingActions`
- `flushPendingActions()`: returns and clears — used by save flow
- `$reset()`: clears `pendingActions`
- **Circular dependency fix**: action classes (`commentActions.ts`, `connectionActions.ts`, `stepActions.ts`, `workflowActions.ts`) now import `UndoRedoAction`/`LazyUndoRedoAction` from `@/stores/undoRedoStore/undoRedoAction` directly instead of barrel, breaking the cycle: store → serializer → action classes → store.
- **Tests**: 8 new tests in `client/src/stores/undoRedoStore/undoRedoStore.test.ts`

### Step 6.4: Implement batch submission on save ✅

- **File**: `client/src/components/Workflow/Editor/Index.vue`
- `onSave()` now calls `flushLazyAction()` before save, `submitPendingActions()` after
- `submitPendingActions()`: flattens all pending serializations into single array, builds batch title via `buildBatchTitle()`, calls `refactor()` with `source_action_type: "editor_save"`. Non-fatal — persistence failure shows warning toast, workflow save still succeeds.
- `buildBatchTitle()` added to `refactorSerialization.ts`: joins titles with "; ", collapses adjacent duplicates, truncates at 200 chars. 5 tests.
- **Report markdown gap closed**: `onReportUpdate()` now uses `SetValueActionHandler` with `what: "readme"` (serializes to `update_report`), making report edits undoable and serializable.

### Step 6.4a: Refactor API as primary save mechanism ✅ COMPLETE

Refactor API is now the sole save path when persistence enabled. Raw PUT is fallback only.

- All 25 action types serialize (Iteration 5a, 4 phases in `REFACTOR_AS_SAVE_PLAN.md`)
- `saveViaRefactor()` uses refactor API when `allSerialized && pending.length > 0`
- Falls back to raw PUT when any action fails serialization or no tracked changes
- `content_id` included in `InsertStepAction` serialization
- Async actions (AutoLayout) deferred until resolved before serializing
- Data shape fidelity verified: `tool_state`, `post_job_actions`, `workflow_outputs`, `from_tool_form` all safe
- Backend: `UpdateReadmeAction` (separate from report), extended `AddStepAction` with 6 optional fields, integer `order_index` IDs in `_apply_add_step`
- Frontend: 4 new serializers (CopyStep, CopyIntoWorkflow, AutoLayout, readme), DRY `stepToAddStepPayload` helper
- Tests: 70 backend, 16 undoRedoStore, 51 serialization — all passing

See `REFACTOR_AS_SAVE_PLAN.md` for full details (Phases 1-4, all ✅ COMPLETE).

### Step 6.4b: Timeout safety + async-aware redo

**Plan**: `TIMEOUT_SAFETY_PLAN.md`

**Problem**: `saveViaRefactor` waits up to 5s for async serializations. If timeout fires while still in-flight, code proceeds with `allActionsSerialized` potentially true but missing the async action — partial refactor-save. Also: store `redo()` has no async detection (safe today since AutoLayout overrides redo synchronously, but latent bug for future async actions).

**Fixes**:

1. After `Promise.race`, check `asyncSerializationsInFlight > 0` → force `allActionsSerialized = false` (triggers raw-save fallback)
2. Clean up orphaned `watch` by hoisting `unwatch` and calling after race
3. Mirror `applyAction`'s async detection in `redo()`
4. Update `UndoRedoAction.redo()` return type to `void | Promise<void>`

**Tests**: 1 new test for async redo deferral.

**Files**: `Index.vue`, `undoRedoStore/index.ts`, `undoRedoAction.ts`, `undoRedoStore.test.ts`

### Step 6.5: Create changelog panel component ✅

- **File**: `client/src/components/Workflow/Editor/ChangelogPanel.vue` (new)
- `<script setup lang="ts">` component with `workflowId` prop
- Fetches paginated changelog via `getChangelog()`, "Load more" pagination
- Entry display: title, `UtcDate` elapsed timestamp, revert badge, revert button
- Error handling via `errorMessageAsString()`, loading via `LoadingSpan`
- `defineExpose({ refresh })` for parent to trigger refresh after save/revert
- **Deviations**: Refresh button uses text "Refresh" (not `faSync` icon). `execution_messages` display deferred for v1. User display skipped for v1.

### Step 6.6: Add changelog panel to workflow editor ✅

- **Files**: `activities.ts`, `Index.vue`
- Added `workflow-editor-changelog` activity with `faListUl` icon (not `faClockRotateLeft` — unavailable in FA5)
- `workflowActivities` computed filters changelog visibility on `undoRedoStore.persistenceEnabled`
- `changelogPanel` ref in setup, `changelogPanel?.refresh?.()` after save
- Registered `ChangelogPanel` in `components: {}` hash

### Step 6.7: Implement revert functionality ✅

- **File**: `client/src/components/Workflow/Editor/Index.vue` — `onRevertToEntry(entry)` method
- Unsaved changes guard with `useConfirmDialog()` → save before revert
- Revert confirmation dialog
- `revertWorkflow(id, entry.workflow_id_before)` API call — "revert to before this" semantics
- Editor reload: `resetStores()` + `fromSimple()` + `_loadEditorData()`
- Versions list + changelog panel refresh
- `fitWorkflow()` after revert (user jumps to potentially different workflow state)
- Error handling via `errorMessageAsString`, Toast success notification
- **Deviation**: No separate `revertActions.ts` — handler lives directly in `Index.vue` (simpler, follows existing patterns)

### Step 6.5-6.7 Tests ✅

- **File**: `client/src/components/Workflow/Editor/ChangelogPanel.test.ts` — 12 unit tests
- Loading state, empty state, entry rendering, timestamps, revert emit, pagination (show/hide/append), refresh replaces, error state, revert badge (show/hide for is_revert)

### Step 6.8: Handle persistence errors gracefully — MOSTLY DONE

Warning toast on persistence failure already exists (Step 6.4). Remaining:

- Verify edge cases (network timeout, validation error, 500)
- Confirm pending actions are preserved on failure for retry

### Step 6.9: Add unsaved-changes indicator

- **File**: `client/src/components/Workflow/Editor/UnsavedIndicator.vue`
- **States**:
  - No pending actions: nothing shown
  - Has pending actions: show count badge near save button (e.g. "3 unsaved changes")
  - Save in progress: show spinner
  - Save failed: show error indicator with retry
- **Location**: Top toolbar near save button

### Step 6.10: E2E tests for persistence

See `E2E_PERSISTENCE_TEST_PLAN.md` for full test plan (19 tests across 4 categories):

- **Changelog panel**: entry after save, multiple entries, empty state, revert, revert badge
- **Action roundtrips**: label, add/remove step, name/annotation, connection, comment, license, auto-layout
- **Refactor-as-save**: single version per save, batch title
- **Undo/redo across saves** (Phase A prerequisite): undo survives save, undo/redo across multiple saves, full cycle across save boundary

### Deliverables for Iteration 6 — Status:

- ✅ Feature flag configuration (`enable_workflow_action_persistence`)
- ✅ API functions (`refactor()` with title/sourceActionType, `getChangelog()`, `revertWorkflow()`, `ChangelogEntry` type)
- ✅ Batch-on-save integration with undo/redo store (`PendingAction`, `flushPendingActions`, `allActionsSerialized`)
- ✅ Refactor-as-save: refactor API is sole save when all serialized, raw PUT fallback
- ✅ Changelog panel component (`ChangelogPanel.vue`, 12 unit tests)
- ✅ Revert functionality (`onRevertToEntry` in `Index.vue`)
- ⬜ Unsaved-changes indicator (Step 6.9 — not yet implemented)
- ⬜ E2E tests for persistence (Step 6.10 — see `E2E_PERSISTENCE_TEST_PLAN.md`)
- ⬜ Timeout safety + async-aware redo (Step 6.4b — planned in `TIMEOUT_SAFETY_PLAN.md`)

### Acceptance Criteria for Iteration 6 — Partial:

- ✅ Feature flag works (can enable/disable)
- ✅ Actions accumulate locally and are batched on save
- ✅ Single save = single API call = single changelog entry
- ✅ Changelog panel shows action history
- ✅ Revert functionality works correctly
- ✅ Error handling: persistence failure → warning toast, save still succeeds
- ⬜ E2E tests pass
- ✅ No disruption to existing workflow editor when flag disabled
- ✅ Performance is acceptable (save adds minimal overhead)

---

## Iteration 7 — Persistent Undo/Redo

Roadmap from "changelog revert" to "persistent undo/redo across sessions". The journal already stores full `action_payloads` per save — the data foundation exists.

### Phase A: Undo/Redo Survives Saves (Within Session)

**Problem**: `saveViaRefactor()` → `_loadCurrent()` → `resetStores()` → clears undo stack. Every save wipes undo history even though the stores already have correct state.

**Fix**: On the refactor-as-save happy path (all serialized, no fallback), skip `_loadCurrent()`/`resetStores()`. Instead:

1. Update `stateStore.version` from refactor response
2. Refresh versions list
3. Refresh changelog panel
4. Clear `hasChanges` flag
5. Do NOT reset step/comment/connection/undoRedo stores

**Files**: `Index.vue` (`saveViaRefactor` method)

**Tests**: 3 E2E tests from `E2E_PERSISTENCE_TEST_PLAN.md` (undo survives save, undo/redo across multiple saves, full cycle across save boundary)

**Risk**: After refactor-as-save, the server's workflow version and the client's in-memory state could drift. Mitigate by verifying the refactor response's workflow dict matches expectations (or at minimum, trusting that the refactor API applied the same actions the client already applied locally).

### Phase B: Save-Point Undo Across Sessions

**Concept**: On workflow open, populate the undo stack with `SavePointAction` wrappers backed by journal entries. Ctrl+Z past current session's changes undoes one whole save batch — effectively a revert integrated into the undo/redo UX.

**How it works**:

1. New API endpoint: `GET /api/workflows/{id}/journal_entries?limit=N` — returns entries with `action_payloads` (the changelog API currently omits payloads)
2. On workflow open (when persistence enabled), fetch last N journal entries
3. For each entry, create a `SavePointAction` and push onto `undoActionStack`:
   ```
   SavePointAction {
     journalEntry: JournalEntry
     undo() → revertWorkflow(id, entry.workflow_id_before) + reload editor
     redo() → re-apply entry.action_payloads via refactor API + reload editor
   }
   ```
4. User sees: current session actions at top of undo stack, then save-point boundaries from previous sessions below
5. Ctrl+Z through current session actions works normally (Phase A)
6. Ctrl+Z past the session boundary → triggers SavePointAction.undo() → revert + reload

**UX considerations**:

- Visual separator in undo history between "current session" and "previous saves"
- Save-point undo is heavier (API call + reload) vs instant local undo — show loading indicator
- Confirm dialog before undoing past session boundary? (destructive — loses current in-memory state)

**Files**:

- Backend: new API endpoint (or extend changelog to include payloads optionally)
- Frontend: `SavePointAction` class, `undoRedoStore` initialization logic, `Index.vue` load flow
- Tests: E2E test for undo across session boundary

### Phase C: Action-Level Undo Across Sessions (Future / Optional)

**Concept**: Deserialize individual refactor actions from journal payloads back into `UndoRedoAction` objects. Every single action from previous sessions individually undoable via Ctrl+Z.

**Why this is hard**:

- Action constructors take store refs, callbacks, closures (e.g. `ConnectStepAction` needs Terminal `connectFn`/`disconnectFn`)
- `LazySetLabelAction` has toast side-effects, markdown replacement side-effects
- `AutoLayoutAction` stores async-computed positions
- Reconstructing requires active store instances matching the workflow state at that point in history

**Approach (if pursued)**:

1. Build a `deserializeAction(payload: RefactorAction, stores: StoreRefs)` function — inverse of `serializeAction()`
2. For each refactor action type, create a lightweight `ReplayAction` wrapper:
   - `undo()` = apply inverse via refactor API (e.g. `update_step_label` → restore `fromValue`)
   - `redo()` = re-apply via refactor API
   - No closures needed — the refactor API is the execution mechanism
3. Store `fromValue` alongside `toValue` in journal payloads (currently only `toValue` is stored for most actions — would need schema extension)
4. Handle composite actions (CopyIntoWorkflow = multiple add_steps) as atomic groups

**Missing data**: The journal stores the "forward" action (toValue) but NOT the "inverse" (fromValue). To undo individual actions, we'd need either:

- Store before/after values per action in the journal (schema change)
- OR compute inverses from `workflow_id_before` diff (expensive)
- OR fetch the previous workflow version and diff (already available via `workflow_id_before`)

**Recommendation**: Phase C is high-effort, moderate-value. Phase B (save-point granularity) covers 90% of the use case. Phase C only needed if users demand individual action undo across sessions.

---

## Remaining Steps Summary

### Immediate (Iteration 6 completion)

1. ✅ Steps 6.1-6.7 — done
2. ⬜ Step 6.4b — timeout safety (`TIMEOUT_SAFETY_PLAN.md`)
3. ⬜ Step 6.8 — error handling polish (mostly done, verify edge cases)
4. ⬜ Step 6.9 — unsaved changes indicator badge

### Next: E2E Tests

5. ⬜ E2E persistence tests — `E2E_PERSISTENCE_TEST_PLAN.md` (19 tests across 4 categories)
   - Changelog panel tests (entry after save, multiple entries, empty state, revert, revert badge)
   - Action roundtrip tests (label, add/remove step, name/annotation, connection, comment, license, auto-layout)
   - Refactor-as-save tests (single version per save, batch title)

### Persistent Undo/Redo Roadmap

6. ⬜ Phase A — undo/redo survives saves within session
7. ⬜ Phase B — save-point undo across sessions
8. ⬜ Phase C — action-level undo across sessions (future/optional)

### Future: Production Hardening

- Journal retention policy + cleanup command
- Telemetry/monitoring (action counts, success rates, latency)
- DB query optimization + indices
- Per-user access controls
- Gradual rollout (percentage-based flag)

---

## Action mapping details (initial)

Frontend → Backend

- `LazySetLabelAction` → `UpdateStepLabelAction` (step: by label or order_index)
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
- `ConnectStepAction` in `connectionActions.ts` → `ConnectAction` (input: step ref + input_name, output: step ref + output_name) ✅ Done in Iteration 5
- `DisconnectStepAction` in `connectionActions.ts` → `DisconnectAction` (same reference format) ✅ Done in Iteration 5

---

## Concrete file touchpoints

Client (✅ = done, ⬜ = not yet)

- ✅ `client/src/components/Workflow/Editor/Index.vue` — `what` on all `SetValueActionHandler`s, `saveViaRefactor`/`saveViaRawPut` branching, `onRevertToEntry`, changelog refresh after save
- ✅ `client/src/components/Workflow/Editor/Actions/refactorSerialization.ts` — serializer for all 25 action types + `buildBatchTitle()`
- ✅ `client/src/components/Workflow/Editor/Actions/refactorSerialization.test.ts` — 51 tests
- ✅ `client/src/components/Workflow/Editor/Actions/connectionActions.ts` — `ConnectStepAction`, `DisconnectStepAction`
- ✅ `client/src/stores/undoRedoStore/index.ts` — `PendingAction`, `flushPendingActions`, `allActionsSerialized`, `asyncSerializationsInFlight`
- ✅ `client/src/stores/undoRedoStore/undoRedoStore.test.ts` — 16 tests
- ✅ `client/src/api/workflows.ts` — `refactor()` with title/sourceActionType, `getChangelog()`, `revertWorkflow()`, `ChangelogEntry`
- ✅ `client/src/components/Workflow/Editor/ChangelogPanel.vue` — changelog sidebar panel
- ✅ `client/src/components/Workflow/Editor/ChangelogPanel.test.ts` — 12 tests
- ✅ `client/src/components/Workflow/Editor/modules/activities.ts` — `workflow-editor-changelog` activity
- ⬜ `client/src/components/Workflow/Editor/UnsavedIndicator.vue` — planned Step 6.9

Server

- Schema additions: `lib/galaxy/workflow/refactor/schema.py` (remove step, absolute position, `Size` model, comment actions, optional `title`/`source_action_type` on `RefactorActions`)
- Executor: `lib/galaxy/workflow/refactor/execute.py` (remove step, absolute position handling, comment actions, explicit `isinstance` checks + sparse dict support in `_find_step`)
- Journal model: `lib/galaxy/model/__init__.py` (`WorkflowActionJournalEntry`)
- Journal manager: `lib/galaxy/managers/workflow_action_journal_manager.py` (thin CRUD)
- DI registration: `lib/galaxy/app.py` (`_register_singleton(WorkflowActionJournalManager)`)
- Transaction wiring: `lib/galaxy/managers/workflows.py` (`defer_commit` flag in `update_workflow_from_raw_description`, journal write in `do_refactor`)
- Service wiring: `lib/galaxy/webapps/galaxy/services/workflows.py` (inject `WorkflowActionJournalManager`)
- API: `lib/galaxy/webapps/galaxy/api/workflows.py` (extended PUT /refactor, new GET /changelog, new POST /revert)
- Migration: `lib/galaxy/model/migrations/` (new `workflow_action_journal_entry` table)

---

## Risk management

- Step reference drift: mitigate by preferring labels (stable across batch ops); fall back to order_index. No database IDs — the refactoring API is a stateless document transformation.
- Position mismatches: use absolute positions exclusively; `position_shift` retained for backward compat only.
- Comment identity: `CommentReference.comment_id` matches the comment's `"id"` field (stable `order_index`-based identifier). Deletion does not renumber remaining IDs, so batch operations are safe. See Step 2.7 batch safety note.
- Redo after divergence: disable or prompt; document behavior.
- Concurrent editing: deferred to future iteration. No optimistic locking in initial implementation.

---

## Test strategy

- Frontend unit tests:
  - `refactorSerialization.test.ts` — 51 tests covering all 25 action types, batch title building
  - `undoRedoStore.test.ts` — 16 tests covering pending actions, flush, allActionsSerialized, async deferral
  - `ChangelogPanel.test.ts` — 12 tests covering UI states, pagination, revert emit, error handling
- Backend unit tests: `test_refactor_actions.py` — 70 tests covering all refactor action types including extended `add_step`, `update_readme`, integer IDs
- Backend integration tests: journal append/list, revert, atomic transaction (journal + version), `defer_commit` behavior
- E2E (⬜ not yet): see `E2E_PERSISTENCE_TEST_PLAN.md` — 19 tests across changelog, action roundtrips, refactor-as-save, undo/redo across saves

---

## Resolved questions

1. ~~Extend existing PUT /refactor or create separate endpoint?~~ → **Extend PUT /refactor** with optional `title`/`source_action_type` fields
2. ~~Store Workflow.id (DB PK) or positional version index in journal?~~ → **Workflow.id (DB PK)** — stable across reverts
3. ~~Should journal FK point to stored_workflow or workflow?~~ → **stored_workflow** — journal tracks the logical workflow container
4. ~~How to route LazySetValueAction serialization when what is null?~~ → **Add `what` to all handlers** — 6 one-line changes in Index.vue
5. ~~Re-index steps after removal or tolerate gaps?~~ → **Tolerate gaps** — `order_index`/`label` refs work fine with sparse step dicts. Fixed `add_step` to use `max(keys)+1` to avoid collision.
6. ~~Default mode: persist immediately per action, or batch on save?~~ → **Batch on save** — fewer versions, simpler error handling
7. Shared-with users: can they create journal entries, or owner-only? → **Open** — depends on Galaxy's access model (currently ownership-only for writes)
8. ~~Use database step IDs in refactoring schema?~~ → **No** — the refactoring API is a stateless document transformation. `order_index`/`label` only. See "Step References — No Database IDs by Design" in research notes.

## Unresolved questions

1. ~~Batch-on-save: add_step + connect ID prediction~~ → **Partially resolved**. `CopyIntoWorkflow` uses `input_connections` on `add_step` with remapped IDs (avoids separate `connect` actions). `InsertStepAction` + later `ConnectStepAction` in same save batch: the `ConnectStepAction` serializer uses the step's `order_index` from the store (already assigned by frontend). Backend `_apply_add_step` uses integer `order_index = max(keys)+1` which matches frontend assignment. Works in practice; edge cases with concurrent step removal untested.
2. `_iterate_over_step_pairs` (execute.py) assumes contiguous indices — needs fixing when `fill_defaults`/`extract_untyped_parameter` serialization is added.
3. Shared-with users: can they create journal entries, or owner-only?
4. ~~Refactor-as-save: 100% action coverage~~ → **Resolved** (Iteration 5a). All 25 action types serialize. `saveViaRefactor` uses refactor API as sole save when all serialized. See `REFACTOR_AS_SAVE_PLAN.md`.
5. Timeout safety: `TIMEOUT_SAFETY_PLAN.md` — async timeout can leave `allActionsSerialized` incorrectly true. Planned fix in Step 6.4b.
6. Frame comment `child_steps`/`child_comments` — not remapped in `CopyIntoWorkflow` serialization. Documented limitation, low impact (frame containment is cosmetic).
7. **Phase A state drift**: after skipping `_loadCurrent()`, how to handle version number? Extract from refactor response?
8. **Phase B undo stack size**: how many journal entries to pre-populate? Suggest configurable, default 10-20 save points.
9. **Phase B + Phase A interaction**: if undo stack survives saves (A) AND we pre-populate from journal (B), what happens on save? Collapse current session actions into single save-point entry?
10. **Phase C inverse data**: storing fromValue in journal doubles payload size. Worth it? Or rely on version-level revert?
