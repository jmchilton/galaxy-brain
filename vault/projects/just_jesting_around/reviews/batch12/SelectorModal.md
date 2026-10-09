# SelectorModal readability review

Originator: `client/src/components/History/Modals/SelectorModal.test.js`. Cases: 5 → 5.

Fresh `getFakeHistorySummary()` fixtures replace hand-built partial histories and wall-clock dates. `withPlugins()` installs explicit fresh Pinia, with user/current-history/loading setup finished before mount. Each test owns its returned wrapper; removed suite-wide mutable wrapper/store and obsolete currentHistoryId/static props. Automatic teardown and fresh stores isolate scenarios.

Pagination now clicks the displayed Load More control and flushes the event-started request instead of calling the store then copying its list into props. This preserves ten → fifteen visible cards and disappearance of the button while exercising the real component interaction.

Preservation: current-history highlighting, initial/no emission then clicked ID-2 selection, custom instruction, and multiple-selection confirmation all remain. Single-selection verifies exactly one emission; multi-selection verifies both selected cards and the full emitted `[ID-1, ID-2]` pair, strengthening the original first-ID-only check. Real modal/list/card children stay mounted to cover their interaction.

Reuse: existing registered-user/history factories and `withPlugins()` suffice. The fifteen-item collection arrangement is local to this modal's pagination behavior, so no shared list factory was introduced.

Validation: all five assigned suites pass together in shuffled order (seed `120031`): 17 passed, no failures or skipped cases. Scoped current ESLint and Prettier checks pass. Driver performs final whole-batch verification and client typechecking. No production changes or supporting suite migrations.

Guidance: the current README already covers scenario naming, focused cases, existing fixtures, and lifecycle cleanup. No new best-practice paragraph is warranted.
