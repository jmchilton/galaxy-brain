---
upstream_base_branch: dev
related_records:
  - galaxy/branches/subworkflow_mapping
  - galaxy/branches/mapping_axes_model
---
# collection_matching_typing

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:collection_matching_typing?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/collection_matching_typing)

## Status

Status: `branches_need_polish`; hardened (scope expanded per John). Head `ad49f27d383` (seven commits on `dev` `7dd58b00674`; backups `collection_matching_typing_pre_baseline_backup`, `collection_matching_typing_pre_checklist_backup`): fully types `galaxy.model.dataset_collections.{matching,structure,type_description,registry}`, drops all four from the `mypy.ini` red list and narrows the call sites in `tools/execute.py`, `workflow/modules.py` and `workflow/map_over.py`. Worktree: `~/projects/worktrees/galaxy/branch/collection_matching_typing`.

No PR.

Fork CI on `ad49f27d383` not yet seen; earlier lint red (B018 in `test_structure.py`) fixed. Locally flake8 and format clean, mypy matches `dev`, 455 unit tests and the new framework guard pass.

[Test challenges](test_challenges_debrief.md) · [Codex](codex_review.md) · [Thermo-nuclear](thermo_nuclear_review.md) · [Baseline refactor](baseline_refactor.md) · [Scope evaluation](scope_evaluation.md) · [Re-scope](implementation_rescope_debrief.md) · [Tags](pr_tags.md) · Earlier: [earlier_drafts/1/](earlier_drafts/1/), [earlier_drafts/2/](earlier_drafts/2/)

## Decisions

- Extracted from the standing branch [subworkflow_mapping](../../../../../agents/gx_standing/standing_branches/subworkflow_mapping/index.md) at John's request (2026-11-23) so he can read it on GitHub. It was written against `dev`, not cherry-picked: the typing commits on #23676 (`2cf5712cef7`, `adf1054cb7a`, `3c824c6e146`) are interleaved with the axes model.
- Not behavior-neutral in three small places: unenumerated trees raise `NotImplementedError` where they raised `AttributeError` or a bare `Exception`; the map-over planner skips a nameless step input; `MatchingCollections.structure` no longer sets `when_values` on the shared `leaf`. Empty and unenumerated linked structures behave as on `dev` (regression caught and covered by test challenges).
- `subworkflow_mapping` and `mapping_axes_model` will conflict with this in `matching.py`, `structure.py`, `type_description.py`, `tools/execute.py`, `workflow/modules.py` and `mypy.ini` until rebased onto it.
- `MatchingCollections.structure` is now non-optional `BaseTree` (asserts; `for_collections` never builds a collection-less match).
- John (2026-11-23): full scope expansion per [scope evaluation](scope_evaluation.md): `is None` for linked-match and `map_over.py` structure checks, `get_collection` in `_structure_for_output`, fully type `type_description.py` and `registry.py`.
- `subworkflow_mapping` rebase onto this: its `map_over.py` `if linked_structure:` should become `is None`. Deferred: a source collection mapped over a subcollection type (e.g. `list:paired` over `paired`) still fails `_structure_for_output`'s shape check.
- John (2026-11-24): keep `test/unit/workflows/test_map_over.py` and add a framework guard for an empty-list subworkflow map-over (`subworkflow_map_over_empty_list.gxwf.yml`).
- Follow-up candidate: `verify_collection` skips `element_count: 0`, so `filter_null.gxwf-tests.yml`'s zero count asserts nothing.
