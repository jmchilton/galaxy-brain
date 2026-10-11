Retain the implemented scope: ten selected originators on the rebased existing branch, using established shared helpers and preserving the six earlier iteration commits. No expansion or contraction is needed.

## As implemented

Review ten diverse client and Tool Shed suites against existing guidance, improving arrangement, named independent cases, fixture typing, and observable contracts. Reuse the existing object-store and history factories, Pinia setup, and SSE helpers; no new helper or supporting migration is needed because the demonstrated reuse is already available.

| Pros | Cons |
| --- | --- |
| • Fulfills the requested ten-originator loop and follows useful abstractions from earlier iterations. | • Stateful lifecycle, request-order, and queue scenarios require more detailed review than renaming tests. |
| • Keeps domain inputs visible and confines the source changes to the ten selected test files. | • Other fixture and request-gate families remain eligible for a future full review. |
| • Records the requested upstream rebase separately, preserving one source commit per iteration. | • Upstream dependency and schema changes require validating against the current environment. |

## Contract to naming and formatting

Rename cases and remove narration, while retaining the original combined cases, ad hoc fixture objects, timer arrangement, and single-use mount scaffolding. This gives a smaller edit but leaves the structures that make the tests difficult to read.

| Pros | Cons |
| --- | --- |
| • Minimizes diff size and verification work. | • Leaves independent redirect and comment-validation failures grouped together. |
| • Avoids altering assertion organization. | • Misses the known reusable object-store/history factories and the ineffective nonmatching-history SSE setup. |

## Expand into new shared test frameworks

Extract generalized deferred-request gates, caller-component hosts, form input fixtures, or JSON renderer doubles and migrate broader consumer families. The existing gates hold different operations open, the form fixtures encode the tested recursive structures, and the metadata tests exercise different mocking boundaries; the current reviews do not demonstrate a missing shared abstraction that warrants those migrations.

| Pros | Cons |
| --- | --- |
| • Could reduce further duplication after reviewing additional domain consumers together. | • Adds files and validation obligations without a demonstrated readability gain in this batch. |
| • Could produce useful defaults for a later consumer group. | • Risks concealing request ordering, input nesting, or the component actually under test. |

The originating reviews propose no unresolved expansion, contraction, README change, or marginal-advice entry. Existing shared helpers are used directly rather than inventing replacements. The implementation diff against `8cd6910a856b15009722e296b69f21fbfaa42e8b` contains only the ten selected unit-test files; there are no production component, template, style, API, dependency, configuration, or E2E edits in this loop.
