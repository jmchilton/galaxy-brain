Fix collections built from a data library or a non-current history's view page landing in the current history instead of the history the user picked.

In a data library folder, tick datasets, choose **Add to History > as a Collection**, pick a history that isn't the current one and build a List. The builder even says "From history: &lt;picked&gt;" - but the list and its hidden element copies land in the **current** history, and the picked history stays untouched. **Auto Build List** / **Advanced Build List** from an owned, non-current history's view page do the same: the list goes to whatever history happens to be current.

| Picking a non-current history in the library dialog | List built from a non-current history's view page |
|---|---|
| ![library dialog with a picked history](screenshots/libraries_to_collection_selected_history.png) | ![list wizard success, current history still empty](screenshots/collection_builder_wizard_list_created.png) |

With this branch the list lands in the picked/viewed history; in both screenshots the current history panel on the right stays empty, which the E2E tests assert.

***Client-only fix to which history collections are created in - no API change; "as Datasets", tool forms and workflow runs are untouched.***

***The library "as a Collection" dialog now makes a picked existing history current, matching its create-new path and the "as Datasets" dialog.***

***Targeted at `release_26.1` because the builder shows "From history: &lt;picked&gt;" and then silently writes into a different history.***

***Behavior changes outside libraries are intended: creators opened from an owned, non-current history's view page ("Build Dataset List", Auto/Advanced Build List) now build in that history - where the selected items live - and, through the same prop forwarding, the upload dialog's collection builder builds in the upload's target history, instead of the current one.***

<details><summary>Cause and fix</summary>

`useCollectionCreation.createPayload` always sent `history_id: currentHistoryId`. The list, pair and list-of-pairs creators already receive a `historyId` prop (the library dialog passes the picked id through `CollectionCreatorIndex`), but `useCollectionCreator` never forwarded it. The dialog's "or create new" path only worked because it made the new history current first.

- `useCollectionCreation(historyId?: () => string)` uses the getter, falling back to the current history; `useCollectionCreator` passes `() => props.historyId`.
- The library "as a Collection" dialog now also makes a picked existing history current, as its create-new path and the "as Datasets" dialog already do, so the new list is visible where the user ends up.
- `ListWizard` (Auto/Advanced Build List) builds in the selection store's `historyId` and its success alert no longer says "your history".

</details>

<details><summary>Commits</summary>

1. Baseline tests: first E2E for library **Add to History > as Datasets** into a picked history, plus a vitest pinning the current-history fallback (both pass on the base).
2. Refactor the library collection dialog's target-history lookup into one promise chain (behavior-preserving).
3. Fix: creators build in their `historyId`; the library dialog makes the picked history current. E2E `test_library_collection_export_to_selected_history`.
4. Fix: `ListWizard` builds in the history the selection came from. E2E `test_build_list_in_viewed_history`.

</details>

<details><summary>Tests</summary>

- `test_library_collection_export_to_selected_history` fails without the fix waiting on the list in the picked history; it also asserts the previously current history has no collection and the picked history becomes current.
- `test_build_list_in_viewed_history` fails without the fix waiting on the list in the viewed history, and also fails with only the `useCollectionCreator` forwarding reverted, so it pins the creator plumbing too.
- `test_add_datasets_to_selected_history` is new coverage of the unchanged "as Datasets" path.
- All three pass under both Selenium and Playwright; the existing library-to-collection screenshots now wait for the dialog fade-in.

</details>

## Risks

Risks are minimal - client-side bug fix plus tests, no API or schema change (a two-way door).

<details><summary>Risk Details</summary>

- Collection creators opened with a `historyId` that isn't current now build in that history; any caller relying on the old "always current" behavior would change. SampleSheet keeps the current-history fallback, and the workflow-run form passes the current history explicitly.
- The library "as a Collection" dialog now switches the current history to a picked existing history, matching its other paths.

</details>

## Context

The bug is also present on `release_25.1` and `release_26.0`. Alternative kept on 🌿[`library_collection_selected_history_26.1_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/library_collection_selected_history_26.1_alt_original_scope) - library dialog fix only, without the `ListWizard` fix (so "Build Dataset List" and Auto/Advanced Build List disagree on a non-current history's view page). Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep as implemented after one re-scope that added the <code>ListWizard</code> fix.</summary>

- Re-scoped once: `ListWizard` had the same root cause, and without it the Selection menu's builders would disagree.
- Not expanded further on a release branch: SampleSheet (no user-visible bug), `CollectionEditView` datatype change (different mechanism, unverified), the "1 of 0 selected" counter on a non-current history's view page (unrelated display).

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural regression; dropped one unused helper parameter.</summary>

- The fix is an optional getter on `useCollectionCreation` plus forwarding a prop every creator already received.
- Removed a speculative `scope` param from `history_panel_build_list_advanced`; other nits left to keep the release-branch diff small.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Kept the three E2Es and the fallback vitest; dropped a creator vitest the ListWizard E2E now covers.</summary>

- Verified the ListWizard E2E fails with only the creator forwarding reverted, so the duplicate vitest was dropped.
- Shared `history_collection_names` helper replaces two local closures; target histories created via the API so they start empty.

</details>

### ✅ Second Frontier Model Review

<details><summary>No defects found.</summary>

- Reviewed the full diff and surrounding code; ran the collection-creation and creator vitest suites.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>One behavior-preserving refactor commit leads the fixes.</summary>

- The library dialog's two duplicated target-history arms became one promise chain, so the fix commit only adds `setCurrentHistory`.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Library dialog shows the existing "An error occurred." toast (now on the picked-history path too); the wizard shows its existing creation-error alert.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes - E2Es assert where collections land via history contents; the vitest pins the current-history fallback.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes - baseline commit, then refactor, then the two fixes.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
