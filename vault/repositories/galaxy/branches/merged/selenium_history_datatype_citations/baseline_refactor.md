# Baseline refactor (re-harden)

No further refactoring of the base branch was performed. After the re-scope I checked the existing base refactor again, and it stands: `bfdb81e99e4` "Add history_panel_wait_for_hid_datatype selenium helper" is still commit 1. History was not rewritten, and head is unchanged at `50dc4ccb773`.

The [earlier pass](earlier_drafts/1/baseline_refactor.md) moved that helper to the base. The re-scope didn't touch it.

## Base refactor kept

`bfdb81e99e4` adds `NavigatesGalaxy.history_panel_wait_for_hid_datatype(hid, datatype)`. It also points `test_collection_edit.py::test_change_datatype_simple_list` at the helper in place of its inline wait. It is the only base refactor, and it applies to `release_26.2` on its own: `git diff origin/release_26.2 bfdb81e99e4` touches only those 2 files (+5/-3).

## Candidates not moved to the base

- **`history_panel_wait_for_hid_dbkey`** (commit 3). Its only caller is the new dbkey test, so on the base it would be dead code. That is the same rule the earlier pass used. It doesn't replace anything that already exists:
  - `framework.py:748` (`assert_item_dbkey_displayed_as`) is a one-shot assert.
  - `test_change_dbkey_simple_list` checks the collection edit form, not the panel.
- **`history_panel_change_selected`, the `operation_modal` component, both Selection-modal hooks, the `citations` component and `click_history_option_tool_references`.** These are new scaffolding with no callers on the base, so they stay with the tests that use them.
- **A shared helper for the "selected content menu" dropdown.** This is the only candidate with existing callers. `history_panel_build_list_auto` and `history_panel_build_list_advanced` each call `use_bootstrap_dropdown(..., menu="selected content menu")` inline. I declined it for three reasons:
  - The neighbouring History options helpers (`click_history_option_*`) follow the same inline convention.
  - It would change helpers that the collection-builder tests depend on, in a 26.2 coverage PR.
  - The re-scope review and the polish pass already left it as a follow-up.

  The `_collection_dropdown` wrappers in `test_collection_edit.py:100` and `test_collection_builders.py:161` have no callers at all. Removing that dead code is a follow-up for `dev`.
- **Thermo follow-ups:**
  - having `assert_item_extension`/`assert_item_dbkey_displayed_as` delegate to the waiters
  - the repeated `.g-modal-confirm-buttons button:last-child` selector
  - the dead `history_panel_multi_operation_action_click`

  All of these change existing tests or code outside this PR, so they're deferred to `dev`.
- **`_select_two_of_three_datasets`** (extracted in commit 3). This reshapes code that commit 2 added, not base code, so it's outside this process.

## Verification

- History wasn't rewritten, so the tree equals `50dc4ccb773`, and the working tree is clean.
- `bfdb81e99e4` is the same sha the earlier pass verified. There, `test_collection_edit.py::test_change_datatype_simple_list` passed under Playwright and Selenium, so that result still applies. No E2E runs were needed this pass.
