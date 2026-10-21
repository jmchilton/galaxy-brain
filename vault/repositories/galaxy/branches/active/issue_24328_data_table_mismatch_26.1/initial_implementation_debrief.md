# Initial implementation debrief

## Root cause

Core `tool_data_table_conf.xml.sample` and IUC `data_manager_fetch_index_maf` both define `indexed_maf_files` with different columns. Install-time checks compare against the live in-memory registry, but `ShedToolDataTableManager.handle_missing_data_table_entry` called `reset_tool_data_tables()`, setting `app.tool_data_tables.data_tables = {}` on the live Galaxy app. Nothing refilled it (`reload_tables` only iterates existing keys), so later installs skipped the check and persisted the conflicting `<table>` into `shed_tool_data_table_conf.xml`. On boot, `_configure_tool_data_tables` → `load_from_config_file` → `merge_tool_data_table` asserted and Galaxy died.

Repro script (scratch, not committed) against 26.0/26.1/26.2/dev: full registry → install refused / no-op, boot OK; emptied registry → table persisted, boot fails with the issue's exact `AssertionError`.

## Changes (2 commits)

1. `80d7fe786e1` Skip shed data tables with conflicting columns at startup
   - `ToolDataTableManager.load_from_config_file` calls the existing `assert_data_table_consistency` per table, raising `DataTableColumnMismatch` (instead of an `AssertionError` from the merge). New `skip_column_mismatches` kwarg logs an error and leaves the table out (not merged, not returned).
   - `GalaxyManagerApplication._configure_tool_data_tables` passes `skip_column_mismatches=True` for the shed config only. Admin `tool_data_table_config_path` conflicts still fail fast.
   - `columns: Dict[str, int]` declared on base `ToolDataTable` (both subclasses set it).
   - Also un-bricks servers that already have the bad entry.
2. `fba71bdcb8a` Don't wipe Galaxy's data tables in `handle_missing_data_table_entry`
   - Removed the `reset_tool_data_tables()` call. The method stays on `BaseShedToolDataTableManager` for the Tool Shed's `tool_validator`, where the registry is throwaway.

## Tests

- Unit `test/unit/tool_util/data/test_tool_data.py`: strict load raises `DataTableColumnMismatch`; `skip_column_mismatches` keeps original table, loads sibling table, logs error. Reuses the previously unused `COLUMN_DIVERGENT_TABLE_CONF_XML`.
- Unit `test/unit/tool_shed/test_data_table_manager.py`: `handle_missing_data_table_entry` keeps registered tables.
- Integration `test/integration/test_tool_data_delete.py::TestConflictingShedToolDataTableIntegration`: Galaxy boots with a conflicting shed table; core columns kept, sibling shed table loads. Red without the app change (server fails to start with `DataTableColumnMismatch`).
- All red first, green after. `test/unit/tool_util/data`, `test_data_table_manager.py`, `test_install_manager.py`: 43 passed. Other `test/unit/tool_shed` failures are env-only (`hg` not installed).

## Decisions / notes

- No "Baseline tests" commit: tests extend existing test files for already-covered behavior; every new test is a red bug test.
- No `.venv` in worktree; ran with sibling 26.1 worktree venv + `PYTHONPATH=lib`.
- Not touched: tools-iuc name collision (`genebed_maf_to_fasta` reads the same 5-col layout as the DM, so the IUC side is self-consistent); legacy `handle_sample_tool_data_table_conf_file(persist=True)` duplication with `install_tool_data_tables`.
