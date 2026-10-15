# galaxy#24175 — Rerun of an imported workflow invocation fails with a 500 when the run had tool step parameters

[Issue](https://github.com/galaxyproject/galaxy/issues/24175)

Filed 2026-10-15 from [proposal](proposal.md) ([source draft](issue_draft.md), [debrief](debrief.md)). Assigned to jmchilton.

Request export of an imported invocation keeps old step ids in step parameter rows, so Rerun 500s. Spike on [`workflow_rerun_step_parameters`](../../../branches/active/workflow_rerun_step_parameters/index.md). Shares re-keying helpers with #24178; could land in one PR.

Next: port the spike fix after #24178's helpers.
