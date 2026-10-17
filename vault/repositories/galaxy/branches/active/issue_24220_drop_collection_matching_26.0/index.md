# issue_24220_drop_collection_matching_26.0

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.0...jmchilton:galaxy:issue_24220_drop_collection_matching_26.0?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24220_drop_collection_matching_26.0)

## Status

Implementing/hardening. Base: `release_26.0` (`a6544be047d`). Worktree: `~/projects/worktrees/galaxy/branch/issue_24220_drop_collection_matching_26.0`.

Fixes galaxyproject/galaxy#24220: tool form drag and drop matched collections to collection inputs by plain string suffix. Carved from [issue_20657_input_processing_mode](../issue_20657_input_processing_mode/index.md).

## Decisions

- Base `release_26.0`, per the issue: 26.0 has the server's `:` boundary (#22193) and `sample_sheet` normalization, so the fixed client agrees with the dropdown. 25.1 not targeted.
- Stacked on `issue_24218_can_map_over_parity_26.0` (`d45d2fdb3bc`, parallel session): #24220 needs its `canMapOver` fix. Open/merge 24218 first; rebase onto `release_26.0` once it lands, or onto 24218 if that is rebased.
- Option-dedupe changes from 20657 (`68b8d3969e5`) left out; not needed for drop matching.
