Fix history items vanishing after Undelete or Unhide while Include deleted or Include hidden is on, and add 26.2 E2E coverage for history item delete/undelete/purge/unhide and the "Make new datasets private" preference.

With **Include deleted** on, click Undelete on a deleted dataset. The request succeeds and the dataset should stay listed (it still matches `deleted:any`). It disappears instead, and typically stays gone until you change the filter. Delete under Include deleted and Unhide under **Include hidden** do the same.

| Action, with the filter on | `release_26.2` | This PR |
| --- | --- | --- |
| Undelete, Include deleted | row disappears ❌ | row stays, now with its delete button ✅ |
| Delete, Include deleted | row disappears ❌ | row stays, now with Undelete ✅ |
| Unhide, Include hidden | row disappears ❌ | row stays, now with its delete button ✅ |
| Delete, Include hidden or default filter | row goes ✅ | row goes ✅ |
| Undelete/Unhide request fails (`deleted:true` / `visible:false`) | row disappears, no error ❌ | row comes back, error dialog ✅ |

<table><tr>
<td><img src="screenshots/history_panel_undeleted_item_still_listed_panel.png" alt="After Undelete of hid 1 under deleted:any, all four items are still listed and the deleted counter drops to 2"></td>
<td><img src="screenshots/history_panel_hidden_item_unhidden_panel.png" alt="After Unhide of hid 2 under visible:any, hid 2 is still listed with its delete button"></td>
</tr><tr>
<td>Undelete of hid 1 under <code>deleted:any</code>: hid 1 stays listed with its delete button; the deleted counter drops 3 → 2.</td>
<td>Unhide of hid 2 under <code>visible:any</code>: hid 2 stays listed with its delete button; the hidden counter is gone.</td>
</tr></table>

`HistoryPanel` hid the row optimistically on every delete, undelete and unhide, and relied on the store refresh to bring it back. Under `deleted:any`/`visible:any` the store never reads the field that changed, so nothing brought it back. The panel now hides a row only if the change takes it out of the current filter, ***using the same predicate the store filters with (`itemPassesFilters`, extracted from `historyItemsStore` into `HistoryFilters.js` in its own pure-refactor commit), so the two can't disagree***. Undelete and Unhide also gain the failure handling Delete already had.

***The bug is on 26.0 and later, but this targets 26.2 as one PR:*** the privacy E2E can't leave 26.2 (the private-by-default flag is off on 26.0/26.1), and the fix's vitest would need a Vue 2 port for an older base. The fix commits stand alone if a backport is wanted. ***The privacy half is test-only: it adds two test hooks and changes no permission behavior. It is the first commit, so it can be split off cleanly.***

<details><summary>New E2E coverage</summary>

The tests came out of a browser-driving loop that exercised Galaxy's FAQ tasks; hardening the history-panel tests is what found the bug.

- `test_history_panel.py::test_delete_undelete_and_purge_items`: trash button, Selection > Delete and Delete (permanently), Include deleted, Undelete, and a delete with Include deleted on. Every state is also checked through the API.
- `test_history_panel.py::test_unhide_item_with_include_hidden`: Unhide with Include hidden on, plus a delete control.
- `test_personal_information.py::test_new_datasets_private_switch`: the "Make new datasets private" preference (on by default since 🔀 #23965) persists, and a new dataset's API roles and its Permissions tab agree in both states. This is a baseline test in its own leading commit; it needed two client test hooks (a `data-description` on the switch, a class on the Permissions tab).
- New `NavigatesGalaxy` helpers for item delete/undelete/unhide, the Include deleted/hidden toggles, Selection > Delete, the privacy switch and the Permissions tab roles; `test_rerun_deleted_dataset` now uses the delete helper.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Context

Builds on 🔀 #23965, which made new datasets private by default. Alternative kept on 🌿[`selenium_delete_items_dataset_privacy_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/selenium_delete_items_dataset_privacy_alt_original_scope) - the test-only version, with no client changes; its delete test routes around the bug by checking hid 1 only after turning Include deleted off. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Fix the panel bug here rather than ship tests that route around it, and close the matching failure path in Undelete/Unhide.</summary>

- Round 1 re-scoped the branch from test-only to include the HistoryPanel fix.
- Round 2 recommended routing Undelete/Unhide through one `updateItem` helper with a `catch`, like `onDelete`; that's the last commit.
- Kept out: dropping the optimistic hide entirely (a UX change under the default filter), converting `HistoryFilters.js` to TS, removing the dead `onHideSelection`, and server-config guards on the privacy test.
- Base: 26.2 as one PR, with the 26.0 split options recorded.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Approve: three call-site swaps and a small helper reusing the store's own predicate, with no new special cases.</summary>

- Alternatives (always reading `deleted`/`visible` in the store computed, a deep watch, snapshotting state) were each judged worse.
- Its suggested `updateItem` helper for Undelete/Unhide was later adopted with the failure handling.
- Untyped `HistoryFilters.js` exports and `selectedItems.ts`'s separate selection predicate were left alone.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Added a 4th dataset and an unhide E2E so every fixed case is checked in the browser; kept the vitest as the fix's demonstrated red.</summary>

- `test_delete_undelete_and_purge_items` deletes a dataset with Include deleted on and requires its Undelete button.
- New `test_unhide_item_with_include_hidden` checks the row stays after Unhide, with a delete control.
- The privacy test moved first, as a baseline commit.
- The `HistoryView.test.js` cases were challenged as integration-level, then kept: the file already mounts this tree, and they fail before the fix.

</details>

### ✅ Second Frontier Model Review

<details><summary>One finding, acted on: the panel's hide check ignored converted <code>sub_items</code> that the store's filter keeps.</summary>

Deleting a SAM whose BAM conversion matches `extension:bam` (with Include deleted on) hid the row. Fixed by sharing `itemPassesFilters` between the store and the panel. Earlier config-guard suggestions for the privacy test weren't taken; they'd drop the private-by-default assert the test exists for.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Split the <code>getClientFilters</code>/<code>itemPassesFilters</code> extraction into a behavior-neutral commit ahead of the fix.</summary>

The fix commit's vitest fails 3 cases on the extraction commit, so the red belongs to the fix. The `history_panel_item_delete` helper and the privacy baseline test are also their own commits.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? If a delete, undelete or unhide request fails, the row comes back and the operation error dialog shows the server's message.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They mount `HistoryView` with the real store and a mocked API, set the filters through the panel's own controls, and check rendered rows, requests and the error dialog.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. The privacy test is first; the history-panel E2E follows the fix because it asserts the fixed behavior.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `client/src/components/History/HistoryView.test.js`:
  - 5 cases of delete/undelete/unhide under Include deleted, Include hidden and the default filter. The 3 cases where the item should stay fail before the fix.
  - 2 cases of a failing Undelete/Unhide PUT under `deleted:true`/`visible:false`. Both fail before the last commit (row hidden, no dialog, unhandled rejection).
  - History and stores suites pass (685 tests).
- Selenium/Playwright, each passing locally under both drivers: `test_delete_undelete_and_purge_items`, `test_unhide_item_with_include_hidden`, `test_new_datasets_private_switch`, `test_rerun_deleted_dataset`.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
