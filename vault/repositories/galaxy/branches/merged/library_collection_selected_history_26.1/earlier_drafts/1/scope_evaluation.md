# Scope evaluation

**Recommendation: expand (modest).** Also route `ListWizard` ("Auto Build List" / "Advanced Build List") through the source history. It is a sibling of this bug in the same composable. Without it, this branch splits behavior inside one Selection menu:
- "Build Dataset List" from an owned, non-current history now builds in that history.
- The wizard entries right below it still build in the current history.

The fix is about 3 lines in `ListWizard.vue` plus a vitest. Optionally, add the one-line `wait_for_fade_in` before the existing `collection_export` / `list_of_pairs_export` screenshots in `test_library_to_collections.py`, a file the branch already touches. Keep the `release_26.1` target and keep `162dfdb49b4` out.

## Possible Decompositions

The branch has about 159 added lines over 8 files, none generated. Its 3 commits already split cleanly:

1. **Baseline E2E for Add to History > as Datasets** (`84a8115a1d3`).
   - The `libraries_folder_*` helpers, the `wait_for_current_history_id` and `wait_for_fade_in` helpers, the selectors, and `test_add_datasets_to_selected_history`.
   - It stands alone as "Add missing tests". Per the memory note, a tests-only PR with no new feature coverage is a candidate for `dev` rather than a release branch.
2. **Refactor the library collection dialog's target-history lookup** (`c4f44684748`). A behavior-neutral `resolveTargetHistoryId` chain, plus the `prepare_library_for_data_export` helper cleanup. It could fold into 3.
3. **Fix** (`c57876ad7b5`). `useCollectionCreation(historyId)` plus `useCollectionCreator` forwarding, `setCurrentHistory` on the picked history, the vitest, and the collection E2E.
   - It could split further into 3a and 3b, at the cost of a red E2E between them:
     - 3a: the composable plumbing and its vitest, which fixes the History view page and upload `DefaultBox`.
     - 3b: the library dialog's `setCurrentHistory` and the E2E.
4. **(If expanded) ListWizard source history.** ListWizard plus a vitest. Depends on 3a.

## Scopes considered

### As implemented

The creator composable honors the `historyId` prop every creator already receives. The library "as a Collection" dialog makes the picked history current before importing, matching its create-new path and the "as Datasets" dialog. The branch also adds the first E2E for "as Datasets" into a picked history.

| Pros | Cons |
|---|---|
| - Root-cause fix in the shared composable, not a library-only patch<br>- Minimal, reviewed shape: normal, codex and thermo-nuclear reviews found no defects<br>- Red-to-green vitest + E2E under both Playwright and Selenium | - Leaves `ListWizard` on the current history, so one Selection menu now behaves two ways for a non-current history<br>- Changes behavior outside libraries, which the PR body must call out: the History view page's "Build Dataset List" and the upload `DefaultBox` now honor their target history |

<details><summary>Correction to earlier notes</summary>

The normal review, the test challenges debrief and the queued issue call the side effect "multiview build list from selection". But `SelectionOperations.vue` renders only when `hasSelection && !isMultiViewItem`, so the Selection menu is hidden in multiview.

The reachable path is the History view page (`HistoryView.vue` → `HistoryPanel` with no `is-multi-view-item`) for an owned, non-current history. The PR body and issue text should say that instead.
</details>

### Expand: ListWizard builds in the source history (recommended)

`SelectionOperations.listWizard` stores `this.history.id` via `setSelectedItems`. `ListWizard` already uses that store `historyId` for its breadcrumb and its `v-if`. But it calls `useCollectionCreation()` with no getter, and it passes `:history-id="currentHistoryId"` to `ListCollectionCreator` and `PairedOrUnpairedListCollectionCreator`.

The proposed change has two parts:
- Pass the store `historyId` to both creators.
- Call `useCollectionCreation(() => historyId.value)`. This also covers the rules path, `ruleOnAttemptCreate`.

| Pros | Cons |
|---|---|
| - Same bug class, same composable, about 3 lines<br>- Removes the inconsistency this branch introduces between "Build Dataset List" and "Auto/Advanced Build List"<br>- Reuses the new `historyId` getter; no new abstraction<br>- Vitest is cheap: mount or drive the wizard with a store `historyId` that differs from current, check the payload | - Another behavior change outside the library dialog for the PR body<br>- The success alert says "added to your history". It would need wording like "to the history" or a `setCurrentHistory`, a small UX call<br>- An E2E needs the History view page for a non-current history. The test challenges debrief judged that awkward, so vitest-only coverage is likely |

### Expand: fade-in waits on existing library collection screenshots

`collection_export` and `list_of_pairs_export` in `test_library_to_collections.py` take screenshots of the same legacy modal without the new `wait_for_fade_in`, so they can catch it half-transparent (polish debrief, "Not done").

| Pros | Cons |
|---|---|
| - One line each, in a file the branch touches, using a helper the branch adds<br>- Gives the new helper more callers | - Test-only polish, not a bug fix<br>- Needs those two E2Es rerun |

### Expand: SampleSheetWizard / SampleSheetGrid honor a history id

`SampleSheetWizard` sends `history_id: currentHistoryId`, and `SampleSheetGrid` calls `useCollectionCreation()` with no getter.

| Pros | Cons |
|---|---|
| - Would finish the sweep of `useCollectionCreation()` callers that ignore a history | - `CollectionCreatorIndex` passes no `historyId` into `SampleSheetCollectionCreator`, so this needs new prop plumbing through three components<br>- Its entry points (form data / workflow run) run against the current history anyway, so no user-visible bug is known<br>- More than modest; better as a follow-up if a real path shows up |

### Expand: retarget to release_25.1 / release_26.0

The bug exists on both. On 25.1 and 26.0, `useCollectionCreation()` takes no history.

| Pros | Cons |
|---|---|
| - Galaxy policy prefers the oldest supported branch that has the bug | - John explicitly picked `release_26.1`<br>- 26.0's `import-collection.js` is the older object-literal shape, so no clean cherry-pick, and the E2E helpers would need another adaptation<br>- A moderate UX bug with an easy workaround (switch first), and the more intricate fix pushes toward a newer target |

### Expand: include `162dfdb49b4` (upload hid count)

| Pros | Cons |
|---|---|
| - Same source branch, same family of findings | - The code it touches (`upload_activity_helpers.py`, `start_for_uploaded_hids`) isn't on 26.1<br>- On 26.2/dev the miscount has no collection caller. It stays on `galaxy_ui_driver` |

### Contract: library dialog only (`setCurrentHistory`, no composable change)

Making the picked history current alone would fix the library repro, because the creator falls back to the current history.

| Pros | Cons |
|---|---|
| - Smallest release diff; no behavior change outside libraries | - Leaves the root bug: every creator ignores its `historyId` prop, and the History view page / `DefaultBox` builder still mis-target while its header says "From history: X"<br>- Galaxy reviewers prefer the general fix; the previous scope overrides argue against this |

### Contract: split out the baseline "as Datasets" E2E

| Pros | Cons |
|---|---|
| - Smaller fix PR; the tests PR could go to `dev` | - The fix's E2E reuses the baseline helpers, so the fix PR depends on it either way<br>- The process wants baseline tests landing first anyway. This is a decomposition choice, listed above, not a scope cut |
