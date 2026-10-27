---
upstream_base_branch: main
---

# Galaxy datatypes snapshot in workflow-graph (#210 Phase A)

- Open PR: not opened
- [View on GitHub](https://github.com/jmchilton/galaxy-tool-util-ts/tree/issue_210_datatypes_snapshot)

## Status

Pushed to `origin` at `519e956e` (base `origin/main` `a0476900`).

No PR yet.

Local gate (`make check`, `make test`) green; CI runs on PRs only.

## Notes

- Issue: [galaxy-tool-util-ts#210](https://github.com/jmchilton/galaxy-tool-util-ts/issues/210), record [issues/wip/210](../../../issues/wip/210/index.md), [plan](../../../issues/wip/210/plan.md).
- Worktree: `~/projects/worktrees/galaxy-tool-util-ts/branch/issue_210_datatypes_snapshot`.
- Adds `@galaxy-tool-util/workflow-graph/datatypes-snapshot` (usegalaxy.org 26.1.2.dev0, 799 types), `make sync-datatypes`, `make verify-datatypes-snapshot` in `make check`.
- Child branch: `issue_210_test_kind_checks` (Phase B).
