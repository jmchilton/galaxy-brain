# Screenshot debrief

Screenshots successfully obtained.

Head `b2722375165`, Playwright backend, prebuilt post-fix client (`static/dist`). The 3 E2E tests were run one at a time with `GALAXY_TEST_SCREENSHOTS_DIRECTORY` set, and all passed. PNGs are in `screenshots/` (gitignored).

## Index

| File | Test | Shows |
|---|---|---|
| `history_panel_deleted_items_shown.png` | `test_delete_undelete_and_purge_items` | Include deleted on (`deleted:any visible:true`), hids 1-4 listed, hid 3 badged Purged, deleted counter 3. Taken before Undelete. |
| `history_panel_undeleted_item_still_listed.png` | same (temporary extra capture, see below) | Right after Undelete of hid 1 with Include deleted still on: hid 1 stays listed and the deleted counter drops 3 -> 2. This is the HistoryPanel fix. |
| `history_panel_hidden_item_unhidden.png` | `test_unhide_item_with_include_hidden` | Include hidden on (`deleted:false visible:any`). After Unhide, hid 2 stays listed with its delete button. This is the unhide half of the fix. |
| `user_preferences_new_datasets_private_off.png` | `test_new_datasets_private_switch` | "Make new datasets private" switch off (uses new `data-description` hook). |
| `dataset_edit_permissions_public.png` | same | Dataset Edit > Permissions tab (new `title-link-class` hook) with empty access. |
| `user_preferences_new_datasets_private_on.png` | same | Switch on. |
| `dataset_edit_permissions_private.png` | same | Permissions tab, with manage and access both set to the user's private role. |

All images look as expected, with no loading spinners or overlays.

## Notes

- **Extra capture was temporary.** The branch's delete-test screenshot is taken before Undelete, so it doesn't show the fixed behavior. I added `self.screenshot(...)` right after the hid-1 undelete waits, as an uncommitted edit, ran the test (passed), then reverted with `git checkout`. The worktree is clean and the branch is unchanged. Optional follow-up: commit a screenshot at that spot (after `history_panel_item_component(hid=1).delete_button.wait_for_visible()`) so the fix is captured in CI artifacts.
- **No before/after.** A pre-fix capture would need the alt-branch client rebuilt (~10 min) and the post-fix build restored afterwards. The process doesn't require one. The vitest red in `HistoryView.test.js` already demonstrates the bug.
- In the collapsed history items, deleted and non-deleted rows look alike (the undelete vs. delete icons are small). The filter text and the deleted counter are the clearest signals in the images.
