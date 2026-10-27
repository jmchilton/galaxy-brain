# Normal review: selenium_upload_data_library

Verdict: good, small tests-only PR. Fixed one real robustness bug: the list test's "current history stays empty" check depended on the admin's leftover current history, so I added `@managed_history`. Amended into the Baseline tests commit, head `6d58c1eed32`. Confirmed by mutation that the list test goes red when library imports go to the current history. Left the nits below alone.

## Not acted on

- **Private library helpers stay private** (`_library_folder_contents`, `_wait_for_library_datasets_ok`, `_remove_library_dataset_restrictions`). No existing helper does this: `LibraryPopulator` has no Selenium-session variant and no import-dir path, and the other import-dir callers (`test_library_contents`, `test_library_to_collections`) wait through the UI and don't need it. Lifting them into `NavigatesGalaxy` next to `populate_library_folder_from_import_dir` would leave infrastructure with one caller. Revisit if a second test needs it.
- **`_library_folder_contents` returns `[]` on a non-ok response.** That's right for the wait loop (the server 500s mid-import), but `_remove_library_dataset_restrictions` could then silently do nothing. The regular-user test would still fail, just later and less clearly. Nit.
- **`UploadContext.stage_data_library_datasets` returns a list of items**, while the `DataLibraryContext` wrapper returns `self`. This matches the `stage_paste_links` sibling and lets the single-dataset helper delegate. Fine.
- **Target history isn't cleaned up.** Sibling `test_target_history_change` effectively leaks too (`test_history` only cleans up on exception). Not worth diverging.

<details>
<summary>Full review</summary>

### Coverage of davelopez's route
- `test_upload_from_data_library_as_regular_user`: admin builds the library via the import-dir UI, removes dataset restrictions, then a freshly `register()`ed non-admin imports through the Upload Activity data-library method. This exercises the non-admin path. A regression that hides library contents from non-admins fails at `data_library_item_label(...).wait_for_and_click()`.
- `test_upload_list_from_data_library_to_target_history`: the target is created via the API. `HistoriesService.create` doesn't switch current for registered users, so current and target really differ. Two datasets are staged, `to_list`, and the target history is picked.
  - **Mutation check:** I patched `DataLibraryUpload.prepareUpload` to send uploads and collection config to `useHistoryStore().currentHistoryId`. The test failed with `TimeoutAssertionError ... waiting on list in target history`, then I reverted. A split regression (copies in current, list in target) is caught by `history_contents(current) == []`; the legacy contents index includes hidden items.

### Bug fixed
- **Current history wasn't guaranteed empty.** Without `@managed_history`, `_create_and_populate_library` logs out and back in as admin. `_associate_user_history` then restores the admin's last session's current history if it isn't deleted. On a shared CI server that history can hold content from other admin tests that don't use `managed_history` (e.g. `TestLibraryToCollections`), so `assert self.history_contents(current_history_id) == []` was order-dependent.
  - The fix adds `@managed_history`, matching the sibling `test_upload_from_data_library`, which already uses the same logout/login flow and asserts hid 1. It also cleans up the current history.

### Reuse
- The new test helpers reuse `dataset_populator.new_history`, `get_history_collection_details`, `history_contents`, `current_history_id` and `_wait_on`.
- No existing helper waits on import-dir library datasets or removes library dataset restrictions from a Selenium session. The API tests call `libraries/datasets/{id}/permissions` `remove_restrictions` directly, same as here.

### Flakiness
- The wait on library datasets reaching `ok` avoids the folder-contents 500 race.
- The target-history selector needs a reload after creating the history via the API; `self.home()` handles that, same as `test_target_history_change`.
- Element identifier order `["1.bed", "2.bed"]` is both click order and listing order, so it's stable either way.
- Finding the list via `any(dataset_collection)` instead of a hid avoids the hidden-copies hid shift.

### Style
Imports are at the top; ruff, black and isort pass. Comments and docstrings are one line each.

### Verification
- Playwright, class (3 tests): passed.
- Selenium, class (3 tests): passed.
- Mutation run (Playwright, list test): failed as expected.
</details>
