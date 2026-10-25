# Test challenges review — PR #24396

Profile: gx_test_challenger. Model: Claude Opus 5.5. Effort: low. Reviewed commit: `770965bef62` (vs `origin/release_26.1`). Debrief: [test_challenges_debrief.md](test_challenges_debrief.md).

Verdict: coverage is broad and behavior-focused; flipped dedupe expectations in existing tests reflect an intentional behavior change, not weakening. Main issue is test harness design.

### P2 1: Extract source-list builder; drop hand-bound Mock app harness
`test_ordered_data_tables.py::make_app` uses `Mock(spec=UniverseApplication)` and manually binds `MinimalGalaxyApplication` methods; the watcher test uses `ConfigWatchers.__new__` and a `Mock` watcher. The ordering logic in `_configure_tool_data_tables` is a pure config -> `List[ToolDataTableConfig]` transform. Extract it to a module-level helper, test it directly with `GalaxyAppConfiguration`, and drive manager tests via `ToolDataTableManager(config_sources=..., on_registration=recorder)` (as `test_refgenie_data_table.py` already does) with a small recording dataclass instead of `queue_worker=Mock()`.

### P2 2: Add one integration test for configured order end to end
No test exercises the real app: list-valued `tool_data_table_config_path` with the managed file placed mid-list, a registration (data manager or shed install) landing in that slot, and row order visible via `/api/tool_data/{table}`. Follow `test/integration/test_tool_data_delete.py` for config setup. Some peer-reload unit tests could then go.

### P3 1: Move function-level imports in tests to module top
`from galaxy.config_watchers import ConfigWatchers` and `from galaxy.app_unittest_utils.galaxy_mock import MockApp` inside tests in `test_ordered_data_tables.py`.
