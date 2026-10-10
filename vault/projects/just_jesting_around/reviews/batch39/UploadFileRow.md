# UploadFileRow

Selected originator: `client/src/components/Panels/Upload/UploadFileRow.test.ts`. Baseline and final: **1 test**.

The four-line `setActivePinia`/`useHistoryStore`/`setHistory`/`setCurrentHistoryId` setup became `seedCurrentHistory(getFakeHistorySummary({ id: "hist-a", name: "History A" }), pinia)`, still before mount. The hand-built `HISTORY` constant is replaced by the shared factory. Its `annotation` (`""` → `null`), `update_time` and `url` now take the factory defaults; the row only reads the history's name and id, and no assertion reads any of them. The mount drops the `as object` cast, `propsData` and the legacy top-level options for `props` and `global: withPlugins(localVue, pinia)`, with the same four stubs merged over `localVue.stubs`. The explicit `injectTestRouter` router is dropped. It was a `createTestRouter()`, the same router `getLocalVue` already installs.

Preserved: every assertion is unchanged. That covers the source URL text and title, `CopyToClipboard` existing, and its `text` prop. `useServerMock` and the `/api/configuration` handler stay. Removing MSW let a request reach happy-dom's real fetch (an abort trace after the test), so the test isn't request-free.

Coverage: no change apart from `testUtils.ts` being covered.

Reuse: `seedCurrentHistory` (added in this batch), `getFakeHistorySummary`, `withPlugins`, and the existing `makeUrlItem`/`withUploadState` fixtures.

Validation: the test passes shuffled (seed `390101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and full `vue-tsc --noEmit` pass.

Guidance: none beyond the `seedCurrentHistory` note.
