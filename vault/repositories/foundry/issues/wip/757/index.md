---
related_records:
  - foundry/issues/674
  - foundry/branches/issue-757-meta-driven-parameters
---
# #757 Channel-shape note has no route for per-element parameters computed from meta

[Issue](https://github.com/galaxyproject/foundry/issues/757). Split from #674 at John's request, 2026-11-07, and filed `roadmap/off`, `priority/mvp`, `work/ready-implement`, `documentation`. The body holds the evidence and proposed approach.

## Status

`wip`: branch `issue-757-meta-driven-parameters` ([record](../../../branches/active/issue-757-meta-driven-parameters/index.md)), no PR yet.

## Findings

- Source workflow and test: [`wip/674/verification/`](../674/verification/). Move them into `verification/workflows/<slug>/`.
- Verified on Galaxy `release_26.1` for the issue: the integer live run, `map_over_expression.gxwf.yml` (text), and `test_run_workflow_conditional_step_map_over_expression_tool` (boolean `when`).
- #667's mapped salmon `--libType` edge "runs green on usegalaxy.org", against #661's "Galaxy 500s". The note should mark this open, not settle it.
- Not re-checked: the IWC corpus isn't materialized locally, so the `consensus-peaks` steps come from the earlier session.

## Next

Implement per the issue. Skim #267 first so shape language agrees.
