---
upstream_base_branch: release_26.0
pr: 24453
---
# issue_24220_drop_collection_matching_26.0

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.0...jmchilton:galaxy:issue_24220_drop_collection_matching_26.0?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24220_drop_collection_matching_26.0)

## Status

Status: PR open; head `93ee487fbe5` (mvdbeek's review commit fast-forwarded on 2026-10-29). Worktree: `~/projects/worktrees/galaxy/branch/issue_24220_drop_collection_matching_26.0`.

PR [#24453](https://github.com/galaxyproject/galaxy/pull/24453) open, not draft; mvdbeek review 1 addressed in [review_response_mvdbeek_1.md](review_response_mvdbeek_1.md), reply not posted, live description not yet updated from [pr_description.md](pr_description.md).

CI on `93ee487fbe5` running; API-shard red `test_data_input_recovery_on_delayed_input` (invocation wait timeout) and fork "Test Galaxy release script" are unrelated.

Fixes galaxyproject/galaxy#24220: tool form drag and drop matched collections to collection inputs by plain string suffix. Carved from [issue_20657_input_processing_mode](../issue_20657_input_processing_mode/index.md).

[PR description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [polish](polish_debrief.md) · [implementation](implementation_debrief.md) · [re-scope](implementation_rescope_debrief.md) · [scope evaluation](scope_evaluation.md) · [screenshots](screenshot_debrief.md)

## Decisions

- Base `release_26.0`, per the issue: 26.0 has the server's `:` boundary (#22193) and `sample_sheet` normalization, so the fixed client agrees with the dropdown. 25.1 not targeted.
- Needed [`issue_24218_can_map_over_parity_26.0`](../../merged/issue_24218_can_map_over_parity_26.0/index.md)'s `canMapOver` fix; merged as #24227, branch now based directly on `release_26.0`.
- Option-dedupe changes from 20657 (`68b8d3969e5`) left out; not needed for drop matching.
- Alt `issue_24220_drop_collection_matching_26.0_alt_original_scope` keeps the pre-re-scope fix ([alts/original_scope.md](alts/original_scope.md)).

- Map-over drops the server can't split (`sample_sheet` targets, compound `X:paired_or_unpaired`) are refused, per mvdbeek's commit. The compound case is a stopgap against `collection_semantics.md`; the server fix is drafted in [followup_issue_split_paired_or_unpaired.md](followup_issue_split_paired_or_unpaired.md).
- Merge forward: `canMatch` → `accepts` is already on `release_26.1`; only tsc/vitest will catch it.
