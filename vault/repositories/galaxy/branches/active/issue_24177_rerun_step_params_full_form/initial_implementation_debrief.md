# Initial implementation debrief

Branch `issue_24177_rerun_step_params_full_form` (commit `fa466393aea`, pushed to `jmchilton`), stacked on `issue_24176_rerun_full_form_prefill` @ `d14f5eaa60b`. Ports spike item 3 (forced expanded form + simple-form prefill) onto #24176's props and guard.

## Change (client only)

- `WorkflowRun.vue`: #24176's guard now also sets `disableSimpleForm` and a new reason `rerunHasStepParameters` (added to the reason union). It runs only if `simpleForm` is still true, so a structural reason (open tool steps, `${}` in tool form, resource params) keeps its own message. Forwards `rerunRequest` to `WorkflowRunFormSimple`.
- `WorkflowRunForm.vue`: alert text for the new reason ("The original run set tool step parameters. The simplified form does not support these, so they would be lost."). The existing `v-if="!disableSimpleForm"` hides the **Simple Form** toggle. Added `workflow-simple-form-link` class and a `data-description` on the reason alert for E2E selectors (`navigation.yml`: `simple_form_link`, `simple_form_disabled_reason`).
- `WorkflowRunFormSimple.vue`: new `rerunRequest` prop. Seeds `splitObjectStore` / `preferredObjectStoreId` / `preferredIntermediateObjectStoreId` from the export (split iff outputs or intermediate id recorded; the invoke API rejects preferred + split together, so the export never has both). Seeds workflow parameter inputs from `replacement_params`.

## Decisions

- **Predicate untouched** (`rerunHasStepParameters` = export `parameters` non-empty). The spike's "only tool step params" commit narrowed it from parameters/replacement/resource to parameters only — #24176 already has that. Not narrowed further to tool rows only: subworkflow step rows are dropped by the simple form too, and #24176 seeds them into the expanded form. The server only stores non-empty step dicts, so an empty `{}` row can't trigger it.
- **No fold** of `WorkflowRerun`'s `:request-state` / `:simple-form-use-job-cache` into `rerunRequest`. `WorkflowRun`'s `requestState` and `simpleFormUseJobCache` props are also used by `WorkflowLanding.vue`, `Home.vue` and `router.js`, so they stay. Folding would only swap two explicit bindings for `??`-precedence logic inside `WorkflowRun`, which is not simpler.
- **Replacement-param seeding inlined** in the simple form (3 lines). #24176's `withRerunValues` in `WorkflowRunForm.vue` does the same lookup. Moving it to `model.js` would edit parent code under review. Follow-up once the stack lands.
- **Reachability of the simple-form workflow-param prefill.** Expanded-form originals always carry `parameters`, so they are forced to the expanded form. Simple-form originals never record `replacement_params` because of the `replacement_dict` bug (issue footnote ¹). So this prefill only matters for API-origin runs, and it has no effect on what is submitted until ¹ is fixed. Not fixed here (separate issue). The object-store prefill is the part with live value.

## Tests (red then green)

- Vitest, red on parent tip:
  - `WorkflowRun.test.js` "explains the expanded form and offers no way back": `disableSimpleForm` / reason props on `WorkflowRunForm`.
  - `WorkflowRunForm.test.ts`: reason text shown, no toggle.
  - New `WorkflowRunFormSimple.test.ts`: preferred and split object stores in the `invokeWorkflow` payload; `replacement_params` reach the workflow-parameter input.
- Vitest, green on parent too (guards):
  - Structural reason wins (run1 → `hasDisconnectedInputs`).
  - No prefill when the export has none.
- Selenium `test_workflow_rerun.py::test_workflow_rerun_keeps_tool_step_parameters`:
  - Steps: set runtime `num_lines` to 3, run, rerun. Assert the expanded form shows the reason alert and no toggle, then submit. Assert the new invocation's request export has `num_lines` 3 and the output has 3 lines.
  - Red on parent: only for the alert and toggle. Parameter preservation already holds there because of #24176's seeding and guard; it would fail against dev.
- `client/src/components/Workflow/Run/` vitest 81 pass; vue-tsc clean; eslint (pre-existing warnings only); prettier; black/ruff/flake8 via pre-commit.

## Not in scope / noted

- Object stores in the expanded form: there are no controls for them, so a forced expanded rerun still drops them (issue's "known gap").
- `replacement_dict` bug (footnote ¹).
- Latent `param_map` keyed-by-id bug in `workflow_run_config_to_request`.
- An API client could record `parameters` for a `parameter_input` step. That also forces the expanded form, which is harmless.
