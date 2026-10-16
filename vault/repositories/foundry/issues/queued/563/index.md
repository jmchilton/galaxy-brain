# foundry#563 — Workflow Plan (now "Workflow Brief")

[Issue](https://github.com/galaxyproject/foundry/issues/563)

Labels at triage (2026-10-16): `needs-triage`. Filed as `queued` despite that label: the pipelines it asks for have landed, so the next move is ours, a real run.

- Plan: [brief-run-plan.md](brief-run-plan.md).
- The pipelines landed on `main` in #682 (2026-10-15, `b2cdd98b`): paper, interview and Nextflow → brief, plus brief → Galaxy. [branch notes](../../../branches/merged/rfc-workflow-brief/index.md)
- The brief CLI (`foundry validate-workflow-brief`, `check-workflow-brief`) shipped in `@galaxy-foundry/gxwf-foundry@0.2.0` with the #561 release (2026-10-16).
- Open: no agent-driven end-to-end brief run yet. Close or keep open per the plan's decision rules.
