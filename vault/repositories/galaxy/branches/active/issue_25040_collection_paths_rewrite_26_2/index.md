---
upstream_base_branch: release_26.2
---
# issue_25040_collection_paths_rewrite_26_2

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:issue_25040_collection_paths_rewrite_26_2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_25040_collection_paths_rewrite_26_2)

## Status

Status: implementing. Base: `release_26.2` (`4cc69d30122`). Worktree: `~/projects/worktrees/galaxy/branch/issue_25040_collection_paths_rewrite_26_2`.

No PR yet.

Fixes [#25040](https://github.com/galaxyproject/galaxy/issues/25040): collection `all_paths`, `serialize()`, `all_metadata_files`, `data_style="paths"` config files and single-dataset `all_metadata_files` skip the compute environment's input path rewrite.

## Decisions

- Base `release_26.2`: the bypass exists on every supported release, but the fix changes widely used tool accessors and drops a batched query, so it targets the newest release. Unblocks review [#23986](../../../reviews/active/23986/index.md) P2 1.
