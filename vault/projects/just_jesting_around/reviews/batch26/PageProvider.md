# PageProvider

Selected originator: `client/src/components/providers/PageProvider.test.js`. Baseline and final: **1 test**.

This is the batch 25 follow-through. The original handler returned the page only when `limit`, `offset` and `search` matched, and otherwise fell through to `[]`. The test only checked a hand-rolled `called` flag, so wrong params still passed. Changing the call's `search` to `"dna tutorial"` in the original file still passed, so the check was vacuous. The test now uses the shape batch 25 gave `StoredWorkflowProvider.test.js`. The handler records the query string and always returns the page with its `total_matches` header. After the awaited call, the test asserts:
- the exact params `{ limit: "50", offset: "0", search: "rna tutorial" }`
- the returned items
- that a `vi.fn()` callback ran once with the response data and the header

The same `"dna tutorial"` change now fails the params assertion. The nested describe and the `ctx`/`extras`/`promise` temporaries are inlined. The describe is renamed to the function under test, `pagesProvider`.

Preserved: the `/prefix/` root, page 1 of 50, `search: "rna tutorial"`, the `Page` response with `total_matches: "1"`, and "callback fires" (now `toHaveBeenCalledTimes(1)`). Every parameter in the old handler's condition is now asserted.

Reuse: `useServerMock` (`http.untyped`, `HttpResponse`) and the sibling provider arrangement. Three provider suites now share this shape (`InvocationsProvider`, `StoredWorkflowProvider`, `PageProvider`). Each is still a short, single-case file whose params and data stay visible inline. A shared "record params and respond" helper would mostly hide the handler, so none was added.

Validation: 1 test passes shuffled (seed 260101). ESLint, Prettier and full `vue-tsc --noEmit` are clean.

Guidance: none.
