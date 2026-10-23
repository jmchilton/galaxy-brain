# Test challenge

Keep the four new API cases. They test observable request behavior using real installed tools and workflow references, without mocks or helper-call assertions. Both requested-existing-history and requested-new-history variants reject an incompatible tool, create no invocation, and leave no requested new history; the existing-history case also asserts no jobs.

The mixed missing/incompatible workflow is valuable: it protects the existing missing-tool precedence and exact-version/plain diagnostic contract while the check is moved earlier. Exported workflow assertions verify the missing reference and version actually survived import, avoiding a vacuous error case. Reported baseline reds for all four cases show the tests detect the behavior change.

The existing compatible-tool positive API test guards against blanket rejection. Existing hook tests guard unrelated invocation behavior during service changes. Nested-tool traversal and eager/lazy compatibility metadata are reused unchanged; an extra mock-heavy unit test of the lookup loop would duplicate implementation rather than improve confidence. No existing assertions or tests are weakened or removed, and no new unit tests need conversion.

No browser/E2E test is warranted for an API rejection and absence of server-side history/invocation/job effects. Final green outcomes are owned by the implementation agent's running suites; reviewer did not duplicate them or mutate code during execution.

Final validation reported by the implementation agent: all 5 focused API cases passed (four new regressions plus existing compatible-tool positive control); existing hook tests and diff checks passed. No review action remains.
