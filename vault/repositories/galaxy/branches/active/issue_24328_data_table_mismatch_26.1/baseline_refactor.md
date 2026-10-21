No refactoring of the base branch was performed.

Round 1 ([earlier_drafts/1/baseline_refactor.md](earlier_drafts/1/baseline_refactor.md)) already put the refactors first. The re-scope kept that order:

1. `8fbd5381555` Declare columns on ToolDataTable (refactor). The re-scope folded the dead `existing.columns is not None` guard in `install_tool_data_tables` into this commit. Declaring `columns` is what makes that guard dead, so it still changes no behavior.
2. `1c2d354892f` Add `_show_tool_data` helper to tool data integration tests (test refactor).
3. `cd895276abe` Skip shed data tables with conflicting columns at startup (fix)
4. `b2ea2184472` Don't wipe Galaxy's data tables in handle_missing_data_table_entry (fix)
5. `27060b3478e` Raise DataTableColumnMismatch from merge_tool_data_table (fix, from the re-scope)

I checked the three fix commits again and found nothing new to split out:

- The assert → `DataTableColumnMismatch` change in `merge_tool_data_table` (commit 5) changes behavior: callers get a different exception type, and the check now also runs under `python -O`. It's part of the expanded scope, not a refactor. `DataTableColumnMismatch` already exists on `release_26.1`, so commit 5 doesn't depend on anything in the earlier fix commits.
- The new `reset_tool_data_tables` comment ("Tool Shed only") explains why the call was removed in commit 4. It goes with that fix.
- The `load_from_config_file` signature reflow exists only to add `skip_column_mismatches` (same as round 1).
- The `divergent_conf` fixture in commit 5 reshapes a test that commit 3 added. It doesn't touch base code, so it doesn't count as a baseline refactor. Folding it back into commit 3 would only tidy history.

Branch is unchanged at `27060b3478e`, which matches `jmchilton/issue_24328_data_table_mismatch_26.1`. Nothing was pushed.

Note: `implementation_rescope_debrief.md` lists older SHAs (`72611eb6e1d`, `bb16bfeac15`, `8f07de3c584`, `929ae441c3d`) for commits 2–5. The SHAs above are the current ones.

Tests at tip `27060b3478e`: the unit set (`test/unit/tool_util/data`, `test_data_table_manager.py`, `test_install_manager.py`) gave 43 passed. I didn't rerun integration because the code didn't change. The re-scope debrief has `test_tool_data_delete.py` at 2 passed.
