---
upstream_base_branch: release_25.1
---
# issue_24469_collection_build_reset_selection_25.1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_25.1...jmchilton:galaxy:issue_24469_collection_build_reset_selection_25.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24469_collection_build_reset_selection_25.1)

## Status

Status: `branches_ready_for_final_review`; polished head `83ed090f9b4`, rebased without conflicts onto `release_25.1`.

No PR is open; the human-read checklist awaits John.

Fresh fork CI is queued/pending; local Jest passed 29/29, formatting passed, and mypy diagnostics match the base.

Fixes galaxyproject/galaxy#24469 ([issue record](../../../issues/queued/24469/index.md)): building a collection from a history selection leaves selection mode on.

## Decisions

- Base `release_25.1` per John (issue notes said 25.0, unsupported).
- Reset selection when opening the list wizard (issue path), not on create; cancel drops selection. Restored `createdCollection` for build-list-all modal.

[implementation](implementation_debrief.md) · [initial](initial_implementation_debrief.md) · [scope](scope_evaluation.md) · [screenshots](screenshot_debrief.md)

[PR description](pr_description.md) · [Title options](pr_titles.md) · [Labels](pr_tags.md) · [Polish debrief](polish_debrief.md)
