---
upstream_base_branch: dev
---
# Let staging leave parameter input values unstaged

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:staging_workflow_parameter_lists)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/staging_workflow_parameter_lists)
- [Implementation debrief](implementation_debrief.md)

## Status

Implemented at `05af7656` on `dev` (`fd43a3c6`), incl. review 1 fixes and `WorkflowPopulator` adoption; unit, framework workflow tests and lint green locally.

No PR.

Fork CI not yet checked.

## Context

Upstream half of [planemo#1744](../../../../planemo/reviews/active/1744/index.md): adds `parameter_input_keys` to `galactic_job_json` / `StagingInterface.stage` so lists for multiple-value parameter inputs aren't staged as collections. Planemo keeps its workaround until it can require a galaxy-tool-util release with this.
