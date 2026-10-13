# workbook_import_followups — review

Subagent review of `4aacb2ca03c`, run read-only with no tests. Verdict: correct, and it covers all three of mvdbeek's suggestions. Expected values match the test data and the server's pair split. The `assert_absent` dataset check is neither racy nor vacuous: `creatingWhat` is set before the wizard moves to the rule builder, and `wait_for_builder` waits for the builder to render.

| # | Severity | Finding | Outcome |
| --- | --- | --- | --- |
| 1 | Medium | The helper hand-rolls JS focus plus `send_keys_to_page`. The backend-neutral `press(*keys, element=...)` (from `16b66a9207e`) already does this. | Fixed in `debd555d9cd`. |
| 2 | Low | Anchoring on column 1 makes reads depend on call order. Once the grid scrolls past a wide column, column 1 is no longer rendered. | Fixed. The helper anchors on any rendered row-0 cell and presses Home first. A throwaway test reading columns 3, 0, 2 passed on both backends; it was not committed. |
| 3 | Low | The row count is read once. | No change. ag-grid 31 renders its initial rows synchronously, and a short count makes the test fail rather than pass falsely. |
| 4 | Optional | `test_uploads._scroll_to_end_of_table` could reuse `table_cell` + `press`. It has the same risk of a click on a wide cell missing. | Not done. Separate follow-up; those tests are `gtn_screenshot`/`local`. |
| 5 | Optional | `collection_name_input` is a stand-in for collection mode. It is hidden when a `collection_name` column is mapped. | Not done. Correct for these workbooks. `showAddNameTag` is the marker to use if that changes. |
| 6 | Optional | The collections → datasets reset is untested. | Not done. mvdbeek asked only for datasets → collections. |
| 7 | Nits | Nested outer/inner identifiers; mode check inside `_assert_example_1_mapping`; a 0- vs 1-based index comment in yml. | All fixed. Added a `_assert_creating_datasets()` helper, asserted columns 1 and 2, and added a yml comment. |
