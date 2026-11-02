---
upstream_base_branch: release_26.0
pr: 24453
---
# issue_24220_drop_collection_matching_26.0

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.0...jmchilton:galaxy:issue_24220_drop_collection_matching_26.0?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24220_drop_collection_matching_26.0)

## Status

Status: reworking onto a shared split-type helper (decision 2026-11-02); pushed head `340e7139d0b`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24220_drop_collection_matching_26.0`.

PR [#24453](https://github.com/galaxyproject/galaxy/pull/24453) in draft since 2026-10-29 for the expanded fix ([comment](https://github.com/galaxyproject/galaxy/pull/24453#issuecomment-6507455866)); live body not yet updated from [pr_description.md](pr_description.md).

CI on `340e7139d0b` green (58 pass, 1 skipped; checked 2026-11-02).

Fixes galaxyproject/galaxy#24220: tool form drag and drop matched collections to collection inputs by plain string suffix. Carved from [issue_20657_input_processing_mode](../issue_20657_input_processing_mode/index.md).

[PR description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [polish](polish_debrief.md) · [implementation](implementation_debrief.md) · [re-scope](implementation_rescope_debrief.md) · [scope evaluation](scope_evaluation.md) · [screenshots](screenshot_debrief.md)

## Decisions

- Base `release_26.0`, per the issue: 26.0 has the server's `:` boundary (#22193) and `sample_sheet` normalization, so the fixed client agrees with the dropdown. 25.1 not targeted.
- Needed [`issue_24218_can_map_over_parity_26.0`](../../merged/issue_24218_can_map_over_parity_26.0/index.md)'s `canMapOver` fix; merged as #24227, branch now based directly on `release_26.0`.
- Option-dedupe changes from 20657 (`68b8d3969e5`) left out; not needed for drop matching.
- Alt `issue_24220_drop_collection_matching_26.0_alt_original_scope` keeps the pre-re-scope fix ([alts/original_scope.md](alts/original_scope.md)).

- Map-over drops the server can't split (`sample_sheet` targets, compound `X:paired_or_unpaired`) are refused, per mvdbeek's commit. The compound case contradicts `collection_semantics.md`. John's decision (2026-10-29): expand this PR with the server fix scoped in [followup_issue_split_paired_or_unpaired.md](followup_issue_split_paired_or_unpaired.md). First build (`cf4cc766114`..`340e7139d0b`) was narrower than the PR comment promised, without recorded sign-off: `_split_dataset_collection` learned compound types, leaving the bare rewrite copied 3× and new compound/`sample_sheet` string checks copied 2× each.
- John's decision (2026-11-02): rework onto the promised shared split-type helper (Python + TS mirror) in this branch if it means less duplication and stronger abstractions. Producers emit literal split types; `_split_dataset_collection` changes reverted; Marius' literal-suffix guard kept (promised publicly on 2026-10-29).
- Merge forward: `canMatch` → `accepts` is already on `release_26.1`; only tsc/vitest will catch it.
