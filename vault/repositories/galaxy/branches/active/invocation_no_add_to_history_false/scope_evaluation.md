Recommend retaining the implemented narrow scope: correct the value semantics of no_add_to_history and cover omitted, false, and true through the workflow invocation API. No expansion or contraction is needed; transaction side effects, invocation-wide validation, and additional input-source matrices should remain separate work.

## As implemented

Replace presence checking with value checking, with cross-history HDA API coverage. This is independently reviewable and needs no invocation-validation redesign.

| Pros | Cons |
| --- | --- |
| Small fix with direct regression and omission/true controls. | Does not guarantee broader invocation atomicity. |

## Expand input-source coverage

Add collection/library input cases and optional explicit null coverage. The shared flag already controls these paths.

| Pros | Cons |
| Broader confidence across input sources. | Extra setup/runtime beyond what demonstrates this bug. |

## Expand invocation validation

Include missing-object handling, early validation, or side-effect guarantees from issue_20900. Those address distinct failure modes and belong in separate work.

| Pros | Cons |
| Addresses more original-issue behavior. | Couples this independently correct fix to larger changes. |

## Contract to implementation only

Omit the API regression and ship only the flag correction.

| Pros | Cons |
| Smallest patch. | Leaves the actual API serialization boundary and bug unprotected; not recommended. |
