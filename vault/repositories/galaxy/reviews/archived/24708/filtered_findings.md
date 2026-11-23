# Filtered findings: #24708

Reviewed commit `86a724b7bf5e`. Items dropped during verification, each with its reason.

- **Name lookups overrun the request line limit** (default P2 1, related cost): disproved. The performance review ran the pinned gunicorn and uvicorn: the sync worker fails past about 130 ids, but `UvicornWorker`, the closest match to Galaxy's worker, returned 200 at 2500 ids. Only an nginx default at the 300-id worst case remains, untested.
- **Resolve names on the server, as a required change** (thermo P2 1): re-litigates the description's choice of the existing index APIs and the 50-match cap. The wrong-results defect it rests on is kept as P2 1, with server-side search offered there as an option.
- **Move column filter state into a composable and chips component** (thermo P2 3): no defect, and the MultiTags change (P3 6) already removes most of that state. Author's call.
- **Bulk workflow counts endpoint** (performance P1 1, reusable option): a new API rather than a fix. The ownership gate is the fix; the bulk endpoint is mentioned under P2 3.
- **Gate `FieldFilter` rendering on `filterClass`, error on a missing `validFilters` key** (thermo P3 2): defensive code for a grid that doesn't exist; the one consumer declares both.
- **Evaluate `FilterOption.detail` once per row** (thermo P3 3): nit. The three calls in one render read the same keyed cache entry and send no extra requests. Its request-count half is merged into P2 3.
- **Rename `InvocationIndexQueryPayload.workflow_id` / `history_id` to plural, widen `index_workflow_invocations`** (thermo P3 4): cosmetic, since the fields mirror the HTTP parameter names, and widening the route's API is out of scope.
- **A bare `'RNA seq'` loses its quotes** (default P3 2, second half): existing `GridList` behavior for text wrapped in quotes, and the description only documents the keyed quoted form.
- **Add `WorkflowPopulator.invocations` helper** (test challenger P3 1): nit, one more closure-sized call site.
- **Narrow the `GridList.test.ts` column filter test** (test challenger P3 4): not worth doing; it is the only cover for the option working on a non-invocation grid.
- **Slim the two "looks up ..." Vitest tests** (test challenger P2 2, part): they still show dedupe and cost little, and removing them gains nothing now the API tests exist.
- **Selenium assertion for a deleted workflow in the column search** (test challenger P2 2, part): covered at the API layer by P3 10 and the `deleted` mark in Vitest.
- **`instance=true` with several ids** (default P3 5, test challenger P2 3, optional part): the comprehension is simple, and one instance id is already tested.
