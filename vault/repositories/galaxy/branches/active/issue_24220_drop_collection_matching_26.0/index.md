# issue_24220_drop_collection_matching_26.0

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.0...jmchilton:galaxy:issue_24220_drop_collection_matching_26.0?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24220_drop_collection_matching_26.0)

## Status

Status: PR open. Polished; head `30f986a5a48`, rebased onto `release_26.0` after #24227 (24218) merged. Worktree: `~/projects/worktrees/galaxy/branch/issue_24220_drop_collection_matching_26.0`.

PR [#24453](https://github.com/galaxyproject/galaxy/pull/24453) open, not draft.

Fork CI on `30f986a5a48` green except "Test Galaxy release script" (checks the fork's stale `master` version; unrelated).

Fixes galaxyproject/galaxy#24220: tool form drag and drop matched collections to collection inputs by plain string suffix. Carved from [issue_20657_input_processing_mode](../issue_20657_input_processing_mode/index.md).

[PR description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [polish](polish_debrief.md) · [implementation](implementation_debrief.md) · [re-scope](implementation_rescope_debrief.md) · [scope evaluation](scope_evaluation.md) · [screenshots](screenshot_debrief.md)

## Decisions

- Base `release_26.0`, per the issue: 26.0 has the server's `:` boundary (#22193) and `sample_sheet` normalization, so the fixed client agrees with the dropdown. 25.1 not targeted.
- Needed [`issue_24218_can_map_over_parity_26.0`](../../merged/issue_24218_can_map_over_parity_26.0/index.md)'s `canMapOver` fix; merged as #24227, branch now based directly on `release_26.0`.
- Option-dedupe changes from 20657 (`68b8d3969e5`) left out; not needed for drop matching.
- Alt `issue_24220_drop_collection_matching_26.0_alt_original_scope` keeps the pre-re-scope fix ([alts/original_scope.md](alts/original_scope.md)).

## Open decision

Map-over drops onto a column-defined `sample_sheet` input are now allowed, matching the 26.0 dropdown; jobs get plain lists without column data. Keep, or file a server issue to tighten `match_multirun_collections` and revert the client guard.
