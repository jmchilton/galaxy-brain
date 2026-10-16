Keep the implemented scope: reject unavailable or workflow-incompatible tools before creating invocation run configurations, while preserving missing-tool lookup and diagnostics. This remains an independent `release_26.2` bug fix and does not need the larger input/runtime validation refactor.

## As implemented

Move the existing tool-availability check before request side effects and reuse each resolved tool to inspect compatibility. Keep the existing recursive tool-reference traversal, exactness policy, error precedence, and runtime backstop.

| Pros | Cons |
| --- | --- |
| Independent guard; one lookup per reference; preserves existing diagnostics; works with cached metadata; prevents orphan histories. | Adds a service helper and exposes an existing compatibility field in the protocol. |

## Smaller: add compatibility checking after run configuration construction

Leave existing tool checking in place and reject incompatible tools alongside it.

| Pros | Cons |
| --- | --- |
| Fewer moved lines. | Preserves orphan histories and misses the intended early rejection contract. |

## Larger: generalized workflow readiness preflight

Combine tool readiness with scheduler, completion actions, input resolution, and runtime-state checks behind a generalized validation stage.

| Pros | Cons |
| --- | --- |
| Could eventually establish broader request atomicity. | Reintroduces the large change being split apart and creates unrelated dependencies and review risk. |

No scope change is recommended. Positive compatible-tool tests and existing invocation/hook tests validate this scope without expanding it.
