Retain the approved prep/feature split at its current boundaries; no new scope change or user decision is recommended. Prep contains independently useful fixes and baseline tests, and the GenericItem API remains with its feature consumers as the user explicitly requested. The completed extraction is 204 changed lines across 12 files, in five atomic commits ending at `60dc8ddf598`.

## As implemented: independent prep fixes and baseline coverage — recommended

From base `88127f42979`, fix eight invocation record lookups by order_index and graph centering before measurements are available; improve baseline notebook-router coverage, metrics isolation, and the existing job screenshot wait. Each of the five commits can be reviewed as an independent behavior correction or test improvement without the selection module.

| Pros | Cons |
| --- | --- |
| • Matches the user's approved split.<br>• Shrinks the dependent feature review.<br>• Contains no unused API foundation or URL behavior. | • Requires independent prep validation.<br>• Feature remains stacked on prep until integration. |

## Reduce prep to order-index lookup only

Keep only the imported-step correctness fix and regression in prep; return graph measurement handling and baseline test improvements to the feature. This is a smaller initial patch, but removes already approved independent changes from their useful review boundary.

| Pros | Cons |
| --- | --- |
| • One especially narrow prep topic. | • Enlarges the feature again.<br>• Discards the user's approved five-commit organization without a demonstrated need.<br>• Adds rebase and revalidation work. |

## Expand prep with controlled GenericItem expansion or tab machinery

Move the new GenericItem expansion interface, named-tab state, or selection synchronization into prep before their production consumers. This was considered during extraction; the user expressly excluded unused foundations.

| Pros | Cons |
| --- | --- |
| • Could reduce the remaining feature diff numerically. | • Violates the selected boundary.<br>• Leaves feature-specific interfaces without consumers.<br>• Entangles prep with new lifecycle/state behavior. |

## Expand to every remaining positional invocation lookup

Include other pre-existing consumers, such as the untouched feedback component. That would be a separate completeness exercise rather than extraction of the reviewed feature's eight lookup fixes.

| Pros | Cons |
| --- | --- |
| • Could make repository-wide lookup handling more consistent. | • Breaks the exact extracted-tree invariant.<br>• Requires additional behavior/tests beyond approved extraction.<br>• No current review finding requires it. |

<details><summary>Assessment basis and remaining gates</summary>

Read the shared scope evaluation procedure, prep initial debrief and normal/strict review context, original feature scope assessment and extraction notes, and the committed prep/stacked feature ranges. This review assesses scope only and does not repeat correctness or execute tests. Prep has no GenericItem, selection-composable, or route-reuse change. Runtime prep tests/browser checks and the fresh challenge are being completed by their owners; incomplete validation is a handoff gate, not a reason to change scope. The feature's final tree is exactly equal before and after rebase, so extraction has not changed the accepted feature capability.

</details>
