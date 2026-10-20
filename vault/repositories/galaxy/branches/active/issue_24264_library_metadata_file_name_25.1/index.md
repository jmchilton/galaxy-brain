# issue_24264_library_metadata_file_name_25.1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_25.1...jmchilton:galaxy:issue_24264_library_metadata_file_name_25.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24264_library_metadata_file_name_25.1)

## Status

Status: `branches_implemented_needs_ci` — READY, hardened twice (re-scoped once). Base: `release_25.1` (`3e7b53eaf75`). Head: `654118f2dd6`. Fork: `jmchilton/issue_24264_library_metadata_file_name_25.1`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24264_library_metadata_file_name_25.1`.

No PR yet. CI not yet seen.

Fixes [#24264](https://github.com/galaxyproject/galaxy/issues/24264): `GET /api/folders/{id}/contents` 500s with `TypeError: attribute name must be string, not 'NoneType'` in `MetadataFile.get_file_name`.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Re-scope](implementation_rescope_debrief.md) · [Normal review](subagents/normal_review.md) · [Re-scope review](subagents/rescope_review.md) · [Test challenges](test_challenges_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Baseline refactor](baseline_refactor.md) · [Scope evaluation](scope_evaluation.md) · Alt: [original scope](alts/original_scope.md) · Round 1 hardening: [earlier_drafts/1/](earlier_drafts/1/)

## Decisions

- Base `release_25.1`: bug dates to 2020 (`801182c3580`); 25.1 (2025-12-12) is the oldest release in the 1-year window; small fix.
- Trigger keyed on nested store `get_store_by()` returning `None` (dataset's backend unknown, e.g. removed from config, or not found by hierarchical/`search_for_missing`), not on `purged`. Reporter's exact config unconfirmed.
- `MetadataFile.get_file_name` raises `ObjectNotFound` rather than returning `""`: write paths (`update_from_file`) also call it and a blank name would silently misplace files.
- Re-scoped (first scope evaluation, Scope C): also guard `extra_files_path` serialization. Rule: read paths degrade to `None`, write paths fail typed.
- Open: test challenges round 2 suggests dropping 2 direct-helper assertions in the mapping test — needs John's OK.
