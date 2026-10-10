# seedCurrentHistory

Helper: `client/src/stores/testUtils.ts`, extended. `seedCurrentHistory(history, pinia?)` stores `history` with the real `setHistory` action, makes it current with `setCurrentHistoryId`, and returns the history store. `currentHistoryId` ignores an id that isn't in `storedHistories` and falls back to the first stored history (or `null`), so `setCurrentHistoryId` alone silently seeds nothing. `storedCurrentHistoryId` isn't returned by the store, so `createTestingPinia({ initialState })` can't seed it either. The name avoids the store's own `setCurrentHistory` action, which switches the current history on the server.

Consumers:
- `client/src/components/Dataset/DatasetCopy.test.js` (originator). Its `setCurrentHistoryId("h1")` never stored `h1`, so the seed was vacuous and the component always fell back to the first listed history. It now seeds before mount (driver fix after review; the component reads the current history only once `/api/histories` answers, and coverage is unchanged).
- `client/src/components/SelectionField/SelectionField.test.js` (supporting, 7 → 7) replaces `initialState: { historyStore: { storedHistories } }` plus `setCurrentHistoryId`. Same end state, now through the real `setHistory` action (`historyStore.ts` lines 54 → 56, branches 3 → 4).
- `client/src/components/Panels/Upload/UploadFileRow.test.ts` (later originator in this batch) replaces its `setHistory` + `setCurrentHistoryId` pair before mount.

Candidates left alone:
- `SelectorModal`, `CommandPalette/providers/histories`: the current history is already stored by a real `loadHistories`, then picked by id.
- `MultipleView`, `ToolForm`, `watchHistory`: seed with `setHistories` (a different action, so coverage would shift), and `MultipleView`/`ToolForm` seed after mount.
- `WorkflowAnnotation`: stores the history after mount on purpose, while the history link's fetch is in flight.
- `UploadMethodView`: its local `seedHistories` stores two histories and later tests switch between them with `setCurrentHistoryId`; the helper would cover only half of it.

`testUtils.ts` now imports `historyStore`, so its existing importers load the store module. The driver ran all 34 test files that import it at the tip, shuffled: 348 tests pass.

Validation: the three adopters pass shuffled (seed `390101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and full `vue-tsc --noEmit` pass.
