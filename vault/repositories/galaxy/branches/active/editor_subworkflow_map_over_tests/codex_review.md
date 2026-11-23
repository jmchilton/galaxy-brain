Run via gpt-6.2-sol.

**ADDRESSED.** One confirmed finding: the fixture's subworkflow collection input had a shape the server never sends, which hid a real editor bug. The other three were already fixed or not worth changing.

**Resolution (John, 2026-11-23): client fallback.** John chose to fix this in the client rather than the server. Emitting `collection_types` from `SubWorkflowModule.get_all_inputs` would also change scheduling, because `map_over.py:_declared_collection_input_types` prefers `collection_types` over the mapped-over `subworkflow_structure` fallback.
- The baseline commit `690f6bd8bcf` puts the fixture in the server's shape, with the singular `collection_type`. It squashes in the test-challenge commit `5c91578285f`. Its tests pass on the unfixed editor.
- The fix commit `d645ec0eeda` makes `terminalFactory` fall back to `collection_type` when `collection_types` is absent, and types both fields on `DataCollectionStepInput`.
- The fix commit also adds two tests: a `paired` collection is rejected on the `list` input, and a `list:list` maps every output over its outer list. Both fail without the fallback.

Codex's sandbox shell failed to start, so it reviewed the pushed commit `b8c7a93e57a` from GitHub rather than the local head `5c91578285f`. Findings 1 and 2 are about code that `5c91578285f` (test challenges) already replaced.

## Findings

1. **REFUTED (already fixed): the connection-order test checks output types for only one order.** It is true of `b8c7a93e57a`. In `5c91578285f`, an `it.each` runs both orders and checks both outputs' downstream map-over in each.
2. **REFUTED (already fixed): the tests call `connect` without `canAccept`, unlike `NodeInput.vue`.** It is true of `b8c7a93e57a`. In `5c91578285f`, the `connectList` helper asserts `canAccept` before connecting.
3. **CONFIRMED: the fixture gives subworkflow input `inner_collection` a `collection_types: ["list"]` field. The server sends `collection_type: "list"` instead.**
   - `SubWorkflowModule.get_all_inputs` (`lib/galaxy/workflow/modules.py`) sets the singular `collection_type` on a child `data_collection_input`. `_workflow_to_dict_editor` (`lib/galaxy/managers/workflows.py:1634`) passes it to the editor unchanged.
   - `terminalFactory` (`client/src/components/Workflow/Editor/modules/terminals.ts:1042`) and the `DataCollectionStepInput` type (`client/src/stores/workflowStepStore.ts`) read only `collection_types`. `InputCollectionTerminal` falls back to `any` when that is empty.
   - **Probe** (temporary, reverted): with step 37's input in the server's shape, the terminal's types are `["any"]`. `canAccept` of a `paired` collection is `true`, and connecting a `list:list` gives no map-over. With the fixture's shape, the same input is `list`-only.
   - So the branch's tests pin editor behavior through a payload the editor never receives for real subworkflow steps. The real editor treats a subworkflow's `list` input as accepting any collection. #23676's head `77807fafe07` emits the same singular field.
   - Codex also noted that `content_id` is the literal `"subworkflow"`, where the server sends the encoded child workflow ID. No terminal code reads it.
4. **NOT ADOPTED: both suites duplicate the populated advanced-fixture setup** (`canAccept` suite and the new suite). It is real duplication, but each copy is six lines and they are identical. Refactoring the existing suite's setup belongs in the baseline refactor step if anywhere.

## Coverage notes

Codex read `terminals.ts`, `collectionTypeDescription.ts`, `NodeInput.vue`, `NodeOutput.vue`/`.test.ts`, `test_fixtures.ts`, the step and connection stores, `modules.py`, `managers/workflows.py` and `model/__init__.py`. It did not run Vitest, and it reviewed `b8c7a93e57a`, not `5c91578285f`.
