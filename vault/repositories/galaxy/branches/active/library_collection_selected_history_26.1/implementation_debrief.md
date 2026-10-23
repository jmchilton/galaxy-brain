# Implementation debrief

**STATUS: READY.** Base `release_26.1` (`d808b6425b8`); head `4189977901c` on `jmchilton`. 4 commits, +195/-33 across 10 files.

## Commits

1. `93b3d468c01` **Baseline tests**: the first E2E for library Add to History > as Datasets into a picked history (`test_add_datasets_to_selected_history`). It adds the `libraries_folder_*` helpers, `wait_for_current_history_id` and `wait_for_fade_in`, plus a vitest pinning `useCollectionCreation`'s current-history fallback. These tests pass without the fixes.
2. `a15d9bd3e48` **Refactor**: the library collection dialog's create-new/picked choice now runs through one promise chain. Tests tick rows by name, and `admin_login` moves out of `prepare_library_for_data_export`.
3. `e6f27e08f50` **Library fix**:
   - `useCollectionCreation(historyId)`, and `useCollectionCreator` forwards `props.historyId` (now required).
   - The dialog makes the picked history current before building.
   - New E2E `test_library_collection_export_to_selected_history` and helper `history_collection_names`.
4. `4189977901c` **ListWizard fix**, added by the re-scope:
   - Auto/Advanced Build List now builds in the history the selection came from. The success alert says "added to the history it was built from" and gains a `data-description`.
   - The selection helpers take a `history_id` and the dropdown helpers a `scope`.
   - New E2E `test_build_list_in_viewed_history`.

## Behavior changes for the PR body

- In a library, Add to History > as a Collection with another history picked now builds in that history and switches to it.
- From an owned, non-current history's **view page** (not multiview, where the Selection menu is hidden), Build Dataset List and Auto/Advanced Build List build in the viewed history.
- `Upload/DefaultBox` collection creation now honors the upload's target history.

## Verification

- Red then green:
  - Library collection E2E: red without the fix, green with it.
  - ListWizard E2E: red without its fix, green with it. It also goes red with only the creator forwarding reverted.
- All 3 new E2Es pass under Playwright and Selenium.
- Existing files still pass: `test_library_to_collections.py` 7/7 (Playwright), `test_collection_builders.py` 9/9 (Selenium).
- Collections vitest passes 29/29.
- Codex found nothing.
- Screenshots are in `screenshots/` ([debrief](screenshot_debrief.md)).

## Decisions

- **Extraction:** taken from `galaxy_ui_driver` commits `1d227e6fc4c` and `913dfd7dfd6`. `162dfdb49b4` was left out because its code isn't on 26.1.
- **Base:** 26.1, at John's request. The bug is also on 25.1/26.0, but 26.0's `import-collection.js` has a different shape.
- **Re-scope:** expanded once, to ListWizard. The original scope is in alt `library_collection_selected_history_26.1_alt_original_scope`. The second scope evaluation said keep.
- **Test challenge:** the creator vitest was dropped as redundant with the ListWizard E2E. If commits 3 and 4 are ever split into separate PRs, give 3 its own test of the plumbing back.
- **Cherry-pick dependency:** commit 4 needs `history_collection_names` from commit 3.

## Follow-ups (not done)

- Collection "change datatype" may target the current history (unconfirmed).
- The view page shows "1 of 0 selected".
- The wizard's Name input is narrow.
- SampleSheet creation has no history getter.
- The queued issue `gx_issues/to_file/library_collection_ignores_selected_history.md` hasn't been filed. Its text should also mention the ListWizard path, and that the side effect is on the view page, not multiview.
