# issue_24219_foreign_collection_carry_26.1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.1...jmchilton:galaxy:issue_24219_foreign_collection_carry_26.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24219_foreign_collection_carry_26.1)

## Status

Re-scoped 2026-10-19 (John: bring the broader 26.2 fix). Base `release_26.1` (`dbe4f2f7e41`), local head `fd4963c2021`. Worktree `~/projects/worktrees/galaxy/branch/issue_24219_foreign_collection_carry_26.1`. Alt: [original_scope](alts/original_scope.md).

Spun out of [issue_24219_pin_offpage_collections_26.1](../issue_24219_pin_offpage_collections_26.1/index.md) scope evaluation: on 26.1 a `data_collection` input selected from another history is dropped on the tool form (rerun); `data` inputs already carry it.

## Decisions

- Backports #23865 (`ee476eb5a3b`, `a48832e3b04`, cherry-picked `-x`): collection select lists visible HDCAs only (fixes #22734 on 26.1); a selected hidden, deleted or other-history HDCA is carried as a `keep` entry. Conflicts kept 26.1 typing.
- On top: carried HDCA classified via `_classify_hdca`, so a map-over-only selection keeps `map_over_type` (26.2 lacks this; goes forward on merge-up).
- Independent of the #24219 pin fix. Whichever lands second drops `visible_only` / sets `_hdca_listing_visible_only = True` (see pin branch index).
- Cross-user carry exposure: open decision for John (private reports); not changed here.
