# Component - Workflow Run Form

Document the client workflow run and rerun forms and the run data that feeds them.

Cover:

- **Routes and entry points.** `workflows/run` and `workflows/rerun` in `client/src/entry/analysis/router.js`, their query arguments, `WorkflowRerun.vue` loading `GET /api/invocations/{id}/request`, the rerun buttons (`WorkflowNavigationTitle.vue`, invocation grid), and how workflow landings (`workflow_landings/:uuid`) mount the form.
- **Form choice.** `WorkflowRun.vue` and `simpleFormDisabledReason.ts`: each reason, its precedence, the `simplified_workflow_run_ui` config, and the toggle between forms.
- **Run data.** `GET /api/workflows/{id}/download?style=run[&invocation_id=]` (`_workflow_to_dict_run` in `lib/galaxy/managers/workflows.py`): per-step `inputs` (`tool.to_json`), `step_index`, labels, replacement parameters, the rerun seeding via `invocation_id`, and what subworkflow steps expose (`SubWorkflowModule.get_runtime_inputs`).
- **Model.** `Workflow/Run/model.js` `WorkflowRunModel`, including its in-place rewrite of run data, `isConnected`, `withRerunValues`, `rerunInputValue`, `rerunHasStepParameters`.
- **The two forms.** `WorkflowRunFormSimple.vue` (inputs, workflow parameters, object stores, job cache, on-complete actions, submit payload) and `WorkflowRunForm.vue` / `WorkflowRunDefaultStep.vue` (expanded form, per-step forms, `err_data` mapping back to steps, submit payload). Which `Form/` helpers they use (`FormDisplay`, `visitInputs`, `matchCase`, `buildNestedState`).
- **Graph panel.** `WorkflowRunGraph.vue` and `composables/useWorkflowRunGraph.ts`, and their workflow store scope.
- **Tests.** The vitest suites under `Workflow/Run/`, their fixtures (`testdata/`), and the Selenium/Playwright run and rerun suites (`test_workflow_run.py`, `test_workflow_rerun.py`) with their `navigation.yml` entries.

Leave out the invocation view and graph ([[Component - Invocation Graph View]]) and the server's invocation request processing (requested separately as `workflow_invocation_request_step_parameters.md`).

## Why

`workflow_step_parameter_overrides` adds a step-parameter picker, cards and graph view to the simple run form, plus run-link arguments and rerun re-show. No note covers the run form; [[Component - Invocation Graph View]] mentions only its graph panel, and `workflow_modules_editor_state_roundtrip.md` defers to "the run-form notes", which don't exist. The only map is the spec table in `projects/workflow_applications/RERUN_UX.md`, which is tied to one feature.

## Requested by

- vault/repositories/galaxy/branches/active/workflow_step_parameter_overrides/brain_research.md: needed the run/rerun routes, form gating, run data shape, submit payloads and test harnesses for adding overrides to the simple form.
