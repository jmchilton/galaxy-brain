---
upstream_base_branch: main
parent_branch: issue_210_datatypes_snapshot
---

# validate-tests: collection shape and datatype checks (#210 Phase B)

- Open PR: not opened
- [View on GitHub](https://github.com/jmchilton/galaxy-tool-util-ts/tree/issue_210_test_kind_checks)

## Status

Pushed to `origin` at `3c0c9787` on parent `issue_210_datatypes_snapshot` `519e956e` (base `origin/main` `a0476900`).

No PR yet.

Local gate (`make check`, `make test`) green; CI runs on PRs only.

## Notes

- Issue: [galaxy-tool-util-ts#210](https://github.com/jmchilton/galaxy-tool-util-ts/issues/210), record [issues/wip/210](../../../issues/wip/210/index.md), [plan](../../../issues/wip/210/plan.md).
- Worktree: `~/projects/worktrees/galaxy-tool-util-ts/branch/issue_210_test_kind_checks`.
- Covers issue asks 1 + 2. Ask 3 (output `ftype` vs tool format) deferred: needs datatype propagation; planemo never checks dataset `ftype`.
- Defaults chosen pending John: `filetype` ∉ `format` and test-input map-over are warnings (new optional `severity`); `--cache-dir` read-only, no fetching.
