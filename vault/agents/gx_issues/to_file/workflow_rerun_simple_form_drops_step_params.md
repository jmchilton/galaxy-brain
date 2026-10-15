# Workflow rerun silently drops tool step parameters (simple form can't submit them)

Source: spike. Branch `jmchilton/workflow_rerun_step_parameters` (commits f4b95406098 server, ec3c52c4443 client, 1ad053b1fb3 review fixes); debrief `vault/repositories/galaxy/branches/active/workflow_rerun_step_parameters/spike_debrief.md`. Split out of `vault/agents/gx_issues/internally_managed/workflow_rerun_drops_step_parameters.md`.

## Problem
`WorkflowRerun.vue` mounts `WorkflowRun` with `prefer-simple-form` and only `request-state="requestData.inputs"` + cache flag. `WorkflowRunFormSimple` never submits `parameters` (tool step params), so a rerun of a run whose tool parameters were set in the full form resubmits saved workflow defaults. Nothing tells the user.

Simple form *does* submit `replacement_dict` and preferred object stores (see `onExecute`) - those are just not prefilled on rerun today. Resource params already force the full form (`hasWorkflowResourceParameters`).

## Fix in spike
- `rerunHasStepParameters(request)` (model.js): rerun with non-empty `parameters` -> full form, simple toggle hidden, alert "original run set tool step parameters; simplified form doesn't support these".
- Simple form prefills workflow (replacement) params and preferred object stores from the exported request (`rerunRequest` prop).
- Extracted the simple form's rerun-input lookup into shared `rerunInputValue` (model.js), used by both forms.

UX shift worth stating in the issue: the full form submits *every* unconnected param of every tool step, so any run started from the full form will rerun in the full form.

Gap: no component test for forced-full-form path (run1 fixture already forces full form); only the predicate is unit-tested. No browser check done.

Could ship standalone, small. Full-form prefill is `workflow_rerun_prefill_full_form`.
