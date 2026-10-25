Recommend **KEEP the expanded scope**: validate discovered completion-action names and delegate immediately checkable configuration validation to each hook before history/invocation creation, with export enforcing an object and required nonempty string target_uri. This is the second evaluation after the approved expansion; the adjacent submission contract is now covered without changing optional export formats/options or destination/execution semantics.

## As implemented: hook-owned submission validation

The service resolves each action through the shared registry and calls an optional, backward-compatible validation method. Export rejects guaranteed-invalid required configuration; config-free notification actions and existing subclasses inherit accepting validation.

| Pros | Cons |
| --- | --- |
| • Covers the adjacent defect identified by the first revised scope evaluation.<br>• Central submission boundary prevents history/invocation side effects.<br>• Preserves plugin ownership and existing option semantics.<br>• Real API regressions and positive controls cover the contract. | • Previously accepted unusable export requests now receive 400.<br>• Hook authors have one optional interface method.<br>• Destination failures still surface at completion. |

## Modest alternative: fully validate optional export options

Validate format and include_files/include_hidden/include_deleted together with target_uri, potentially sharing a typed export configuration model with execution. This goes beyond required export configuration by choosing strictness/coercion rules for options that currently have fallback behavior.

| Pros | Cons |
| --- | --- |
| • Earlier feedback for more malformed option values.<br>• A shared model could eventually simplify execution. | • Strict format validation would change existing fallback semantics.<br>• Model coercion could silently alter persisted requests.<br>• Needs an explicit option compatibility contract and matching execution changes. |

<details>
<summary>Why the completed expansion is sufficient</summary>

The revised scope policy favors modest generalization and related fixes, and the first revised evaluation already applied that policy: names-only validation expanded into a hook-owned required-configuration contract. That expansion now fixes the adjacent known-export failure shapes at the same submission boundary. Optional formats and boolean options have separate established interpretation/fallback behavior; changing that behavior is an additional contract decision rather than another missing part of the required URI check. This recommendation is based on the concrete ownership and behavior boundary, not the release target or original issue wording.

The prior reviews discussed configuration shape, destination resolution, extension compatibility and repeated actions. Shape is now addressed; extension compatibility is preserved by a nonabstract accepting default, exercised by notification None/{}. No earlier review requested optional-option strictness as a condition of correctness. Fresh test challenge retained all negative coverage and improved existing helper reuse.

</details>

## Broader alternative: resolve and validate destinations at submission

Resolve file-source availability, access and destination details while validating the request, optionally testing an actual export destination end to end.

| Pros | Cons |
| --- | --- |
| • Earlier destination-specific errors.<br>• Can improve export observability. | • Destination state may change before completion.<br>• Moves execution context/I/O into submission.<br>• Needs lifecycle and access-policy decisions beyond shape validation. |

## Adjacent alternative: repeated-action semantics

Define whether duplicate action names execute each configuration, deduplicate or reject. The existing monitor/export paths have their own repetition contract independent of validating each submitted configuration.

| Pros | Cons |
| --- | --- |
| • Clarifies a neighboring API ambiguity.<br>• Could prevent redundant scheduling. | • Requires choosing new execution semantics.<br>• Changes monitor/export lookup behavior.<br>• Independent of required configuration validity. |

## Contracted alternative: restore names-only validation

Keep the original registry guard but remove configuration validation and the hook interface.

| Pros | Cons |
| --- | --- |
| • Smaller diff and fewer hook methods. | • Reintroduces accepted guaranteed-invalid export requests.<br>• Discards the first evaluation's useful generalization.<br>• Makes submission validation inconsistent across names and required payloads. |

Assessment read the expanded working tree against the release base, archived first scope recommendation, implementation evidence, current normal/challenge/quality reviews, schema and hook/registry/execution paths. No further expansion or contraction recommended.
