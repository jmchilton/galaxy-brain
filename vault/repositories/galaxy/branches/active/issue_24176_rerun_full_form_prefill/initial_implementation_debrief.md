# Initial implementation debrief

Branch `issue_24176_rerun_full_form_prefill` (head `d14f5eaa60b`, pushed to `jmchilton`), stacked on `issue_24178_subworkflow_step_params_export` @ `5cf81e75c12` (parent's final tip). Ports spike item 4 (server seeding + expanded-form prefill). Not ported: forced expanded form / simple-form prefill (#24177), import re-keying (#24175).

## Change

**Server**
- `GET /api/workflows/{id}/download?style=run` takes optional `invocation_id` (ignored for other styles). The controller loads it with `workflow_manager.get_invocation` (default ownership/access checks, 403 for another user's invocation).
- `WorkflowInvocation.recover_step_parameters()` (model): `STEP_PARAMETERS` rows → `{step_id: {...}}`.
- `_workflow_to_dict_run(invocation=)` seeds only when `invocation.workflow_id == workflow.id`.
  - Tool steps: `_compute_seeded_runtime_state` recomputes state via `compute_runtime_state(step, step_args=recorded)` (same `check_param` path as the original request), after `_seedable_step_args` drops inputs saved as `${name}` and connected inputs (the form never submits those). If any recorded value fails validation (e.g. a purged dataset) the step is re-injected (state is mutated in place) and recomputed without the failing values; if that still errors, it falls back to the saved state.
  - Subworkflow steps: `_seed_subworkflow_run_inputs` re-keys with the parent's `step_parameters_by_index` and sets matching run-time input values. Unknown inner step ids (`KeyError`/`ValueError`, e.g. imported invocations before #24175) → logged and skipped.
- No `${}` guard needed for subworkflow inputs: `SubWorkflowModule.get_runtime_inputs` only exposes `RuntimeValue` inputs.

**Client**
- `getRunData(workflowId, version, instance, invocationId)` adds `&invocation_id=`.
- `WorkflowRerun` passes `:rerun-request="requestData"` and `:rerun-invocation-id`.
- `WorkflowRun` takes `rerunRequest` / `rerunInvocationId`, passes the id to `getRunData` and forwards `rerunRequest` to `WorkflowRunForm`. Gating logic untouched.
- `WorkflowRunForm` `rerunRequest` prop: input steps prefilled via `stepModels`, workflow params from `replacement_params`, resource params from `resource_params`, `useCachedJobs` from `use_cached_job`.
- `rerunInputValue(requestInputs, step, position)` in `model.js` — the simple form's rerun lookup, factored out; `WorkflowRunFormSimple` now uses it (behaviour unchanged).

## Tests (red then green)

- API (`lib/galaxy_test/api/test_workflows.py`), all red on parent tip except the deleted-dataset one:
  - `test_run_form_seeded_from_invocation` — tool step incl. value inside conditional; unseeded baseline differs.
  - `test_run_form_seeded_from_invocation_conditional_case` — recorded selector switches case.
  - `test_run_form_seeded_from_invocation_keeps_workflow_parameters` — `${seedme}` kept; guard proven load-bearing (`'moo' != '${seedme}'` with it off).
  - `test_run_form_seeded_from_invocation_subworkflow` — `1|num_lines` seeded.
  - `test_run_form_seeded_from_invocation_dataset` — unconnected `cat` data input: recorded HDA is seeded (fails with seeding off: `RuntimeValue`); after purge the form loads and the value is left out (equals unseeded). Error-drop proven load-bearing on an earlier variant of this test. Needs `wait_for_purge=True` (delete is async, 202).
  - `test_run_form_seeding_requires_invocation_access` — 403 for another user's invocation on a public workflow.
- Client vitest: `WorkflowRunForm` prefill (props + `use_cached_job` in submitted payload), `WorkflowRun` wiring (`getRunData` args, prop forwarded), `rerunInputValue` rules. The first two seen red against the pre-change components.
- Green after rebase: 20 related API tests (seeding + parent's rerun/subworkflow/invalid-key tests + run-form/replacement-param tests), `client/src/components/Workflow/Run/` vitest (72), vue-tsc clean, eslint (warnings only, pre-existing), prettier, black/isort/ruff 0.17.0, mypy from `lib/` (no new errors).

## Escalation: interaction with #24177 (merge together)

Seeding replaces a tool step's `RuntimeValue` with the recorded literal. `WorkflowRunModel.hasOpenToolSteps` only counts non-data inputs whose value is a `RuntimeValue`, so it flips true → false (confirmed with a throwaway vitest probe on a `input → random_lines(num_lines runtime)` model). On this branch alone, rerunning such a workflow could land in the simple form, which never submits `parameters` — dev today forces the expanded form with the value empty. #24177's `rerunHasStepParameters` predicate (export has `parameters` → expanded form) covers exactly this, since seeding requires recorded `parameters`. Recommendation: merge #24176 and #24177 together (or fold the predicate in here). Not fixed here per scope.

## Notes

- `serialize_workflow_invocation_to_request` still parses `STEP_PARAMETERS` rows inline; could reuse `recover_step_parameters()`. Left alone — parent-owned code that #24175 is editing in parallel. Follow-up.
- #24175 interaction: imported invocations' rows carry stale step ids. Top-level tool steps simply don't match (no seeding); subworkflow rows are skipped with a warning. A cross-instance import could coincidentally match a step id — #24175's re-keying fixes the root.
- Untested: connected-input skip and the second-pass fallback to saved state (hard to construct; both defensive).
- For #24177: build on `rerunRequest` / `rerunInvocationId` props on `WorkflowRun`, `rerunRequest` on `WorkflowRunForm`, `rerunInputValue` in `model.js` (don't redo the refactor), `getRunData(..., invocationId)`.
- Reviewer question (issue's alternative): server seeding vs client merge of the request export.

## Normal review (acted on)

Review subagent (REVIEW_FOCUS + domain). Per GX_DEVELOPMENT, no review debrief file is kept in the vault because the reviewer raised a security concern; it went to a private report instead.

Acted on:
- Skip connected inputs when seeding (`_seedable_step_args`).
- Fall back to saved state if the second seeded pass still errors.
- Positive API test for a seeded tool dataset input; reworked purged-dataset test onto an unconnected input.
- Only load the invocation for `style=run`; `log.debug` when the invocation ran another workflow version; lazy `%s` log args.
- Client test nits: resource params set in the test that needs them; `""`-key positional fallback case for `rerunInputValue`.

Not acted on:
- Add the forced-full-form guard here (reviewer: should-fix, regression on this branch alone). Coordinator scoped forcing to #24177; escalated above.
- Switch `serialize_workflow_invocation_to_request` (and `run_request.py`) to `recover_step_parameters()`. Parent-owned code that #24175 edits in parallel; follow-up after the stack lands.
- Collapse `WorkflowRerun`'s `request-state` / `simple-form-use-job-cache` slices into `rerunRequest` — natural in #24177, which adds more `rerunRequest` reads.
- Locating forms in `WorkflowRunForm.test.ts` by order rather than a stable selector — acceptable.

Post-review green: 20 related API tests, `Workflow/Run` vitest (72), vue-tsc, black/ruff, mypy (no new errors).

## Guard added after phase 1 (coordinator decision)

So the branch doesn't regress alone: `rerunHasStepParameters(request)` in `Run/model.js` (true iff the export's `parameters` is non-empty). `WorkflowRun.loadRun`, after the three existing checks: `if (props.isRerun && rerunHasStepParameters(props.rerunRequest)) simpleForm.value = false;`. No reason text, simple toggle still shown, no simple-form prefill — those stay in #24177, which builds on the predicate. Red-first vitest: predicate unit test + `WorkflowRun` component test (tool-less run1 variant: simple without params, expanded with). Workflow/Run vitest 74 pass.
