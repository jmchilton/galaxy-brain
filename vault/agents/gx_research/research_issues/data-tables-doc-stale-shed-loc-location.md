# Admin data tables doc describes the old location of shed-installed loc files

- Area: doc/source/admin/data_tables.md
- Found while: [[Component - Tool Data Tables]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

`doc/source/admin/data_tables.md` ("Configuration order", the paragraph after it) says that when a tool using a data table is installed, "a `loc` file is placed in a versioned subdirectory in `tool_data_path` (in a subdirectory that has the name of the toolshed)", e.g. `tool-data/toolshed.g2.bx.psu.edu/`. It also says the tool data table config files in those directories "are unused". The `plasmidfinder` example shows a `<file path>` pointing at that versioned directory.

Since `652bb74707a` ("Isolate shed-managed loc files under tool_data_path/shed/"), `ShedToolDataTableManager.install_tool_data_tables` (`lib/galaxy/tool_shed/tools/data_table_manager.py:234-322`) works differently:

- It copies `*.loc.sample` to the shared `tool_data_path/shed/<name>.loc` (`:244-257`).
- Only the repository's `tool_data_table_conf.xml` (and other non-loc samples) go to the per-revision dir under `shed_tool_data_path` (`get_target_install_dir`, `:165-171`).
- It rewrites each `<file path>` to the shared `shed/` file (`:299-302`).
- It adds no `<tool_shed_repository>` block to the `<table>` entries. It skips an element whose name and file set already exist in the shed config (`:306-316`).

The per-revision `tool_data_table_conf.xml` is the input that `add_new_entries_from_config_file` registers at install time. It isn't loaded at startup, but it isn't strictly unused.

## Evidence / repro

Read in code and docs at this SHA. The doc paragraph predates the `shed/` change.

## Suggested fix

Update the paragraph and example. Say that shed loc files live under `tool_data_path/shed/` and are shared across repositories and revisions, that rows from later installs are appended with an attribution comment, and that `<table>` entries reference that shared path.
