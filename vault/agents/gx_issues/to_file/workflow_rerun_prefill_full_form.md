# Prefill the full workflow run form with what an invocation ran with

Source: spike. Branch `jmchilton/workflow_rerun_step_parameters` (commits f4b95406098 server, ec3c52c4443 client, 1ad053b1fb3 review fixes); debrief `vault/repositories/galaxy/branches/active/workflow_rerun_step_parameters/spike_debrief.md`. Split out of `vault/agents/gx_issues/local/workflow_rerun_drops_step_parameters.md`.

## Problem
Full run form (`WorkflowRunForm.vue`) starts empty: `stepData`, `wpData`, `inputs`, `resourceData` empty, `useCachedJobs` false. A rerun forced into it (replacement params in tool steps, disconnected runtime inputs, resource params, or now tool step params) loses inputs, step params, workflow params, resource params and cache preference. Prerequisite for `rerun_single_step_from_invocation.md`.

## Shape in spike
- Server: `GET /api/workflows/{id}/download?style=run&invocation_id=...` (`_workflow_to_dict_run`). Tool steps: `compute_runtime_state(step, step_args=<recorded params>)` - same path the scheduler uses, so repeats/conditionals come out right (client merge of flat `a|b` keys into FormDisplay can't add repeat instances). Subworkflow steps: overlay values on runtime `InputProxy` inputs. `WorkflowInvocation.recover_step_parameters()` model helper.
- `${name}` catch: full form substitutes `${name}` client-side (`getReplacements`), so recorded values are literals. Seeding must skip inputs whose saved value is a `${...}` template (`_untemplated_step_args`) or the Workflow Parameters card vanishes. Test fails without the guard.
- Recorded dataset deleted+purged since: seeded run form still loads (tested).
- Client: `getRunData(..., invocationId)`; full form prefills input steps (`rerunInputValue`), workflow params, resource params, job re-use from the exported request.
- Tests: `test_run_form_seeded_from_invocation`, `..._subworkflow`, `..._with_deleted_dataset`; vitest `WorkflowRunForm.test.ts` prefill case.

## Open decision (John)
Original issue text said "request export is the right source; client accepts it like the simple form accepts inputs". Spike seeds server-side instead (reason above). Pick one before filing.

## Gaps
- Full form has no object-store UI and never submits preferred object stores -> full-form rerun still drops them. In scope here or separate?
- Alternative server source: `WorkflowRequestStepState` (full encoded runtime state, FK, import-remapped) instead of step-parameter rows. More robust, bigger; not pursued.
