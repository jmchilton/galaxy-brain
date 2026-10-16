# Test challenge

Keep the API tests and shared assertion helper. They exercise the public request contract with actual imported workflows, persisted connections, histories, datasets, and invocation/job endpoints. There are no new mocks or implementation-mirroring unit assertions to remove or rewrite.

The four negative cases are meaningful: wholly disconnected required input with a requested existing history, the same with a new history, partially connected sibling inputs, and a disconnected required input nested two subworkflows deep. Assertions cover HTTP status/error code/path, absence of invocations, unchanged preexisting job counts where a history exists, and no named new history. Reported baseline reds accepted all four with HTTP 200.

Updating the old late-failure test is justified: the new contract rejects submission before an invocation exists. Keeping its old expected failed-invocation record would contradict that contract. The replacement checks more relevant side effects and retains the required-input diagnostic; it does not hide an unexplained runtime failure by weakening assertions.

The three falsy-default cases (false, zero, empty text) protect sentinel behavior against accidental truthiness checks. Existing required-default, optional-disconnected, and connected-but-omitted-optional tests provide execution-level positive controls. These are better than isolated mocked assertions of the shared predicate. The unchanged runtime backstop still covers entrypoints that bypass request validation.

No browser/E2E test is warranted: rejection and persistence effects are fully visible through the API, and no client behavior changes. Workflow units and existing hooks are being run by the implementation agent alongside the focused API selection. Reviewer did not duplicate them or modify code during execution; final runtime outcomes should be recorded in the handoff.

Final validation reported by the implementation agent: focused API selection 10 passed; workflow units 193 passed, 2 skipped; existing hooks and diff checks passed. No review action remains.
