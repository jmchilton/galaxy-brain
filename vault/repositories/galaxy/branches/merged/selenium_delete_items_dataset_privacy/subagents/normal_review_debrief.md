# Normal review debrief

Verdict: mergeable, no real bugs. Acted on nit 3 (the setter now waits for the "Permissions have been saved" toast, not just any toast plus an is_selected check that flips before the save) and nit 5 (hid 2's deleted state is now awaited). Both tests re-run green under Playwright and Selenium. Head `202009a0848`.

Not acted on:
- HistoryPanel undelete/delete/unhide hide-up-front bug: real, belongs in a separate client PR with a vitest, not this test-only branch. Question for John.
- Nits 1–2 (data-description on the switch, class on the Permissions tab): client changes; left out to keep the branch test-only. Question for John.
- Nit 4 (default-on assert fails on externally configured servers): acceptable, documents the 26.2 default.
- Nit 6 (rename `history_panel_include_deleted` → `_toggle_`): gxui's verb backs onto the name; not worth the churn.

<details><summary>Full review</summary>

# Normal review: selenium_delete_items_dataset_privacy

Head `5003927cb27`, 2 commits over `origin/release_26.2`. I read the code only and ran no E2E tests.

## Verdict

Mergeable as is. There are no real bugs in the branch. The helpers are small, consistent with their neighbours, and use components that already exist (`confirm_dialog`, `use_bootstrap_dropdown`, `toast`). The tests are not vacuous: every negative check has a positive guard on the same selector. Below are a few cheap robustness nits and one flake-shaped wait. The "undelete under Include deleted" finding is a real client bug. Its root cause is narrower than the debrief says, and it also affects delete and unhide.

## Real bugs

None in the branch.

## HistoryPanel finding: a real bug, with a wider scope than the debrief says

The debrief's mechanism is not quite right. `onUndelete`'s optimistic `setInvisible` is designed to be undone. `watch(historyItems)` (HistoryPanel.vue around line 229) clears `invisibleHistoryItems[hid]` whenever a new `historyItems` array still contains that hid. The bug is that this watcher never fires under `deleted:any`:

- `parseFilterText` drops `deleted:any` (`removeAny`, filtering.ts:656), so `getHistoryItems`' filter never reads `item.deleted`.
- `mergeArray` (history.utilities.js) updates the store item in place (`localItem[key] = item[key]`).
- As a result, the `historyItems` computed has no dependency on `deleted` and does not re-evaluate. No new array is produced, the watcher stays silent, and the hid stays hidden until `queryKey` changes (a filter toggle).

The same path breaks two sibling operations:
- **Delete under Include deleted.** `onDelete` also calls `setInvisible`, so a trashed item vanishes even though the filter says it should stay listed.
- **Unhide under `visible:any`** (Include hidden). `onUnhide` has the identical pattern.

The current test steps around this, because hid 1 is deleted under the default filter. That is fine for a test-only branch. Fix it in a separate client PR and don't pin the bug in this one.

Minimal fix: hide optimistically only when the change would actually drop the item from the current filter. This reuses the store's own filter test.

```diff
--- a/client/src/components/History/CurrentHistory/HistoryPanel.vue
+++ b/client/src/components/History/CurrentHistory/HistoryPanel.vue
 async function onDelete(item: HistoryItemSummary, recursive = false) {
     isLoading.value = true;
-    setInvisible(item);
+    hideIfFilteredOut(item, { deleted: true });
@@
 async function onUndelete(item: HistoryItemSummary) {
-    setInvisible(item);
+    hideIfFilteredOut(item, { deleted: false });
     isLoading.value = true;
@@
 async function onUnhide(item: HistoryItemSummary) {
-    setInvisible(item);
+    hideIfFilteredOut(item, { visible: true });
     isLoading.value = true;
@@
 function setInvisible(item: HistoryItemSummary) {
     unref(invisibleHistoryItems)[item.hid] = true;
 }
+
+/** Optimistically hide ``item`` if ``change`` takes it out of the current filter. */
+function hideIfFilteredOut(item: HistoryItemSummary, change: Partial<HistoryItemSummary>) {
+    const filters = filterClass.getFiltersForText(filterText.value).filter(([key]) => !key.includes("related"));
+    if (!filterClass.testFilters(filters, { ...item, ...change })) {
+        setInvisible(item);
+    }
+}
```

The `related` exclusion mirrors `historyItemsStore.getHistoryItems`. The `catch` in `onDelete` (`invisibleHistoryItems.value[item.hid] = false`) stays correct either way.

Possible future cleanup: `getHistoryItems` and this helper now share the "filters minus related" logic. Pull it into a single `HistoryFilters` helper if a third caller appears.

Test for the fix: a HistoryPanel vitest that mounts with `deleted:any`, triggers `undelete` on a deleted item, and asserts that the item is still rendered. After that lands, this E2E could assert `history_panel_wait_for_hid_visible(1)` right after `history_panel_item_undelete(1)`, before toggling the filter.

Another option is `watch(historyItems, …, { deep: true })`. It is smaller, but it walks every item on every store change and can flicker a just-deleted item back if an unrelated field updates first. I don't recommend it.

## Nits (cheap, optional)

1. **`new_datasets_private_*` selector is generic.** `input[name="check-button"]` comes from `DatasetPermissionsForm.vue`, which is shared with `HistoryDatasetPermissions.vue`. It is unambiguous on the Preferences page today, but the name says nothing. The PR already touches `navigation.yml`, so adding a `data-description` would be more robust:
   ```diff
   -                    <BFormCheckbox v-model="checkedInForm" name="check-button" switch @change="change">
   +                    <BFormCheckbox
   +                        v-model="checkedInForm"
   +                        name="check-button"
   +                        data-description="make new datasets private"
   +                        switch
   +                        @change="change">
   ```
   The selectors would then be `'[data-description="make new datasets private"]'` and `... + label`. Check where BFormCheckbox puts the attribute, input or wrapper, before relying on `+ label`. This also lets the component be reused unchanged by a future History > Dataset Permissions test. If the PR should stay free of client changes, the current selector is acceptable.

2. **`permissions_tab` uses an XPath on the visible text.** The text is localized (`localize("Permissions")`). Its sibling `datatypes_tab` uses `title-link-class="dataset-edit-datatype-tab"`. To match it:
   ```diff
   -                <GTab v-if="!datasetAttributes['permission_disable']">
   +                <GTab v-if="!datasetAttributes['permission_disable']" title-link-class="dataset-edit-permissions-tab">
   ```
   ```diff
   -    permissions_tab:
   -      type: xpath
   -      selector: '//*[@role="tab" and normalize-space(.)="Permissions"]'
   +    permissions_tab: '.dataset-edit-permissions-tab'
   ```

3. **The toast wait in `user_preferences_set_new_datasets_private` can match a stale toast.** The `_wait_on(is_selected == private)` that follows the toast wait proves nothing about persistence, because `checkedInForm` is a client-side `v-model` and flips on click. So the toast is the only persistence signal. A leftover toast, for example from the previous set call, would let the helper return before the PUT lands. The next getter re-navigates and could then read the old value. The backend message is fixed (`"Permissions have been saved."`, `users.py:1144`), so it can use the existing `message_with_text`:
   ```diff
   -            self.components.toast.message.wait_for_visible()
   -            self._wait_on(
   -                lambda: preferences.new_datasets_private_input.wait_for_present().is_selected() == private,
   -                f"Make new datasets private switch to be {private}",
   -            )
   +            self.components.toast.message_with_text(text="Permissions have been saved").wait_for_visible()
   ```
   This still doesn't distinguish two identical toasts. If that matters, add `toast.message.wait_for_absent_or_hidden()` before the click, which is the existing pattern at `navigates_galaxy.py:1837`. The debrief's line "waits for the switch to land, not just any toast" overstates what the `is_selected` wait does. The real persistence check is the test's re-read through `user_preferences_new_datasets_private()`, which is good.

4. **Hard-coded config default.** `assert self.user_preferences_new_datasets_private() is True` ties the test to `new_user_dataset_access_role_default_private: true`. The schema default (`config_schema.yml:3131`) is true, so this is fine for the framework-managed server. It would fail on a `GALAXY_TEST_EXTERNAL` target configured otherwise. Acceptable; the comment already documents it.

5. **Two unwaited API asserts.** `assert deleted_purged(2) == (True, False)` runs immediately after hid 3's purge wait. In practice it is ordered behind the earlier bulk op, but for symmetry with hid 3 it could use `_wait_on`. The `history_panel_wait_for_hid_hidden(...)` calls after delete only show the optimistic hide, not the server state. The API checks are what make them meaningful, so keep them.

6. **`history_panel_include_deleted` toggles the filter**, but its name reads like it sets it. `history_panel_toggle_include_deleted` would be clearer at the second call site, where it turns the filter off. Trivial.

## Reuse / parity checks (no action needed)

- `history_panel_delete_selected` reuses `use_bootstrap_dropdown(..., menu="selected content menu")` and `confirm_dialog`. `test_collection_edit.py` and `test_collection_builders.py` have local wrappers of the same dropdown call that could move onto a shared `history_panel_selection_menu_option(option)`. That is out of scope.
- `history_panel_item_delete` now has a second caller (`test_rerun_deleted_dataset`). I found no other inline item `delete_button.wait_for_and_click()` sites.
- `edit_dataset_permission_roles` and the getter use `.all()`, `.text` and `.is_selected()`, all of which the Playwright adapter implements (`playwright_element.py:59,166`). The debrief reports green runs under both drivers.
- Vacuity: `undelete_button.assert_absent()` on hid 3 is guarded by `wait_for_hid_visible(3)` plus the positive `undelete_button.wait_for_visible()` on hid 2. The empty UI `access` list is guarded by `manage == [email]`. Both are fine.
- No Python imports were added, and the comments are short.

## Unresolved

- Fix the HistoryPanel bug in a separate PR (target release_26.2 or dev)? It is pre-existing and also on dev.
- Take nits 1 and 2 (client `data-description` / `title-link-class`) in this branch, or keep it test-only?

</details>
