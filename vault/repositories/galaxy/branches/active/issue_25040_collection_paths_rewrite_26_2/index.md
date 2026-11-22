---
upstream_base_branch: release_26.2
pr: 25049
---
# issue_25040_collection_paths_rewrite_26_2

- [#25049](https://github.com/galaxyproject/galaxy/pull/25049)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_25040_collection_paths_rewrite_26_2)

## Status

Status: `ready`. PR [#25049](https://github.com/galaxyproject/galaxy/pull/25049) opened 2026-11-22 at John's request, out of draft, alternative to mvdbeek's [#25048](https://github.com/galaxyproject/galaxy/pull/25048). Base: `release_26.2` (`3dcb0584c40`). Head: `80fe612c98d` (6 commits), pushed. Worktree: `~/projects/worktrees/galaxy/branch/issue_25040_collection_paths_rewrite_26_2`.

CI not yet seen.

Fixes [#25040](https://github.com/galaxyproject/galaxy/issues/25040): collection `all_paths`, `serialize()`, `all_metadata_files`, `data_style="paths"` config files and single-dataset `all_metadata_files` skip the compute environment's input path rewrite. Also fixes nested `include_collection_name` staging paths (`export_remote`).

[Implementation](implementation_debrief.md) · [PR description](pr_description.md) · [PR titles](pr_titles.md) · [PR tags](pr_tags.md) · [PR checklist](pr_checklist.md) · [Revision review](subagents/revision_review.md) · [Initial implementation](initial_implementation_debrief.md) · [Re-scope](implementation_rescope_debrief.md) · [Normal review](subagents/normal_review.md) · [Re-scope review](subagents/rescope_review.md) · [Test challenges](test_challenges_debrief.md) · [Performance](performance_challenges_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Baseline refactor](baseline_refactor.md) · [Scope evaluation](scope_evaluation.md) · Alt: [original scope](alts/original_scope.md) · Round 1 hardening: [earlier_drafts/1/](earlier_drafts/1/)

## Decisions

- Base `release_26.2`: the bypass exists on every supported release, but the fix changes widely used tool accessors and drops a batched query, so it targets the newest release. Unblocks review [#23986](../../../reviews/active/23986/index.md) P2 1.
- Model property `DatasetCollection.element_identifiers_extensions_paths_and_metadata_files` deleted (no callers; its name was the bug), against the issue text.
- Re-scoped once (first scope evaluation): nested `include_collection_name` fix, input-only metadata rewrite, integration test renamed away from #25021's path.
- Overlap: mvdbeek's draft #25023 carried the same accessor fix (since reworked); #25021 overlaps the integration test. Both named in the PR.
- Second scope evaluation's stale collection-name length allowance fix: deferred to a follow-up PR (changes export filenames); scope kept as hardened.
- 2026-11-22: mvdbeek opened #25048 with the same core fix; John chose to open this branch as an alternative (#25049), with #25048's two extra integration checks folded in.
