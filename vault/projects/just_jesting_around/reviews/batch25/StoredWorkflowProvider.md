# StoredWorkflowProvider

Selected originator: `client/src/components/providers/StoredWorkflowProvider.test.js`. Baseline and final: **1 test**.

The original handler returned the workflow only when `limit`, `offset`, `skip_step_counts` and `search` matched. Otherwise it fell through to `[]`, and the test asserted only that the callback had run (via a hand-rolled `called` flag). Wrong request parameters therefore still passed, so the parameter check was vacuous. The test now follows the already-improved sibling `InvocationsProvider.test.js`. The handler records the query string and always answers with the workflow and its `total_matches` header. After the awaited call, the test asserts:
- the exact params `{ limit: "50", offset: "0", skip_step_counts: "true", search: "rna" }` (`root` dropped, `currentPage` turned into `offset`)
- the returned items
- that a `vi.fn()` callback was called once with the response data and the `total_matches` header

Changing the call's `search` to `"dna"` makes the params assertion fail. The redundant nested describe and the `ctx`/`extras`/`promise` temporaries are inlined.

Preserved: the same `/prefix/` root, page 1 of 50, `skip_step_counts: true`, `search: "rna"`, the `StoredWorkflow` response with `total_matches: "1"`, and "callback fires" (now `toHaveBeenCalledTimes(1)`). Every parameter the old handler's condition encoded is now asserted.

Reuse: `useServerMock` (`http.untyped`, `HttpResponse`) and the `InvocationsProvider.test.js` arrangement. The one-test assertion shape doesn't justify a shared helper. Follow-up: `PageProvider.test.js` has the same vacuous condition-plus-`called`-flag shape. The file name is singular while the module is `StoredWorkflowsProvider.js`. It was left unchanged to keep the commit to one test file.

Validation: 1 test passes shuffled (seed 250101). ESLint, Prettier and full `vue-tsc --noEmit` are clean.

Guidance: none.
