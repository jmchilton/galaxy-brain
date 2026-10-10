# pageStore

Selected originator: `client/src/stores/pageStore.test.ts`. Baseline and final: **18 tests**.

The concurrent-dedup case drops its hand-rolled resolver (a no-op placeholder reassigned inside `new Promise`) for `deferred<LoadPagesResult>()`, so the pending request reads as one `response` that the test later resolves. `mockResult` is typed as `LoadPagesResult`. The local `mockPage(id, title)` stays as a one-line wrapper (it keeps the `Page <id>` default the assertions read) but now builds on `getFakePageSummary`, which removes the `as PageSummary` cast; the `createMarkdownPage` case uses `getFakePageDetails` and loses its `as never` cast. Its comment about the `r:` scope considering the cache complete is dropped: `savePages` never marks a variant fully listed, and the reports provider's `isComplete` is the store's, so the claim didn't hold, and the case name already says the new page goes ahead of cached ones.

All 18 scenarios and their assertions are unchanged. The dedup case is strengthened: the two concurrent callers now get the same array (`toBe` instead of `toEqual`), and that array holds page `a`. The factories add full summary/details fields to the fixtures; the store only reads `id`, and no assertion depends on the extra fields.

Reuse: existing `@tests/test-data/pages` factories and `deferred` from `@tests/vitest/deferred`; no new helper. `CommandPalette/providers/reports.test.ts` has a similar cast-based `mockPage` but was left alone (no new abstraction to adopt).

Validation: 18 tests pass shuffled (seed `410101`, `NODE_OPTIONS=--no-webstorage`). ESLint, Prettier and full client vue-tsc pass. Per-file coverage of the store is unchanged (no statement or branch lost or gained).

Guidance: none.
