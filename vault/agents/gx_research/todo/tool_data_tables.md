# Component - Tool Data Tables

Cover Galaxy's tool data table subsystem in `lib/galaxy/tool_util/data/__init__.py` and `lib/galaxy/tools/data/`: `ToolDataTableManager`, the tabular and Refgenie table types, `.loc` file resolution (`ToolDataPathFiles`, `.loc.sample` fallback, URL-backed files), how definitions with the same table name merge, duplicate-row policy, and first-match `value` lookup used by dynamic options and the tool-data API. Explain how the configured source order works (`tool_data_table_config_path`, `shed_tool_data_table_config`), how Tool Shed installs and data managers register new entries, how reloads reach other processes (control tasks, config watchers), and how `_loaded_content_version` invalidates caches. Leave out a per-tool catalogue of data tables and the data manager bundle format beyond where it touches table registration.

Write against `dev` after galaxy#24396 (a `release_26.1` PR) has merged forward. It replaces incremental per-table reloads with ordered config sources and complete-row merges.

## Why

galaxy#24396 reshapes data table precedence and reload semantics, and no research note covers data tables. The nearest notes (Tool Shed Data Model, Tool Testing Infrastructure) only mention them in passing.

## Requested by

- vault/repositories/galaxy/reviews/active/24396/: learning_galaxy review needed baseline architecture for data table merge/reload.
