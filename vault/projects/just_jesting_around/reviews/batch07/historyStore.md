# History store

Selected originator: `client/src/stores/historyStore.test.ts`.

The SSE section mixed observable refresh decisions with long explanations of the watcher implementation. It also used `any` for configuration and a stored history, while the cache section cast sparse API responses to `never`. Reuse `setupTestPinia()` for fresh stores and `getFakeHistorySummary()` for the known current history. Keep the existing SSE event and visibility helpers. Name the local configuration and startup helpers after their domain actions, shorten the narration, and stop/dispose the watcher before restoring visibility and timers.

Use `response.untyped(HttpResponse.json(...))` for the intentionally sparse configuration and listing response shapes. Their JSON bodies, dates, IDs, page sizes, held requests, and error responses remain unchanged. Named/unnamed creation rows now have descriptive case names; the queued request order and captured observations before releasing a request are preserved.

The ignored-history SSE test previously set the current ID without registering its history. Production `currentHistoryId` then fell back to null, so the negative assertion did not establish that a different current history was ignored. Register `hist-1` with the existing factory and assert that it is current before emitting the `hist-2` event. This adds one setup assertion and exercises the scenario named by the test.

All 66 original assertion statements remain byte-identical, with one assertion added. Preserve the SSE initial load, 30-second non-polling window, visibility change, matching/nonmatching dispatch, three-second polling and single-loop restart; creation/count-failure and both directions of queued creation/switching; own-listing filtered/unfiltered and full/partial-page transitions, concurrent deduplication and retry; shared user initialization failures; and single-history error/retry-limit contracts. The original 26 cases still pass.

No new shared abstraction is needed. Existing Pinia, history-data, and SSE helpers have real consumers and cover the repeated domain setup. The request gates differ in the operation they hold open, and their local definitions keep request ordering visible.

No README addition or marginal advice is proposed. Existing guidance already covers named scenarios, existing factories, scoped mocks, and untyped responses; the missing-current-history arrangement is a concrete test fix rather than a new general principle.

Validation: focused Vitest results in `/private/tmp/jest_readability_batch07_stores_results.json`; scoped ESLint with `--no-ignore --max-warnings 0` and Prettier checks passed. Driver performs combined typecheck and independent review.

Independent review found that stopping polling and disposing Pinia did not remove the resource watcher's visibility listener. The coordinator added a scoped typed registration spy and removes each exact visibility callback/options tuple during teardown before restoring the spy and patch. Real watcher behavior and all assertions remain; the focused history/confirmation/comment suites pass shuffled order after cleanup.
