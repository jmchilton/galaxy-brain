# Baseline refactor

I moved one refactor commit to the base: "Add history_panel_wait_for_hid_datatype selenium helper" (`bfdb81e99e4`), which goes ahead of both test commits. Head `86975a0d75d` (was `7470d5c9fe0`). Its tree is identical to the old head.

## Refactor commit

- `bfdb81e99e4` adds `NavigatesGalaxy.history_panel_wait_for_hid_datatype(hid: int, datatype: str)`, typed as in the thermo pass. It also points `test_collection_edit.py::test_change_datatype_simple_list` at the helper in place of its inline `wait_for_visible` + `_wait_on`. This is the only part of the branch that changes existing code, and it applies to `release_26.2` on its own. It drops the explicit `wait_for_visible()`. `wait_for_text()` already waits for visibility (`smart_components.py`), so behavior is the same.
- `3fc7e917081` "Test changing the data type of selected history items" is now just the modal hook, the `change_datatype_modal` selectors, `history_panel_change_datatype_of_selected` and the new test. I reworded its message to drop the helper and `test_collection_edit.py` mentions.
- `86975a0d75d` "Test exporting a history's tool references" is unchanged (cherry-picked).

## Not moved to the base

The other non-test changes are four `data-description` hooks, the `citations` and `change_datatype_modal` selectors, `click_history_option_tool_references` and `history_panel_change_datatype_of_selected`. These are new scaffolding with no callers outside the new tests. Moved to the base, they would be dead code, so they stay with the test that uses them. The follow-ups from the thermo review (merging the helper with `assert_item_extension`, a shared GModal-confirm selector) are refactors of existing code outside this PR's scope. I left them as follow-ups so this 26.2 coverage PR stays proportionate.

## Verification

- `git diff 7470d5c9fe0 86975a0d75d` is empty, so earlier green results at the old head still hold at the new head.
- At `bfdb81e99e4`, `test_collection_edit.py::test_change_datatype_simple_list` passed under Playwright and under Selenium. Each was a separate run against a framework-managed server.
- The local branch has diverged from the pushed `jmchilton/selenium_history_datatype_citations`. Nothing was pushed.
