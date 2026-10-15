# Prefill the full workflow run form when rerunning an invocation

When a workflow rerun opens in the full (legacy) run form, the form ignores the original run and starts from the workflow's saved defaults.

The rerun page already loads everything the original run used (`GET /api/invocations/{id}/request`), but only the simple form reads any of it:

| Setting from the original run | In the `/request` export | Full run form on rerun today |
| --- | --- | --- |
| Workflow inputs | ✅ | ❌ Empty. A required single dataset input selects whichever matching dataset is listed first |
| Workflow parameters (`${name}`) | ✅ | ❌ Empty |
| Tool step parameters set at run time | ✅ | ❌ The workflow's saved values |
| Workflow resource parameters | ✅ | ❌ Defaults |
| Job re-use | ✅ | ❌ Off, so every step runs again |
| Preferred object stores | ✅ | ➖ The full form has no object store controls at all |

➖ = not covered by this issue; see the end of the details below.

The full form isn't a rare path for reruns. `WorkflowRun` refuses the simple form, even when the rerun page asks for it, for any workflow with:

- a `${name}` workflow parameter inside a tool step,
- an unconnected tool step input that is a required dataset or is set to be chosen at run time, or
- workflow resource parameters.

Reruns of those workflows can only use the full form. A rerun that does start in the simple form is also one click on **Expanded workflow form** away from losing all of it. For those workflows, the original run was made in the full form, which submits every unconnected parameter of every tool step. They are the runs with the most settings to carry over, and the rerun keeps none of them. The user has to rebuild the run from memory, and if a required dataset input is left alone, the rerun silently runs on a dataset the form picked.

<details><summary>Where the settings are dropped (dev <a href="https://github.com/galaxyproject/galaxy/commit/c63ffc2ccae4875976677b468dce3ac3e1ba74d8"><code>c63ffc2ccae</code></a>)</summary>

- [`WorkflowRerun.vue`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/Workflow/Run/WorkflowRerun.vue#L46-L54) loads the request export and mounts `WorkflowRun` with `request-state="requestData.inputs"`, `prefer-simple-form`, `is-rerun` and the job cache flag. Nothing else from the export is passed on.
- [`WorkflowRun.vue`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/Workflow/Run/WorkflowRun.vue#L127-L153) turns off `preferSimpleForm` when `hasReplacementParametersInToolForm`, `hasOpenToolSteps` or `hasWorkflowResourceParameters` is set (computed in [`model.js`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/Workflow/Run/model.js#L119-L173)). `requestState`, `isRerun` and `simpleFormUseJobCache` go to `WorkflowRunFormSimple` only. [`WorkflowRunForm`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/Workflow/Run/WorkflowRun.vue#L299-L307) gets the model and nothing from the original run.
- [`WorkflowRunForm.vue`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/Workflow/Run/WorkflowRunForm.vue#L165-L175) starts `wpData`, `useCachedJobs`, `stepData`, `inputs` and `resourceData` empty or false. Tool steps render from the run-style workflow download, which is built from the saved step state ([`_workflow_to_dict_run`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/lib/galaxy/managers/workflows.py#L1260-L1326)).
- The simple form's [**Expanded workflow form**](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/Workflow/Run/WorkflowRunFormSimple.vue#L693-L705) button switches to that same empty full form.
- For a required, single, non-optional dataset input with no value, [`FormData.vue`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/Form/Elements/FormData/FormData.vue#L189-L195) selects the first listed option.
- The export itself is complete for these settings. [`serialize_workflow_invocation_to_request`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/lib/galaxy/webapps/galaxy/services/invocations.py#L327-L393) returns `inputs`, `replacement_params`, `resource_params`, `use_cached_job`, the three preferred object store ids, and `parameters` (step parameters keyed by order index, with `parameters_normalized=True`).
- Object stores: the full form has no controls for them and its `onExecute` never sends `preferred_*_object_store_id`, on a rerun or on a normal run. Adding those controls is a feature of the full form in its own right, so it is left out here.

</details>

## Context

A follow-up to 🔀 #20032 (fixing 🎯 #11340), which added **Rerun** for invocations and prefills only the simple form's inputs. Related to 🎯 #18696, which asks for a smoother rerun with cached jobs; the full form turns job re-use off. 🔀 #23776 recently converted the full form to `<script setup>`. Found while working on 🌿 [`workflow_rerun_step_parameters`](https://github.com/jmchilton/galaxy/tree/workflow_rerun_step_parameters), a spike that prototypes this issue's fix along with three related step-parameter fixes, each proposed separately:

- the simple form never submits tool step parameters, so a rerun drops them (the spike's fix sends those reruns to the full form, which makes this issue matter more),
- the request export of subworkflow step parameters can't be submitted back, and
- the request export of an imported invocation fails.

This issue is also a prerequisite for a planned feature: edit one step's parameters from a finished invocation and rerun, reusing the unchanged upstream jobs. That focused form needs the same "values that actually ran" prefill.

## Proposed Approach

Seed tool steps on the server and fill the rest on the client. `GET /api/workflows/{id}/download?style=run` takes an optional `invocation_id`. When it is given, each tool step's state is recomputed with that invocation's recorded step parameters, using `compute_runtime_state(step, step_args=…)`, the same call that computed the step's state when the original run was requested. The tool form is then built from that state. A subworkflow step's run-time inputs get their recorded values set directly on the input models. The full form then prefills workflow inputs, workflow parameters, resource parameters and job re-use from the request export that the rerun page already loads, the same way the simple form uses it for inputs.

<details><summary>Approach details</summary>

- **Why seed on the server.** Recomputing the state with `compute_runtime_state` puts each recorded value through `check_param`, the same conversion and validation the original request went through. The tool model, including options that depend on other parameters, is then built from the recorded values rather than the saved ones. A conditional case switch also comes out right: [`visit_input_values`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/lib/galaxy/tools/parameters/__init__.py#L259-L287) re-selects the case before it visits that case's inputs. Only runs submitted through the API can switch a case, because the full form locks conditional selectors (`sustain-conditionals`). The planned single-step rerun can use the seeded step model directly.
- **Repeats are not a reason for either approach.** `visit_input_values` [only visits repeat instances already in the state](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/lib/galaxy/tools/parameters/__init__.py#L244-L256). A recorded value for an instance that the saved workflow doesn't have was therefore never applied to the original run, so there is nothing to bring back. The full form also never records one, because it renders with `sustain-repeats`.
- **`${name}` guard.** The full form replaces `${name}` on the client, so a recorded value is the substituted literal. Seeding it would overwrite the template and remove that parameter from the Workflow Parameters card. Skip inputs whose saved value contains `${`, and prefill the parameter itself from `replacement_params`.
- **Source rows.** Read the `STEP_PARAMETERS` rows of the invocation request (a `WorkflowInvocation.recover_step_parameters()` helper), and only when `invocation.workflow_id` matches the workflow being rendered. Top-level tool steps don't depend on the export fixes. Subworkflow steps reuse the order-index re-keying from the subworkflow export fix, and imported invocations need the import fix so that the row keys point at the imported steps.
- **Client.** `getRunData` passes the `invocation_id`. `WorkflowRunForm` takes the request export and prefills input steps, using the same lookup the simple form uses (factored out and shared), as well as workflow parameters, resource parameters and `use_cached_job`.
- **Tests.** API tests:
  - the run download seeded from an invocation, for a tool step, a subworkflow step, a `${name}` step parameter and a conditional,
  - one whose recorded dataset has since been deleted and purged, where the run form must still load.

  Client: a `WorkflowRunForm` unit test for the prefill.

</details>

## Alternative Approaches

The main alternative keeps everything on the client. The full form already receives the request export, which has `parameters` keyed by order index as flat `a|b` names: the same shape the full form submits. It overlays those values onto each tool step's inputs before they render. The rerun page then reads from one source instead of two, and `/download` needs no new parameter. The `${name}` guard is a check on the existing `wp_linked` flag. Done on the step model with the client's existing `visitInputs` walk, the merge even handles a conditional case switch in one pass. What it gives up is fidelity: recorded values skip `check_param`, and the tool model, including dependent options, is built for the workflow's saved values. For subworkflow steps, it also needs the export fix first. The proposed approach costs one extra query parameter and a second source for the rerun page, and keeps tool-state rules on the server. Which would reviewers rather maintain: server seeding, or a client merge of the export?

<details><summary>Alternatives in detail</summary>

### Client merge of the request export

<details><summary>Description</summary>

#### Details

Pass the full request export into `WorkflowRunForm`. For each tool step, take `parameters[order_index]`, skip connected and `wp_linked` inputs, and set the remaining values on the step's inputs before `WorkflowRunDefaultStep` renders. [`visitInputs`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/Form/utilities.js#L27-L67), which `WorkflowRunModel` already uses, picks a conditional's case after visiting its selector, and the step model carries the inputs of every case, so a case switch needs no extra pass. Merging later through [`replaceParams`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/Form/composables/useFormState.ts#L229-L239) would not work as well: it only sets names already in the form's index, so a case switch would need the index rebuilt and the values applied again. Inputs, workflow parameters, resource parameters and job re-use are filled the same way in both approaches.

#### Why the proposed approach is preferred

Both approaches restore the same values for runs made from the form, and neither adds repeat instances. The server path puts recorded values through `check_param` and builds the tool model, dependent options included, from them, as the original request computed its state. The client merge sends raw values into a model built for the saved state. In exchange, the client merge needs no new API parameter, keeps the rerun page on one source, and has a simpler `${name}` guard.

</details>

### Seed from the stored per-step runtime state

<details><summary>Description</summary>

#### Details

Each invocation stores the full encoded runtime state of every step (`WorkflowRequestStepState`). It has a foreign key to the step and is remapped on invocation import. The run form could decode that state instead of applying the step parameter rows.

#### Why the proposed approach is preferred

It is a real option: it survives import without the related fixes, and the scheduler already decodes it (`decode_runtime_state`). But it is the whole computed state, values the user never set included, and it still needs the `${name}` guard. The step parameter rows are exactly what the user submitted, and the related fixes make those rows portable.

</details>

### Rebuild each step from its job

<details><summary>Description</summary>

#### Details

Build each tool step from `POST /api/jobs/{id}/build_for_rerun` for a job of that step.

#### Why the proposed approach is preferred

A job has concrete datasets rather than connections, and a mapped-over step has many jobs. It describes what ran, not how the workflow run was configured.

</details>

</details>
