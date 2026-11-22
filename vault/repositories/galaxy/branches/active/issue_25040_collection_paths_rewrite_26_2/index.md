---
upstream_base_branch: release_26.2
---
# issue_25040_collection_paths_rewrite_26_2

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:issue_25040_collection_paths_rewrite_26_2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_25040_collection_paths_rewrite_26_2)

## Status

Status: `branches_need_decision`. BLOCKED on a scope decision after a re-scope and two hardening rounds. Base: `release_26.2` (`4cc69d30122`). Local head: `cd4d46bb801` (6 commits), not yet force-pushed; the fork has the stale `6d2f2cabcf4`. Worktree: `~/projects/worktrees/galaxy/branch/issue_25040_collection_paths_rewrite_26_2`.

No PR yet. CI not yet seen.

Fixes [#25040](https://github.com/galaxyproject/galaxy/issues/25040): collection `all_paths`, `serialize()`, `all_metadata_files`, `data_style="paths"` config files and single-dataset `all_metadata_files` skip the compute environment's input path rewrite. Also fixes nested `include_collection_name` staging paths (`export_remote`).

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Re-scope](implementation_rescope_debrief.md) · [Normal review](subagents/normal_review.md) · [Re-scope review](subagents/rescope_review.md) · [Test challenges](test_challenges_debrief.md) · [Performance](performance_challenges_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Baseline refactor](baseline_refactor.md) · [Scope evaluation](scope_evaluation.md) · Alt: [original scope](alts/original_scope.md) · Round 1 hardening: [earlier_drafts/1/](earlier_drafts/1/)

## Decisions

- Base `release_26.2`: the bypass exists on every supported release, but the fix changes widely used tool accessors and drops a batched query, so it targets the newest release. Unblocks review [#23986](../../../reviews/active/23986/index.md) P2 1.
- Model property `DatasetCollection.element_identifiers_extensions_paths_and_metadata_files` deleted (no callers; its name was the bug), against the issue text.
- Re-scoped once (first scope evaluation): nested `include_collection_name` fix, input-only metadata rewrite, integration test renamed away from #25021's path.
- Overlap: mvdbeek's draft #25023 (`fee0cf0ff4`) is the same accessor fix, still with bugs this branch fixed; #25021 overlaps the integration test. Name both in the PR.
- Open: second scope evaluation suggests dropping the stale collection-name length allowance in `get_all_staging_paths` (commit 2). Apply, defer, or ship the alt?
