---
upstream_base_branch: main
blockers: gxformat2/branches/issue_295_workflow_diff
related_records: gxformat2/branches/issue_295_workflow_diff
---

# `gxwf diff`: structural diff of two Format2 workflows (gxformat2#295 port)

- [Open PR](https://github.com/jmchilton/galaxy-tool-util-ts/compare/main...issue_232_workflow_diff?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy-tool-util-ts/tree/issue_232_workflow_diff)

## Status

Implemented and normal-reviewed at `54c68efb`, branched from `origin/main` `7370df1b`; pushed to `origin`.

No PR yet.

No CI (runs only on PRs); local gate green at `54c68efb`: `make check`, `pnpm lint:unused:ci`, `pnpm build`, `pnpm test`.

## Notes

- Issue: [#232](https://github.com/jmchilton/galaxy-tool-util-ts/issues/232), record [issues/wip/232](../../../issues/wip/232/index.md). Python reference: galaxyproject/gxformat2#295, draft PR galaxyproject/gxformat2#296.
- [Implementation debrief](implementation_debrief.md).
- Worktree: `~/projects/worktrees/galaxy-tool-util-ts/branch/issue_232_workflow_diff`.
- `diff.yml` and `format2/diff/` fixtures are synced from the unmerged gxformat2 branch `issue_295_workflow_diff` at `4440404`. Re-sync from gxformat2 main once #296 merges; that one lands first.
