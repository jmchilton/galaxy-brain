Expand modestly: make tool-readiness references unique across the entire nested workflow tree and add nested invocation regressions. The current recursive collector deduplicates only inside each workflow; identical references across parent/child boundaries are looked up repeatedly and repeated in missing/incompatible diagnostics. Preserve distinct versions/UUIDs, traversal order, missing-tool precedence and the early rejection boundary.

## As implemented

At polished head `27e7daa34344d1a99066102e57dd45e894acac41`, reject unavailable or incompatible tools before run-configuration creation. Reuse existing recursive collection, lookup options and eager/lazy compatibility metadata, with the scheduling backstop intact.

| Pros | Cons |
| --- | --- |
| • Prevents requested history/invocation creation for invalid tools.<br>• Preserves missing-tool diagnostics and resolution semantics. | • Repeated references across nested boundaries produce duplicate diagnostics and lookups.<br>• Existing new API cases exercise top-level tools only. |

## Recommended modest expansion: unique recursive references

Apply the existing complete-reference uniqueness rule when `WorkflowsContentsManager.get_all_tools` merges subworkflow results. Add API cases for parent/nested occurrences of incompatible and missing tools, including exact/plain missing diagnostics and absence of requested history/invocation effects.

| Pros | Cons |
| --- | --- |
| • Generalizes an existing local contract to the complete tree.<br>• Eliminates duplicated diagnostics and redundant lookups.<br>• Exercises recursive behavior through the real API. | • Adds a small shared-manager change.<br>• Other collector callers must retain their distinct-reference information. |

<details><summary>Concrete boundary and prior review considerations</summary>

`get_all_tools` already checks dictionary membership for local tool references containing tool ID, version and UUID, but merges children with unconditional `tools.extend(...)`. Use the same equality-based membership check during child merging; retain first occurrence order and distinct versions/UUIDs. No new cache, generic validation framework or traversal abstraction is needed.

Other callers are the workflow-list missing-tools filter and agent workflow readiness reporting. Both consume tool references rather than step occurrences; uniqueness preserves their required information. Inspect their uses while implementing. API coverage should assert one diagnostic entry per identical reference. Test distinct versions separately only where the real API fixture preserves that distinction; retain existing exact-version/plain errors and compatible execution controls.

Prior normal/test reviews inferred recursive behavior from collector reuse, and the old scope report compared only the current fix, a smaller late check and a much broader preflight. This intermediate alternative directly follows the revised preference for modest generalization.

</details>

## Alternative modest expansion: nested tests alone

Add a nested incompatible-tool regression without changing collection semantics, optionally also testing explicitly disabled workflow compatibility.

| Pros | Cons |
| --- | --- |
| • Strengthens existing recursive coverage cheaply. | • Leaves duplicate nested diagnostics and repeated lookups.<br>• Additional metadata categories mostly retest existing compatibility parsing. |

## Contraction: check compatibility after constructing run configurations

Retain the old validation location and add incompatibility rejection there.

| Pros | Cons |
| --- | --- |
| • Fewer moved lines. | • Leaves unwanted requested histories.<br>• Sacrifices the motivating early rejection behavior. |

## Larger expansion: generalized readiness preflight

Unify tool readiness with object stores, scheduler, completion hooks, subworkflow wiring and input validation.

| Pros | Cons |
| --- | --- |
| • Could eventually provide comprehensive request readiness. | • Recombines independently reviewable fixes.<br>• Introduces separate input/runtime design decisions and validation. |

Preserve the original branch as `invocation_tool_compatibility_alt_original_scope`; implement the modest expansion and rerun required independent reviews and scope evaluation. Historical results remain evidence for unchanged behavior, not validation of the collector change and new assertions.
