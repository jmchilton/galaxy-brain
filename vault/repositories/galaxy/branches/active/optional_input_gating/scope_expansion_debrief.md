Generalized the orphaned-connection fix so any `when` change drops connections whose gate port disappears, via the `findStepExtraInputs` rule and the terminal drop path; red→green, all checks and 4/4 E2E green, force-pushed `0bd89181eb3` → `285142a093d`.

# optional_input_gating — scope expansion debrief (2026-10-27)

## Corrections to the scope evaluation

- **Stranded links weren't truly unremovable.** `Node.vue` renders any connection with no matching input as an invalid input terminal ("Disconnect this input"). The bug was a spurious invalid connection that got saved, not a link that couldn't be removed. Because of this, the drop rule is "ports the old `when` had that the new one lacks", not "anything without a terminal". The literal rule would also have silently deleted the user-visible invalid connections left by a tool upgrade. A test covers that negative case.
- **Action-layer plumbing.** `useStepActions` had no route to a terminal: it had neither a `stores` bundle nor a `workflowId`. It now takes `workflowId` as a 5th argument, following the precedent of actions that already take `workflowId` (`AutoLayoutAction`, `CopyIntoWorkflowAction`). This touches the `Index.vue` and `FormOutputLabel.vue` call sites. The datatypes mapper comes from the global `useDatatypesMapperStore`.
- **Verified claims.** Every other claim checked out:
  - The twin `when_present` step loads in presence mode on `probe` (a test now asserts it).
  - Only the form changes `when` through `updateStep`.
  - `connectWithPresenceGate` uses `updateStepValue`, so it is unaffected.

## Per commit

1. `208b8ffae50` Extract shared step output helpers. Unchanged.
2. `897badf1153` **Drop connections orphaned when a step's condition changes** (reworded from "Drop the orphaned `when` connection when a step condition is cleared").
   - `workflowStepStore.extraInputsRemovedBy(stepId, update)` diffs `getStepExtraInputs` against `findStepExtraInputs({...step, ...update})`. The rule isn't duplicated.
   - `UpdateStepConnectionsAction` now takes the stores bundle.
     - It prunes orphaned port keys from `toPartial.input_connections`, puts the original `input_connections` in `fromPartial`, and drops connections that the final `input_connections` doesn't list.
     - Each drop goes through `terminalFactory(...).dropConnection` (which calls `resetMappingIfNeeded`). It falls back to a raw `removeConnection` only when no port or mapper exists.
     - Undo re-adds the links, restores the step fields, and restores the `stepMapOver`/`stepInputMapOver` snapshot.
   - `useStepActions.updateStep` dispatches on `"when" in toPartial || "input_connections" in toPartial`.
   - `FormConditional.vue` is back to dev's version, since `withoutBooleanGateConnection` is gone.
3. `2e706fe8c97` Framework workflow tests. Unchanged; this is a cherry-pick.
4. `285142a093d` Feature.
   - `withoutBooleanGateConnection` is removed from `onMode` and `onPresenceInput`.
   - `extraInputsRemovedBy` passes `steps.value`, for the two-argument `findStepExtraInputs`.
   - Adds the FormConditional integration tests.

`UpdateStepConnectionsAction` stays a separate subclass. The twin dispatch, the evaluator, `presenceGateAssumed` and the permissive `unknown` policy are untouched.

## Red → green

Red runs, on the original code (`0bd89181eb3`, re-confirmed at `ad56e6175c8`). All five new `actions.test.ts` tests failed for the right reason:

| Test | Failure |
| --- | --- |
| boolean → none via `{when: undefined}` | `expected ['input1','when'] to equal ['input1']` |
| custom → none | `['flag','input1','other']` remained |
| narrowed custom | `other` kept |
| unknown-input control | red only because `when` wasn't dropped |
| map-over | `stepMapOver` stayed `list` |

FormConditional on the commit-4 code:

- Red: twin probe → none, boolean and `input1`; custom → presence; and the single-undo test (probe/flag link remained).
- The boolean → presence/none tests already passed, because the old form pruned the link itself.

Commit-2 FormConditional test: red on the old code because the emitted partial still carried `input_connections`. The store-side assertions already held there.

Green: all of the above pass.

Test changes, logged as required (each is stricter):

- The commit-2 FormConditional test now feeds emits into a real `updateStep` and checks the step and connection stores.
- The commit-4 test "drops the boolean gate's connection when switching to %s" now asserts on store state instead of on the emitted `input_connections`: the connection-store input names, plus key-set equality of the step's `input_connections` with the tool connections. The probe tests also check key sets; for boolean, that includes the placeholder `when` port.

## Tests run

- Commit 2:
  - vitest on `src/stores`, `src/components/Workflow/Editor` and `src/components/Form`: 1068 passed.
  - `vue-tsc --noEmit`: clean.
  - eslint: 0 errors (only the pre-existing `no-explicit-any` warnings).
  - prettier: clean.
- Final HEAD:
  - The same vitest set: 112 files, **1150 passed** (1140 + 10).
  - `vue-tsc`, eslint and prettier: clean.
- Commit 3 has the same client tree as commit 2 (fixtures only), so commit 2's client checks cover it.
- Framework workflows (`-k optional_input_gating -m workflow`): 4 passed.
- E2E, Playwright, headless, one at a time:
  - Setup: rebuilt the client (`pnpm run build`) and ran this worktree's Galaxy on port 8093, with a scratch E2E config.
  - Results: `test_editor_drop_optional_output_gates_step`, `test_editor_gate_step_on_optional_input`, `test_editor_create_conditional_step` and `test_editor_twin_dispatch_connections_valid` all passed.
  - Cleanup: Galaxy, gravity and celery were stopped by PID. `config/galaxy.yml` (gitignored) was restored, and the worktree is clean.

## Commits (origin/dev `a9a68082414`..)

- `208b8ffae50` Extract shared step output helpers in the workflow editor
- `897badf1153` Drop connections orphaned when a step's condition changes
- `2e706fe8c97` Add framework workflow tests for steps gated on optional input presence
- `285142a093d` Let workflow steps run only when an optional input is provided

## Left for John

- **`useStepActions` signature.** It now has a `workflowId` parameter that duplicates the four stores it already takes. A cleaner alternative is to pass the `useWorkflowStores` bundle instead. That's a wider signature change, so I didn't make it.
- **Fallback path.** If the datatypes mapper isn't loaded, the action removes connections without resetting map-over. That can't happen in the editor, because the graph renders only after the mapper loads.
- **`RemoveStepAction`.** It still drops connections without resetting map-over. That's pre-existing and out of scope.
- **`pr_description.md` is stale.** It should mention the generalized drop: custom and probe transitions, and the map-over reset. If commit 2 is split out for `release_26.2`, note that it now also changes `useStepActions`' signature (3 call sites).
- **SHAs recorded elsewhere are stale.** The branch record, the queue entry and any snapshot pinned to `0bd89181eb3` need updating to `285142a093d`. I didn't touch any galaxy-brain bookkeeping.
- **Still awaiting John:** the `unknown` policy.
