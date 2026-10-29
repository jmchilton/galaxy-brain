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

Head `9008b571` (requires gxformat2>=0.29.0, gate dropped); fork CI pending; `test_galaxy_activity.py` + `make lint` green locally, mypy left to CI. Fork CI green on prior head `129b9a55`.

## Decisions

- 2026-10-29: gxformat2 0.29.0 shipped PR #281 (#202); pin raised to `>=0.29.0` and `_has_parameter_list` gate dropped.

## Dependencies

- Upstream Galaxy branch [`staging_workflow_parameter_lists`](../../../../galaxy/branches/active/staging_workflow_parameter_lists/index.md) adds `parameter_input_keys` to galaxy-tool-util staging; targets `release_26.2`; adopt it here once planemo can require galaxy-tool-util 26.2 (or the 26.2.x point release it lands in).
