Keep the expanded scope. Tool readiness now validates the entire workflow tree before history creation using one lookup per distinct complete reference; the first recommended expansion fixes recursive duplicate diagnostics while preserving distinct versions/UUIDs, lookup semantics and missing-tool precedence. No additional scope change is needed.

## As implemented: early readiness with unique recursive references

Reject unavailable and incompatible tools before run-config mutation, then preserve runtime backstops. Apply the collector's existing complete-reference uniqueness to child merges; test nested incompatibility, mixed missing/incompatible precedence and repeated/distinct-version diagnostics through real requests.

| Pros | Cons |
| --- | --- |
| • Covers parent and nested workflows consistently.<br>• Removes duplicate diagnostics/lookups without losing version/UUID identity.<br>• Shared collector correction benefits other reference-based consumers. | • Shared manager change requires considering list/agent consumers.<br>• Existing list-based equality retains quadratic worst-case collection cost. |

## Modest additional expansion: unify recursive collection with a typed keyed set

Introduce a typed tool-reference model and ordered keyed collection to reduce repeated dictionary construction and membership cost. This is a plausible structural improvement, but the present code has no new identity ambiguity or observed scale defect; the tiny child-merge correction already restores its existing contract across every recursion level.

| Pros | Cons |
| --- | --- |
| • Stronger reference typing and faster membership for large trees. | • Changes shared representation/caller contracts.<br>• Adds a model/key migration to a behavior fix without demonstrated need. |

## Modest additional expansion: compatibility metadata category matrix

Add wrappers for explicit incompatible declarations, eager/lazy forms and arbitrary UUID combinations. Current lookup receives unchanged kwargs and reads the same already-supported compatibility property used by runtime checks, so this adds metadata-parser coverage rather than correcting another exposed readiness gap.

| Pros | Cons |
| --- | --- |
| • More metadata/identity combinations exercised. | • Duplicates existing parsing/lookup contracts.<br>• Requires fixture/tool management beyond the concrete recursive readiness behavior. |

## Smaller: nested tests without deduplication

Keep the early service check but accept repeated messages and lookups for the same parent/child reference.

| Pros | Cons |
| --- | --- |
| • Omits shared-manager change. | • Restores the demonstrated duplicate-diagnostic defect.<br>• Leaves local and nested collection inconsistent. |

## Larger: combined invocation readiness framework

Combine tool readiness with storage, hook, wiring and parameter preflight.

| Pros | Cons |
| --- | --- |
| • Could centralize future mutation boundaries. | • Recombines independently reviewable concerns.<br>• Requires separate parameter/input/runtime design and validation. |

This is the second evaluation under the revised expansion-oriented process. The recommendation follows concrete completeness of the now-recursive reference boundary, not release conservatism or original issue wording. The prior expansion rationale is archived in earlier_drafts/2/scope_evaluation.md.
