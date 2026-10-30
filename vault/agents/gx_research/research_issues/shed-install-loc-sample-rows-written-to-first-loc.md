# Shed install appends `.loc.sample` rows to the table's first loc file, not the shared shed loc

- Area: lib/galaxy/tool_shed/tools/data_table_manager.py, lib/galaxy/tool_util/data/__init__.py
- Found while: [[Component - Tool Data Tables]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

When a Tool Shed install brings a `<table>` whose name is already registered, `ShedToolDataTableManager._merge_loc_sample_entries` (`data_table_manager.py:173-204`) is meant to append the repository's `.loc.sample` rows "to the shared loc file". It computes `shared_path` from the element's `<file path>` (already rewritten to `tool_data_path/shed/<basename>` at `:299-302`), but uses it only to look up the source sample by basename. It then calls `existing_table.append_entries_with_attribution(new_rows, attribution)`, which has no filename parameter.

`TabularToolDataTable.append_entries_with_attribution` (`tool_util/data/__init__.py:844-896`) writes to `get_filename_for_source(None)`. That is the first tabular file in `filenames` without `tool_shed_repository` info (`:741-773`). Shed installs now write stamp-less `<table>` entries (`652bb74707a`), so this is usually the admin's own loc file from `tool_data_table_config_path` (e.g. `tool-data/all_fasta.loc`), not `tool_data_path/shed/all_fasta.loc`. On the first install for a table, the shed loc isn't in the live table's `filenames` at all.

Effects:

- Rows from an installed repository end up in an admin-maintained loc file (with an `# Added by owner/repo@rev` comment), mixed in with the admin's references and placed at the admin source's precedence, not at the managed file's configured position.
- If the admin's file is read-only (the admin docs say non-managed sources may be), the write fails during install.
- If the admin's loc is missing and the table loaded its `.loc.sample` fallback, that sample path is the first file and receives the rows.

## Evidence / repro

Reproduced with a script against the dev checkout. A table `all_fasta` is defined in `local.xml` (`tool-data/all_fasta.loc`) and in the managed file (`tool-data/shed/all_fasta.loc`). Calling `table.append_entries_with_attribution([["mm10", ...]], "Added by iuc/foo@abc")` appended the comment and row to `tool-data/all_fasta.loc`, and the shed loc stayed empty. No test covers `_merge_loc_sample_entries` with a pre-existing admin loc. `test_append_entries_with_attribution_*` in `test/unit/tool_util/data/test_tool_data.py` uses a single-file table.

## Suggested fix

Pass the target file explicitly: give `append_entries_with_attribution` a `filename` argument and have `_merge_loc_sample_entries` pass `shared_path` (after checking that it is one of the table's tabular files, or registering it first). Add a test with an admin loc and a shed loc for the same table, asserting that the rows land in the shed loc.
