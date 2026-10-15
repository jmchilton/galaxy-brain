# galaxy#24178 — Invocation request export can't be posted back when a subworkflow step had runtime parameters

[Issue](https://github.com/galaxyproject/galaxy/issues/24178)

Filed 2026-10-15 from [proposal](proposal.md) ([source draft](issue_draft.md), [debrief](debrief.md)). Assigned to jmchilton.

Request export of subworkflow step parameters can't be posted back (500). Spike on [`workflow_rerun_step_parameters`](../../../branches/active/workflow_rerun_step_parameters/index.md) (f4b9540, 1ad053b). Filed with John's note: only fixed because the spike shows it's clean, no migration.

Next: port spike commits as a PR with the `WorkflowStep` re-keying helpers.
