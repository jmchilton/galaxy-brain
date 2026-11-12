---
upstream_base_branch: main
pr: 233
blockers: gxformat2/branches/issue_295_workflow_diff
related_records: gxformat2/branches/issue_295_workflow_diff
---

# `gxwf diff`: structural diff of two Format2 workflows (gxformat2#295 port)

- [Open PR](https://github.com/jmchilton/galaxy-tool-util-ts/compare/main...issue_232_workflow_diff?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy-tool-util-ts/tree/issue_232_workflow_diff)

## Status

Polished at `433db8de` (pushed to `origin`, base `origin/main` `7370df1b`) after normal, Codex, thermo-nuclear reviews and the [strengthening round](subagents/strengthen.md); head now `a5c6cd57` after the [Foundry #796 findings fix](subagents/foundry_findings_fix.md), mirroring gxformat2 `397819a`.

Draft PR [#233](https://github.com/jmchilton/galaxy-tool-util-ts/pull/233), opened 2026-11-11 at John's request; sibling of galaxyproject/gxformat2#296.

CI starts with the PR; local gate green at `a5c6cd57`: `make check`, `pnpm lint:unused:ci`, `pnpm build`, `pnpm test`.

## Notes

- [PR description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md).

- Issue: [#232](https://github.com/jmchilton/galaxy-tool-util-ts/issues/232), record [issues/wip/232](../../../issues/wip/232/index.md). Python reference: galaxyproject/gxformat2#295, draft PR galaxyproject/gxformat2#296.
- [Implementation debrief](implementation_debrief.md), [normal review](subagents/normal_review.md), [Codex review](codex_review.md), [thermo-nuclear review](thermo_nuclear_review.md).
- Worktree: `~/projects/worktrees/galaxy-tool-util-ts/branch/issue_232_workflow_diff`.
- `diff.yml`, `normalized_format2.yml` and `format2/diff/` fixtures are synced from the unmerged gxformat2 branch `issue_295_workflow_diff` at `729027d`. Re-sync from gxformat2 main once #296 merges; that one lands first.
