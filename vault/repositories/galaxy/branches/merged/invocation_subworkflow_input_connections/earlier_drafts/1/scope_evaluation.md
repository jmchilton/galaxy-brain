Keep the implemented scope: reject disconnected required subworkflow inputs at submission, reusing one predicate with the existing runtime backstop. This is a coherent independent `release_26.2` guard, including recursive paths and optional/default positive controls; it should not pull in the larger invocation resolver or parameter/data validation changes.

## As implemented

Share required/disconnected/default detection between runtime and early recursive request validation. Reject before histories or invocations exist, while preserving runtime failure reporting for paths that bypass this entrypoint.

| Pros | Cons |
| --- | --- |
| Covers nested/partial shapes; preserves falsy defaults; avoids duplicated semantic predicates; independently reviewable. | Changes failure timing and requires replacing the old late-failure API expectation. |

## Smaller: duplicate the runtime predicate only at submission

Add a request-only graph check without changing the runtime implementation.

| Pros | Cons |
| --- | --- |
| Fewer runtime diff lines. | Two copies of subtle default/optional semantics could drift; narrower textual diff buys no behavioral simplification. |

## Larger: generalized graph/input validation

Combine required connections with collection shape, supplied parameter validation, input accessibility, and the resolve/materialize lifecycle.

| Pros | Cons |
| --- | --- |
| Could establish broader invocation validation guarantees. | Reintroduces unrelated scope, dependencies, and known collection-shape concerns from the larger source branch. |

No scope change is recommended. Recursion, path diagnostics, and positive controls are intrinsic validation of this fix rather than extra features.
