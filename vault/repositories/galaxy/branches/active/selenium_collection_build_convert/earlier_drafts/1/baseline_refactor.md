# Baseline refactor

I split the convert commit's changes to existing code into a leading refactor commit, "Open collection edit view by hid; share change-datatype steps" (`876754fddc7`). The branch content is unchanged: `git diff 0492c2d95b1 97ffab4de3f` is empty. Head moved from `0492c2d95b1` to `97ffab4de3f`.

## Refactor commit

This commit leaves existing test behavior unchanged and makes no product change:
- `navigation.yml`: adds `history_panel.content_item.edit_button` (`schema.ts` already declared it at base) and removes `collection_menu_edit_attributes`, which has no other users.
- `schema.ts`: removes `collection_menu_edit_attributes`.
- `NavigatesGalaxy`: adds `history_panel_collection_edit(hid)` and `collection_edit_change_datatype`.
- `test_collection_edit.py`:
  - `open_collection_edit_view(hid=3)` now delegates to `history_panel_collection_edit`.
  - The datatype test uses the new shared helper, and the local `change_datatype_value_and_click_submit` is gone.
  - The dbkey test's second open names hid 5. The old first-`.edit-btn` selector clicked the newest item, which was hid 5, so naming it keeps the behavior the same.
- One step was added: `collection_edit_change_datatype` re-clicks the Datatypes tab, which the old local helper didn't. That is harmless, and the tests pass at this commit.

The convert commit now only adds code: the Convert tab selectors, `collection_edit_convert`, `history_wait_for_new_collection`, and the test. I rewrote its body because the commit no longer moves any steps.

## Commit mapping (galaxy_ui_driver restack)

| New | Old | galaxy_ui_driver counterpart |
|---|---|---|
| `876754fddc7` Open collection edit view by hid; share change-datatype steps | (split from `e3e08309f54`) | none |
| `8a5fb734bdd` Test building a list that keeps file extensions | `c0be735a200` | same subject |
| `25ce2409856` Test converting a collection's datatype from its edit view | `e3e08309f54` | same subject, **different patch now**, so drop it by subject, not by patch-id |
| `97ffab4de3f` Test renaming an element in the advanced flat list builder | `0492c2d95b1` | same subject |

`git diff e3e08309f54 25ce2409856` is empty, so the convert commit's tree is unchanged.

## Tests

All runs used a framework-managed server, one at a time.
- Refactor commit `876754fddc7`, `test_collection_edit.py`: Playwright 2/2 and Selenium 2/2 passed.
- HEAD `97ffab4de3f`, `test_collection_edit.py` plus the two new builder tests: Playwright 5/5 and Selenium 5/5 passed.
- On the refactor commit, ruff, black and flake8 are clean, and pre-commit passed on each new commit.
