# original_scope

Branch: `issue_24328_data_table_mismatch_26.1_alt_original_scope` at `043dd7caad4` (pushed to `jmchilton`).

The branch as of the first hardening round: 2 refactor commits (`columns` declared on `ToolDataTable`, `_show_tool_data` integration helper) + 2 fix commits (startup skips conflicting shed tables; `handle_missing_data_table_entry` no longer wipes the live registry).

Differs from parent: parent additionally turns the bare `assert` in `TabularToolDataTable.merge_tool_data_table` into `DataTableColumnMismatch` (new commit + unit test) and drops the dead `existing.columns is not None` check in `install_tool_data_tables` (folded into the `columns` refactor commit).
