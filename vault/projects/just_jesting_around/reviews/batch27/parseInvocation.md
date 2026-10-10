# parseInvocation

Selected originator: `client/src/components/Markdown/Utilities/parseInvocation.test.js`. Baseline **1 test** with 12 assertions → final **11 tests**.

The single "populate args" case is split into one case per routing rule: invocation attachment, `history_link`, the three workflow directives (`it.each`), labeled dataset input, labeled collection input, unknown output, labeled output collection, and the two step lookups. A local `parse(directiveName, attributes)` wrapper hides the repeated invocation/workflow-ID arguments so each case shows only the directive, the label and the expected ID. The double `describe` is flattened. The `INVOCATION` fixture and stored workflow ID are unchanged.

All 12 original assertions survive with their exact inputs and expected values. The collection-input pair (collection ID set, dataset ID unset) stays together in one case, replacing the inline comment with the case name. The invocation check is strengthened from `invocation.id === "invocation_id_1"` to identity with the fixture. The mapped-over step case also asserts its `job_id` (`job_id_2`), which the fixture already carried.

Reuse: pure function over a module-specific `Invocation` shape; no shared factory exists or is warranted. No helper or supporting edit.

Validation: 11 tests pass shuffled (seed `270101`, `NODE_OPTIONS=--no-webstorage`). Scoped ESLint and Prettier pass; full `vue-tsc --noEmit` passes.

Guidance: the README's scenario-naming and `it.each` advice covers this; nothing new.
