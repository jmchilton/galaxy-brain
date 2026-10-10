# Batch 28 review

Range `7abeb84114c..vitest_readability`. Four originator commits; each touches one test file; no production code; no process comments. A later `841d83bc78f` README fix landed while reviewing (outside this scope; checked quickly, both table rows are accurate: `ToolForm.test.ts` exists, and `EDITOR_STUBS` uses methods, not `expose`).

## 9320a3ee34e Improve readability of Editor/Index tests

Approved.

Mapping (30 → 30):
- default mount (17): resolves datatypes (adds an explicit flush, needed because `WorkflowGraph` is `v-if`-gated on the mapper), no changes after load, clone fresh id/uuid/workflow_outputs (steps via local `toolStep`, same field values), download URL + prefix, annotation/name/help/logoUrl trackers → one `it.each` (same events, same original/changed values, same three hasChanges checks each), readme tracker, readme closes except undo-redo, clears hasChanges after save, edits during save stay dirty, save-as name+annotation (incl. the negative `SavedAs_` check), save-as fields intact, save-as cancel resets, prevents navigation (+1 assertion: no `update:confirmation` before the change), error modal show/title/variant/not-stale-title/no flash/close.
- node inspector (2): superseded edits; queued edits per step. Every `toHaveBeenCalledTimes`/`LastCalledWith`/tool_state check kept. try/finally → `afterEach(useRealTimers)`.
- onNavigate (11): all kept with same assertions; `triggerOnNavigateToList` → `clickActivity(wrapper, "exit")`; positional `on-proceed` flags → `proceedFromSaveChangesModal`, mapping matches (`save` = true,false; `dontSave` = false,true).

Findings:
- Always-rendered `WorkflowGraph` slot is inert outside the inspector group. The slot holds only `<NodeInspector v-if="activeStep">`, and no default-mount or onNavigate case sets `activeNodeId` (`onClone` → `CopyStepAction.run` only adds the step and sets `hasChanges`; it doesn't activate it). `onChange` in the error-modal case doesn't either.
- Dropping `mockSaveWorkflow.mockClear()` in the temp-workflow case loses nothing: that case asserts `createWorkflowSpy`, `mockPush` and `mockFlashSavedIndicator`, never `saveWorkflow`, and the flash mock is still reset in `beforeEach`.
- `vi.resetAllMocks()` before mount vs `mockGetModule.mockReset()` after mount: this is safe. If mount called `getModule`, the kept `toHaveBeenCalledTimes(1)` would now fail. On vitest 4, `mockReset` restores the original `vi.fn(impl)`, and `vitest-fail-on-console` patches console by assignment rather than with a spy, so neither reset nor restore affects the global fail-on-console guard.
- Mount consolidation is behavior-equivalent. `workflowTags: []` was dropped from the nav path, but the prop defaults to `[]`. The explicit `{ ...localVue.stubs, ...EDITOR_STUBS }` matches what the adapter used to merge for top-level `stubs`.
- Non-blocking: the four `it.each` trackers, readme-close, the three save-as cases and prevents-navigation still run during the initial load. That load's `resetStores()` and its `finally { hasChanges = hasStateMessages }` clear `hasChanges` partway through. This was also true before the change (the commit only moves the boundary). The assertions stay live: hasChanges comes from value watchers, so a late `false` reset can only make a truthy check fail, never pass. The readme tracker has the same shape and flushes first ("wait for the initial load" was its original intent), so using `mountLoadedEditor()` for the four trackers would make them deterministic. Optional.
- Nits (optional): `WORKFLOW_ID` is introduced, but the download assertion still hard-codes `workflow_id`. The `window.location` override is never restored. That predates this commit, and no later case reads it.

## 27cc2970ca2 Improve readability of GAlert tests

Approved.

Mapping (8 → 8): self-dismiss (shown, hidden after click, one `dismissed`, `input`/`update:show` `[false]`); `value` before `show`; 2→1→0 countdown with visibility at each step and one `dismissed`; four variant role rows with no `aria-live`; role override. All values identical; `countdownValues`/`isShown` are plain projections of the old inline expressions. `enableAutoUnmount` adds cleanup that was missing. No findings.

## 56d3a97269a Improve readability of JobElements tests

Approved.

Mapping (6 → 6, 3 × 2 components): button exists + is popover target + interactive; localized accessible name; no button without tool. Selectors produced by `toolDetailsButton()` are byte-identical to the old literals. Manual `let wrapper`/unmount → `enableAutoUnmount`; translations reset kept. `as object` cast dropped. No findings.

## 6e590ea8b82 Improve readability of WorkflowList tests

Approved.

Mapping (4 → 4): empty list (0 cards, empty message); 10 cards, no empty message, redundant non-deleted count; late user (0 cards + LoadingSpan + no empty message, then 3 cards and no LoadingSpan) still on its own default-`stubActions` testing Pinia; filter toggle "" → "is:deleted" → "".

Findings:
- `Workflow/testUtils.ts` had exactly one importer at the parent commit (`WorkflowList.test.ts`; other `testUtils` hits are `@/stores/testUtils`, and `admin/Notifications/test.utils.ts` has its own `generateRandomString`). Deleting it with its last consumer is fine and isn't production code.
- No assertion read the random fields (tags, annotations, `published`, `show_in_tool_panel`). Counts, owner and `deleted` drove every check, and `deleted` was always `false` (or forced `true`) before too. `getFakeWorkflowSummary` is the existing factory and gives the real `WorkflowSummary` shape, which removes the `ReturnType<typeof vi.fn>` cast.
- The `showDeletedButton.exists()` replacement is right. The second check ran on a captured `DOMWrapper`, which always exists. Re-finding `#show-deleted` before the second check and the second click keeps the intent (the button is still there after toggling) and makes it fail-able.
- Mount order is unchanged: mount, then set the user, then flush. Awaited `trigger` replaces trigger + `$nextTick`. The dropped trailing `flushPromises` had nothing after it.
