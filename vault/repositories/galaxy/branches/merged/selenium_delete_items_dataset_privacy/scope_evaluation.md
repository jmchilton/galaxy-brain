# Scope evaluation (second, after re-scope)

**Recommendation: expand, by a small amount (Scope B).** The re-scope landed what round 1 asked for: the HistoryPanel fix, the tightened E2E, and the client hooks. One related gap is left in the exact functions the fix touches. `onUndelete` and `onUnhide` have no `catch`, unlike `onDelete`. If their PUT fails under a filter that hides the item (Show deleted only / Show hidden only), the row stays hidden and no error shows. That is the same stuck-hidden symptom this branch fixes, now on the failure path. Fixing it means routing both handlers through an `updateItem(item, change)` helper that un-hides and calls `onOperationError` on failure, the way `onDelete` does. That is about 8 lines of logic plus one vitest failure case in the existing `it.each`. The thermo-nuclear review already proposed the helper and deferred it to dev. That is the "follow-up" reasoning John has overridden before. Everything else raised (config guards, menu/populator helpers, TS conversion, dropping the optimistic hide, the dead `onHideSelection`) should stay out. If John would rather ship now, keeping the branch as is (Scope A) is a sound fallback: the gap is pre-existing and only reachable on failure.

## Possible Decompositions

The branch has about 270 hand-written lines across 5 commits:

1. `fa168dd5e85`: Baseline tests, the privacy E2E plus its 2 client hooks
2. `84c60401e4c`: `history_panel_item_delete` helper
3. `4a8ee762bf2`: `getClientFilters`/`itemPassesFilters` extraction
4. `166ea66a203`: the HistoryPanel fix plus the vitest
5. `b2722375165`: the delete/undelete/purge and unhide E2E

**The 26.0 question.** These facts come from read-only checks against `origin/release_26.0` and `origin/release_26.1`:

- **The privacy test is pinned to 26.2.** `new_user_dataset_access_role_default_private` defaults to `false` on 26.0 and 26.1 and to `true` on 26.2 and dev. The test asserts the switch starts on, so commit 1 can't move.
- **The bug and the fix apply to 26.0 and later.** All bases have the same 3 `setInvisible(item)` calls. 26.0 is within policy (v26.0.0 was released 2026-04-09). Policy for a standalone fix this simple would point at 26.0.
- **Backport cost for commits 3+4, or 2–5:**
  - `git merge-tree` onto both 26.0 and 26.1 conflicts in `HistoryFilters.js` and `HistoryView.test.js`.
  - `HistoryPanel.vue` and `historyItemsStore.ts` merge cleanly.
  - The `HistoryFilters.js` conflict is trivial: the constructor line differs (`new Filtering(validFilters)` vs 26.2's 4-arg call), right next to the appended helpers.
  - The vitest needs real adapting. 26.0 and 26.1 run Vue 2 test-utils (26.1's `HistoryView.test.js` uses `destroy()`, 26.0 has neither call), while the branch uses `wrapper.unmount()`.
  - The forward merge 26.0 → 26.2 would then conflict again in the same two files. That is routine for the release managers, but it is a cost.

Options (not a recommendation):

1. **One 26.2 PR, as is** (5 commits, plus B if taken). There is no backport work. The bug stays unfixed on 26.0 and 26.1, and a reviewer may ask "why not 26.0?"
2. **Two PRs, split by base.**
   - 26.0 PR: commits 2–5. This is the fix plus the E2E that found it, with the vitest ported to Vue 2.
   - 26.2 PR: commit 1 alone (privacy E2E plus hooks). It has no dependency on the 26.0 PR.
   - The E2E helpers in commit 2/5 use `history_panel_muli_operation_select_hid` and HistoryCounter `data-description`s, which both exist on 26.0, so the E2E itself should port. That still needs to be confirmed by a run on 26.0.
3. **Three PRs.**
   - 26.0 fix-only PR: commits 3+4.
   - 26.2 PR: commits 1, 2 and 5, once the fix merges forward. The E2E's tightened undelete/unhide asserts need the fix on 26.2.
   - The 26.2 privacy PR could also go separately and immediately.
4. **Privacy split only, all on 26.2.**
   - PR A: commit 1.
   - PR B: commits 2–5.
   - This keeps the review surfaces separate (privacy preference vs history panel) with no backport work.

Under any option, Scope B goes with commit 4 (same functions, same vitest).

## A. As implemented

Five commits on `release_26.2`:
- privacy-preference E2E with client test hooks, as a baseline
- delete-helper refactor
- filter-predicate extraction
- HistoryPanel fix so delete, undelete and unhide no longer hide an item the current filter still keeps
- E2E for delete/undelete/purge/Include deleted and unhide/Include hidden

| Pros | Cons |
|---|---|
| Fixes the bug the hardened E2E found, at its root, using the store's own predicate | `onUndelete`/`onUnhide` still have no failure handling, in the functions just touched |
| Every review since the re-scope says ship (re-scope review, Codex P2 acted on, thermo-nuclear approve) | The fix targets 26.2 even though the bug exists on 26.0 and later |
| The vitest is shown red (3 cases) before the fix; E2E is green under both drivers | Bundles two unrelated features (privacy preference, history panel) in one PR |

## B. Failure handling for undelete/unhide (recommended)

Add `updateItem(item, change)`:
- it calls `hideIfFilteredOut(item, change)`
- then `updateContentFields`
- on `catch`, it clears `invisibleHistoryItems[hid]` and calls `onOperationError`
- `finally` keeps `isLoading` handling

`onUndelete` and `onUnhide` become one-liners. Add one vitest case to the existing `it.each`: a failing PUT under "show deleted" keeps the row and shows the error.

| Pros | Cons |
|---|---|
| Closes the same stuck-hidden symptom on the failure path, in the same functions | Reachable only on failure: network or session loss, or a concurrent purge. Purged items don't show Undelete, so the common path is closed |
| Also surfaces errors that are currently swallowed. Today a failed undelete/unhide shows nothing and leaks an unhandled rejection | A second-round expand parks the branch as BLOCKED for John's call |
| The helper makes the change literal single-sourced (thermo-nuclear's suggestion); about 8 lines | Pre-existing on all bases; it adds review surface to a release-branch fix |

<details><summary>Details</summary>

`onDelete` already has this shape: on `catch` it sets `invisibleHistoryItems.value[item.hid] = false` and calls `onOperationError({ errorMessage: error })`. `updateContentFields` calls `rethrowSimple` on an API error, so the PUT does throw.

The thermo-nuclear review left `onDelete` off the helper because `deleteContent` takes different arguments. Keep it that way: B touches only undelete and unhide.

The vitest scaffolding already mocks PUT through `server.use(http.put(...))`. A failure case only needs a 4xx response and an assertion that the hid is still rendered.

</details>

## C. Remove the optimistic hide entirely

Drop `setInvisible`/`hideIfFilteredOut` from the three handlers and rely on the store merge plus a refetch.

| Pros | Cons |
|---|---|
| Removes the `invisibleHistoryItems` state model | Under the default filter, deleted items would linger until the request returns, which is a UX change (thermo-nuclear) |
| | Wider behavior change; not release-branch material |

## D. Remove the dead `onHideSelection` / `@hide-selection`

`HistoryPanel.vue` binds `@hide-selection="onHideSelection"`, but nothing emits it (re-scope review). It is the only other `setInvisible` caller. A sweep of `client/src` found no other optimistic-hide site.

| Pros | Cons |
|---|---|
| Deletes dead code in the touched file | Cleanup, not a bug; no reviewer asked for it |
| | Adds unrelated churn to a release-branch fix; better on dev |

## E. Convert `HistoryFilters.js` to TS / type the new helpers

| Pros | Cons |
|---|---|
| `getClientFilters`/`itemPassesFilters` would give TS callers real types instead of `any` | Converts a whole file on a release branch; the thermo-nuclear review ruled it out of scope |

## F. Route `selectedItems.ts` `isSelected` through `itemPassesFilters`

| Pros | Cons |
|---|---|
| One predicate everywhere | Different semantics: it decides selection, not visibility, in a composable shared with other lists. The thermo-nuclear review found it is not a reuse miss |

## G. Earlier-declined items (carried from round 1)

These stay out, for the same reasons as `earlier_drafts/1/scope_evaluation.md`:
- **Server-config guards (Codex P2s).** They would drop the private-by-default assert that motivates the privacy test.
- **Shared Selection-menu helper.** It touches unrelated tests and risks conflicts with the 26.2 sibling branches.
- **Populator helper for `datasets/{id}`.** The branch no longer uses a raw GET.
- **Folding the refactor commit back in.** That loses the helper's second caller.

| Pros | Cons |
|---|---|
| Each has a small standalone merit (see round 1) | None is related to the bug or the tests; each adds churn or weakens an assert |

## H. Contract: drop the fix, revert to the original scope

Ship `selenium_delete_items_dataset_privacy_alt_original_scope` (test-only), and send the fix as its own 26.0 PR.

| Pros | Cons |
|---|---|
| Test-only on 26.2, and the fix lands at the policy base | The E2E goes back to routing around the bug, and the tightened asserts are lost until the fix merges forward |
| | Undoes a re-scope that every reviewer endorsed. Decomposition options 2 and 3 give the same base targeting without dropping anything |
