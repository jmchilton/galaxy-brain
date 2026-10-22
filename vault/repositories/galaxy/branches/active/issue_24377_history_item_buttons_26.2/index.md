# issue_24377_history_item_buttons_26.2

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:issue_24377_history_item_buttons_26.2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24377_history_item_buttons_26.2)

## Status

Status: implementing. Base: `release_26.2` (`fe7b52529a0`). Head: `1755ced7f18`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24377_history_item_buttons_26.2`.

No PR yet. CI not yet seen.

Implements [#24377](https://github.com/galaxyproject/galaxy/issues/24377) ([issue record](../../../issues/queued/24377/index.md)): restores the stubbed history item button tooltip checks in `test_history_dataset_state.py` and fixes the stale selectors.

## Decisions

- Base `release_26.2`: restores test coverage that has been a no-op since 2022 ("missing tests are bugs"); found in 26.2 release testing. Same stub on `release_26.1` and `dev`.
