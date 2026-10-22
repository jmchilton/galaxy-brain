# Scope evaluation

**Recommendation: a modest expansion (Scope B).** Fix the `HistoryPanel.vue` optimistic-hide bug in this branch, then tighten the delete E2E so it asserts hid 1 reappears right after Undelete instead of only after the filter toggle. The bug affects delete under Include deleted, undelete, and unhide under Include hidden. The test exercises exactly that flow and currently routes around the bug. The normal review already has a 10-line fix built on `HistoryFilters.testFilters`. Making the branch non-test-only costs little on 26.2. Also take the two client test hooks (Scope C) once the branch has a client change, because they cost one line each. Leave config guards, the selection-menu helper and the populator helper out.

## Possible Decompositions

The branch has 141 hand-written lines (navigation.yml, navigates_galaxy.py and three test files) in 3 commits: `5d033654e90` helper refactor, `ca59e69ae61` delete test, `b1288fcd9b1` privacy test. The two tests share no code and merge independently.

1. **As is: one PR, 3 commits.** The refactor lands first.
2. **Two PRs, one per test.**
   - PR 1: helper refactor plus the delete test, about 70 lines.
   - PR 2: the privacy test, about 70 lines. It is the 26.2 private-by-default coverage.
   - Neither depends on the other.
3. **Three PRs.**
   - The helper refactor as a trivial standalone PR, landing first.
   - The delete test and the privacy test after it, in either order.
4. **If Scope B is taken.**
   - Client PR: the HistoryPanel fix plus a vitest, possibly targeting a different base.
   - The current branch, then rebased to tighten the undelete assert.
   - Alternatively, land the E2E as is and follow up with the assert change in the client PR.

## A. As implemented

Three commits on `release_26.2`: a `history_panel_item_delete` refactor (also used by `test_rerun_deleted_dataset`), E2E for trash/bulk delete/purge/Include deleted/Undelete, and E2E for the Make new datasets private preference and the dataset Permissions tab.

| Pros | Cons |
|---|---|
| Test-only, so there is no product risk on a release branch | The delete test works around a real bug it found, asserting after a filter toggle |
| Hardened through five reviews, green under both drivers | The new switch and Permissions tab selectors rely on a generic `name="check-button"` and on localized tab text |
| Merges cleanly with every queued 26.2 selenium sibling | The bug stays filed only in debriefs |

## B. Add the HistoryPanel optimistic-hide fix (recommended)

`onDelete`, `onUndelete` and `onUnhide` call `setInvisible` up front. Under `deleted:any` or `visible:any`, `historyItems` never re-evaluates, so the item stays hidden until the filter changes. The fix hides the item only when the change would take it out of the current filter (`hideIfFilteredOut`, which reuses the store's filter test). Add a vitest covering all three cases: delete and undelete under `deleted:any`, and unhide under `visible:any`. Change the E2E to `history_panel_wait_for_hid_visible(1)` straight after `history_panel_item_undelete(1)`.

| Pros | Cons |
|---|---|
| Fixes a user-visible bug in exactly the flow this branch tests | Ends the branch's test-only status, though that was a convenience, not a requirement |
| One root cause, fixed at three call sites; the fix is already drafted | `HistoryPanel.vue` has no vitest today, so a mounted test needs store scaffolding and is the real cost |
| The E2E stops pinning a workaround and asserts the intended behavior | The bug is on dev too, so the fix may draw a "target dev?" question (Galaxy is liberal on 26.2) |
| Reviewers prefer a bug fixed together with the test that found it | Changes a `watch`-adjacent UI path; there is a small risk of re-showing an item that should hide (the `related` filter exclusion must mirror the store) |

<details><summary>Details</summary>

The normal review moves the mechanism away from the initial debrief's explanation. `watch(historyItems)` should un-hide the item, but `removeAny` drops `deleted:any` from the parsed filters, so the computed never depends on `deleted`, and `mergeArray` mutates items in place. The fix diff is in `subagents/normal_review_debrief.md`. Its alternative, `watch(..., { deep: true })`, was rejected as too costly and flicker-prone. Both prior debriefs left this as a "Question for John" rather than deciding it, so it is open, not settled. If John wants the branch to stay test-only, ship B as its own client PR (decomposition 4).

</details>

## C. Client test hooks for the new selectors

Add `data-description="make new datasets private"` to the `DatasetPermissionsForm.vue` switch and `title-link-class="dataset-edit-permissions-tab"` to the Permissions `GTab`. Then point `navigation.yml` at them, replacing the `name="check-button"` CSS and the text XPath.

| Pros | Cons |
|---|---|
| One line each; matches the sibling `datatypes_tab` | Client change; free only if B is also taken |
| The selectors survive localization and stay unambiguous if `DatasetPermissionsForm` appears twice on a page | The `+ label` sibling selector must be rechecked against where BFormCheckbox places the attribute |
| Lets a future History > Dataset Permissions test reuse the component | |

## D. Guard on server config (Codex P2s)

Set the initial switch state through the setter instead of asserting it starts on, and skip the purge when `allow_user_dataset_purge` is false.

| Pros | Cons |
|---|---|
| Passes against externally configured servers | Drops the assertion that pins 26.2's new private-by-default, which motivates the test |
| | No selenium test guards on server config; `test_histories_list` already purges unconditionally |

## E. Shared Selection-menu helper

Add `history_panel_selection_menu_option(option)` and route `history_panel_delete_selected`, the build-list helpers, and the local wrappers in `test_collection_edit.py` and `test_collection_builders.py` through it.

| Pros | Cons |
|---|---|
| Collapses four call shapes of `use_bootstrap_dropdown(..., menu="selected content menu")` into one | Already declined twice as out of scope; touches unrelated tests and risks conflicts with the 26.2 sibling branches |
| | Each wrapper is a single line, so little is gained |

## F. Populator helper for `datasets/{id}`

A helper for the raw `datasets/{id}` GET that `test_datasets.py` and `test_dataset_collections.py` repeat.

| Pros | Cons |
|---|---|
| Removes the duplication in API tests | This branch no longer uses the raw GET; it uses `get_history_dataset_details`, so the helper belongs to unrelated code |

## G. Contract: drop the refactor commit

Fold `history_panel_item_delete` back into the delete-test commit and leave `test_tool_form` alone.

| Pros | Cons |
|---|---|
| One fewer commit | Loses the only reuse of the new helper; it is a gxui verb, so the helper stays either way |
