# entryPointStore

Reviewed `client/src/stores/entryPointStore.test.js`: 4 cases before and after, all passing with shuffle seed 120043; scoped ESLint and Prettier pass.

The store hook reuses `setupTestPinia` and awaits the public fetch directly, eliminating the extra flush. Its single untyped handler now asserts the running=true query instead of returning a successful unrelated fallback. The endpoint is absent from the generated schema, so retaining `http.untyped` is the honest boundary. The existing SSE mock prevents unrelated EventSource traffic; these cases exercise data methods only.

Preserved partial update count, name change, retained active flag, the exact removed ID, and the exact active result for job and output-dataset filters. Removal now checks the complete ordered ID list before and after, also proving the other entry remains. Synchronous data-method cases no longer have async declarations, and test names explain filtering and partial-merge behavior.

The partial update intentionally omits active; filling it with defaults would weaken the merge regression. Its original JSON baseline is also reused by the selected ToolEntryPoints suite. No new shared helper or supporting test edit is needed, and current guidance already covers the changes.
