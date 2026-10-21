# issue_24328_data_table_mismatch_26.1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.1...jmchilton:galaxy:issue_24328_data_table_mismatch_26.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24328_data_table_mismatch_26.1)

## Status

Implemented, hardening in progress. Base: `release_26.1` (`6ff6692662d`). Fork: `jmchilton/issue_24328_data_table_mismatch_26.1`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24328_data_table_mismatch_26.1`.

No PR yet. CI not yet seen.

Fixes [#24328](https://github.com/galaxyproject/galaxy/issues/24328): installing IUC `data_manager_fetch_index_maf` leaves Galaxy unable to start (`indexed_maf_files` column mismatch with core).

[Initial implementation](initial_implementation_debrief.md)

## Decisions

- Base `release_26.1` (John): the install-time `DataTableColumnMismatch` guard lands in 26.1; 26.0 has the same startup crash but different install code.
- Galaxy pieces only: startup tolerance + stop `reset_tool_data_tables` wiping the live registry. The core vs IUC `indexed_maf_files` name collision is tools-iuc's to resolve; not filed.
