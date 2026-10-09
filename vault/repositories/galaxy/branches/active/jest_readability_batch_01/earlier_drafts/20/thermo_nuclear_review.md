# Strict maintainability review — iteration 15

Approved. No structural, abstraction, or boundary blocker remains.

Reviewed the iteration 15 changes relative to `b8933cdd60dac5572bc156c40a1464ab72e018a2`, including all ten selected suites, the shared test-data export, and its supporting API ownership-test consumer. Read `LOOP_ITERATION.md`, `PROBLEM_AND_GOAL.md`, the complete client unit-testing guidance, and the shared review focus. No production code changed.

Applied the full shared `thermo-nuclear-code-quality-review.md` prompt separately from the normal coverage review. Reviewed the final source, the relevant component implementations, generated interface boundaries, canonical test-data and SSE helpers, and the upload factories.

## Structural simplification

- SwitchToHistoryLink removes an assertion-heavy helper with six positional arguments and repeated sparse histories. Named rows expose condition, tooltip, filters, and expected action counts; each execution still visibly performs ordinary click then Ctrl-click. The table is justified by ten real combinations; no generic scenario engine is introduced.
- ContentItem splits one long stateful test into five local cases. Shared setup returns fresh state, and the empty non-history state preceding expansion/selection remains explicit. No abstraction hides the click or the assertion.
- Repositories deletes assignments to internal component data and magic COMPLETE state. Its empty service response is the existing canonical boundary; the clearer design removes concepts rather than relocating them.
- uploadState removes duplicate paste/batch models in favor of existing factories, groups related fields in object assertions, and uses named IDs for mixed lifecycle roles. Its small `findUpload` helper removes many repeated searches; it earns its place without a new generic fixture/assertion layer.
- StateUpgradeModal removes mutable wrapper storage, double casts, and an action/assertion helper. A local typed message builder and two named post-dismissal rows preserve the real modal transition.

## Type, model, and ownership boundaries

The first full typecheck exposed brief `HistorySummary` being used as `HistorySummaryExtended`. The final fix adds one typed `getFakeHistorySummaryExtended`, composed from the unchanged brief factory with only the three required extended fields. Its supporting API consumer removes the same hand-built extended fields while retaining its original brief defaults, explicit owner/null values, alternate ID/URL, and all cases. Both selected history consumers and the supporting API ownership suite use it; overrides are last, mutable nested counts are fresh, and no cast masks this boundary. Existing brief callers retain their previous result. This is a domain helper with concrete consumers, not a pass-through wrapper.

Registered-user fixtures replace sparse casts. The partial history-store import is typed. StateUpgrade messages satisfy their declared interface directly. Counter's non-generated configuration response uses `response.untyped` and needs no `any`/`never` casts. Remaining `as object` component casts are existing Vue mount typing boundaries, not replacement domain models. ContentItem intentionally preserves its original sparse unknown-state item; replacing it with a full healthy dataset factory would change the input that selects the asserted success class.

## Size, branching, and isolation

Largest changed file: `uploadState.test.ts`, 549 lines. None crosses 1000 lines. No production branch, feature flag, fallback, dispatch mechanism, or orchestration layer is added. Brief history factory behavior is unchanged. Local mount helpers are small arrangements serving multiple cases; the one-case FormCard and Details setups stay inline. Component/service mocks stay at existing ownership boundaries.

Automatic unmount, fresh plugins, restored spies/sanitizer/timers, clear fake intervals, and before/after singleton cleanup improve isolation. Fixed clocks remove incidental wall time. There is no clearer cross-file mount abstraction here: the real-child dependencies, store/API state, and scenario props differ materially. Existing guidance covers these improvements; no generalized new testing rule is warranted.

## Validation

The authoritative shuffled run (seed `150101`, `NODE_OPTIONS=--no-webstorage`) passes 110/110 cases across eleven files (96 selected cases and 14 supporting API cases), with no skipped, todo, or failed cases. Full client typechecking, scoped ESLint with zero warnings, and Prettier pass. Upload authors also ran the unchanged shared-fixture consumers: 30 additional passing cases across upload item types, batch operations, and submission. Higher-layer suites were inspected, not executed.
