# invocationStore

Selected originator: `client/src/stores/invocationStore.test.ts`.
Baseline: 20 cases. Final: 20 cases.

Reused `setupTestPinia()` and `getFakeHistorySummary()` instead of rebuilding their setup. Local summary, metric, collection-view and detail-view factories now satisfy their generated API types without `unknown` casts. The collection response remains distinct from the detail response: only the latter contains `steps`. Required step and metric metadata stays in the factories; the scenarios still expose job states and IDs. The sparse workflow-name response uses inferred handler parameters and `response.untyped(HttpResponse.json(...))` instead of `as never`.

The in-flight metrics scenario holds its first response until both original polling updates have occurred. It waits for the request to begin, checks the initial missing runtimes, releases the response, and waits for both runtime values. This replaces a 200 ms elapsed-time assumption with the actual request interleaving. Automatic unmounting removes reactive viewers; afterEach also releases a held response if an assertion fails.

Retained contracts: one initial/cache/shared-flight metrics request; refetch only as terminal counts increase; unchanged-state reuse; unavailable-summary cache behavior, late summary arrival and subsequent terminal increase; default limit 15 and explicit limit 5; server ordering, loaded flag, shared mutable cache, ID deduplication and replacement; concurrent list coalescing and loading cleanup; failed list fetch followed by successful retry; summary-to-detail upgrade, cached detail reuse and preservation after later summaries; empty runtime lookup and both component runtime-update scenarios. Detail assertions remain strict over the complete single-step response, including the original `step-inv1` ID and array cardinality.

Reuse search: `WorkflowInvocationState/util.test.ts` also contains short summary casts, but a shared factory would merely conceal a three-field literal plus `populated_state`. The complete summary in `useInvocationGraph.test.ts` already reads clearly. No new helper or supporting suite was justified.

Guidance: the README already covers reusable setup, typed API handlers and response.untyped. The precise in-flight-request arrangement is a local concurrency requirement; no general README addition is proposed.

Validation: shuffled invocation/window/watcher run, seed 90113, passes all 33 cases, including this suite's 20. Current ESLint with zero warnings, Prettier and git diff --check pass. Full client typechecking and independent batch review are tracked by the driver. JSON evidence: `/private/tmp/jest_readability_batch09_stores_watch.json`.
