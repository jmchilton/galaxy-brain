# Phase 1 implementation

Implemented the routed selection boundary, query parsing and canonical writing, step-card tabs/config loading, Overview and Steps selection synchronization, current-selection sharing, and subworkflow error links. Invocation query changes now preserve the mounted page; embedded views shadow the selection provider. Step resolution prioritizes index, number, then unique label, and copied links use unique labels or human step numbers. Relevant invocation-step lookups use order_index instead of array position.

The URL writer operates on Overview/Steps and workflow Outputs only, preserving notebook report state. Job links require a valid explicit step selector. Workflow Outputs do not inherit a retained graph step. Changes within a tab use replace.

Review follow-up: graph centering now waits for positive node and viewport dimensions in WorkflowGraph itself, including initially selected nodes; InvocationGraph avoids fitting the whole graph over a selected target. Steps search clearing preserves the selected grouped input. Added regressions for selecting grouped inputs from a filtered list and shuffled imported invocation steps; the existing graph fixture was corrected to represent API arrays with order_index.

Validation: selection tests pass (19); focused selection/Share/State/Overview batch passes (37 tests, before the final two selection cases were added). Tests use NODE_OPTIONS=--no-experimental-webstorage for this host's Node webstorage behavior. Targeted ESLint passed for the initial implementation. Full typecheck reports numerous pre-existing generated-schema mismatches; newly introduced optional-query typing errors were corrected. Follow-up graph/Steps regression tests and lint are running at the time of this note and results will be appended.

Phase 2 remains responsible for mapped-job filters/dialog navigation and step/workflow output expansion. The optional useInvocationSelection() context exposes stepIndex, stepTab, job, and output refs. No commits or PRs were created. Browser validation and the remaining required handoff reviews remain with the coordinating agent.
