Let tests and scripts drive one Multiview history column at a time, with a helper that copies an item between columns, and fix the per-history selectors that match nothing on `dev`.

***The point is addressing one history's column, so tests and scripts can drag items between existing histories. Repointing the dead selectors is the prerequisite.***

On `dev`, `multi_history_panel.switch_button` and `current_history_check` point at `#history-column-<id>`. That id belonged to the legacy multi-panel; Vue Multiview replaced it in 2022, and 🔀 #14608 deleted the old panel. No test calls either selector, so nothing noticed. With no way to address a single column, the only copy test drags onto the "new history" drop box.

| Selector (`multi_history_panel`) | `dev` | This PR |
| --- | --- | --- |
| `switch_button(history_id)` | `#history-column-<id> .switch-to`, matches nothing 😬 | column's `data-description="switch to history button"` ✅ |
| `current_history_check(history_id)` | `#history-column-<id> .details .name`, matches nothing 😬 | column's `data-description="name display"` ✅ |
| `history_column_item(history_id, hid)` | — | item in that history's column 🆕 |
| `history_column_drop_zone(history_id)` | — | drop target for that history's column 🆕 |
| `current_label`, `switch_history` | no callers | removed |

***Only test hooks change. Users could already drag between columns, and Multiview renders and behaves the same. The Vue diff adds two attributes: `data-history-id` on each column and a `data-description` on its switch button.***

`NavigatesGalaxy.multi_history_copy_item(hid, from_history_id, to_history_id)` drags an item between two existing columns. `test_copy_dataset_between_columns` uses it and checks through the API that the target history got the dataset and the current history didn't change. `test_switch_to_history_from_column` covers the two repointed selectors: it reads a column's name, checks both switch buttons' labels, clicks the target's, and checks that the current history and both labels flip. `test_list_list_copy` and its new-history drop box are untouched.

## Risks

Risks are minimal - only test selectors and two DOM attributes change, so nothing locks Galaxy into a hard-to-change choice (a two-way door).

## Context

Part of 🌿 [`galaxy_ui_driver`](https://github.com/jmchilton/galaxy/tree/galaxy_ui_driver), used to copy items between histories when driving Multiview from scripts.

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? No user-facing change. In tests, a missing hook or a drop that doesn't copy shows as a timeout naming the selector or the history and hid.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. Both are E2E tests that check results through the API and the rendered buttons, not the selectors themselves.
- [x] Are baseline tests in their own leading commits (if applicable)? N/A. The tests need the new hooks.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `test_history_multi_view.py::TestHistoryMultiView::test_copy_dataset_between_columns` times out on `.history-column[data-history-id=…]` with the Vue hooks reverted.
- `test_history_multi_view.py::TestHistoryMultiView::test_switch_to_history_from_column` times out on the switch button with its `data-description` reverted.
- Locally the whole `test_history_multi_view.py` file passes under Playwright (6/6). An earlier revision of the copy test also passed under Selenium.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
