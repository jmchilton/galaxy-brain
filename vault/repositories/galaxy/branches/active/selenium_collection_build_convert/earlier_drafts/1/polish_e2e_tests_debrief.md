# Polish E2E tests debrief

I shared the two builder tests' upload and identifier boilerplate in helpers and added screenshots for the two views only these tests cover; there were no raw selectors or sleeps to replace.

Head moved from `77bcbb1df32` to `5ff72b94a2a`. Each change is folded into its own commit.

## Changes

- **`Test building a list that keeps file extensions`**: added `_upload_and_select_sample_fastas()` and `_collection_identifiers(hid)` to `test_collection_builders.py`, and used them in `test_build_list_keep_extensions`.
- **`Test renaming an element in the advanced flat list builder`**: `test_build_list_advanced_rename_element` uses the same helpers. It also adds `self.screenshot("collection_builder_advanced_list")` after naming and before Create, as the other builder tests do. No other test opens the Advanced > Flat List builder.
- **`Test converting a collection's datatype from its edit view`**: added `self.screenshot("collection_edit_convert_tab")` once the Convert tab's alert is visible. This is the only E2E coverage of the Convert tab.

## Checked, nothing to do

- **Selectors**: all new targets are already in `navigation.yml`. I renamed none of them, so gxui's reads of `list_wizard.element_name` etc. still work.
- **Sleeps**: the branch adds none. The `sleep_for` calls in `_show_hidden_content` predate the branch and are out of scope.
- **No other screenshots added**: the auto list wizard already has `collection_builder_wizard_list`. The edit view's datatype and dbkey tabs have none, but the branch doesn't add those tests.

## Tests

I ran `test_collection_edit.py` (3 tests) plus `test_build_list_keep_extensions` and `test_build_list_advanced_rename_element`, one backend at a time:
- Playwright (headless): 5/5 passed.
- Selenium: 5/5 passed.
