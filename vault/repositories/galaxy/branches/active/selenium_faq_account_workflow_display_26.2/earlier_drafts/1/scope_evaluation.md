Recommend a modest expansion: make the new display-application inspection helper return an empty catalog for datasets with no configured display applications, and cover that case with a browser test.

## Possible Decompositions

The branch exceeds 100 lines of non-generated additions. The following logical PR boundaries are available for John to choose; this report does not recommend splitting the branch.

1. **Account FAQ helpers and storage refresh:** reset-request extraction, Manage Information navigation/save extraction, storage refresh selectors/helper/test, and their screenshots. Within that PR, keep the storage baseline test before its extraction. No dependency on the other pieces.
2. **Workflow editor FAQ helpers:** editor tags navigation/helper/test and Best Practices inspection plus existing consumer migration. Keep the tagging baseline before the helper extraction. Independent of account and dataset pieces.
3. **Dataset display-application coverage and helper:** the populated-catalog baseline test, stable hooks for both client link variants, and catalog inspection helper. The recommended empty-catalog expansion belongs here. Independent of the first two pieces.

They could land in any order. The current combined baseline commit would need partitioning if split into PRs, preserving each piece's baseline-before-refactor order.

## Scope as implemented

Extract the five selected FAQ commits into one release_26.2 branch: new storage refresh, editor tagging and dataset display coverage; reusable reset-request, profile, Best Practices and catalog helpers; navigation hooks, waits and screenshots. Keep the real password-reset/session work on its separate branch.

| Pros | Cons |
| --- | --- |
| • Meets the selected FAQ extraction goal.<br>• Consolidates browser interaction in the canonical helper layer.<br>• Baseline tests precede the refactor. | • Catalog inspection is only exercised for a dataset with applications.<br>• A normal empty catalog is outside the helper's currently usable cases. |

## Modest expansion: inspect empty display-application catalogs

Give `dataset_display_applications(hid)` a complete catalog-reading contract for a loaded dataset: return its applications when present and `{}` when none are configured. Add one browser case using a local dataset type without display applications, with an observable readiness boundary separating provider loading from an empty result.

| Pros | Cons |
| --- | --- |
| • Generalizes the new helper to an ordinary dataset state.<br>• Makes absence useful to automation instead of yielding an item-presence timeout.<br>• Stays within the touched component and existing result type. | • Requires a readiness marker or equivalent observable state.<br>• Needs one additional browser scenario and fresh hardening of that change. |

<details>
<summary>Why this is the preferred expansion</summary>

The source helper waits for an application list item before reading the catalog. That gives it a useful populated-catalog operation, but excludes datasets whose valid catalog is empty. The existing component already supports both cases; the proposed expansion extends the browser abstraction across that existing UI distinction rather than adding an application feature or a new execution mode.

Retain the existing populated UCSC test and its API-backed expectations. The empty case should establish that dataset/provider loading has completed before asserting the empty result; an immediate empty element lookup would erase the distinction between loading and absence. The helper's return type and current callers need not change.

The required scope process defaults toward modest generalization when it gives the abstraction another real use case. This qualifies more directly than adding another unrelated FAQ or broadening product behavior. The recommendation is not based on correctness or formatting concerns, which other reviews have already handled.

</details>

## Broader expansion: inspect display-link destinations

Extend the catalog result to include each link's destination and target, and verify that modern application routes and legacy external links remain actionable. This would cover link construction beyond the current label/text catalog.

| Pros | Cons |
| --- | --- |
| • Adds a stronger user-facing link contract.<br>• Distinguishes legacy and modern navigation semantics. | • Changes the proposed reusable return shape.<br>• Adds a second independent expansion beyond the ordinary empty-catalog gap. |

Defer this broader shape change. The selected empty-catalog expansion keeps the current helper contract small and useful without requiring external-site navigation.

## Contract to coverage without reusable helpers

Retain the three baseline tests with inline browser interactions and omit the helper extraction, existing consumer migrations and new stable display hooks.

| Pros | Cons |
| --- | --- |
| • Smaller helper API surface.<br>• Keeps the existing-UI coverage independently reviewable. | • Does not meet the explicit goal of extending browser interaction abstractions.<br>• Retains duplicated profile paths and raw display traversal.<br>• Leaves source helpers unavailable for QA automation. |

Do not contract this way. Reusable abstractions are part of the requested outcome, not incidental cleanup.

## Broader account recovery and neighboring FAQ batches

Combine real emailed reset and expired-password/session regressions, additional FAQ coverage, gxui verb changes, or GTN documentation updates with this extraction.

| Pros | Cons |
| --- | --- |
| • Could consolidate more training-run findings.<br>• Would exercise additional account and CLI paths. | • Duplicates the explicitly separate issue_24457 release_25.1 work.<br>• Combines independent batch and consumer changes.<br>• Provides no necessary prerequisite for this helper extraction. |

Do not add these independent workstreams. Their exclusion follows the task's established division of work, not a general objection to release-branch changes.

## Prior reviews and disposition

Normal review requested a direct Best Practices result-map assertion; that is already implemented. Test challenges and strict quality review identified no further scope expansion or contraction. E2E polish added the three surface screenshots and is already incorporated.

No implementation or history was changed during this evaluation. Stop here for the coordinator to follow the prescribed rescope workflow for the recommended empty-catalog expansion; existing review and runtime evidence still describe the pre-expansion implementation.
