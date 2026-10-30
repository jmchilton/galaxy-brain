---
type: research
subtype: component
tags:
  - research/component
  - galaxy/lib
  - galaxy/models
  - galaxy/workflows
  - galaxy/api
status: draft
created: 2026-10-30
revised: 2026-10-30
revision: 1
ai_generated: true
component: Workflow Invocation Models
galaxy_areas:
  - lib
  - models
  - workflows
  - api
summary: "Invocation-side ORM tables, their keys and indexes, and how the element, collection and step_details views key inputs and outputs"
sources:
  - "vault/agents/gx_research/archive/workflow_invocation_models.md"
related_notes:
  - "[[Component - Workflow API]]"
  - "[[Component - Invocation Graph View]]"
  - "[[Component - Jobs API and Job Cache]]"
  - "[[Component - Job Completion Lifecycle]]"
  - "[[Component - Workflow Extraction Models]]"
  - "[[Component - Collection Models]]"
---

# Workflow Invocation Models

Verified against Galaxy `origin/dev` @ `65e6daff2334c8cfd4971682eecfb87f38a224be`. Line numbers are at that SHA. Paths are under `lib/galaxy/` unless they start with `client/` or `lib/galaxy_test/`. Unqualified `:NNNN` citations refer to `model/__init__.py`.

## Scope

In scope: the ORM classes that record a workflow run, and how they link to `Workflow`, `StoredWorkflow`, `WorkflowStep` and `WorkflowOutput`. That covers `WorkflowInvocation`, `WorkflowInvocationStep`, step output associations, invocation-level outputs (datasets, collections, values, and the `NoReplacement` sentinel), request inputs, and the subworkflow association. It also covers the `to_dict` views (`collection`, `element`, `step_details`), how their dicts are keyed, which columns are indexed, and where `expression.json` outputs appear.

Out of scope: scheduling internals (`WorkflowProgress`, delays, materialization), invocation messages beyond a pointer, and the invocation report. Endpoints are covered in [[Component - Workflow API]], and the client's step cards in [[Component - Invocation Graph View]].

## Model map

```
StoredWorkflow 1--* Workflow (one row per version; stored_workflow_id)
                      |
                      1--* WorkflowStep (workflow_id, order_index, label, uuid)
                               |
                               1--* WorkflowOutput (workflow_step_id, output_name, label)

WorkflowInvocation (workflow_id -> Workflow, history_id)
  |-- steps                      * WorkflowInvocationStep (workflow_step_id, job_id | implicit_collection_jobs_id)
  |      |-- output_datasets     * WorkflowInvocationStepOutputDatasetAssociation (output_name -> HDA)
  |      |-- output_dataset_collections * ...StepOutputDatasetCollectionAssociation (output_name -> HDCA)
  |      `-- output_value        (view-only, scalar) WorkflowInvocationOutputValue
  |-- output_datasets            * WorkflowInvocationOutputDatasetAssociation (workflow_output_id, workflow_step_id -> HDA)
  |-- output_dataset_collections * WorkflowInvocationOutputDatasetCollectionAssociation (... -> HDCA)
  |-- output_values              * WorkflowInvocationOutputValue (workflow_output_id, workflow_step_id, JSON value)
  |-- input_datasets             * WorkflowRequestToInputDatasetAssociation (workflow_step_id -> HDA, request JSON)
  |-- input_dataset_collections  * WorkflowRequestToInputDatasetCollectionAssociation (workflow_step_id -> HDCA)
  |-- input_step_parameters      * WorkflowRequestInputStepParameter (workflow_step_id, parameter_value JSON)
  |-- input_parameters           * WorkflowRequestInputParameter (name/value/type, not step-bound)
  |-- step_states                * WorkflowRequestStepState (workflow_step_id, runtime state JSON)
  |-- subworkflow_invocations    * WorkflowInvocationToSubworkflowInvocationAssociation
  |                                  (workflow_step_id, subworkflow_invocation_id -> WorkflowInvocation)
  |-- messages                   * WorkflowInvocationMessage
  `-- completion                 1 WorkflowInvocationCompletion
```

Two layers record outputs:

- **Step outputs** record every dataset or collection a step produced, keyed by the step's `output_name`. They are written by `WorkflowInvocationStep.add_output` (`:10904-10920`).
- **Invocation outputs** record only outputs the workflow marks as workflow outputs. Each row points at a `WorkflowOutput`. They are written by `WorkflowInvocation.add_output` (`:10298-10327`). Values without a `history_content_type` go to `WorkflowInvocationOutputValue`.

`WorkflowProgress.set_step_outputs` writes both (`workflow/run.py:718-747`). It adds a step-level row for every output with a `history_content_type` (`:726-728`). It then adds one invocation-level row per `step.workflow_outputs` entry through `_record_workflow_output` (`:729-752`). A missing workflow output adds an `InvocationWarningWorkflowOutputNotFound` message rather than a row (`:732-744`).

## Version and step identity

- `WorkflowInvocation.workflow_id` points at a **`Workflow`**, which is one version, not the `StoredWorkflow` (`:10000`). To get all runs of a stored workflow, join `workflow.stored_workflow_id`, as `build_invocations_query` does (`managers/workflows.py:722-726`). The API's invocation `workflow_id` is therefore the encoded version id, the same id the `instance=true` convention uses. See [[Component - Workflow API]].
- `GET /api/invocations?workflow_id=X&instance=true` resolves X to its `StoredWorkflow` first (`webapps/galaxy/services/invocations.py:104-108`). It returns runs of **every** version, not only version X.
- Version number: `StoredWorkflow.version_of(workflow)` enumerates `reversed(self.workflows)` (`:9102-9106`), so it costs one full version list per call.
- Every version has its own `WorkflowStep` rows, so `workflow_invocation_step.workflow_step_id` differs between versions for the "same" step. Cross-version step identity has to come from `WorkflowStep.label`, `order_index` or `uuid` (`:9387-9403`). None of those three columns is indexed, and none is unique in the schema. `order_index` can shift when steps are added. Labels are the stable key the editor and API enforce, but they are optional.
- `WorkflowOutput` (`:9828-9836`) has `workflow_step_id` (indexed), `output_name`, a nullable `label` and `uuid`. `Workflow.workflow_output_for(label)` returns the first output with that label across the version (`:9275-9281`). `WorkflowStep.workflow_output_for(output_name)` looks up by name on one step (`:9632-9638`).
- Subworkflow invocations are full `WorkflowInvocation` rows whose `workflow` is `step.subworkflow` (`attach_subworkflow_invocation_for_step`, `:10090-10101`), in the parent's history. Filtering by the parent's `stored_workflow_id` does not return them. `include_nested_invocations=false` excludes any invocation that appears as a `subworkflow_invocation_id` (`managers/workflows.py:735-744`).

## Tables, keys and indexes

"Indexed" means `index=True` on the model column. Indexes added only by migration are noted. There are no composite indexes and no unique constraints on any of these tables, apart from `workflow_invocation_completion.workflow_invocation_id`.

| Table (class) | Columns | Indexed | Not indexed |
|---|---|---|---|
| `workflow_invocation` (`WorkflowInvocation`, `:9994-10007`) | `workflow_id`, `history_id`, `state`, `scheduler`, `handler`, `uuid`, `on_complete`, times | `workflow_id`, `history_id`, `state`, `scheduler`, `handler`, `update_time` | `create_time`, `uuid` |
| `workflow_invocation_step` (`:10826-10839`) | `workflow_invocation_id`, `workflow_step_id`, `state`, `job_id`, `implicit_collection_jobs_id`, `action`, times | `workflow_invocation_id`, `workflow_step_id`, `state`, `job_id`, `implicit_collection_jobs_id` | `update_time`, `create_time` |
| `workflow_invocation_step_output_dataset_association` (`:11328-11344`) | `workflow_invocation_step_id`, `dataset_id`, `output_name` | step id, `dataset_id` | `output_name` |
| `workflow_invocation_step_output_dataset_collection_association` (`:11347-11369`) | `workflow_invocation_step_id`, `workflow_step_id`, `dataset_collection_id`, `output_name` | step id, `workflow_step_id`, `dataset_collection_id` | `output_name` |
| `workflow_invocation_output_dataset_association` (`:11225-11248`) | `workflow_invocation_id`, `workflow_step_id`, `dataset_id`, `workflow_output_id` | all four | — |
| `workflow_invocation_output_dataset_collection_association` (`:11251-11287`) | `workflow_invocation_id`, `workflow_step_id`, `dataset_collection_id`, `workflow_output_id` | all four | — |
| `workflow_invocation_output_value` (`:11290-11325`) | `workflow_invocation_id`, `workflow_step_id`, `workflow_output_id`, `value` (JSON) | `workflow_invocation_id`, `workflow_output_id` | `workflow_step_id` |
| `workflow_request_to_input_dataset` (`:11141-11167`) | `workflow_invocation_id`, `workflow_step_id`, `dataset_id`, `name`, `request` | `workflow_invocation_id`, `dataset_id` | `workflow_step_id` |
| `workflow_request_to_input_collection_dataset` (`:11170-11199`) | same with `dataset_collection_id` | `workflow_invocation_id`, `dataset_collection_id` | `workflow_step_id` |
| `workflow_request_input_step_parameter` (`:11202-11222`) | `workflow_invocation_id`, `workflow_step_id`, `parameter_value` (JSON), `request` | `workflow_invocation_id` | `workflow_step_id` |
| `workflow_request_input_parameters`, `workflow_request_step_states` (`:11088-11138`) | invocation-scoped name/value/type; per-step runtime state | `workflow_invocation_id` (both also added by migrations `caa7742f7bca`, `3a2914d703ca`) | `workflow_step_id` on step states |
| `workflow_invocation_to_subworkflow_invocation_association` (`:10701-10732`) | `workflow_invocation_id`, `subworkflow_invocation_id`, `workflow_step_id` | both invocation ids | `workflow_step_id` |
| `workflow` / `workflow_step` / `workflow_output` | see above | `workflow.stored_workflow_id`, `workflow.parent_workflow_id`; `workflow_step.workflow_id`, `subworkflow_id`; `workflow_output.workflow_step_id` | `workflow_step.label`, `order_index`, `uuid`; `workflow_output.label` |

Notes on keys:

- The table name `workflow_request_to_input_collection_dataset` does not match its class name.
- The step-level collection table's `workflow_step_id` is never written by either constructor (`add_output`, `:10904-10920`, or the model-store import). It is always `NULL`, so do not filter on it. Use `workflow_invocation_step_id`.
- `WorkflowInvocation.step_invocations_by_step_id` asserts one invocation step per workflow step (`:10245-10251`). The schema does not enforce that.
- `WorkflowInvocationStep.order_index` and `.subworkflow_invocation_id` are `column_property` scalar subqueries (`:10865-10877`). `order_index` comes from `workflow_step`, and the subworkflow id from the association matched on `(workflow_invocation_id, workflow_step_id)`. Selecting the entity runs two correlated subqueries per row. `WorkflowInvocation.steps` is ordered by that `order_index` (`:10026-10030`).
- `WorkflowInvocationStep.output_value` is a view-only join on `(workflow_invocation_id, workflow_step_id)` (`:10853-10864`). It is many-to-one, so it loads a single value, although a subworkflow step can have several value outputs.

### Query patterns for per-step and per-output reads

- **All invocations of a stored workflow.** Use `workflow.stored_workflow_id`, which is indexed, and then `workflow_invocation.workflow_id`, which is also indexed. The default ordering is `workflow_invocation.id DESC` (`managers/workflows.py:748-754`). `create_time` is not indexed. `update_time` is.
- **One step across those invocations.** Use `workflow_step` (`workflow_id IN versions`, indexed) filtered by `label` or `order_index` (unindexed, but it scans only the matched versions' steps). Then filter `workflow_invocation_step.workflow_step_id IN (…)`, which is indexed. Add `workflow_invocation_id IN (…)` to restrict to a page of invocations.
- **A step's outputs.** Batch-load by `workflow_invocation_step_id IN (…)` on both step-output tables (indexed).
- **Workflow outputs by label.** Join `workflow_output` on `workflow_output_id`, which is indexed on the dataset and collection tables and on the value table, and filter on `workflow_output.label`. That column is unindexed, but the join narrows by `workflow_output_id` first.
- **Jobs.** `workflow_invocation_step.job_id` (plain steps) or `implicit_collection_jobs_id` (mapped steps). Both are indexed. See [[Component - Jobs API and Job Cache]] and [[Component - Collection Models]] for ICJ membership. The `GET /api/invocations?job_id=` filter checks only `job_id` (`managers/workflows.py:731-732`).

## What each association holds

### Step outputs (`WorkflowInvocationStep`)

- A plain tool step: `WorkflowStepExecutionTracker.record_success` adds one HDA or HDCA row per tool output name, and sets `invocation_step.job` (`tools/execute.py:924-929`).
- A mapped-over tool step records only the **implicit HDCAs**, one per output name. It sets `implicit_collection_jobs`, and `job_id` stays `NULL` (`tools/execute.py:951-967`). Per-element HDAs are not in the step tables. Reach them through the HDCA's elements or the ICJ's jobs.
- Input steps record their single `output` (an HDA or HDCA). Parameter inputs have no history content, so they write no step-level row (`run.py:726-728`).
- A subworkflow step's output names are the **subworkflow's** workflow-output labels. Unlabeled outputs fall back to `"<order_index>:<output_name>"` (`workflow/modules.py:1033-1050`). Its datasets are the child invocation's objects.
- Recovery on later scheduling passes rebuilds a step's outputs from these two tables plus `output_value` (`WorkflowModule.recover_mapping`, `workflow/modules.py:788-800`; `run.py:722-723`).

### Invocation outputs

- `WorkflowInvocationOutputDatasetAssociation` and `...DatasetCollectionAssociation` hold `workflow_output_id`, `workflow_step_id` and the item. A mapped step's workflow output is an HDCA, so it appears among the collection rows.
- `WorkflowInvocationOutputValue` holds a JSON `value`. It is used when the output object has no `history_content_type`: a parameter input marked as an output, or a parameter value that a subworkflow passes up.
- **`NoReplacement`**: `NoReplacement` / `NO_REPLACEMENT` (`tools/parameters/workflow_utils.py:5-10`) is the scheduler's "no value" sentinel. Suppose a workflow output's source has no value, for example an optional input left empty with no default. `_record_workflow_output` then stores `{"__class__": "NoReplacement"}` as an output **value** row (`run.py:749-752`). This happens even when the output would otherwise be data. Readers that resolve a connection treat that dict as `NO_REPLACEMENT` (`run.py:571-574`). An unset optional data input marked as an output therefore shows up in `output_values`, not in `outputs`.

### Request inputs

- `WorkflowInvocation.add_input` (`:10574-10606`) dispatches on `history_content_type`. An HDA goes to `WorkflowRequestToInputDatasetAssociation`, an HDCA to `...DatasetCollectionAssociation`, and anything else to `WorkflowRequestInputStepParameter`. The optional `request` JSON keeps the original request (for example `deferred`, used by `inputs_requiring_materialization`, `:10372-10396`).
- The scheduler calls it once per input step, when the step first produces a non-`NO_REPLACEMENT` value (`run.py:701-706`). Unset optional inputs have no request row.
- `recover_inputs` (`:10608-10650`) rebuilds a run request keyed by `effective_label` (label, or the input's `name`). It falls back to the `order_index` string and `inputs_by="name|step_index"` when a step has neither. `GET /api/invocations/{id}/request` uses it.
- `WorkflowRequestInputParameter` holds invocation-wide `replacements`, `step`, `meta` (object-store preferences, `effective_outputs`) and `resource` parameters (`:11088-11115`).

## Serialization views

`InvocationsService.serialize_workflow_invocation` calls `WorkflowInvocation.to_dict(view, step_details=…, legacy_job_state=…)` and validates the result as `WorkflowInvocationResponse` (`webapps/galaxy/services/invocations.py:286-297`). `view` is `element` or `collection` (`schema/invocation.py:728-758`). Show defaults to `element`, and lists default to `collection` (`:286-305`).

| View | Keys |
|---|---|
| `collection` | `id`, `update_time`, `create_time`, `workflow_id` (version), `history_id`, `uuid`, `state`, `landing_uuid`, `on_complete` (`:10051-10068`, `:10464-10478`), and `messages`, added by the service |
| `element` | the `collection` keys plus `steps`, `inputs`, `input_step_parameters`, `outputs`, `output_collections`, `output_values` (`:10480-10570`) |

### `element` dict keys

| Field | Keyed by | Value | Source |
|---|---|---|---|
| `inputs` | **`str(workflow_step.order_index)`** | `{id, src: hda/hdca, label, workflow_step_id}` | `:10501-10522` |
| `input_step_parameters` | step label, or `"<order_index+1>: Unnamed parameter"` | `{parameter_value, label, workflow_step_id}` | `:10524-10533` |
| `outputs` | `WorkflowOutput.label`, or `"<output_name> (Step <order_index+1>)"` | `{src: hda, id, workflow_step_id}` | `:10535-10547` |
| `output_collections` | the same label fallback | `{src: hdca, id, workflow_step_id}` | `:10549-10559` |
| `output_values` | `WorkflowOutput.label`; **unlabeled outputs are skipped** | raw JSON value (including the `NoReplacement` dict) | `:10564-10570` |

Consequences:

- Labels are dict keys, so two workflow outputs that share a label collapse to one entry (last write wins). [Issue #24305](https://github.com/galaxyproject/galaxy/issues/24305) is about this.
- `inputs` and `outputs` use different keys (order index versus label) for historical compatibility. The code comment at `:10514` says so.
- `outputs` and `output_collections` carry `workflow_step_id` but not `workflow_output_id` or `output_name`. To recover the producing output name from the API, match on the step's own `outputs` dict.

### `steps[]` and `step_details`

Each entry is `WorkflowInvocationStep.to_dict` (`:11051-11085`), validated as `InvocationStep` (`schema/invocation.py:365-436`).

- Always present: `id`, `update_time`, `job_id`, `workflow_step_id`, `subworkflow_invocation_id`, `state` (invocation-step state: `new`, `ready` or `scheduled`), `action`, `order_index`, `workflow_step_label`, `workflow_step_uuid`. In the invocation's `element` view, `implicit_collection_jobs_id` is added (`:10500`).
- `step_details=false`, the default, uses the step `collection` view. `outputs` and `output_collections` fall back to `{}`, and `jobs` to `[]`. The default invocation payload therefore has empty per-step outputs.
- `step_details=true`, or `GET /api/invocations/steps/{step_id}` (`services/invocations.py:164-168, 307-311`), uses the step `element` view:
  - `outputs` is keyed by `output_name` and maps to `{src: hda, id, uuid}`, where `uuid` is the `Dataset` uuid.
  - `output_collections` is keyed by `output_name` and maps to `{src: hdca, id}`.
  - `jobs` holds `Job.to_dict()`, or the ICJ's jobs as `Job.dict_collection_visible_keys` rows (`get_jobs_dict`, `:11042-11049`).
- `legacy_job_state=true` (deprecated) emits one step entry per job, with the job's state and `job_id` (`:10487-10497`).

### Export view (`_serialize`)

Model-store export (`write_store`) uses `_serialize`, not `to_dict`. Its output is lists, not label-keyed dicts:

- `steps` carry `order_index`, `job` or `implicit_collection_jobs` links, and `outputs` / `output_collections` lists of `{output_name, dataset|dataset_collection}` (`:11002-11040`).
- The input and output association lists each carry `order_index`. Output rows also carry a serialized `workflow_output` with `{output_name, label, uuid}` (`:10398-10462`).
- Import re-binds steps by `order_index` and outputs by `workflow.workflow_output_for(label)` (`model/store/__init__.py:1183-1185, 1298-1342`).

## `expression.json` outputs

- Expression tools write ordinary HDAs with extension `expression.json`. They are recorded in the **dataset** tables (step outputs, and `outputs` if marked), not in `output_values`. A mapped expression step produces an HDCA of them, listed under `output_collections`.
- The value is read from the file only when a downstream non-data parameter needs it: `replace_expression_json_dataset` / `read_expression_json` (`workflow/modules.py:268-319`) and `to_cwl` (`:361-362`). The API does not inline it. A client that wants the value fetches the dataset content.
- Skipped steps (`when` false) produce placeholder HDAs via `HistoryDatasetAssociation.set_skipped`. Each placeholder has extension `expression.json`, content `null`, blurb `skipped` and `visible=False` (`:5661-5676`). `is_skipped` tells it apart from a real expression output that happens to be null (`:5651-5659`). These placeholders appear in the step and output tables like any other HDA.
- By contrast, a parameter value that becomes a workflow output (an input parameter, or a subworkflow's parameter output) is in `output_values` as inline JSON.

## Known issues

Recorded in `vault/agents/gx_research/research_issues/`:

- `invocation-import-relinks-outputs-by-label.md`: store import binds unlabeled invocation outputs to the first unlabeled `WorkflowOutput` of any step.
- `invocations-job-id-filter-misses-mapped-jobs.md`: `?job_id=` ignores ICJ membership, so the job page finds no invocation for mapped-over jobs.
- `invocation-step-output-value-scalar.md`: `output_value` is scalar, so step recovery can restore at most one value output.
- `wisodca-workflow-step-id-never-written.md`: the indexed `workflow_step_id` on the step-collection table is always `NULL`.

## Related

- [[Component - Workflow API]]: the invocation endpoints, `instance` id convention and `/step_jobs_summary`.
- [[Component - Invocation Graph View]]: the client step cards that consume `steps[]`, `order_index` and per-step fetches.
- [[Component - Jobs API and Job Cache]]: job and ICJ grouping and `copied_from_job_id` for steps' jobs.
- [[Component - Job Completion Lifecycle]]: how `finish()` bumps `workflow_invocation_step.update_time`, which the scheduler watches.
- [[Component - Workflow Extraction Models]]: job input and output association tables, from the history-to-workflow direction.
- [[Component - Collection Models]]: HDCA and `ImplicitCollectionJobs` structure behind mapped step outputs.
