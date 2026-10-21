# skip_at_startup

Branch: `issue_24328_data_table_mismatch_26.1_alt_skip_at_startup` at `27060b3478e` (pushed to `jmchilton`).

The branch as hardened twice (READY): startup logs and skips a shed `<table>` whose columns conflict with a registered table (`load_from_config_file(skip_column_mismatches=True)` from `_configure_tool_data_tables`), so Galaxy boots with the core table and the data manager's table missing. Includes the `_show_tool_data` integration helper and `TestConflictingShedToolDataTableIntegration` (server boots).

Differs from parent: parent keeps halting at startup but raises a `ConfigurationError` naming the table, both column sets, the installing repository and the `<table>` to remove from the shed config. Parent drops `skip_column_mismatches`, the integration test and its helper commit; startup is covered by a unit test instead. The registry-wipe and typed-merge-error commits are the same in both.
