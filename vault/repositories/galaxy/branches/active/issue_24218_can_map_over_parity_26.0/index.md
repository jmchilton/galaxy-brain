# issue_24218_can_map_over_parity_26.0

- [#24227](https://github.com/galaxyproject/galaxy/pull/24227)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24218_can_map_over_parity_26.0)

## Status

`ready`; PR out of draft at head `1187e612f7d`, base `release_26.0` (`a6544be047d`).

Draft [#24227](https://github.com/galaxyproject/galaxy/pull/24227) opened 2026-10-17 at John's request (title `[26.0] Fix workflow editor map-over onto `:paired_or_unpaired` inputs the server rejects`; `area/workflows` used because `area/workflows/editor` doesn't exist upstream).

PR CI green apart from two unrelated reds (see CI diagnosis); undrafted 2026-10-19 at John's request.

## Polish

[PR description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [polish debrief](polish_debrief.md)

## About

Fixes galaxyproject/galaxy#24218: client `CollectionTypeDescription.canMapOver` accepts `:paired_or_unpaired` map-overs that the server's `has_subcollections_of_type` rejects, and the editor draws a map-over of empty type `""`. The source fix is ported from `00e2bf07047` on [issue_20657_input_processing_mode](../issue_20657_input_processing_mode/index.md). [Issue notes](../../../issues/wip/24218/index.md). Worktree: `~/projects/worktrees/galaxy/branch/issue_24218_can_map_over_parity_26.0`.

## Decisions

- Base `release_26.0` (John, 2026-10-17): the 26.0 server has compound `:paired_or_unpaired` support (#22193), so this gives full parity; the 25.1 server lacks it.
- Land with or before #24220.
- Re-scoped (2026-10-17, scope evaluation): added a `:` boundary on the compound `X:paired_or_unpaired` check, client + server. Client-only original: [alt](alts/original_scope.md).
- The new `collectionTypeDescription.test.ts` on 26.0 will add/add-conflict with the dev-era file (26.1+) at merge-forward; resolve by keeping both `describe` blocks.

## CI diagnosis — 2026-10-19

- Converter tests: `CONVERTER_molecules (Test #2)` failed. Branch touches no converter or datatype. Unrelated.
- Playwright shard 2: `test_dataset.py::test_history_dataset_update_annotation_and_info`, `ElementHandle.click: Element is not attached to the DOM`. History dataset UI, not the editor. Flake.
- Both failed jobs rerun.
