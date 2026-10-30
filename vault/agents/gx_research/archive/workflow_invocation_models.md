# Component - Workflow Invocation Models

Document the invocation-side ORM and serialization: `WorkflowInvocation`, `WorkflowInvocationStep`, the step output associations (`WorkflowInvocationStepOutputDataset(Collection)Association`), invocation-level outputs (`WorkflowInvocationOutputDataset(Collection)Association`, `WorkflowInvocationOutputValue`, `NoReplacement`), request inputs (`WorkflowRequestToInput*`, `WorkflowRequestInputStepParameter`), the subworkflow invocation association, and how each links to `Workflow` versus `StoredWorkflow`, `WorkflowStep` (label, `order_index`) and `WorkflowOutput` (label). Cover the serialization views (`element`, `collection`, `step_details`) and how `inputs`, `outputs`, `output_collections` and `output_values` are keyed, which indexes exist for per-step and per-workflow invocation queries, and how `expression.json` outputs surface. Leave out scheduling internals and the invocation report.

## Why

Compare-runs needs per-step and per-output reads across many invocations and found no note on these tables, their keys or their indexes. `Component - Workflow API` covers endpoints only, and `Component - Workflow Extraction Models` covers history-to-workflow reconstruction, not the invocation tables.

## Requested by

- vault/repositories/galaxy/branches/active/compare_runs/brain_research.md: resolvers for step runs and output runs batch-load these associations, and the plan's key and index claims are unverified in any note.

## Debrief

- Created `vault/research/Component - Workflow Invocation Models.md`, verified against Galaxy `origin/dev` @ `65e6daff2334c8cfd4971682eecfb87f38a224be`. It covers every class the request named: the version/step/output identity links, a per-table column and index table, query patterns for per-step and per-output reads across invocations, the `collection` / `element` / `step_details` / export views and how each dict is keyed, `NoReplacement` as a stored output value, and where `expression.json` and skipped-step outputs surface.
- Index claims for compare_runs: no composite indexes or uniqueness constraints exist on the invocation tables. `workflow_invocation.create_time` is not indexed, and `update_time` is. `workflow_step.label`, `order_index` and `uuid`, and `workflow_output.label`, are not indexed. `workflow_step_id` is unindexed on `workflow_invocation_output_value`, the request-input tables and the subworkflow association. The step-collection table's indexed `workflow_step_id` is always `NULL`.
- Other findings for the requester: the default invocation payload has empty per-step `outputs`, and only `step_details=true` or the per-step endpoint fills them. `inputs` is keyed by `order_index` and `outputs` by label. Unlabeled outputs get a fallback key in `outputs` and `output_collections` but are dropped from `output_values`. `instance=true` on the invocations index returns runs of all versions. Mapped steps store only implicit HDCAs at step level, and `job_id` stays `NULL` for them.
- Added backlinks in Workflow API, Invocation Graph View, Jobs API and Job Cache, Job Completion Lifecycle, Workflow Extraction Models and Collection Models.
- Research issues created: `research_issues/invocation-import-relinks-outputs-by-label.md`, `research_issues/invocations-job-id-filter-misses-mapped-jobs.md`, `research_issues/invocation-step-output-value-scalar.md` and `research_issues/wisodca-workflow-step-id-never-written.md`.
- Out of scope, as requested: scheduling internals and the invocation report. Invocation messages and `WorkflowInvocationCompletion` appear only on the model map.
