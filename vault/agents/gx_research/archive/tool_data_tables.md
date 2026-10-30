# Component - Tool Data Tables

Cover Galaxy's tool data table subsystem in `lib/galaxy/tool_util/data/__init__.py` and `lib/galaxy/tools/data/`: `ToolDataTableManager`, the tabular and Refgenie table types, `.loc` file resolution (`ToolDataPathFiles`, `.loc.sample` fallback, URL-backed files), how definitions with the same table name merge, duplicate-row policy, and first-match `value` lookup used by dynamic options and the tool-data API. Explain how the configured source order works (`tool_data_table_config_path`, `shed_tool_data_table_config`), how Tool Shed installs and data managers register new entries, how reloads reach other processes (control tasks, config watchers), and how `_loaded_content_version` invalidates caches. Leave out a per-tool catalogue of data tables and the data manager bundle format beyond where it touches table registration.

Write against `dev` after galaxy#24396 (a `release_26.1` PR) has merged forward. It replaces incremental per-table reloads with ordered config sources and complete-row merges.

## Why

galaxy#24396 reshapes data table precedence and reload semantics, and no research note covers data tables. The nearest notes (Tool Shed Data Model, Tool Testing Infrastructure) only mention them in passing.

## Requested by

- vault/repositories/galaxy/reviews/active/24396/: learning_galaxy review needed baseline architecture for data table merge/reload.

## Debrief

- Created `vault/research/Component - Tool Data Tables.md`, verified against Galaxy `origin/dev` @ `65e6daff2334c8cfd4971682eecfb87f38a224be`. The prerequisite galaxy#24396 (merge commit `5a5850702d0`) is on `dev`, and so is #24323 (dropdown collapse, `eb1950c4740`). The note describes the merged ordered-source design and the review-driven changes that landed with it (`ToolDataTableConfigSource`, `tool_data_table_config_sources()`, `_replace_with`, a single peer task from `on_registration`, non-recursive watching of non-root loc dirs, and `_removed_tables` reuse).
- Added backlinks in Dynamic Tool Manager and Toolbox Lifecycle, Tool Shed Data Model, Pulsar Input Staging and Tool Testing Infrastructure.
- Research issues recorded: `research_issues/shed-install-loc-sample-rows-written-to-first-loc.md` (install-time `.loc.sample` rows are appended to the table's first unstamped loc file, usually the admin's, instead of the shared `tool_data_path/shed/` loc; reproduced with a script) and `research_issues/data-tables-doc-stale-shed-loc-location.md` (the admin doc still describes per-revision loc placement).
- Out of scope: a per-tool table catalogue, and the data manager bundle format (`<move>`, value translations, path rebasing, undeclared tables) beyond `_process_bundle` adding and removing rows. The unify-the-two-manager-modes follow-up (`reviews/archived/24396/followup_refactor_issue.md`) is unfiled. The note mentions it but doesn't track it.
