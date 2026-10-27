# Component - Workflow Invocation Models

Document the invocation-side ORM and serialization: `WorkflowInvocation`, `WorkflowInvocationStep`, the step output associations (`WorkflowInvocationStepOutputDataset(Collection)Association`), invocation-level outputs (`WorkflowInvocationOutputDataset(Collection)Association`, `WorkflowInvocationOutputValue`, `NoReplacement`), request inputs (`WorkflowRequestToInput*`, `WorkflowRequestInputStepParameter`), the subworkflow invocation association, and how each links to `Workflow` versus `StoredWorkflow`, `WorkflowStep` (label, `order_index`) and `WorkflowOutput` (label). Cover the serialization views (`element`, `collection`, `step_details`) and how `inputs`, `outputs`, `output_collections` and `output_values` are keyed, which indexes exist for per-step and per-workflow invocation queries, and how `expression.json` outputs surface. Leave out scheduling internals and the invocation report.

## Why

Compare-runs needs per-step and per-output reads across many invocations and found no note on these tables, their keys or their indexes. `Component - Workflow API` covers endpoints only, and `Component - Workflow Extraction Models` covers history-to-workflow reconstruction, not the invocation tables.

## Requested by

- vault/repositories/galaxy/branches/active/compare_runs/brain_research.md: resolvers for step runs and output runs batch-load these associations, and the plan's key and index claims are unverified in any note.
