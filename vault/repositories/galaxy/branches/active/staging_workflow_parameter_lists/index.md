---
upstream_base_branch: release_26.2
---
# Let staging leave parameter input values unstaged

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:staging_workflow_parameter_lists)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/staging_workflow_parameter_lists)
- [Implementation debrief](implementation_debrief.md)
- [Test challenges](test_challenges_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Baseline refactor](baseline_refactor.md) · [Scope evaluation](scope_evaluation.md) · [Retarget to 26.2](retarget_release_26_2.md)

## Status

Hardened and retargeted to `release_26.2` at `a812cad3` (on `0902830b`); polishing.

No PR.

Fork CI on `a812cad3` queued.

## Context

Upstream half of [planemo#1744](../../../../planemo/reviews/active/1744/index.md): adds `parameter_input_keys` to `galactic_job_json` / `StagingInterface.stage` so lists for multiple-value parameter inputs aren't staged as collections. Planemo keeps its workaround until it can require a galaxy-tool-util release with this.

## Decisions

- 2026-10-28: John approved retargeting `dev` → `release_26.2` per scope evaluation.
