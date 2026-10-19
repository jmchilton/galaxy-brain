Keep the expanded scope. The branch now completes early storage-routing validation: all explicit preferred stores, their existing exclusivity rule and the adjacent caller-supplied effective-output prohibition are checked before target-history creation. The first recommended modest expansion is implemented, and no further scope change is warranted by the remaining adjacent behavior.

## As implemented: complete early storage-routing checks

Use the existing selection policy for all three fields; move both storage-routing guards before history/input preparation. Preserve omitted/null/empty semantics and internally derived effective outputs; real request regressions cover every rejection family and configured-store integration controls retain valid nested/split behavior.

| Pros | Cons |
| --- | --- |
| • Completes the concrete contiguous validation boundary.<br>• Reuses policy and preserves accepted requests.<br>• Side effects and successful storage routing are observable in real requests. | • Invalid requests with multiple errors can report an earlier storage error.<br>• API rejection fixtures use selection-disabled configuration. |

## Modest additional expansion: configured nonselectable-store rejection matrix

Add unknown and nonselectable backend cases under the distributed-store integration fixture across all three fields. This would supply additional policy evidence, but the branch already delegates to the shared policy and exercises all preference sources negatively plus configured stores positively; there is no additional storage-routing behavior to fix here.

| Pros | Cons |
| --- | --- |
| • Additional configured-backend coverage. | • Repeats existing canonical selection-policy behavior.<br>• Adds integration setup and runtime without resolving a remaining adjacent defect. |

## Smaller: revert the effective-output movement

Return caller metadata rejection to the late run-config loop while retaining preferred-store checks.

| Pros | Cons |
| --- | --- |
| • Slightly smaller diff. | • Restores a proven invalid-request history side effect.<br>• Separates related storage-routing validation. |

## Larger: complete invocation preflight

Include resource parameters, tool state and dataset resolution in a universal mutation-free preflight stage.

| Pros | Cons |
| --- | --- |
| • Potentially addresses other invalid-request side effects. | • Requires independent resolver/runtime design decisions.<br>• Adds unrelated behaviors beyond this now-complete storage boundary. |

This second evaluation follows the revised bias toward modest expansion and explicitly considers another small alternative, rather than using release targeting or original issue wording as reasons to stay narrow. Earlier expansion rationale is archived in earlier_drafts/2/scope_evaluation.md. Correctness/test evidence was reviewed separately; this report evaluates the final behavior boundary.
