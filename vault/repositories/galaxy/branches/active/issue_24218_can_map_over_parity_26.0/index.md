# issue_24218_can_map_over_parity_26.0

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.0...jmchilton:galaxy:issue_24218_can_map_over_parity_26.0?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24218_can_map_over_parity_26.0)

## Status

Polished, waiting for John's final review (`branches_ready_for_final_review`). Head `1187e612f7d`, base `release_26.0` (`a6544be047d`).

No PR yet.

Fork CI is pending on `1187e612f7d`; nothing failed on the previous head.

## Polish

[PR description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [polish debrief](polish_debrief.md)

## About

Fixes galaxyproject/galaxy#24218: client `CollectionTypeDescription.canMapOver` accepts `:paired_or_unpaired` map-overs that the server's `has_subcollections_of_type` rejects, and the editor draws a map-over of empty type `""`. The source fix is ported from `00e2bf07047` on [issue_20657_input_processing_mode](../issue_20657_input_processing_mode/index.md). [Issue notes](../../../issues/wip/24218/index.md). Worktree: `~/projects/worktrees/galaxy/branch/issue_24218_can_map_over_parity_26.0`.

## Decisions

- Base `release_26.0` (John, 2026-10-17): the 26.0 server has compound `:paired_or_unpaired` support (#22193), so this gives full parity; the 25.1 server lacks it.
- Land with or before #24220.
- Re-scoped (2026-10-17, scope evaluation): added a `:` boundary on the compound `X:paired_or_unpaired` check, client + server. Client-only original: [alt](alts/original_scope.md).
- The new `collectionTypeDescription.test.ts` on 26.0 will add/add-conflict with the dev-era file (26.1+) at merge-forward; resolve by keeping both `describe` blocks.
