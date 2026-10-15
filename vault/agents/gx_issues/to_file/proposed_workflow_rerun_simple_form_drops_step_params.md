# Workflow rerun silently drops tool parameters the original run set

Rerunning a workflow invocation from the simplified run form submits only its inputs and job re-use choice, so tool parameters the original run set are silently replaced by the workflow's saved values.

The rerun page always tries the simplified form first. Take a workflow that qualifies for it, meaning no disconnected runtime inputs, no `${…}` in tool steps and no resource parameters. This is what a rerun keeps:

| Setting the original run used | In `GET /api/invocations/{id}/request` | Rerun form prefills it | Rerun submits it |
| --- | --- | --- | --- |
| Workflow inputs | yes | yes | yes |
| Job re-use (`use_cached_job`) | yes | yes | yes |
| Tool step parameters (`parameters`) | yes | no, the form has no tool steps | **no**, so the saved workflow values run |
| Preferred object store(s) | yes | **no** | only if the user picks them again |
| Workflow parameters (`${name}` in post-job actions) | yes¹ | **no** | **no**¹ |

¹ A separate bug, to be filed on its own: the simplified form sends workflow parameters as `replacement_dict`, which the invoke API doesn't read, so they are dropped on every simplified-form run, not only reruns. They reach the export only when the original run came from the expanded form or the API.

For example, suppose a user opens **Expanded workflow form** on `input1 → random_lines1`, changes `num_lines` from its saved `1` to `3`, and runs it. The invocation's request export records `"parameters": {"1": {"num_lines": "3", …}}`. Clicking **Rerun** opens the simplified form. Its button reads **Rerun Workflow**, with the tooltip "Rerun this workflow with the original inputs". The request it submits has no `parameters`, so `random_lines1` runs with `num_lines: 1`. Nothing on the page says that the run differs from the original.

Who hits this:

- Anyone who changed a tool value in the expanded form for the original run.
- API clients that passed `parameters` at invoke time.
- Users on any server. `WorkflowRerun.vue` hard-codes `prefer-simple-form`, so this happens even where admins set `simplified_workflow_run_ui: off`.

<details><summary>Where the parameters are dropped (dev <a href="https://github.com/galaxyproject/galaxy/commit/c63ffc2ccae4875976677b468dce3ac3e1ba74d8"><code>c63ffc2ccae</code></a>)</summary>

- [`WorkflowRerun.vue`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/Workflow/Run/WorkflowRerun.vue#L46-L53) loads the request export. It mounts `WorkflowRun` with `prefer-simple-form`, `:request-state="requestData.inputs"` and `:simple-form-use-job-cache`. The rest of the export (`parameters`, `replacement_params`, `resource_params` and the preferred object stores) is never passed on.
- [`WorkflowRun.vue`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/Workflow/Run/WorkflowRun.vue#L125-L153) only leaves the simplified form for `hasReplacementParametersInToolForm`, `hasOpenToolSteps` or `hasWorkflowResourceParameters`. Nothing looks at what the original run set.
- `onExecute` in [`WorkflowRunFormSimple.vue`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/Workflow/Run/WorkflowRunFormSimple.vue#L443-L502) builds the request from `inputs`, `replacement_dict`, `use_cached_job` and the object store ids picked in the form. Those ids start as `null` and are never seeded from the export. It never sends `parameters`.
- The expanded form's [`onExecute`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/Workflow/Run/WorkflowRunForm.vue#L297-L320) sends `parameters` for every tool and subworkflow step, keeping each unconnected input. [`FormDisplay`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/Form/FormDisplay.vue#L151-L155) emits its full state during setup, so this includes values the user never touched.
- [`serialize_workflow_invocation_to_request`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/lib/galaxy/webapps/galaxy/services/invocations.py#L370-L392) exports those rows as `parameters`, keyed by step order index, with `parameters_normalized=True`.
- The invoke API reads `replacement_params` ([schema](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/lib/galaxy/schema/workflows.py#L210), [`run_request.py`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/lib/galaxy/workflow/run_request.py#L533)). `InvokeWorkflowPayload` has no `replacement_dict` field or alias and ignores unknown keys, so the [`model_dump()`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/lib/galaxy/webapps/galaxy/services/workflows.py#L330) handed to the scheduler drops the simplified form's key (footnote ¹).

</details>

<details><summary>What the simplified form hands to <code>invokeWorkflow</code> on rerun (component test against dev)</summary>

`WorkflowRunFormSimple` was mounted with a hand-built two-step model (`input1 → random_lines1`, plus a `${sample}` rename), in rerun mode, with the export's `inputs` and `use_cached_job`. The export also carried `parameters: {"1": {"num_lines": "3"}}`, `replacement_params: {"sample": "s1"}` and `preferred_object_store_id: "fast"`. It submitted:

```json
{
  "replacement_dict": { "sample": "s1" },
  "inputs": { "0": { "values": [{ "src": "hda", "id": "hda1" }] } },
  "inputs_by": "step_index",
  "batch": true,
  "use_cached_job": true,
  "require_exact_tool_versions": false,
  "version": 0,
  "on_complete": null,
  "history_id": "hist1"
}
```

The request has no `parameters` and no object store. `InvokeWorkflowPayload(**payload).model_dump(exclude_unset=True)` then drops `replacement_dict` too. `invokeWorkflow` POSTs this object unchanged to `/api/workflows/{id}/invocations`. This demonstrates the payload only; it is not a recorded browser run.

</details>

## Context

Bug discovered while working on 🌿 [workflow_rerun_step_parameters](https://github.com/jmchilton/galaxy/tree/workflow_rerun_step_parameters), a spike that carries step parameters through rerun. It is a follow-up to 🔀 #20032 (fixing 🎯 #11340). That PR built rerun on the request export added in 🔀 #18985 (🎯 #18981), but only prefills inputs and job re-use from it. 🔀 #22601 fixed a smaller silent loss on the same page, where falsy parameter input values (`false`, `0`, `""`) fell back to defaults. Three related pieces will be tracked separately: prefilling the expanded run form from an invocation, resubmitting exported subworkflow step parameters (a 500 today), and the simplified form's `replacement_dict` key (footnote ¹).

## Proposed Approach

When the request export carries tool step `parameters`, rerun should open the expanded form instead of the simplified one, hide its **Simple Form** toggle and say why. This must land with or after prefilling the expanded form from the invocation: on dev, `WorkflowRun` passes nothing from the export to `WorkflowRunForm`, so forcing that form today would show the saved tool values with no inputs selected, losing the input prefill the simplified form already does. Separately, the simplified form should prefill the preferred object stores from the export, and workflow parameters once it actually submits them. There is also a UX shift to accept. The expanded form records every unconnected parameter of every tool step, because `FormDisplay` emits its full state on mount. So the export of an expanded-form run always carries them, changed or not, and any run started from the expanded form will rerun in the expanded form.

<details><summary>Approach details</summary>

- **Predicate.** `rerunHasStepParameters(request)` in `Run/model.js` is true when the export has a non-empty `parameters`. `WorkflowRerun` passes the whole export to `WorkflowRun`, as `rerun-request` for example. `WorkflowRun.loadRun` checks the predicate after the existing three checks. It sets a fourth `disableSimpleFormReason`, which `WorkflowRunForm`'s alert explains as "the original run set tool step parameters; the simplified form doesn't support these, so they would be lost".
- **Simplified-form prefill.** Seed `preferredObjectStoreId`, `preferredIntermediateObjectStoreId` and `splitObjectStore` from the export's three object store ids, and seed each `wpInputs` value from `replacement_params`. The workflow parameter prefill has no effect until the `replacement_dict` bug (footnote ¹) is fixed.
- **Shared lookup.** Move the simplified form's rerun input lookup (label versus step index, and filtering `null` data values) into a helper in `model.js`, so the expanded-form prefill uses the same rules.
- **Known gap.** The expanded form has no object store controls and never submits object store preferences, on any run, so a forced expanded-form rerun still loses them. Adding those controls is an expanded-form feature of its own and is out of scope here.
- **Tests.**
  - A unit test for the predicate.
  - Component tests for: rerun with `parameters` lands in the expanded form with the reason shown and no toggle; rerun without them stays in the simplified form; the simplified form prefills object stores.
  - A Selenium rerun test that changes a tool value in the expanded form, reruns, and asserts the new invocation's request export still has it.

</details>

## Alternative Approaches

The closest alternative keeps the simplified form and has it forward the export's `parameters` unchanged, with `parameters_normalized: true`. This needs no UX shift and doesn't depend on the expanded-form prefill. However, it reapplies settings the user can't see or change on that page, and switching to the expanded form would still lose them. It also returns a 500 for workflows with subworkflow step parameters until the export is fixed. Forcing the expanded form only when the recorded values differ from the workflow's saved values would avoid most of the UX shift, but comparing flat `a|b` keys to nested tool state on the client is fragile. Showing only a warning in the simplified form would be honest but would still drop the values. We prefer the forced expanded form because it is the only option where the rerun shows, and lets the user edit, the tool parameters that will run. Object stores are the exception, because the expanded form has no controls for them. Reviewers who would rather keep reruns in the simplified form should weigh in on the forwarding option.

<details><summary>Alternatives in detail</summary>

### Forward `parameters` unchanged from the simplified form

<details><summary>Description</summary>

#### Details

The simplified form adds the export's `parameters` and `parameters_normalized: true` to its request. Rerun pins the exact workflow version (`instance: true`), so order index keys still line up. A note on the page would list which steps carry recorded values.

#### Why the proposed approach is preferred

The user is rerunning to change something, and here they can't see or edit the tool values being applied. Switching to the expanded form would still drop them. On dev, exported subworkflow step parameters can't be resubmitted (`_normalize_step_parameters` splits keys on `|`), so those reruns would fail until the server side is fixed. It is still a reasonable first step if reviewers want to keep reruns in the simplified form.

</details>

### Force the expanded form only when values differ from the saved workflow

<details><summary>Description</summary>

#### Details

Compare each recorded step parameter with the value the run form would show by default, and only force the expanded form when one differs.

#### Why the proposed approach is preferred

Recorded values are flat `a|b` strings from form state. The defaults are nested and typed (`"1"` against `1`, `null` against `""`, repeats, conditionals), so a client-side diff would have false positives and false negatives. A server-side "differs from saved state" flag would be more reliable, but it's more machinery than this bug needs.

</details>

### Warn only

<details><summary>Description</summary>

#### Details

Keep the simplified form and show an alert that the original run's tool parameters won't be reused.

#### Why the proposed approach is preferred

It removes the "silent" part but still runs different settings, and the user's only workaround is to re-enter them by hand in an expanded form that starts from the saved values.

</details>

</details>
