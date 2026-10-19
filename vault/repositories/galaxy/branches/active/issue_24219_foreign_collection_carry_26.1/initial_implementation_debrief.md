# Initial implementation debrief

Branch `issue_24219_foreign_collection_carry_26.1`, base `release_26.1` (`dbe4f2f7e41`), head `1991e542a04`.

## What changed

- `lib/galaxy/tools/parameters/basic.py`: `DataCollectionToolParameter._carry_selected_hdca` - after paging, each selected HDCA whose history is not the current one is appended to `options["hdca"]` as `make_hdca_entry(..., "(not in current history) <name>", keep=True, include_column_definitions=True)`. Mirrors 26.2's method and the 26.1 data-input carry (`_carry_unresolved_inputs`), reusing `_carried_state_label` / `make_hdca_entry`.
- `lib/galaxy_test/api/test_tools.py`: `_build_tool_param` gains `inputs`; `test_build_collection_options_carries_other_history_selection`.

## Decisions

- Narrower than 26.2's condition (`deleted or not visible or other history`): on 26.1 hidden HDCAs are listed (direct-only), so carrying them would duplicate an on-page entry; deleted HDCAs fail `from_json` before `to_dict`.
- No dedupe vs page: an other-history HDCA can never be on this history's page.

## Tests run

- New test red on base (`assert 0 == 1`, foreign HDCA absent), green after.
- `test_tools.py -k build_` 19 passed + `TestDataManagerToolsApi::test_build_does_not_leak_hda_from_user_bundle` (fails identically on base); `test_jobs.py -k rerun` 6 passed.
- ruff, black clean; mypy no errors in `basic.py`.
