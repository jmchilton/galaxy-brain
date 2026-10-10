# SelectionField

Supporting test for `seedCurrentHistory`: `client/src/components/SelectionField/SelectionField.test.js`. Baseline and final: **7 tests**.

`mountSelectionField` now builds a plain `createTestingPinia({ createSpy: vi.fn, stubActions: false })` and calls `seedCurrentHistory(getFakeHistorySummary({ id: HISTORY_ID }), pinia)`, instead of seeding `storedHistories` through `initialState` and then calling `setCurrentHistoryId`. The end state is the same: `history123` is stored and current. The store is filled by the real `setHistory` action now, not by `initialState`. No case, assertion or fixture changed.

Coverage: `historyStore.ts` lines 54 → 56, branches 3 → 4; no other file changed. Removing `setHistory` from the helper makes all 7 cases fail, so the seed is load-bearing.

Validation: shuffled run (seed `390101`) with the other `testUtils` importers passes; ESLint, Prettier and `vue-tsc --noEmit` pass.
