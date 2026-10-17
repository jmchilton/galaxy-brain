# issue_24218_can_map_over_parity_26.0

Status: implemented + hardened (READY), head `d29206dcd71`; fork CI pending. [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.0...jmchilton:galaxy:issue_24218_can_map_over_parity_26.0?expand=1). Base: `release_26.0` (`a6544be047d`). Worktree: `~/projects/worktrees/galaxy/branch/issue_24218_can_map_over_parity_26.0`. Fork: `jmchilton/issue_24218_can_map_over_parity_26.0`.

Fixes galaxyproject/galaxy#24218: client `CollectionTypeDescription.canMapOver` accepts `:paired_or_unpaired` map-overs the server's `has_subcollections_of_type` rejects; editor draws map-over of empty type `""`. Source fix ported from `00e2bf07047` on [issue_20657_input_processing_mode](../issue_20657_input_processing_mode/index.md). [Issue notes](../../../issues/wip/24218/index.md)

## Decisions

- Base `release_26.0` (John, 2026-10-17): 26.0 server has compound `:paired_or_unpaired` support (#22193), so full parity; 25.1 server lacks it.
- Land with or before #24220.
- Re-scoped (2026-10-17, scope evaluation): added `:` boundary on compound `X:paired_or_unpaired` check, client + server. Client-only original: [alt](alts/original_scope.md).
- New `collectionTypeDescription.test.ts` on 26.0 add/add-conflicts with the dev-era file (26.1+) at merge-forward; resolve by keeping both `describe` blocks.
