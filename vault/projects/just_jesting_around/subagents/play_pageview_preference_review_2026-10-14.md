# PageView preference repair review

APPROVE final reviewed HEAD `be172bfb5fe518a5916e20c3841eccefc4326e76`, with PageView play commit `8d636d30c4e24236625d1b6c788f3d76db9322c3`. The driver resolved the initial retained-state restoration finding. Review was read-only in the Galaxy worktree; no runners were stopped and no tests were run by this reviewer. No implementation changes were made by this reviewer.

## Resolved finding

`withFullToolPanel` captures `previousState` by reference before constructing the store. If `pinia._s` has no `toolStore` but `pinia.state.value.toolStore` exists (for example, after `$dispose()`), setup-store hydration and assigning `store.currentPanelView = "default"` change that retained state. Cleanup then assigns the already-mutated `previousState` back. The old view is lost even though its exact raw storage value is restored.

The final correction adds exactly two lines: a shallow value snapshot before store construction and `Object.assign(previousState, previousValues)` before reinstalling the retained state object after disposal. This follows the lower panel fixture's `captureStore` approach. The expanded temporary real-module lifecycle proof includes a disposed store with retained state, a prior panel view, and a catalog sentinel. It asserts state object identity, restored view, catalog identity and contents, absence of the registered store, and exact raw storage restoration. Its recorded run passes all four stories (three original plays plus the five-scope probe).

Post-correction logs report four passing unit cases and three passing original plays; lint, formatting, and type-checking completed successfully according to the driver's actual exit-code evidence. The final folded tree equals validated fixup `bc9602bd6ea`; the worktree is clean. The 569-test full browser gate covered the preceding `5fcc99d98c6d6d2a43af579d33e686088a78a5d0` tree, before these two lines. Final-tree verification is the authorized touched checks and expanded lifecycle proof, not a new whole-browser run.

## Details

- The repair diff from `b24cbe084f317ed9bec0aa6df8699bbc43973791` changes only `PageView.stories.ts`; it introduces a private decorator used only by Published.
- All Published, Embedded, and DisplayOnly plays, assertions, and existing five-second timeouts are unchanged. The remaining PageView unit file is byte-identical to the remote lease. No production files are changed by the repair.
- The decorator requests the actual salted VIEWER hash before constructing the tool store, waits for same-key cleanup, and seeds only the preference key and current panel view. Existing catalog handlers and real store request paths remain intact. Choosing Full Tool Panel is a legitimate scene precondition for the Collection Operations assertion.
- Cleanup is registered synchronously before asynchronous bootstrap. The alive check prevents writes/store construction after cancellation while awaiting cleanup. Fresh store disposal stops its persistent watcher, with raw restoration after child unmount. Reused-store cleanup restores the prior view and waits for the watcher before restoring the exact raw key. The final correction also restores retained state values when there was no registered store.
- Inspected both versions of the temporary lifecycle script and their recorded browser results. The final five-scope probe covers a fresh saved preference, absent key, reused store with deliberately differing raw preference, disposed store with retained state, and cancelled pending bootstrap. The temporary export is absent from the final reviewed source.
- Focused repair logs report four passing units and three passing plays. Type-check log contains no errors. The whole browser retry log reports 97 passing files and 569 passing tests; the driver must still confirm its actual exit code before pushing.
- Relative to remote lease `03631e0fb41ba075a7bae29c2ddcae0dee0f6719`, admin BroadcastsList replaces its local factory/constants/type with the extracted shared import. Its scenarios and plays are unchanged; the shared factory preserves the original default ISO behavior. ToolForm stories have no changes.
- The first reviewed folded tree equals `0360d1ea534`; the final folded tree equals `bc9602bd6ea`. The lower immutable base and unrelated conversion content were not modified by this repair or correction.

No outstanding required changes. All original plays/assertions and the unchanged remaining unit file are preserved in the final correction.
