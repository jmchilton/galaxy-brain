# issue_24219_pin_offpage_collections_26.1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.1...jmchilton:galaxy:issue_24219_pin_offpage_collections_26.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24219_pin_offpage_collections_26.1)

## Status

Implementing. Base `release_26.1` (`dbe4f2f7e41`). Worktree `~/projects/worktrees/galaxy/branch/issue_24219_pin_offpage_collections_26.1`.

Fixes galaxyproject/galaxy#24219: a selected visible collection past the first tool form option page is dropped on form refresh.

## Decisions

- Base `release_26.1`: oldest supported branch with the bug (#22643 paging landed in 26.1); fix is a small server-side change.
- Forward merge to 26.2/dev conflicts (`basic.py`, `test_tools.py`): there the collection listing is visible-only (`ee476eb5a3b`, no `visible_only` arg) → `DataCollectionToolParameter._hdca_listing_visible_only = True`, drop the arg in `_page_hdca_matches`, pin then `_carry_selected_hdca` the unpinned value. Hidden case in `test_build_collection_options_pinned_matches_page_entry` becomes a carried `(hidden)` option there.
- Server-only; client `FormData` already shows non-`keep` pinned entries.
