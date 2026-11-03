Run via Claude Opus at high effort.

```yaml
documents:
  - path: vault/projects/workflow_applications/RERUN_ISSUE.md
    why: Body of #24454 as filed - picker scope rules, run links, rerun re-show, "rerun with this changed", G1-G4, testing plan and the tree-vs-graph recommendation. api_design.md supersedes its exposure keys, exposed_step_parameters and flat parameters payload.
  - path: vault/projects/workflow_applications/LESSONS_LEARNED.md
    why: What the spikes proved - where G1 strictness hooks in (compute_runtime_state / populate_module_and_state), that inner subworkflow keys already apply, the G3 listing gap, the meta-row storage, graph-picker integration costs (annotated prop, store scope, datatypes mapper hang) and the 1-based vs 0-based step number trap.
  - path: vault/projects/workflow_applications/RERUN_UX.md
    why: File-level map of the run/rerun routes, form gating, run model, server run dict, step-param normalization and apply path, plus picker tree rules, card rendering, error mapping and reusable helpers.
    load_when: Locating code to change; ignore its exposure-key and flat-key parts.
  - path: vault/repositories/galaxy/branches/active/workflow_run_exposed_step_params/spike_debrief.md
    why: The tree-picker spike's commits, tests and the shortcuts left undone (no navigation.yml entries, untyped schema, no F3 subworkflow guard, no G3 listing).
    load_when: Porting spike code or tests into this branch.
  - path: vault/repositories/galaxy/branches/active/workflow_run_exposed_step_params/alts/graph_picker.md
    why: The graph-picker alt being merged in as the pop-out view - its own store scope, Node.vue/WorkflowGraph.vue annotated prop, select/deselect diffExposures, and the subworkflow lock to drop.
    load_when: Building the pop-out graph view or select/deselect picking.
  - path: vault/repositories/galaxy/branches/active/issue_24178_subworkflow_step_params_export/implementation_debrief.md
    why: The internal step-parameter map the new field must translate into - step_parameters_by_index/_by_id, resolve_step_parameters, param_map.get(step.id), and the existing 400 policy for unknown outer/inner indexes.
    load_when: Implementing the server translation and validation of step_parameter_overrides.
  - path: vault/research/Component - Workflow Invocation Models.md
    why: The request tables (WorkflowRequestInputParameter meta/step rows, WorkflowRequestInputStepParameter) and the model-store _serialize export view - where to record overrides and how they reach /request and import/export.
    load_when: Recording overrides with the request (G4) and testing import/export.
  - path: vault/repositories/galaxy/branches/active/issue_24177_rerun_step_params_full_form/implementation_debrief.md
    why: The parent branch - simpleFormDisabledReason, the rerunHasStepParameters gate and its alert text that recorded overrides must relax, and the replacement_params submit fix.
    load_when: Changing rerun gating or the simple-form submit payload.
  - path: vault/repositories/galaxy/branches/active/issue_24176_rerun_full_form_prefill/implementation_debrief.md
    why: Server seeding of the run data from an invocation (style=run&invocation_id), withRerunValues and mountRerun - the prefill path rerun cards build on.
    load_when: Prefilling cards on rerun.
  - path: vault/repositories/galaxy/branches/active/issue_24175_imported_invocation_step_params/implementation_debrief.md
    why: Import re-keying in _serialize / _import_workflow_invocations. #24175 is a sibling not in this branch's stack, so import/export changes for the new field touch the same code and may conflict.
    load_when: Carrying step_parameter_overrides through invocation import/export.
  - path: vault/research/Component - Invocation Graph View.md
    why: How WorkflowGraph is reused read-only, scoped workflow stores, NodeInvocationText, and the run form's existing WorkflowRunGraph / useWorkflowRunGraph panel the pop-out could reuse.
    load_when: Building the pop-out graph view.
  - path: vault/research/PR 21842 - Tool Execution Migrated to api jobs.md
    why: buildNestedState in Form/utilities.js converts flat a|b_0|c form values into nested typed tool state - the client side of emitting nested overrides from cards.
    load_when: Building the client payload for step_parameter_overrides.
  - path: vault/research/Component - Tool State Specification.md
    why: The nested (21.01-style) request state representations and conversions the field's shape is modeled on; a source for validating a partial nested state server-side.
    load_when: Designing server-side translation and validation of nested overrides.
  - path: vault/research/Component - Workflow API.md
    why: The invoke endpoint and InvokeWorkflowPayload field list where the new field lands; it says nothing about how step parameters are processed.
  - path: vault/research/Component - Jobs API and Job Cache.md
    why: parameters_display (the G2 rows behind "rerun with this changed") and the job cache that single-step reruns rely on.
    load_when: Implementing the job-parameter row action or G2.
  - path: vault/repositories/galaxy/issues_incubator/internal/rerun_single_step_from_invocation/raw.md
    why: The single-step edit-and-rerun flow api_design.md says should map onto a one-entry step_parameter_overrides resubmission.
    load_when: Checking the field serves the step-rerun use case.
  - path: vault/research/Component - CWL Workflow State.md
    why: Traces queue_invoke -> populate_module_and_state -> compute_runtime_state -> workflow_run_config_to_request -> scheduler state recovery; CWL-focused, and its line numbers predate the stack.
    load_when: Following how translated step parameters are applied and persisted.
  - path: vault/research/Component - Workflow Format Differences.md
    why: Format2 nested state and subworkflow run nesting, which the API design cites as precedent for the nested shape.
    load_when: Writing the PR description or schema docs for the new field.
  - path: vault/research/Component - E2E Tests Smart Components.md
    why: navigation.yml targets and parameterized selectors; the spike's E2E tests used raw selectors instead.
    load_when: Writing or porting the Playwright tests.
  - path: vault/research/Component - E2E Tests - Writing.md
    why: SeleniumTestCase/NavigatesGalaxy helpers and Playwright running for the run, rerun and link E2E tests.
    load_when: Writing or porting the Playwright tests.
  - path: vault/research/Component - API Tests.md
    why: Populators and fixtures for the strict-key, subworkflow, /request and import/export API tests.
    load_when: Writing API tests.
  - path: vault/projects/just_jesting_around/reviews/batch30/WorkflowRun.md
    why: WorkflowRunModel rewrites run data in place, so shared JSON fixtures make Workflow/Run vitest suites order-dependent; use structuredClone.
    load_when: Writing vitest tests for the tree builder or cards.
research_requests:
  - vault/agents/gx_research/todo/workflow_invocation_request_step_parameters.md
  - vault/agents/gx_research/todo/workflow_run_form.md
```
