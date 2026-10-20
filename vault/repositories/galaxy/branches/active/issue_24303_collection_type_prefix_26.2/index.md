# issue_24303_collection_type_prefix_26.2

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:issue_24303_collection_type_prefix_26.2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24303_collection_type_prefix_26.2)

## Status

Implementing ([plan](plan.md), [research](research.md)). Base: `release_26.2` (`e2649e52818`). Worktree: `~/projects/worktrees/galaxy/branch/issue_24303_collection_type_prefix_26.2`.

No PR yet. CI not yet seen.

Implements [#24303](https://github.com/galaxyproject/galaxy/issues/24303): declarative output collection type "input type plus a list level" (`type_prefix` modifier on `type_source`).

## Decisions

- Base `release_26.2`: John's call (new tool-spec feature; #24190 Nest fix targets `release_26.0` and is unmerged).
- Replaces #24190 (Nest `list:paired`) on 26.2: Nest 1.1.0 with `type_prefix`, 1.0.0 kept; bernt-matthias's commit cherry-picked. 26.0/26.1 don't get the Nest fix.
- Defaults: `type_prefix`; sample_sheet + prefix errors; profile gate 26.2; parser-only; resolution-order bug separate issue.
