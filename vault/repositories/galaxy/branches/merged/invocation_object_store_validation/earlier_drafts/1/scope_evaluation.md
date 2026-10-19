Keep the implemented narrow scope: early validation of the three invocation object-store preference fields, including moving their existing mutual-exclusion guard before history creation. This is an independent `release_26.2` bug fix and does not require the larger invocation-validation refactor.

## As implemented

Validate each explicitly selected store through Galaxy's existing preference validator before request histories are created. Keep the existing general/split exclusivity rule alongside it and verify rejection through a parametrized API test.

| Pros | Cons |
| --- | --- |
| Covers all three sibling fields consistently; preserves existing policy; independently reviewable; prevents an observable history side effect. | Broad invocation validation still has separate remaining work. |

## Smaller: validate stores without moving the existing exclusivity guard

Add the preference checks early but leave general/split conflicts checked after history creation.

| Pros | Cons |
| --- | --- |
| Slightly fewer moved lines. | Leaves closely related validation in two places and preserves avoidable history creation for an invalid preference combination. |

## Larger: generalized invocation preflight

Introduce shared request validation or move the wider data resolution/runtime-state checks before all history changes.

| Pros | Cons |
| --- | --- |
| Could eventually cover additional invalid-request side effects. | Reintroduces the broad resolver scope being split apart; adds unrelated regressions and dependencies; obscures this simple fix. |

No scope change is recommended. The planned existing integration positive controls are validation of the chosen scope rather than an expansion of production behavior.
