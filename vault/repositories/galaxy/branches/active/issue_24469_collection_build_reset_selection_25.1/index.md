---
upstream_base_branch: release_25.1
---
# issue_24469_collection_build_reset_selection_25.1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_25.1...jmchilton:galaxy:issue_24469_collection_build_reset_selection_25.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24469_collection_build_reset_selection_25.1)

## Status

Status: implemented, hardened READY; awaiting CI. Head `33914ab23fd`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24469_collection_build_reset_selection_25.1`.

Fixes galaxyproject/galaxy#24469 ([issue record](../../../issues/queued/24469/index.md)): building a collection from a history selection leaves selection mode on.

## Decisions

- Base `release_25.1` per John (issue notes said 25.0, unsupported).
- Reset selection when opening the list wizard (issue path), not on create; cancel drops selection. Restored `createdCollection` for build-list-all modal.

[implementation](implementation_debrief.md) · [initial](initial_implementation_debrief.md) · [scope](scope_evaluation.md) · [screenshots](screenshot_debrief.md)
