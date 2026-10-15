# Rerun of an imported workflow invocation fails with a 500 when the run had tool step parameters

Clicking **Rerun** on an imported workflow invocation fails with a server error if the original run saved tool step parameters, which almost every run submitted from the full workflow run form does.

```text
1. Run a workflow from the full run form
   (forced when a tool step has a disconnected runtime input, e.g. random_lines1 with num_lines set as a runtime input)
2. Invocation → Export → download the archive (or RO-Crate)
3. Invocations list → Import Invocation → that archive
4. Click Rerun on the imported invocation
   → "Unable to load workflow rerun data: …"
     GET /api/invocations/{imported_id}/request → 500 (KeyError on a workflow step id)
```

The API test below reproduces it on dev. It runs a workflow with one step parameter, exports the invocation, imports it, and asks for the request.

<details><summary>Reproduction (API test, fails on dev with a 500 from a <code>KeyError</code> on the old step id)</summary>

This is the top-level case of [`test_workflow_request_step_parameters_after_invocation_import`](https://github.com/jmchilton/galaxy/blob/1ad053b1fb3d297f5a0819943b8e1a80cf6c864a/lib/galaxy_test/api/test_workflows.py#L5703-L5726) from the branch below, with the parametrization removed. The branch version also covers a tool step inside a subworkflow. On dev, the request call returned a 500 (`KeyError: 6` in that test database).

```python
@skip_without_tool("random_lines1")
def test_workflow_request_step_parameters_after_invocation_import(self):
    step_parameters = {"1": {"num_lines": 2, "seed_source|seed": "moo"}}
    with self.dataset_populator.test_history() as history_id:
        summary = self.workflow_populator.run_workflow(
            WORKFLOW_RUNTIME_PARAMETER_SIMPLE,
            test_data={"step_parameters": step_parameters, "input1": {"value": "1.bed", "type": "File"}},
            history_id=history_id,
        )
        store_path = self.workflow_populator.download_invocation_to_store(
            summary.invocation_id, include_files=False, extension="tgz"
        )
    with self.dataset_populator.test_history() as reimport_history_id:
        imported = self.workflow_populator.create_invocation_from_store(
            history_id=reimport_history_id, store_path=store_path, model_store_format="tgz"
        )
        request = self.workflow_populator.invocation_to_request(imported[0]["id"])  # 500 on dev
        assert request["parameters"] == step_parameters
```

The existing `test_export_reimport_reexport_invocation_with_subworkflow` passes on dev because it runs without step parameters.

</details>

Run-time step parameters are the one per-step record on an invocation that stores a raw database step id and no step reference. Import rebuilds the workflow with new step ids and copies that id as is:

```text
original run           workflow W, tool step id 6
  saved                workflow_request_input_parameters: type="step", name="6", value='{"num_lines": 2}'
export                 {"type": "step", "name": "6", "value": ...}        # no order_index
import                 workflow rebuilt as W', the same tool step is now id 41
  saved                name="6", copied verbatim
GET …/request          W'.steps_by_id[6] → KeyError → 500
```

| Per-step record on an invocation | Exported as | Re-attached to the new workflow on import |
| --- | --- | --- |
| Invocation steps, step states, input datasets/collections, input step parameters, outputs | step `order_index` | ✅ |
| Run-time tool step parameters | raw step id in `name` | ❌ copied verbatim |

Who hits it:

- Any invocation submitted from the full run form whose tool steps have at least one unconnected parameter. That form sends the unconnected parameters of every tool step, and Galaxy saves each non-empty set. Galaxy uses the full form when a tool step has a disconnected runtime input, a `${…}` replacement parameter or workflow resource parameters, when the user clicks **Expanded workflow form**, or when a server sets `simplified_workflow_run_ui: off`.
- Any API invocation that passes `parameters`.
- Not the simplified run form. It sends no `parameters`, so its invocations import and rerun fine.

Importing on the same server always raises the `KeyError`, because the rebuilt workflow's steps all get new ids. Importing into another Galaxy can be worse. If an old id happens to match a step id of the rebuilt workflow, the request export assigns the parameters to that unrelated step without any error. For a subworkflow step the value is nested by the inner steps' database ids too, so those are stale as well.

<details><summary>Code walk (dev <a href="https://github.com/galaxyproject/galaxy/commit/c63ffc2ccae4875976677b468dce3ac3e1ba74d8"><code>c63ffc2ccae</code></a>)</summary>

- **Saved by step id.** [`workflow_run_config_to_request`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/lib/galaxy/workflow/run_request.py#L635-L640) stores each entry of `param_map`, which `_normalize_step_parameters` keys by `step.id`, as `WorkflowRequestInputParameter(name=str(step_id), type="step")`. A subworkflow step's value is a dict keyed by inner step ids.
- **Exported verbatim.** [`WorkflowRequestInputParameter._serialize`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/lib/galaxy/model/__init__.py#L11034-L11039) writes only `name`, `value` and `type`. Compare [`WorkflowRequestStepState._serialize`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/lib/galaxy/model/__init__.py#L11058-L11062), which adds `order_index`.
- **Imported verbatim.** [`_import_workflow_invocations`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/lib/galaxy/model/store/__init__.py#L1213-L1221) rebuilds the workflow from the archive with `read_workflow_from_path`, which creates new steps. It copies `input_parameters` name, value and type, while step states and the input and output associations go through `attach_workflow_step(order_index)`.
- **Looked up by step id.** [`serialize_workflow_invocation_to_request`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/lib/galaxy/webapps/galaxy/services/invocations.py#L371-L377) does `steps_by_id[step_id]` on the imported workflow. The `KeyError` is uncaught, so the API returns a 500.
- **Reached from the UI.** The invocations list has **Import Invocation** (`/workflows/invocations/import`), which posts the archive to `POST /api/histories` and runs `__IMPORT_HISTORY__` → `perform_import` → `_import_workflow_invocations`. The **Rerun** button and the **Rerun** column both open `/workflows/rerun?invocation_id=…`, and [`WorkflowRerun.vue`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/Workflow/Run/WorkflowRerun.vue) loads `GET /api/invocations/{id}/request` before it can show the form. History exports don't include invocations, so only invocation archives are affected.

</details>

## Context

Bug discovered while working on 🌿 [`workflow_rerun_step_parameters`](https://github.com/jmchilton/galaxy/tree/workflow_rerun_step_parameters), a spike on rerun forms dropping the step parameters an invocation ran with. The **Rerun** action that turns this into a user-facing failure comes from 🔀 #20032. It is being filed together with a bug where the request export of subworkflow step parameters can't be resubmitted. The fix below reuses that fix's helpers for converting between step id keys and order index keys, so the two could land in one PR.

## Proposed Approach

Export step parameter rows in a portable form, the way other per-step records are exported, and re-key them on import. `_serialize` keeps `name`/`value`/`type` and adds the step's `order_index` plus the value keyed by order index (`"<inner order_index>|name"` for subworkflow steps, the shape a `parameters_normalized` invoke request takes). Import then finds the new step with `workflow.step_by_index(order_index)` and rewrites `name` and the nested ids. This changes the store format only, not the database schema. An older Galaxy reading a new archive ignores the extra keys and behaves as it does today.

<details><summary>Approach details</summary>

- **Model helpers.** Add `WorkflowStep.step_parameters_by_index(param_dict)` and its inverse `step_parameters_by_id(param_dict)`. They recurse through nested subworkflows, and the request export and `_normalize_step_parameters` can use them too.
- **Serialize.** For `type == "step"` rows whose step is found, add `order_index` and `step_parameters` (index keyed).
- **Import.** If `order_index` is present, set `name = str(step.id)` and `value = dumps(step.step_parameters_by_id(attrs["step_parameters"]))` on the imported workflow's step.
- **Archives exported before the fix.** These carry no `order_index`, so there is no mapping from old ids to new ones. The request export should skip a step id the workflow doesn't contain and log a warning, so **Rerun** opens instead of failing. Those steps then fall back to the workflow's saved values. Reviewers may prefer a clear 4xx that tells the user their step parameters were lost. That would also block the rerun.
- **Same-server collision** isn't possible, and the cross-server collision goes away for new archives because import never keeps the old id.
- **Tests.** The API test above, parametrized over a top-level tool step and a tool step inside a subworkflow (`{"1": {"1|num_lines": 2}}`). It fails on dev and passes with the fix.

</details>

## Alternative Approaches

The tempting alternative is a foreign key from step parameter rows to `workflow_step`, so import could remap them like step states. It costs a migration and a backfill, it still leaves the nested subworkflow ids inside the JSON value, and `WorkflowRequestStepState` already is that FK-backed per-step record. Building the request export from `WorkflowRequestStepState` would avoid the problem, but it changes what the export's `parameters` mean. The proposed store-format addition fixes new archives with no schema change and keeps old archives working.

<details><summary>Alternatives in detail</summary>

### Alternative: Foreign key column plus migration

<details><summary>Description</summary>

Add a nullable `workflow_step_id` FK to `workflow_request_input_parameters`, set it for step rows, export it as `order_index` and remap it on import with `attach_workflow_step`.

#### Why the proposed approach is preferred

The FK only fixes the outer step. A subworkflow step's value is still nested by inner step ids inside a JSON string, so import still needs the re-keying above. A backfill for existing rows would mean parsing and rewriting that JSON for terminal invocations. And `WorkflowRequestStepState` already is the FK-backed per-step record, so this would add a second one.

</details>

### Alternative: Export `parameters` from `WorkflowRequestStepState`

<details><summary>Description</summary>

Stop reading step parameter rows in the request export, and derive `parameters` from the step states. Those are FK-backed and already re-attached on import.

#### Why the proposed approach is preferred

Step states hold the full runtime state of every step, not the overrides the user submitted. The export would then describe every parameter of every step, and resubmitting it would pass all of them as overrides. That may be the right long-term source for prefilling the run form, but it is a larger change in behaviour than this bug needs.

</details>

### Alternative: Drop step parameter rows on import

<details><summary>Description</summary>

Skip `type == "step"` rows in `_import_workflow_invocations`, or always ignore unknown ids in the export.

#### Why the proposed approach is preferred

It removes the 500 but throws away what the run actually used. A rerun would then use the workflow's saved values and wouldn't say so. The proposal keeps this only as the fallback for archives that can't be mapped.

</details>

### Alternative: Store the order index in `name`

<details><summary>Description</summary>

Persist new step parameter rows by order index instead of step id.

#### Why the proposed approach is preferred

`workflow_request_to_run_config` and the request export both read `name` as a step id, so the database would hold a mix of the two formats with no way to tell them apart. Nested subworkflow values would still need their own change.

</details>

</details>
