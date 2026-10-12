# Batch 57: history service queries

Originator: `client/src/stores/services/history.services.test.ts`.

The two scenarios retain all nine original query checks: three ownership flags for the default listing, then the same flags together with offset 20, limit 25, and filter value zebrafish for the paginated listing. Each scenario additionally requires exactly one intercepted request.

Replaced the whole Axios module mock with the existing typed `useServerMock` infrastructure. The handler returns the same successful empty listing through the actual Axios transport. Request captures belong to each scenario, and the shared helper only arranges the endpoint and returns those captures. Parsing the intercepted request URL removes the unchecked last-call cast and ad hoc query-string slicing. The typed response removes the `any` fixture assertion; shared server teardown restores handlers between cases.

Validation: pristine and rewritten suites both pass two cases with shuffled seed 570101. V8 JSON comparison reports 16 files and 49 covered statement/function/branch-arm locations on both sides, with zero added or lost locations. Original assertions: 9; final assertions: 11. Reports are in `/private/tmp/readability57-services-before` and `/private/tmp/readability57-services-after`.

No production, supporting-test, dependency, or README changes. Existing API-mocking guidance directly supports the migration; no evidence-backed guidance gap or new shared abstraction was identified.

Full client type check, file ESLint/Prettier, and explicit pre-commit gates all passed.
