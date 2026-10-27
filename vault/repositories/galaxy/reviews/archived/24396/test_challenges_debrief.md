# Test challenges debrief — PR #24396 @ 770965bef62

Diffed against `origin/release_26.1` merge-base. Read-only review; no tests run (low effort).

## Inventory
- `test/unit/app/tools/test_ordered_data_tables.py` (new, 433 lines, ~17 tests): source ordering, managed-file placement, missing default/explicit configs, registration atomicity, peer reload, watchers, URL downloads.
- `test_refgenie_data_table.py`: registering tabular source over refgenie table, both orders.
- `test_tool_data.py`, `test_data_manager_reload.py`: expectations flipped from "dedupe by value" to "keep distinct rows sharing value" — intentional behavior reversal (version-filtered rows), not weakening. New `get_field` first-wins test covers the lookup side. Keep.
- `test_dynamic_options.py`, `test_tool_data.py` (managers), `test_install_manager.py`: small, behavior-level. Keep.

## Challenges
1. `make_app` builds `Mock(spec=UniverseApplication)`, then binds `MinimalGalaxyApplication._configure_tool_data_tables` / `_tool_data_tables_registered` onto it by hand; watcher test uses `ConfigWatchers.__new__` + `Mock(monitored_dirs=...)`. The source-list logic in `_configure_tool_data_tables` (realpath identity, dedupe, `optional` when not `is_set`, append-last default) is pure config -> `List[ToolDataTableConfig]`. Recommend extracting `tool_data_table_config_sources(config, from_shed_config)` (module function) and testing it directly with `GalaxyAppConfiguration`; most ordering/registration tests can then construct `ToolDataTableManager(config_sources=..., on_registration=recorder)` as the refgenie test already does, with a small recording dataclass in place of `queue_worker=Mock()`.
2. No integration coverage of the headline feature (admin list order with managed file in a chosen slot, then a data-manager/shed registration landing in that slot, visible via `/api/tool_data/{table}`). `test/integration/test_tool_data_delete.py` is a pattern for configuring `tool_data_table_config_path` in an integration test. Recommend one integration test: two read-only XML sources plus managed in the middle, run a data manager (or reuse existing data-manager integration fixtures), assert row order via API; this would also let several unit tests (peer reload ordering) be dropped.
3. Function-level imports in tests (`ConfigWatchers`, `MockApp`) — move to module top.
4. No E2E needed: admin config feature, no UI change.
