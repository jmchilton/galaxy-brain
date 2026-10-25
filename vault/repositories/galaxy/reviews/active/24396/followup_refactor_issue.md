# Unify ToolDataTableManager on ordered config sources

After #24396, `ToolDataTableManager` (`lib/galaxy/tool_util/data/__init__.py`) has two modes:

- **Legacy `config_filename`:** per-file load and merge, plus per-table `reload_from_files` replay of `_load_info` / `_merged_load_info`. The Tool Shed app, `ValidationContext`, `galaxy_mock` and `galaxy-tool-util` consumers such as planemo use this mode.
- **`config_sources`:** ordered sources, a staged rebuild, and `on_registration`. Only Galaxy's app uses this mode.

The two modes differ in source order, duplicate handling and error reporting, and `_merged_load_info` is still filled but unused in the new mode. The plan below targets `dev`.

1. In `__init__`, normalize `config_filename` and `tool_data_table_config_path_set` into `List[ToolDataTableConfigSource]` (e.g. via `tool_data_table_config_sources`), and drop the legacy load loop.
2. Delete the legacy branches in `reload_tables` and `add_new_entries_from_config_file`, together with `ToolDataTable.reload_from_files` / `_merged_load_info`. `persist=False` callers (Tool Shed install validation) should use the staging manager directly.
3. Rewrite `test/unit/app/tools/test_ordered_data_tables.py` so it no longer binds `MinimalGalaxyApplication` methods onto `Mock(spec=UniverseApplication)`. Drive ordering and registration through `ToolDataTableManager(config_sources=..., on_registration=recorder)`, as `test_refgenie_data_table.py` does, and keep one thin app-wiring test.
4. Replace the in-place `__class__`/`__dict__` publish (`ToolDataTable._replace_with`) with name-based lookups. This means auditing the callers that hold `ToolDataTable` references, such as dynamic options and data managers.
5. Consider having `DataManager._reload` use the same single batched peer-notification hook that registrations use.
6. Check how planemo and the Tool Shed use `ToolDataTableManager(config_filename=...)` for behavior changes, in particular source order and the non-identical same-value rows that are now kept.
