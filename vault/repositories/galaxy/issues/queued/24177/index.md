# galaxy#24177 — Workflow rerun silently drops tool parameters the original run set

[Issue](https://github.com/galaxyproject/galaxy/issues/24177)

Filed 2026-10-15 from [proposal](proposal.md) ([source draft](raw.md), [debrief](debrief.md)). Assigned to jmchilton.

Simplified run form drops tool step parameters on rerun. Spike on [`workflow_rerun_step_parameters`](../../../branches/active/workflow_rerun_step_parameters/index.md). Must land with or after #24176. Filed with John's note: only fixed because the spike shows it's clean, no migration.

Next: after #24176, route reruns with step params to the full form.
