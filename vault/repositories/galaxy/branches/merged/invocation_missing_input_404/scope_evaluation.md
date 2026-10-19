Recommend retaining the narrow missing-input scope: return HTTP 404 for nonexistent hda, ldda, ld, and hdca invocation inputs while preserving existing resolution and access checks. No expansion or contraction is needed; early validation, deleted-input policy, history side-effect guarantees, and input-type validation remain separate work.

## As implemented

Add direct absence guards to the four existing input-source branches and one parametrized API regression. Preserve the collection manager call and library conversion paths.

| Pros | Cons |
| --- | --- |
| Consistent missing-object responses across supported sources; independently reviewable. | Does not promise atomicity for invalid invocation requests. |

## Contract to datasets only

Fix hda, ldda, and ld while leaving collections for later.

| Pros | Cons |
| Slightly smaller implementation. | Leaves an equivalent supported-source inconsistency; not recommended. |

## Expand invalid-input coverage

Add malformed IDs, deleted objects, incompatible input types, or missing library associations. These are distinct contracts rather than nonexistent top-level objects.

| Pros | Cons |
| Covers more invalid-input categories. | Couples separate policies to a straightforward 404 correction. |

## Expand into invocation preflight validation

Move all validation before history creation and input copying, as in the larger issue_20900 branch.

| Pros | Cons |
| Can establish stronger side-effect guarantees. | Requires the larger resolver/materialization redesign and loses this narrow extraction. |
