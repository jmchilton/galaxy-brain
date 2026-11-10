# gxformat2#288 — `validate_draft` accepts cyclic step graphs

Issue: https://github.com/galaxyproject/gxformat2/issues/288
Origin: filed from foundry#668 triage; the drafted text is in [foundry 668's notes](../../../../foundry/issues/queued/668/upstream_gxformat2_draft_cycles.md).

## Triage (2026-11-10)

- Claimed by the workflow_libs workhorse. No open PR or branch addressed it.
- Root cause confirmed: `_walk_draft_validation` has no cycle check, and `_topo_ordered_steps` drains a cycle alphabetically on the assumption that validation reports it. It also drops self-edges, so a step sourcing its own output never even registers. TS `walkDraftValidation` / `topoOrderedSteps` have the same gap.
- Right repository: gxformat2 owns the draft contract and the shared fixtures; TS ports it.

Branches: [gxformat2](../../../branches/active/issue_288_draft_cycles/index.md), [TS port](../../../../galaxy-tool-util-ts/branches/active/issue_288_draft_cycles/index.md). Debrief: [implementation](../../../../galaxy-tool-util-ts/branches/active/issue_288_draft_cycles/implementation_debrief.md).
