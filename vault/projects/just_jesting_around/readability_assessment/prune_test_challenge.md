# Test challenge debrief

Scope: remove only the 77 scored-2 changes while preserving scored-3+ changes and the production/base tree. Read the shared test-challenge checklist, Galaxy testing documentation, and client README unit-testing guidance. No source mutations made in this review.

The key challenge was dependency coverage: testing only files whose own edits were dropped misses surviving consumers of removed fixture modules. Static export/consumer inspection exposed ten broken suites. Retain only the shared definitions needed by those consumers, then typecheck and rerun the dependent suites alongside the dropped-edit suites. The first typecheck independently confirmed all ten failures before recovery; initial test collection is not final-tip validation.

Restoring `CollectionProgress.test.js` reintroduces four cases already present in the retained TypeScript suite: running counts, mixed states, state updates, and queued states. The TypeScript suite additionally covers terminal-job hiding. The duplicate JS file also retains its older manual mounting style. This is a known consequence of explicitly removing the scored-2 deletion, not permission to delete another test or rewrite it during this task. Both suites should be run to demonstrate that the explicit historical restoration works.

These changes adjust existing isolated client component/composable tests and test fixtures. They introduce no production feature or changed application contract requiring a new Selenium/API test. Moving tests to another layer, changing mocks unrelated to the removed dependency chain, or dropping additional marginal tests would exceed the requested pruning scope. No such changes were made.

Tool Shed targeted run observed during review: four suites / 34 tests passed. Final client/typecheck reruns after dependency recovery are owned by the main agent and must be recorded before completion.
