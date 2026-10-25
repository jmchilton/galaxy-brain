# Baseline refactor

I split `history_panel_item_delete` and `test_tool_form`'s use of it into a first commit on `release_26.2`, ahead of the two test commits. Head `b1288fcd9b1` (was `73488a1f502`). The final tree is identical to the old head (`git diff 73488a1f502 b1288fcd9b1` is empty).

## Commits

1. `5d033654e90` **Add history_panel_item_delete helper.** It adds `NavigatesGalaxy.history_panel_item_delete(hid)`. `test_rerun_deleted_dataset` calls it in place of the inline `history_panel_item_component(hid=1).delete_button.wait_for_and_click()`. No `navigation.yml` change was needed, because `delete_button` already exists. This is the branch's only change to pre-existing code, so the commit is a behavior-neutral refactor of the base.
2. `ca59e69ae61` **Test deleting, undeleting and purging history items.** Its content is unchanged apart from the helper, which moved down into commit 1. I edited its message to drop the helper and the `test_tool_form` note.
3. `b1288fcd9b1` **Test the Make new datasets private preference.** Cherry-picked unchanged.

## Not split out

- **Selection-menu wrappers** in `test_collection_edit.py` and `test_collection_builders.py`. They cover a different operation set and were already ruled out of scope twice.
- **The remaining new helpers and selectors.** They have no callers in existing code to route through them, so they stay with the tests that introduce them.

## Tests

- `test_tool_form.py::TestToolForm::test_rerun_deleted_dataset` at `5d033654e90`: passed under Selenium and Playwright.
- The head's tree is unchanged. Earlier green runs of both new tests still apply, and so does the clean `merge-tree` against the 26.2 sibling branches.
- The pre-commit hooks passed on commits 1 and 2. Commit 3 is an unchanged cherry-pick of a commit that had already passed them.

`selenium_delete_items_dataset_privacy` was force-pushed to `jmchilton`.
