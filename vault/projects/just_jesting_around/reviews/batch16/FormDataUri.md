Reviewed `client/src/components/Form/Elements/FormData/FormDataUri.test.ts`, 3 → 3 cases.

The singular URL-data and File variants now form a named table with visible expected default labels. List assertions read fixture order directly with `nth`, replacing boolean-controlled assertion helpers and unnecessary casts. Removed an unused extension selector and an unawaited `flushPromises()` call: this component synchronously renders existing URI data and starts no API operation. Fresh shared plugins and automatic unmount replace wrappers without cleanup. A short mount helper renders the recursive URI element children because the tested labels and locations live there; shallow stubs would erase this behavior.

Preservation: unchanged `SINGULAR_DATA_URI`, `SINGULAR_FILE_URI`, `SINGULAR_LIST_URI` imports and content; singular file count one, original locations and `Data`/`File` default labels; one list collection, exactly the fixture element count, each element's file-type assertion, original ordered `1.bed`/`2.bed`/`3.bed` identifiers, and every location. Type narrowing replaces sparse casts without changing fixtures or expecting invented extension coverage.

Reuse: existing shared URI fixtures and type guards, `nth`, and `getLocalVue`. Fixture files are unchanged and no new cross-file helper is justified by two tiny variant assertions.

Guidance: existing scenario/table, shared fixture and meaningful mount-boundary guidance is sufficient. No new README rule or marginal advice proposed.

Validation: all four owned suites pass 93/93 cases, zero failures or skips, shuffled with seed `160071` and `NODE_OPTIONS=--no-webstorage`; evidence is `/private/tmp/batch16_forms_tests.json`. Scoped ESLint passes with zero warnings and Prettier passes; the driver coordinates full client typechecking and final batch checks.
