# issue_24219_foreign_collection_carry_26.1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.1...jmchilton:galaxy:issue_24219_foreign_collection_carry_26.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24219_foreign_collection_carry_26.1)

## Status

Implemented and hardened; held for John's review. Base `release_26.1` (`dbe4f2f7e41`), head `3147227b128`. Worktree `~/projects/worktrees/galaxy/branch/issue_24219_foreign_collection_carry_26.1`.

Spun out of [issue_24219_pin_offpage_collections_26.1](../issue_24219_pin_offpage_collections_26.1/index.md) scope evaluation: on 26.1 a `data_collection` input selected from another history is dropped on the tool form (rerun); `data` inputs already carry it.

## Decisions

- Independent of the #24219 pin fix; supersedes that branch's alt `_alt_foreign_carry`.
- Carries only other-history HDCAs: 26.1 collection listing includes hidden HDCAs (would duplicate if carried) and deleted HDCAs never reach `to_dict`.
- Carried entry is classified like the page (`_classify_hdca`): one entry, with `map_over_type` only when there is no direct match (client keeps one `keep` entry per id).
- Forward merge to 26.2/dev conflicts with `ee476eb5a3b` (`_carry_selected_hdca` there): keep 26.2's wider condition plus this branch's `map_over_type` classification. `_build_tool_param(inputs=)` also added by the #24219 branch - trivial conflict.
