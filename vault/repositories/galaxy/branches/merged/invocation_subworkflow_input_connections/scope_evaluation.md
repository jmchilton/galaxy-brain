Recommend keeping the expanded scope as implemented. Early recursive request validation and the runtime backstop now enforce the same disconnected-required-input invariant, including whole and partial gaps before any connected sibling outputs are resolved. The modest adjacent diagnostic correction requested by the first revised evaluation is complete; another expansion would introduce a separate validation contract without a demonstrated remaining defect in this invariant.

## As implemented: shared structural invariant at submission and runtime

Reject missing required nested-input connections before history/invocation creation and apply the same detector at runtime for persisted invocations bypassing submission. Preserve optional/default values and genuine connected-output failures; report the established structural diagnostic consistently for whole and partial gaps.

| Pros | Cons |
| --- | --- |
| • Covers immediate, partial and recursive missing connections.<br>• Removes misleading output attribution and pending-sibling delay.<br>• Shares default/optional semantics and preserves valid requests.<br>• API and runtime regressions exercise the two entry points. | • Partially disconnected bypass-preflight runs now receive the accurate structural failure rather than the previous unrelated output failure.<br>• Requires direct persisted-model tests for the runtime-only fallback. |

## Smaller: submission guard with historical runtime diagnostics

Retain early request rejection but restore the prior partial-input fallback and its incidental output attribution. This is the original archived scope, preserved separately on the original-scope alternative branch.

| Pros | Cons |
| --- | --- |
| • Smaller behavior change for old persisted invocations. | • Reintroduces a demonstrated adjacent bug.<br>• Allows pending outputs to obscure a deterministic structural error.<br>• Preserves the contradictory interpretation of a shared invariant. |

## Modest further expansion: richer runtime missing-input names

Extend persisted failure details with missing input names or a new structured failure type, matching the richer submission error context.

| Pros | Cons |
| --- | --- |
| • Could make runtime-only malformed graph diagnostics more descriptive. | • Established message already accurately states the defect and identifies the subworkflow step.<br>• A new failure type would require schema/client changes; textual additions would change a stable diagnostic without correcting another demonstrated bug. |

## Modest further expansion: recursive empty/cyclic nested workflow checks

Generalize root graph sanity validation through the same traversal. This was considered in the first revised evaluation and remains a different structural invariant.

| Pros | Cons |
| --- | --- |
| • Could reject other deterministic saved-graph problems early. | • Empty nested workflows are deliberately valid test controls here.<br>• No demonstrated nested-cycle failure or established compatibility contract justifies changing that behavior in this fix. |

## Larger: general invocation graph/value preflight

Include data accessibility, collection shape, input parameter types and materialization in one recursive validation phase.

| Pros | Cons |
| --- | --- |
| • Could eventually give a unified early-validation model. | • Combines independent value and lifecycle concerns.<br>• Requires extensive additional compatibility evidence.<br>• Does not improve the now-complete missing-connection invariant. |

<details><summary>Second evaluation evidence and boundary</summary>

This is the second evaluation after implementing the revised first recommendation archived in `earlier_drafts/2/scope_evaluation.md`. The prior deferral of runtime diagnostic changes has been resolved by moving the shared guard before replacement and deleting the old partial-connection branch. Persisted graph tests demonstrate both the inaccurate ready-sibling failure and the pending-sibling delay on the baseline, then pass with the correction. No further expansion was suggested by fresh correctness, test challenge or strict quality reviews.

The recommendation follows the revised policy's preference for a modest related generalization: that generalization has already been implemented across both relevant boundaries. It is not based on targeting a release branch or staying within the initial issue. No further adjacent broken behavior in the same invariant was identified. Review execution and validation details live in the corresponding normal/test-quality reports; this scope decision does not claim additional executions.

</details>
