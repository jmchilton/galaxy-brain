Recommend retaining the implemented one-line scope: classify existing workflow_parameter_invalid failures as expected for scheduler logging. No scope expansion or contraction is needed; this remains independent of the invocation request-validation redesign and the no_add_to_history correction.

## As implemented

Add the existing failure reason to the existing expected-failure tuple. Runtime already emits the reason; the change corrects logging classification without altering invocation acceptance or failure behavior.

| Pros | Cons |
| --- | --- |
| Tiny independently reviewable correction using the shared mechanism. | Does not address underlying invalid requests or their side effects. |

## Expand logging regression coverage

Add a scheduler-level test that triggers invalid parameter failure and observes info/error logging. This could document the behavior but is optional for a single classification entry; a membership-only test would duplicate the implementation.

| Pros | Cons |
| Explicit end-to-end coverage of the logging distinction. | Disproportionate setup for a small classification change. |

## Expand into request validation

Include earlier parameter validation and other request checks from issue_20900. Those change when requests fail and need independent review.

| Pros | Cons |
| Addresses more original-issue behavior. | Couples a logging correction to acceptance-policy and transaction changes. |

## Drop this extraction

Leave invalid workflow parameters classified as unexpected while upstreaming other fixes first.

| Pros | Cons |
| One fewer branch to review. | Retains unnecessarily severe logs for existing user-actionable validation failures. |
