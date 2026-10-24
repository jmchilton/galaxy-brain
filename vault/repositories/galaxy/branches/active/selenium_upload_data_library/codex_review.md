# Codex review (re-harden 2)

Codex reported no findings on `d2d1dcd883c..dff1243e3d0`, the tests plus the 5 product fixes, so nothing needed acting on.

## Not acted on

- None.

## Details

- Run: `codex exec -s read-only` with the findings schema. The brief gave only each fix's intent and the house style, not our reasoning.
- Files reviewed: 29.
  - Client:
    - the api schema, `vGTooltip.ts`, `GButton.vue`
    - `TargetHistorySelector`/`TargetHistoryLink`/`SwitchToHistoryLink`
    - `DataLibraryUpload.vue`, `useUploadBatchOperations.ts`, `collectionElements.ts`
    - `navigation.yml`
  - Server: `folders.py`, `collections.py`, `schema.py`, the history_contents API/service, the library folder contents service.
  - Tests: all the test files this branch touches.
- Coverage note: "Runtime verification remains incomplete: the focused Python test could not start because the read-only sandbox provides no writable temporary directory. Client and E2E tests were not run." Our own runs cover the tests; see the fix and polish debriefs.
- Findings: `[]`
