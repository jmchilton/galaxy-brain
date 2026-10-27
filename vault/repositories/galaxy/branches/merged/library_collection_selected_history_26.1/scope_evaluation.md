# Scope evaluation (second, after re-scope)

**Recommendation: keep as implemented.** The re-scope already closed the one real sibling bug: ListWizard ("Auto/Advanced Build List") now builds in the history the selection came from. Every collection creator reachable from a history's Selection menu or the library dialog now honors its target history through the one `useCollectionCreation(historyId)` getter. The remaining candidates fall into three groups: no known user-visible bug (SampleSheet), a different mechanism (CollectionEditView datatype change, the "1 of 0 selected" counter), or test-only polish. None clears the bar for a second expansion on a `release_26.1` fix. Keep the `release_26.1` target and keep `162dfdb49b4` out.

## Possible Decompositions

About 196 added lines over 10 files at `fc218167da1`, none generated. The 4 commits split cleanly; landing order is top to bottom:

1. **Baseline E2E for Add to History > as Datasets** (`93b3d468c01`, +98). The `libraries_folder_*` helpers, `wait_for_current_history_id`, `wait_for_fade_in`, navigation.yml targets, `test_add_datasets_to_selected_history`, and the fallback vitest. It stands alone as "Add missing tests", which could go to `dev` per the missing-tests memory note.
2. **Refactor the library dialog's target-history lookup** (`a15d9bd3e48`, +17/-16). Behavior-neutral. It could fold into 3.
3. **Library collection fix** (`715db425064`, +42/-8). `useCollectionCreation(historyId)`, `useCollectionCreator` forwarding, `setCurrentHistory` on the picked history, `history_collection_names`, and the library E2E.
4. **ListWizard fix** (`fc218167da1`, +34/-14). The store `historyId` goes to the creators and the getter, plus the alert wording, the scoped history-panel helpers, and `test_build_list_in_viewed_history`.
   - Depends on 3: it uses the getter and `history_collection_names`.
   - Since the test-challenge pass dropped the creator vitest, 3's composable plumbing is pinned only by 4's E2E. Splitting 3 and 4 into separate PRs would leave 3 without a test of its plumbing half. The `_alt_original_scope` branch still has that vitest.

## Scopes considered

### As implemented (recommended)

Collection creators build in their `historyId` prop. The library "as a Collection" dialog makes the picked history current. ListWizard builds in the selection's source history. The branch also adds the first E2E for "as Datasets".

| Pros | Cons |
|---|---|
| - Root-cause fix in the shared composable; the Selection menu is now consistent<br>- Normal, rescope, codex and thermo-nuclear reviews found no defects<br>- Red-to-green E2Es under both Selenium and Playwright | - Three behavior changes outside libraries, which the PR body must list: "Build Dataset List" and Auto/Advanced Build List on an owned, non-current history's view page, and the upload `DefaultBox`<br>- The plumbing in 3 has no test of its own if 3 and 4 are split (see above) |

### Expand: SampleSheetWizard / SampleSheetGrid honor a history id

`SampleSheetGrid` calls `useCollectionCreation()` with no getter, and `SampleSheetWizard` sends `history_id: currentHistoryId`. The first evaluation and the rescope review both deferred this.

| Pros | Cons |
|---|---|
| - Would finish the sweep of `useCollectionCreation()` callers | - Still no user-visible bug: its entry points (form data, workflow run) target the current history<br>- `CollectionCreatorIndex` passes no `historyId` into `SampleSheetCollectionCreator`, so this needs new prop plumbing through three components<br>- The baseline fallback vitest already pins the no-arg behavior SampleSheet relies on |

### Expand: CollectionEditView "change datatype" uses the current history

`clickedDatatypeChange` sends `PUT /api/histories/{currentHistoryId}/contents/bulk` for a collection that may live in another history.

| Pros | Cons |
|---|---|
| - The same "current history assumed" smell | - Not collection creation: a different component, endpoint and mechanism; it doesn't touch `useCollectionCreation`<br>- Unverified whether it is user-visible (the server may resolve by item id); it needs its own repro<br>- Better queued as a separate issue if it reproduces |

### Expand: "1 of 0 selected" counter on a non-current history's view page

The re-scope observed this but didn't investigate it.

| Pros | Cons |
|---|---|
| - Seen on the same page the ListWizard E2E drives | - It is a selection-count display, not where things get built. Probably pre-existing and independent of this fix<br>- Cause unknown, so including it would mean an open-ended investigation on a release branch |

### Expand: fade-in waits on the existing library collection screenshots

`collection_export` and `list_of_pairs_export` still take their screenshots without `wait_for_fade_in`. The first evaluation listed this as optional, and it was not done.

| Pros | Cons |
|---|---|
| - One line each, in a touched file, using a helper the branch adds | - Test-only polish, not scope. A polish pass could add it without a re-scope<br>- Needs two more E2Es rerun |

### Expand: retarget to release_25.1 / release_26.0

| Pros | Cons |
|---|---|
| - Galaxy policy prefers the oldest supported branch that has the bug | - John picked `release_26.1`<br>- 26.0's `import-collection.js` has a different shape, so there's no clean cherry-pick. The fix now also spans ListWizard and the E2E helpers, which makes a backport harder still |

### Expand: include `162dfdb49b4` (upload hid count)

| Pros | Cons |
|---|---|
| - Same source branch | - The code it touches isn't on 26.1, and on 26.2/dev it has no collection caller. Unchanged since the first evaluation |

### Contract: back to the original scope (`_alt_original_scope`)

| Pros | Cons |
|---|---|
| - Smaller diff; drops the third behavior change | - It brings back the split Selection menu: "Build Dataset List" honors the source history while Auto/Advanced Build List don't<br>- The re-scope's reviews and tests already validate the larger scope |

### Contract: library dialog only (`setCurrentHistory`, no composable change)

| Pros | Cons |
|---|---|
| - Smallest release diff | - It leaves the root bug in every creator. The first evaluation already rejected this |

<details><summary>Notes</summary>

- `alts/original_scope.md` says the parent adds `5857b17da80`, and `implementation_rescope_debrief.md` says `469a571f614`. The ListWizard commit is now `fc218167da1` after the hardening fixups. Update the alt doc's SHA, or drop it in favor of the commit subject.
- The upload panel's `composables/upload/collectionCreation.ts` is an unrelated composable with the same name, and it already takes `targetHistoryId`. No action needed.
</details>
