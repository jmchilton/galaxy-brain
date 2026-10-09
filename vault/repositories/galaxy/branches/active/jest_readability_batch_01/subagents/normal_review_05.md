Acted on the independent review's preservation finding: restored immediate cache-hit loading=false before promise flushing, retaining settled-state/request checks. The corrected three-case suite passes. No blocking or unacted recommendations remain; scope and screenshots retain the test-only implementation.

## Details

# Independent review — iteration 05

Reviewed the complete diff against `2dbcc3703c61c058598fe50d14fba2623bd3329f`, all 20 originating suites, four supporting suites, and three new helpers. Read the project goal, loop instructions, client testing best practices, review-focus instructions, test-challenge instructions, and Galaxy's test-layer documentation. Inspected relevant implementations and shared fixtures independently of the authors' reviews.

No blocking findings. One small preservation correction was applied: keep the cached collection range's original immediate `loading=false` check before flushing promises, while retaining the later settled-loading and no-request assertions. Its three-case targeted rerun passes.

## Preservation and readability evidence

| Originating suite | Independent review evidence |
| --- | --- |
| MultipleView | All six cases and 16 assertions survive, including four→eight→twelve intermediate states. Fixed ascending timestamps make the first history reliably oldest. Native global stubs and fresh plugins retain the actual child button behavior. |
| ToolSection | All six cases and 18 assertion statements survive. Click is awaited and exact selected-tool payload replaces event existence. Filter/disableFilter/manual toggle sequence and three ordering scenarios remain. The one section-label type assertion documents a real production interface mismatch. |
| useFormState | All 14 cases and 45 assertions survive. Active/inactive conditional paths, duplicate names, server/client ownership, validation flag changes, and reactive switching retain their intermediate checks. Freezing the fresh factory result preserves the frozen-input condition. |
| HistoryNavigation | Both cases and all four button checks remain. Typed registered and anonymous fixtures remove sparse casts; explicit AnonymousUser preserves the anonymous condition, which a null session would not represent. Required selectors fail if controls disappear. |
| Workflow actions | All 24 actions retain apply-change, undo-restoration, and redo-restoration snapshot checks: 72 executed helper assertions plus two direct checks. Every selected snapshot key remains. Fresh Pinia rebinds all local store references before importing the workflow. The existing raw conversion utility replaces the duplicated recursion; independent snapshots still clone the final data. Position narrowing preserves the original positioned steps. |
| CopyModal | All eight cases and eight assertions remain, including owner/non-owner same-name differences and exact copy arguments. Changes concern fresh mount configuration, wrapper disposal, and restoring spies. |
| useNotificationSSE | All 14 cases and 27 assertion statements remain. Refcounts retain the intermediate no-DELETE observation. CLOSED versus CONNECTING, five-failure growth, capped delay, successful-open reset, forced reset, canceled retry, wake, and online sequences remain. Scoped native globals and visibility getter are restored. The local transport fake is appropriate for driving browser lifecycle deterministically. |
| fileSources | Four cases and six assertions retain initial loading, loading completion, returned payload equality, and all-read-only versus mixed writability. Shared defaults leave scenario IDs and writable flags visible. Lifecycle mounting remains necessary for onMounted fetching. |
| roundRobinSelector | Eight cases and 20 assertions retain exact item arrays, polling interval, advance durations, intermediate wraparound, stop, replacement, and empty-list transitions. Actual composable result replaces placeholder refs and methods; native lifecycle disposal and timer restoration isolate cases. |
| useCreatingJob | Ten cases and 23 assertions retain missing/found dataset, dataset/collection errors, single versus implicit collection job, unknown source, null ID, and reactive ID switching. Hoisted partial response maps describe intentional store fakes without claiming complete API payloads. |
| workflowStepStore | Nine cases and 17 assertions retain sparse step payloads, the inherited id=0 regression input, connection changes, extra-input ordering, and longer-input versus shorter-connection naming. Existing conditional fixtures stay shared; no inappropriate generalized fixture replaces sparse inputs. |
| collectionElementsStore | Three cases preserve empty cache, pure reads, ten placeholders/five fetched elements, cache-hit behavior, and overlap producing eight fetched elements. Exact collection ID/offset/limit observations strengthen request checks; the overlap remains offset=3, limit=5. Typed predicate removes the array cast. Immediate cache-hit loading observation is retained following review, alongside settled loading and no-request evidence: 21 final assertion statements. |
| jobMetricsStore | Four cases and nine assertions retain empty job/default-HDA/non-HDA lookups and exact cached metrics. The deliberately non-HDA discriminator remains unchanged. Fresh default caches replace redundant whole-state assignments. |
| workflowConnectionStore | Four cases and 12 assertions retain empty/populated/cleared indexes for both steps and the input terminal. Store-assigned step IDs and original terminal names remain. |
| ToolHistoryTab | All 13 cases remain. Exact card counts, version and badge arrays, ten timeline entries, complete alphabetical IDs, and exact revision event payload strengthen regex/truthiness/conditional checks. Same-version entries across revisions remain distinct; all nine accessible expansion checks survive. |
| RevisionsTab | All 15 cases remain. Exact labels, ordering, invalid badge counts, and original invalid revision/path/message replace computed expectations and fixture discovery. Prop-driven expansion and all accessible toggle checks remain. Removed assertions only validated fixture discovery that is no longer necessary. |
| app/utils | Both exact URL assertions remain, including the truly omitted argument and the original relative path. Shorter suite structure and distinct names suffice. |
| dates | Nine grouped cases become 16 independently named cases; all 17 executed checks remain. Both functions keep undefined/null/empty/malformed inputs, and both exact timezone calendar outcomes survive. Date.now uses a fixed spy without replacing timezone-mock's Date constructor. |
| API package client | Four cases and nine assertions retain exact base URL/default headers and all returned HTTP methods. Scoped minimal window stub replaces unsafe location mutation. Constructor mock is hoisted and restored globals prevent leakage. |
| rateLimiter | All four distinct HTTP-method cases retain original requests, status/error checks, retry warnings, retry count, maximum-retry error, and no-retry checks for non-idempotent methods. Real GalaxyApi and MSW still exercise the actual middleware boundary. |

## Concrete reuse and scope

`getFakeCollectionSummary` extracts the complete payload formerly duplicated in collectionElementsStore and supporting datasetCollectionStore. ID-derived names and collection IDs, timestamps, null summary, and all other fields remain identical. Both consumers retain fresh containers; supporting detailed fixtures and all six supporting cases remain.

`getFakeFileSource` has three concrete consumers: selected fileSources, supporting RDMDestinationSelector, and supporting HistoryExportWizard. Supporting IDs, URI roots, plugin types, labels/descriptions, requirements, private-source URL, and feature flags remain unchanged. The private Zenodo fixture keeps its true pagination/search values. Partial supports overrides merge into a fresh default object. Supporting six and 14 cases keep their original assertions and arrangements.

`MetadataJsonViewerStub` replaces three identical local module mocks through native mount-time stubs. Selected metadata suites and supporting OverviewTab preserve viewer data rendering and real button/collapse behavior. OverviewTab keeps all seven cases and eight assertions. Automatic wrapper unmount applies to all three consumers.

These 27 source files contain only 24 test suites and three test helpers. No production, dependency, configuration, or README changes are necessary. Supporting migrations remain limited to concrete fixture/stub reuse, and their inventory counters must remain unchanged. No generic helper is extracted merely to meet a sharing quota.

## Fresh test challenge

Retain the existing unit boundaries. Form transformations, workflow indexes and full undo/redo state restoration, URL/date formatting, and round-robin scheduling are public client contracts with meaningful inputs and transitions. The changes add no tests that merely restate a helper's implementation or verify factory defaults.

API middleware and file-source requests already run through real client/store logic with MSW. The API package's constructor suite deliberately verifies constructor options and returned client identity; `client/packages/api-client/src/integration.test.ts` independently exercises real openapi-fetch request construction and typed response parsing. Combining them would discard either constructor observability or transport coverage.

The SSE transport fake drives CLOSED, CONNECTING, successful-open, visibility, and online conditions with precise jitter envelopes. Existing `test/integration/test_history_sse.py` checks real viewer subscriptions and delivery, while `test/integration/test_notification_sse.py` checks notification delivery and server reconnect catch-up. Those server tests do not replace browser-side reference counts, canceled timers, or backoff reset checks. Existing workflow editor Selenium coverage exercises real comment placement and editing; it does not replace per-action complete state restoration. This test-only refactor introduces no new feature requiring an E2E scenario.

Mounting real children remains justified where tests observe actual child button/tool rendering or accessible expansion. Lifecycle hosts remain only for composables requiring mounting/disposal. Existing factories, setupTestPinia, emittedArg, withPlugins, raw conversion utilities, and automatic unmounting remove repeated setup without introducing production restructuring.

Existing README guidance covers the findings. Conditional sorting assertions and poorly scoped globals were defects to correct in these tests, with no additional generally useful documentation gap. No unresolved abstraction or marginal advice is proposed.

## Validation

The driver's combined validation passes 168 cases in 21 client suites and 35 cases in three native ToolShed suites: 203 cases across 24 affected suites. Baseline selected cases were 163 and final selected cases are 170. Supporting cases remain 33. The native standalone API package also passes both suites and nine cases. The final cache-hit preservation correction passes its three-case targeted rerun (`/private/tmp/jest_readability_batch05_cache_review_fix.log`).

Full client and ToolShed type checks pass, as does the whole API package type check with bundler module resolution and skipLibCheck. Scoped client lint explicitly includes the normally ignored package test and passes with zero errors or warnings; client formatting and native ToolShed lint/formatting pass. Independent `git diff --check` passes. These are focused affected-suite checks, not a claim that the entire client test suite ran.
