Drive ordered data table tests through ToolDataTableManager directly

Opened from `jmchilton:pr_24396_review_1` into `mvdbeek:ordered-tool-data-config-26.1`.

This rewrites the test harness for `test/unit/app/tools/test_ordered_data_tables.py` (review finding P2 3). It only touches tests.

Before this change, `make_app` built `Mock(spec=UniverseApplication)`, bound `MinimalGalaxyApplication._tool_data_tables_registered` onto it with a lambda, and called `_configure_tool_data_tables` unbound. Now most tests exercise `ToolDataTableManager` itself, the way `test_refgenie_data_table.py` does:

- They build `ToolDataTableManager(config_sources=[ToolDataTableConfigSource(...)], on_registration=registrations.append)` directly. Source ordering from config is already tested in `test_tool_data.py`.
- A peer is a second manager on the same sources, reloaded from the recorded registration payload. A restart is a fresh manager.

A small app-wiring section keeps the checks that need the application:

- config-relative path resolution
- startup errors for missing explicit configs
- the optional unset managed file
- control-task dispatch through `reload_tool_data_tables`
- `GalaxyManagerApplication` without watchers
- the `ConfigWatchers` tests

That section builds real application classes with `__new__` and calls the real `_configure_tool_data_tables`, so the hooks run as ordinary bound methods. `RecordingQueueWorker` from `test_data_manager_reload.py` records control tasks, so the tests assert the exact task list.

Every old assertion is kept or made stricter:

- `send_control_task.assert_not_called()` becomes `registrations == []`.
- `assert_called_once_with` becomes an exact control-task list.
- Payload checks now also assert the `on_registration` names.

| Old test | New location |
|---|---|
| `test_live_registration_and_peer_reload_follow_source_order` | manager: `test_registration_and_peer_reload_follow_source_order` |
| `test_omitted_managed_legacy_order_and_admin_reordering[managed_first]` | manager: `test_managed_source_position_sets_row_priority`; omitted-managed append is covered by `test_config_sources_append_unlisted_managed_file` and app: `test_unset_managed_config_is_optional_at_its_configured_position` |
| `test_missing_default_reserves_position_for_registration[explicit]` | manager: `test_missing_optional_managed_source_reserves_position_for_registration`; default path and optional wiring in app: `test_unset_managed_config_is_optional_at_its_configured_position` |
| `test_explicit_missing_configs_are_errors[missing_managed]` | app: `test_explicit_missing_configs_are_errors[managed\|local]` |
| `test_aliases_preserve_xml_relative_paths_and_different_config_bases[write_alias]` | manager: `test_aliases_preserve_xml_relative_paths` (`__HERE__`, write through symlink, restart); app: `test_aliases_resolve_against_different_config_bases` (`config_dir` / `managed_config_dir` resolution, alias dedup) |
| `test_new_table_registration_notifies_peers_and_updates_watchers[reload_kind]` | manager: `test_new_table_registration_reaches_peer_reload`; app: same name (control task, watchers, peer watchers) |
| `test_multi_table_registration_sends_one_peer_reload` | manager: `test_multi_table_registration_reports_tables_once`; app: same name (exactly one control task carrying both names) |
| `test_registration_preserves_read_only_external_sources_and_data_manager_order` | manager: same name |
| `test_invalid_registration_changes_neither_disk_nor_live_tables` | manager: same name |
| `test_failed_write_does_not_publish_registration` | manager: same name |
| `test_ordered_sources_retain_version_filtered_rows[version]` | manager: same name (`MockApp` holds the manager) |
| `test_xml_definition_file_and_row_order_survive_reload` | manager: same name |
| `test_watchers_discover_new_location_directories_with_reload_callback` | app: same name |
| `test_nonpersistent_parser_keeps_transient_definitions` | manager: same name (unchanged) |
| `test_failed_reload_keeps_table_state_and_notifies_after_persist` | manager: same name (`registrations == [["references"]]`) |
| `test_registration_and_reload_without_application_watchers` | app: same name (now asserts that no `watchers` attribute exists) |
| `test_path_reload_does_not_download_unrelated_tables` | manager: same name |
| `test_url_downloads_are_not_watched_but_missing_location_files_are` | app: same name |
| `test_path_reload_discovers_new_table_using_an_already_known_file[reload_existing_first]` | manager: same name |

Test results:

- `test/unit/app/tools/test_ordered_data_tables.py`: 36 passed (28 before).
- With `test/unit/app/tools/test_refgenie_data_table.py` and `test/unit/tool_util/data/test_tool_data.py`: 64 passed.
- Two temporary changes to `_tool_data_tables_registered` were each caught by the app tests: sending one task per table name, and skipping the watcher refresh.
- `mypy --check-untyped-defs` on the module reports no errors in this file.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
