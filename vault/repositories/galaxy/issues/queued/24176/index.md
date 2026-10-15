# galaxy#24176 — Prefill the full workflow run form when rerunning an invocation

[Issue](https://github.com/galaxyproject/galaxy/issues/24176)

Filed 2026-10-15 from [proposal](proposal.md) ([source draft](issue_draft.md), [debrief](debrief.md)). Assigned to jmchilton.

Full (legacy) run form ignores the invocation on rerun. Spike on [`workflow_rerun_step_parameters`](../../../branches/active/workflow_rerun_step_parameters/index.md). Prerequisite for #24177. Filed with John's note: only fixed because the spike shows it's clean, no migration.

Next: implement the server-seeded prefill (`download?style=run&invocation_id=`) from the spike.
