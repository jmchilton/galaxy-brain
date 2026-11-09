# galaxy-brain research follow-up for galaxyproject/galaxy#24770

No current research note conflicts with `release_26.2` as it was before this PR. The items below are post-merge updates.

## Post-merge activities

- `vault/research/Component - Job Completion Lifecycle.md`, "Observers and what they depend on" and "How scheduling detects progress":
  - The "Workflow scheduler, dependency checks" row and the `ready_to_schedule_more` bullet say tracked HDAs wake an invocation when they become *ready*. After #24770 there is a second kind of HDA dependency. It carries a `ReadinessSnapshot` (effective state, extension, deleted, dataset deleted) and wakes the invocation when any of those values *changes*. Tool input-readiness waits use this kind (model operations, `KeepSuccessDatasetsTool`, collection expansion, `auto`/`_sniff_` datatype resolution). Those waits used to be untracked delays that reran the invocation on every iteration.
  - The `scheduling_manager.py` line ranges (`:404-470`, `:367-405`, `:549-592`) shift because the readiness-snapshot query is added to `_any_dependency_satisfied`.
  - Optionally, note that `DependencyType`, `SchedulingDependency` and `SchedulingDependencies` now live in `lib/galaxy/workflow/scheduling_dependencies.py`, not `workflow/modules.py`.
- `vault/agents/gx_research/todo/workflow_scheduling_iterations.md` (pending `Component - Workflow Scheduling`): when it is researched, cover the tracked-vs-untracked delay split, the `ToolInputsNotReadyException(dependencies=...)` → `DelayedWorkflowEvaluation` path, and the one-blocker-per-step rule. A `Requested by` line for this PR has been added.
