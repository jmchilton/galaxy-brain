# storageOperationsStore review — iteration 04

Selected originator: `client/src/stores/storageOperationsStore.test.ts`.

Four baseline cases remain four cases. All 18 assertion statements remain; one explicit completed-run existence check brings the final count to 19. Counts, bytes, history/run IDs and the 26-hour expiration input remain unchanged. The completed-run state/count assertions now execute unconditionally instead of being skipped when a result is missing.

Reused `setupTestPinia()` from `stores/testUtils.ts`. All scenarios now use the same fixed `2026-01-01T00:00:00.000Z` clock, replacing wall-clock fixture defaults. The expired input is explicitly `2025-12-30T22:00:00.000Z`; the completed update remains exactly one second after the fixed clock. `afterEach` restores timers and clears local storage even if an assertion fails. Names describe clear, expiration, completion and history association behavior; narrative comments were removed.

A search for `total_bytes_processed`, `target_object_store_id`, and storage run fixtures identified a concrete duplicate pending-run payload in `client/src/components/History/model/queries.test.ts`. Implemented `getFakeStorageOperationRun()` in `client/tests/test-data/storageOperations.ts`, a typed `Partial<StorageOperationRunSummary>` factory with fixed defaults. Both selected store and supporting query suite use it. The store's small local tracked-run adapter adds the store-specific history ID and run URL. It constructs fixtures rather than invoking the production conversion being tested indirectly. The query fixture keeps its existing run ID and both original 2099 timestamps; every prior field/value and all 18 assertions remain identical.

Supporting query baseline and final: nine cases. The selected store, selected API helper, selected package integration and supporting query suite pass together: four suites, 32 cases. Scoped ESLint and Prettier pass; the driver handles final full-client typechecking. Logs: `/private/tmp/batch04_storage_queries_baseline.log` and `/private/tmp/batch04_stores_api_final.log`.

No README addition recommended. The existing advice to reuse test-data factories and keep scenario-specific inputs visible covers this change. Conditional assertions were a concrete defect to fix, not a new generic rule worth accumulating.
