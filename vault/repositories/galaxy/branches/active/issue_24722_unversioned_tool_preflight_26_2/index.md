---
upstream_base_branch: release_26.2
---

# issue_24722_unversioned_tool_preflight_26_2

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:issue_24722_unversioned_tool_preflight_26_2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24722_unversioned_tool_preflight_26_2)

## Status

Implementation in progress for [#24722](https://github.com/galaxyproject/galaxy/issues/24722) ([issue record](../../../issues/queued/24722/index.md)). Worktree: `~/projects/worktrees/galaxy/branch/issue_24722_unversioned_tool_preflight_26_2`.

## Decisions

- Base `release_26.2`: the bug goes back to 25.1, but #24209 restructured `_check_workflow_tools` on 26.2, so an older base would conflict non-trivially on forward merge.
