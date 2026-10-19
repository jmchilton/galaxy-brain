Recommend retaining the narrow scheduler-validation scope: reject an explicitly named unknown workflow scheduler with HTTP 400 using the existing scheduler registry, while preserving omitted and configured scheduler behavior. No expansion or contraction is needed; completion hooks, tool compatibility, and broader invocation validation remain separate work.

## As implemented

Check a nonempty supplied scheduler against the manager registry before building run configurations. Cover unknown-name rejection and omitted/default acceptance through the invocation API.

| Pros | Cons |
| --- | --- |
| Small independently useful fix with acceptance controls and existing infrastructure. | Does not establish broader invalid-request atomicity guarantees. |

## Expand scheduler policy and configuration coverage

Define new behavior for empty or null values and test custom scheduler registries with integration configuration. This is optional follow-up rather than necessary for the unknown-name fix.

| Pros | Cons |
| Broader explicit scheduler contract. | Additional policy choices and custom test setup beyond the reproduced bug. |

## Expand invocation preflight validation

Include completion-hook checks, tool compatibility, and other issue_20900 validation changes.

| Pros | Cons |
| Addresses more invalid invocation modes. | Introduces unrelated dependencies and loses the reviewable scheduler-only extraction. |

## Contract away acceptance controls

Test only unknown-name rejection. This would reduce the already small test but remove protection for normal invocation paths.

| Pros | Cons |
| Fewer parameter cases. | Weaker confidence in preserving omission/default behavior; not recommended. |
