---
upstream_base_branch: dev
related_records:
  - galaxy/branches/subworkflow_mapping
---
# workflow_test_timeouts

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:workflow_test_timeouts?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/workflow_test_timeouts)

## Status

Single commit `a5226c06c15` "Allow slow workflow tests to set a timeout" on `dev` `238bf001549` (2026-09-24); pushed. Same change as #23676's `485c68ba354` minus that commit's timeout line in `subworkflow_mapping_per_step.gxwf-tests.yml`.

No PR.

No CI run on this tip.

## Decisions

- Separable from #23676 (deleted `workflow_core/WORK_GRAPH.md`, 2026-10-01). Open: PR it on its own, or keep it folded into #23676?
- Standing branch: [subworkflow_mapping](../../../../../agents/gx_standing/standing_branches/subworkflow_mapping/index.md).
