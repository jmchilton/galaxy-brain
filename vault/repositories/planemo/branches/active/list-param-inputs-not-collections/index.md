---
upstream_base_branch: master
---
# Pass list values to multiple-value workflow parameter inputs

- [Open PR](https://github.com/galaxyproject/planemo/compare/master...jmchilton:planemo:list-param-inputs-not-collections)
- [View on GitHub](https://github.com/jmchilton/planemo/tree/list-param-inputs-not-collections)

Takes over [planemo#1744](https://github.com/galaxyproject/planemo/pull/1744) (mvdbeek). Review record: [reviews/active/1744](../../../reviews/active/1744/index.md). Debrief: [implementation_debrief.md](implementation_debrief.md).

## Status

Branch `list-param-inputs-not-collections` on `jmchilton`, `~/projects/worktrees/planemo/branch/list-param-inputs-not-collections`; built on PR head `d3b58601` + review branch `pr_1744_review_0` (`5a205ab3`), not rebased (merge-base `b1ac9ac5`; `origin/master` `5ff07fa8` at creation), so it can still be pushed into #1744.

No PR of its own yet; #1744 open by mvdbeek.

Fork CI on `129b9a55` queued (run 40434086940); local gate green; Galaxy-backed test passed against Galaxy master (26.1) at `1e9956a5`. Reviewed (subagents/review_1.md); head `129b9a55`.

## Decisions

- Don't bump the gxformat2 pin; `_has_parameter_list` gate stays until a gxformat2 release with #202 (gxformat2 PR #281).

## Dependencies

- Upstream Galaxy branch [`staging_workflow_parameter_lists`](../../../../galaxy/branches/active/staging_workflow_parameter_lists/index.md) adds `parameter_input_keys` to galaxy-tool-util staging; adopt it here once planemo can require that release.
