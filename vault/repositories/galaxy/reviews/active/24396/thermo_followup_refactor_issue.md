# Follow-up: unify ToolDataTableManager on ordered config sources

After #24396, `ToolDataTableManager` (`lib/galaxy/tool_util/data/__init__.py`) has two modes: legacy `config_filename` (per-file load + merge, per-table reload) and `config_sources` (ordered sources, staged rebuild, `on_registration`). Plan, targeting `dev`:

1. In `__init__`, normalize `config_filename` (+ `tool_data_table_config_path_set`) into `List[ToolDataTableConfig]`; drop the legacy loop.
2. Delete the legacy branches in `reload_tables` and `add_new_entries_from_config_file`; `persist=False` callers (tool shed install validation) use the staging manager directly.
3. Move the managed-file source-building from `MinimalGalaxyApplication._configure_tool_data_tables` into a tool_util function with direct unit tests.
4. Extract the table-compatibility assert into one helper; replace the `__class__`/`__dict__` swap with either a named method or name-based lookups (audit callers that hold `ToolDataTable` references, e.g. dynamic options, data managers).
5. Check planemo and tool shed usage of `ToolDataTableManager(config_filename=...)` for behavior changes (source order, duplicate rows now kept when non-identical).
