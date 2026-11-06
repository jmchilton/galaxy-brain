# Re-scope debrief

[Scope evaluation](earlier_drafts/1/scope_evaluation.md) recommended a modest expansion. It noted that bulk Change Database/Build is the sibling modal of Change data type: it uses the same `SingleItemSelector`, has no hook, and has no E2E caller. The first review had set it aside as out of scope.

The original scope lives at `selenium_history_datatype_citations_alt_original_scope` (`86975a0d75d`); see [alts/original_scope.md](alts/original_scope.md).

## What changed

Head `2816a7b7dbe`, four commits on `release_26.2`:

1. **Add history_panel_wait_for_hid_datatype selenium helper.** Unchanged from the baseline-refactor pass.
2. **Test changing the data type of selected history items.**
   - `change_datatype_modal` became `history_panel.multi_operations.operation_modal`. Its `_` is parameterized by `${operation}`, the menu item's data-description, and the modal's hook is `"<operation> modal"`.
   - `history_panel_change_datatype_of_selected` became `history_panel_change_selected(operation, value)`.
3. **Test changing the database/build of selected history items.** New:
   - `data-description="change database build modal"`
   - `history_panel_wait_for_hid_dbkey`
   - a `_select_two_of_three_datasets` setup shared with the datatype test
   - `test_change_dbkey_of_selected_items`, which sets `apiMel3` on hids 1 and 2 and checks it in the UI and API. It also checks the start value `?` and that hid 3 stays `?`.
4. **Test exporting a history's tool references.** Unchanged.

## Verification

- Red: the dbkey test fails on a client build without its hook (selector timeout).
- Green: after a rebuild, both selection tests and `test_collection_edit.py` (4/4) pass under Playwright and Selenium. After the review fixes, the dbkey test passes on both backends.
- `test_change_dbkey_simple_list` had failed locally only because `tool-data/shared/ucsc/builds.txt` was missing. With the sample copied in (it's gitignored; `common_startup.sh` does the same), it passes.

The [re-scope review](subagents/rescope_review.md) found nothing must-fix; items 1–3 were applied.

## Restack note

`galaxy_ui_driver` has no dbkey commit, and its datatype commit still uses `change_datatype_modal` / `history_panel_change_datatype_of_selected`. When it restacks onto a 26.2 that has this branch, drop both of its commits. gxui's `history-change-datatype` verb (`lib/galaxy/selenium/gxui/verbs.py:248,263`) calls `history_panel_change_datatype_of_selected`. Switch it to `history_panel_change_selected("change data type", datatype)`. A `history-change-dbkey` verb would then be one line.
