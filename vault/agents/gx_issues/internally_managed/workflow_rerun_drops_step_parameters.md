# Workflow rerun drops per-step parameter overrides, replacement parameters and resource parameters

Rerunning a workflow invocation only carries over its inputs and the job-cache preference; every other run-time setting the server exports for that invocation is lost.

| Setting on the original run | Exported by `GET /api/invocations/{id}/request` | Reaches the rerun form |
| --- | --- | --- |
| Workflow inputs | yes | yes |
| `use_cached_job` | yes | yes (simple form only) |
| Per-step tool parameter overrides (set at run time) | yes | **no** |
| `${name}` replacement parameters | yes | **no** |
| Workflow resource parameters | yes | **no** |
| Preferred object stores | yes | **no** |

So a user who changed step parameters at run time and clicks "Rerun" gets a form populated with the workflow's saved defaults, not the values that ran. Nothing tells them.

<details><summary>Where it's lost (from a code read, unverified)</summary>

- `WorkflowRerun.vue` fetches the request and mounts `WorkflowRun` with only `request-state="requestData.inputs"` and `simple-form-use-job-cache`.
- `WorkflowRun.vue` forwards request state to the simple form only; the full form (`WorkflowRunForm.vue`) initialises `stepData`, `wpData`, `inputs` and `resourceData` empty and `useCachedJobs` false.
- Workflows with replacement parameters in tool steps, disconnected required runtime inputs or resource parameters are forced to the full form, so those are exactly the runs that lose the most.

</details>

There's a server-side half too: the export of step parameters is untested and broken for subworkflow steps.

<details><summary>Server-side export gaps</summary>

- `serialize_workflow_invocation_to_request` (`services/invocations.py`) emits a per-step parameter map keyed by order index, with a `# TODO: test subworkflows and ensure this works`.
- At request time a subworkflow step's parameters are stored as a nested `{sub_step_id: {...}}` dict (`run_request.py`, `_normalize_step_parameters`). Re-submitting that under `parameters_normalized` splits keys on `|` and fails.
- The only API test of the export asserts `parameters is None`. Nothing round-trips step parameters (export → invoke → export).

</details>

## Context

Related to 🎯 #23292 (rerun shouldn't depend on switching histories) — same rerun page. Related to 🎯 #21971 (workflow tool state round-trip fidelity). Prerequisite for the per-step "edit and rerun" feature (see `rerun_single_step_from_invocation.md`).

## Proposed Approach

Fix in two PRs. Server first: round-trip API tests for step parameters (tool steps, repeats, conditionals, sections, subworkflow steps) and a fix for the subworkflow export. Client second: have the full run form accept the exported request state (step parameters, replacement and resource parameters, object stores, cache preference) the way the simple form accepts inputs.

## Alternative Approaches

Rebuilding each step's form from `POST /api/jobs/{id}/build_for_rerun` gives the exact values each job ran with, but yields concrete datasets rather than step overrides with connections, and a mapped-over step has N jobs. The request export is the right source; it just needs to be complete and tested.
