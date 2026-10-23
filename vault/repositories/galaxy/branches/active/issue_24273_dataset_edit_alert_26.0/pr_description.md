Fix 🎯 #24273 - the dataset Edit tab is torn down by a background refetch, dropping the "Attributes updated." alert the scheduled Selenium rename test waits for.

Saving on the dataset **Edit** tab triggers a history refresh that overwrites the stored dataset with a summary, so the dataset store refetches it. `DatasetView` rendered a full-page spinner whenever the store was loading, so every refetch unmounted the open tab: the save alert vanished, the form reset, and `test_history_dataset_rename` timed out on `.dataset-attributes-alert`. The same blanking hit the **Preview** tab, and a failed refetch replaced the whole view with "Dataset Not Available".

***Users saw this too, not just the test: the confirmation of a save could disappear before it was read, and any background update flashed the open tab away.***

| After a rename | After datatype auto-detect |
|---|---|
| ![Rename alert survives the history refresh](screenshots/dataset_edit_attributes_rename_success.png) | ![Datatypes tab stays open with the new datatype](screenshots/dataset_edit_datatype_auto_detect_success.png) |
| The alert survives the refresh; header, form and history all show the new name. | The alert stays, the Datatypes tab stays selected and the dropdown shows the detected `txt`. |

Now only the **first** load of a dataset blocks the view. After that the open tab stays mounted and refreshes in place:

- A new `useSettledDataset` composable holds the last complete dataset while the store refetches; `DatasetView` and `DatasetDisplay` gate on it. The header name still follows the live store, so renames show immediately.
- Tabs that used to load only on mount (Edit forms, Details, the Preview check) now refresh in place when the dataset's `update_time` changes, and only the latest request applies.
- A failed background refresh keeps the last loaded content and adds a warning ("…showing the last loaded version") instead of blanking the view. A failed first load still blocks as before.
- Backports #23985 so a failed save shows the server's message.

***The test change is small; most of the diff is keeping the other tabs correct once they stop being remounted - a smaller fix that only stops `DatasetView` blocking leaves the Details tab stale after a job finishes.***

<details><summary>Why the extra tabs had to change too</summary>

Keeping `DatasetView` mounted means child tabs no longer get fresh data from being remounted. Without the in-place refreshes this fix would have shipped stale tabs: the Details tab would keep a finished job's "running" size and metadata, and the Edit forms would keep the old datatype's options after a datatype change. Each refresh path has its own vitest coverage, including out-of-order responses and failures.

- `onDatasetUpdated(datasetId, callback)` (in `composables/settledDataset.ts`) fires when the stored dataset's `update_time` changes, never on first sight or an id switch. It replaces three hand-rolled watches.
- `createLatestRequestTracker()` (`utils/latestRequest.ts`) is a small "latest request wins" guard used by all three tabs.
- While metadata is being set after a datatype change, the Datatypes tab stays rendered with an info notice instead of disappearing; otherwise the in-place reload would leave the user on the Permissions tab.
- `client/tests/vitest/hold.ts` is a shared held-response helper for the refetch race tests.

</details>

<details><summary>Tests</summary>

- Vitest for `DatasetView`, `DatasetDisplay`, `DatasetAttributes`, `DatasetDetails` and `useSettledDataset`: tabs stay mounted (asserted by element identity) through held refetches, refresh in place, ignore stale responses, and show non-blocking warnings on refresh failure. These fail against the base components at their own assertions.
- Selenium `test_history_dataset_rename` now asserts the alert survives the header refresh, and `test_history_dataset_auto_detect_datatype` asserts the detected datatype appears in the still-open Datatypes tab. Both capture the screenshots above.
- The baseline tests and refactors this builds on merged separately in #24297.

</details>

## Risks

Risks are minimal - this is client-only UI state handling with no API or persisted-data changes (a two-way door).

<details><summary>Risk Details</summary>

- `DatasetDisplay.vue` conflicts with the reworked preview on `release_26.2`/`dev` (about 124 lines), so merging forward needs a manual port of the preview piece.
- `DatasetDetails.test.ts` is an add/add conflict on 26.1+.
- The Details tab's child components (`DatasetStorage`, `InheritanceChain`, `JobParameters`) still load only on mount; only `DatasetStorage` can visibly change when a job finishes.

</details>

<details><summary>Risk Review Advice</summary>

Look at `useSettledDataset` and its `isSettledDataset` check: the view must still block (and show "Dataset Not Available") when only a summary is stored and the detailed fetch fails. Then check that each tab's in-place refresh can't be reverted by a slower, older response.

</details>

## Context

Builds on 🔀 #24297 (baseline tests and refactors) and backports 🔀 #23985. Alternative kept on 🌿[`issue_24273_dataset_edit_alert_26.0_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/issue_24273_dataset_edit_alert_26.0_alt_original_scope) - only `DatasetView` stops blocking after the first load and the Edit forms rebuild in place; no shared composable, Preview fix or #23985 backport. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep as implemented on <code>release_26.0</code>; a smaller fix isn't correct.</summary>

- Round 1 recommended expanding (shared composable, Preview tab, non-blocking refresh errors, #23985 backport); that was done.
- Round 2: the original scope already left the Details tab stale once `DatasetView` stopped remounting, so the smallest correct fix needs the Details refresh and latest-request guard anyway.
- The main cost is merge-forward of `DatasetDisplay.vue`; split options (by surface, minimal 26.0 + rest on dev, retarget) were recorded.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Size proportionate (~250 production lines); one cleanup applied.</summary>

- `DatasetAttributes` now derives `loading` from `formRevision`, matching `DatasetDetails`.
- Recommended for `dev`, not here: have `DatasetDetails` read the store via `useSettledDataset` instead of its own fetch (needs test rewrites).
- Recommended against a single "fetch + refresh + latest wins" composable: the three sites only look alike.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>All tests kept; one strengthened, one added.</summary>

- The preview recheck test now drives the real path (running detailed dataset → ok summary → held refetch → release).
- Added a `useSettledDataset` test pinning that a summary-only store whose details fail stays unsettled, so the blocking error stays reachable.
- Red/green: component tests fail against the base components; composable tests fail against a naive "store value unless loading" version.

</details>

### ✅ Second Frontier Model Review

<details><summary>Three findings, all confirmed and fixed with red-to-green tests.</summary>

- The Details tab never refreshed once it stopped remounting; it now refreshes in place with a non-blocking error.
- Stale Edit-form reloads could overwrite newer ones; only the latest request now applies.
- A failed background preview check blanked the preview; it now keeps the preview and warns.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Baseline tests and pure refactors split out and merged as #24297.</summary>

- Extracted the Edit form fetch and the preview check into functions, and derived the Details loading state, so the fix commits carry only behavior changes.
- Baseline tests for `DatasetView`, `DatasetDisplay` and `DatasetDetails` pass on the base components.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? A failed first load still blocks with "Dataset Not Available"; failed background refreshes keep the last content and add a warning; failed saves show the server's message.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They mount components with MSW responses and assert on the DOM, including element identity to show a tab stayed mounted.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes - they merged ahead of this in #24297.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
