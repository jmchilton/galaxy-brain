# issue_24221_paged_map_over_options_26.1

- [Open PR](https://github.com/jmchilton/galaxy/pull/new/issue_24221_paged_map_over_options_26.1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24221_paged_map_over_options_26.1)

## Status

Implemented, hardening in progress. Base: `release_26.1` (`dbe4f2f7e41`). Worktree: `~/projects/worktrees/galaxy/branch/issue_24221_paged_map_over_options_26.1`.

No PR.

No CI yet.

Fixes [#24221](https://github.com/galaxyproject/galaxy/issues/24221): paged collection options drop a collection's "map over" entry (server splits a row across pages; client merges dedupe by id+src).

## Decisions

- Base `release_26.1`: regression from #22643 (26.1); 26.0 and older don't page options.
- Backport of the #24221 commits on [issue_20657_input_processing_mode](../issue_20657_input_processing_mode/index.md). Server commit cherry-picked; client half hand-ported (26.1 forms are Options API, and dev's `itemUniqueKey`/`findDataOption` changes belong to the larger 20657 feature, so 26.1 keeps `itemUniqueKey` and only adds `mergeDataOptions`).
