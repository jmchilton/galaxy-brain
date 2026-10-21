Two behavior-preserving refactor commits were split out onto `origin/release_26.1` ahead of the fix: declaring `columns` on `ToolDataTable` (dropping the `getattr` fallback), and an integration-test `_show_tool_data` helper. The two fix commits are replayed on top unchanged. The final tree matches the previous tip `93e2a4b96b7` exactly.

New history (force-pushed to `jmchilton/issue_24328_data_table_mismatch_26.1`):

1. `f65bf583d59` Declare columns on ToolDataTable (refactor)
   - `columns: Dict[str, int]` annotation on the base `ToolDataTable`. `TabularToolDataTable`, and so `RefgenieToolDataTable`, always set it.
   - `assert_data_table_consistency` uses `existing.columns` directly instead of `getattr(existing, "columns", None)` plus a `None` check. No concrete table lacks `columns`, so behavior doesn't change.
2. `4caa2ec15ef` Add _show_tool_data helper to tool data integration tests (refactor)
   - `DataManagerIntegrationTestCase._show_tool_data(table_name)` returns the `tool_data/<name>` JSON. `_testbase_fields` and the duplicated show call in `test_admin_delete_data_table_entry` now use it. No assertion changes.
3. `35543ecf726` Skip shed data tables with conflicting columns at startup (fix; was `64bafce3764`)
4. `043dd7caad4` Don't wipe Galaxy's data tables in handle_missing_data_table_entry (fix; was `93e2a4b96b7`)

Not split out:
- `_FakeTableRegistry.add_new_entries_from_config_file` stub and the `_RepositoryTool` dataclass in `test_data_table_manager.py`. Only the new regression test uses them, so they stay with the fix.
- The `load_from_config_file` signature reflow. It exists only to add the `skip_column_mismatches` kwarg.

Old tip kept locally as `backup/issue_24328_pre_baseline_refactor`.

Tests:
- At refactor commit `4caa2ec15ef`: unit (`test/unit/tool_util/data`, `test_data_table_manager.py`, `test_install_manager.py`) 40 passed.
- At tip `043dd7caad4`: the same unit set, 42 passed. Integration `test/integration/test_tool_data_delete.py`, 2 passed.
