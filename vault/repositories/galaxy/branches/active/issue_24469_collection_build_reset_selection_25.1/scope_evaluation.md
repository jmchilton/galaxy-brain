Recommend keeping the scope as implemented. All three collection-build entry points in `SelectionOperations.vue` (Auto Build List, Advanced Build List, Build Dataset List for an all-in-query selection) now leave selection mode, which covers the issue and the rules-builder path inside `ListWizard`; the remaining candidate (clear only on successful create, keep selection on wizard cancel) is a UX refinement that needs new wizard-to-history plumbing and is better left as a reviewer-driven follow-up.

## As implemented

`listWizard()` and the restored `createdCollection()` emit `update:show-selection` false; `useSelectedItems` watch resets the selection. Baseline Jest, one Jest modal test, Selenium assertions in two builder tests.

| Pros | Cons |
|---|---|
| - Tiny, release-safe diff (~47 lines)<br>- Covers every build entry point, not just the dangling handler the issue named<br>- Matches existing `runOnSelection` pattern | - Cancelling the wizard drops the selection (behavior change)<br>- Selection cleared on hand-off, not on actual creation |

## Expansion: clear on successful create only

Keep selection while `ListWizard` is open; clear it only when the wizard/rules builder actually creates a collection (e.g. store flag or event the history panel watches).

| Pros | Cons |
|---|---|
| - No selection loss on cancel/back<br>- Semantically exactly what the issue asks | - Needs cross-route plumbing (wizard lives on `/collection/new_list`, history panel elsewhere)<br>- Touches `ListWizard`, store, and history panel; larger for 25.1<br>- Stale selection risk if user edits history mid-wizard |

## Expansion: other selection operations

Audit other dropdown actions (change dbkey, tags, hide/delete/purge) for the same stale-selection bug.

| Pros | Cons |
|---|---|
| - Related code, same symptom class | - Already go through `runOnSelection`, which clears selection; nothing to fix found |

## Contraction: restore `createdCollection` handler only

Literal issue fix.

| Pros | Cons |
|---|---|
| - Smallest possible | - Does not fix the issue's repro (Auto/Advanced Build go through `listWizard`, not the modal) |

<details>
Same structure on `release_26.2` and `dev`, so the fix forward-merges cleanly. The `CollectionCreatorIndex` missing `extendedCollectionType` prop warning is pre-existing and unrelated.
</details>
