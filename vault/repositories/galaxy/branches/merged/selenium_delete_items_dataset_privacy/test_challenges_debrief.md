# Test challenges debrief (re-harden after re-scope)

Head `22f813cc39d` (was `a03c7fd491e`). Pushed to `jmchilton`. The branch tree is unchanged except for the test move below.

## Changes

- **Dropped the `HistoryView.test.js` `it.each` (5 cases) and moved its coverage to E2E.** It used a full `mount` to drive HistoryCounter, the filters, HistoryPanel, the store and ContentItem together. client/README.md sends that kind of cross-component integration to Selenium/Playwright. Breakdown of the 5 cases:
  - Undelete under Include deleted: already covered by the tightened delete E2E, so it was a duplicate.
  - Delete under the default filter hides the item: already covered by the E2E (`wait_for_hid_hidden(1)`).
  - Delete under Include deleted, unhide under Include hidden, and delete under Include hidden: these were easy to cover at E2E, so I rewrote them there.
  - The `overrides` / `itemOverrides` params on the test file were reverted to base, and nothing else used them. The fix commit is now client code only.
- **`test_delete_undelete_and_purge_items` gets a 4th dataset.** With Include deleted on, hid 4 is deleted and must show its Undelete button. The API must report it deleted, and it must be hidden once Include deleted is turned off. The existing hid 1–3 assertions are untouched.
- **New `test_unhide_item_with_include_hidden`** (`@managed_history`):
  - hid 2 is hidden through `dataset_populator.hide_dataset`.
  - With Include hidden on, unhide hid 2. Its Unhide button must go away and its delete button must be visible, so the row is still listed.
  - Deleting hid 1 still removes it from the list (control).
  - The API must report `(deleted, visible)` for both items.
  - New helpers `history_panel_item_unhide` and `history_panel_include_hidden`. New nav entries `content_item.unhide_button` and `history_panel.include_hidden_button`.
- **Privacy test is now `Baseline tests: Make new datasets private preference`, moved first.** Since the re-scope it no longer depends on the HistoryPanel fix: it passes without the fix and fails without its own hooks only on missing selectors. It is therefore a baseline test. Its client test hooks (data-description, title-link-class) stay in that commit, so it can split off if the fix moves to 26.0.

## Red without `81633e9b01b` (by reasoning)

- Delete E2E: `hid=4 undelete_button.wait_for_visible()` fails because the old `setInvisible` removes the row. `hid=1 delete_button.wait_for_visible()` after Undelete fails for the same reason.
- Unhide E2E: `hid=2 delete_button.wait_for_visible()` fails. The Unhide-button wait passes either way. Waiting for it first makes sure the re-render has happened before the delete-button check, so that check can't pass on stale DOM.
- The built `static/dist` contains the fix (`De(e,{visible:!0})`), so the green runs are the post-fix state.

## Challenged, kept

- No mocks or unit tests remain on the branch.
- The privacy test's API reads already use `get_history_dataset_details`, and there is no repeated raw HTTP.
- `undelete_button.assert_absent()` on purged hid 3 stays, with positive guards on the same row (reasoning in earlier_drafts/1).
- Settled decisions not revisited:
  - the `history_panel_muli_operation_select_hid` spelling
  - the `history_panel_include_deleted` name
  - the default-on switch assert
  - no config guards

## Tests run (one at a time)

- `test_unhide_item_with_include_hidden`: Playwright and Selenium pass.
- `test_delete_undelete_and_purge_items`: Playwright and Selenium pass.
- `HistoryView.test.js` (base version): 8/8 pass.
- ruff, black and isort are clean, and the pre-commit hooks passed.
- `test_new_datasets_private_switch` was not re-run. Its code is byte-identical; only its commit moved.

## Coordinator override

Restored the `HistoryView.test.js` vitest into the fix commit. `HistoryView.test.js` already mounts this component tree, so the README's multi-component argument doesn't apply. The vitest is the only demonstrated red for the fix: 3 cases fail on the pre-fix panel, confirmed twice. The new E2E checks are kept too. 13/13 green.
