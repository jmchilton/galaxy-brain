Add the missing E2E tests for Multiview columns (dragging items between two histories' columns, switching from a column), fix the per-history selectors they need, and fix the bug the first such test found: the target column doesn't refresh after a drop.

***Multiview had no test that touched a specific history's column, so its per-history selectors had been dead since 2022 and a refresh bug on every release since 24.1.2 went unnoticed. It targets `release_26.2` because of that bug; the selector and hook changes are what its regression tests need, and the only Vue change is two data attributes.***

On `release_26.2`, `multi_history_panel.switch_button` and `current_history_check` point at `#history-column-<id>`. That id belonged to the legacy multi-panel; Vue Multiview replaced it in 2022, and 🔀 #14608 deleted the old panel. No test calls either selector, so nothing noticed. With no way to address a single column, the only copy test drags onto the "new history" drop box.

| Selector (`multi_history_panel`) | `release_26.2` | This PR |
| --- | --- | --- |
| `switch_button(history_id)` | `#history-column-<id> .switch-to`, matches nothing 😬 | column's `data-description="switch to history button"` ✅ |
| `current_history_check(history_id)` | `#history-column-<id> .details .name`, matches nothing 😬 | column's `data-description="name display"` ✅ |
| `history_column_item(history_id, hid)` | — | item in that history's column 🆕 |
| `history_column_drop_zone(history_id)` | — | drop target for that history's column 🆕 |
| `current_label`, `switch_history` | no callers | removed |

## Bug: dropped items don't show up in the target column

Drag a dataset from one Multiview column onto another. The copy happens and a "Dataset copied to history" toast appears, but the target column keeps saying "This history is empty" until something else reloads it. Collection-only drops behave the same.

The cause is one operator in `useHistoryDragDrop`. c7423339250 (🔀 #18699, on every release since 24.1.2) meant to load/pin the target only "if items were copied", but wrote the check as:

```ts
if (datasetCount > 0 && collectionCount > 0) {
```

So only a drop that mixes datasets *and* collections refreshes anything. This PR changes `&&` to `||`. `HistoryPanel.vue` also backs the main history panel, so a single-type drop there reloads its history too; the copy itself is unchanged.

***This also restores the pin behavior from before Aug 2024.*** Only `MultipleViewList.vue`'s "new history" drop box passes `pinHistories=true`. With `||`, a dataset-only or collection-only drop there pins the new history and the source history again when histories are pinned, as it did before c7423339250. Under `&&` the new history wasn't pinned, so it could be missing from a pinned Multiview. Columns (`HistoryPanel.vue`) only ever reach `loadHistoryById`.

<details><summary>Test helpers and E2E tests</summary>

The Vue diff adds two attributes: `data-history-id` on each column and a `data-description` on its switch button. Multiview renders the same.

`NavigatesGalaxy.multi_history_copy_item(hid, from_history_id, to_history_id)` drags an item between two existing columns. `test_copy_dataset_between_columns` uses it, waits for the copied item to appear in the target column, screenshots it, and checks through the API that the target history got the dataset and the current history didn't change. `test_switch_to_history_from_column` covers the two repointed selectors: it reads a column's name, checks both switch buttons' labels, clicks the target's, and checks that the current history and both labels flip. `test_list_list_copy` and its new-history drop box are untouched.

</details>

## Risks

Risks are minimal - the product change is a one-operator fix that makes the drop refresh work as c7423339250 intended, and the rest is test selectors and two DOM attributes, so nothing locks Galaxy into a hard-to-change choice (a two-way door). The one visible behavior change beyond the fix is that single-type drops onto the "new history" box pin again when histories are pinned, as before Aug 2024.

## Context

The copy helper came out of 🌿 [`galaxy_ui_driver`](https://github.com/jmchilton/galaxy/tree/galaxy_ui_driver), which drives Multiview from scripts. Nothing here depends on it.

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? After a drop, the target column now shows the copied item; the toasts are unchanged. In tests, a missing hook or a drop that doesn't render shows as a timeout naming the selector or the history and hid.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. The vitest checks which store refresh a drop triggers, answering the copy API with MSW (`useServerMock`) and stubbing store actions with `createTestingPinia`; the pin cases use the "new history" box's real call shape. The E2E tests check the rendered column, the API and the buttons.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. `historyDragDrop.test.ts` lands first with the cases that already pass (mixed drop, mixed drop onto the pinned "new history" box, failed copy, same-history drop).
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `historyDragDrop.test.ts`: the dataset-only and collection-only column cases and the dataset-only "new history" box (pinned) case fail under `&&` (`loadHistoryById`/`pinHistory` not called) and pass with `||`; 7/7 pass.
- `test_history_multi_view.py::TestHistoryMultiView::test_copy_dataset_between_columns` times out waiting for the copied item in the target column under `&&`, and passes with `||`. It also times out on `.history-column[data-history-id=…]` with the Vue hooks reverted.
- `test_history_multi_view.py::TestHistoryMultiView::test_switch_to_history_from_column` times out on the switch button with its `data-description` reverted.
- Locally the whole `test_history_multi_view.py` file passes under Playwright (6/6). An earlier revision of the copy test also passed under Selenium.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
