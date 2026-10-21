# Compare runs of a workflow step, a workflow's outputs, or a tool

A user should be able to pick one workflow step, a workflow's outputs, or a tool, and see every past run of it in one table, with inputs, outputs, parameters, state, version and reuse side by side.

Today, answering "what did this step produce last week with the old parameter?" means opening invocations one at a time, finding the step in each graph, and clicking through to datasets. For tools there is no list of past runs at all.

Mockups: [published](https://claude.ai/artifact/EnVow5Qbt2pKo8j3BUoQEK) ([source](../../agents/gx_issues/internally_managed/compare_runs_mockup.html)).

## Three comparison modes

| Mode | Compares | One row per | Columns | Entry point |
| --- | --- | --- | --- | --- |
| 1. Step across invocations | one labelled step of a stored workflow | invocation | the step's inputs, outputs, parameters | **All runs** tab on the invocation step card, next to Jobs and Outputs |
| 2. Workflow outputs across invocations | a stored workflow | invocation | labelled workflow inputs (datasets, collections and parameters) and labelled workflow outputs | **Compare outputs** on `/workflows/:storedWorkflowId/invocations` |
| 3. Tool across runs | a tool, all versions by default | tool submission (a job, or a mapped-over batch) | the tool's inputs, outputs, parameters | **Other runs of this tool** on the job page (`/jobs/:jobId/view`) |

Mode 1:

| Invoked | Version | State | Reused | `input1` | `out_file1` | Parameters |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-11-12 ★ current | v5 | ok | | `sample_counts.tsv` | `counts.tsv` | ▸ |
| 2026-11-10 | v5 | ok | reused | `sample_counts.tsv` | `counts.tsv` | ▸ |
| 2026-11-03 | v3 | ok | | `sample_counts.tsv` | `counts.tsv` | ▸ |

Mode 2, for a workflow with inputs `reads`, `ref`, `min_quality` and outputs `counts`, `qc_report`, `n_genes` (an `expression.json` shown as its value):

| Invoked | Version | State | `reads` | `ref` | `min_quality` | `counts` | `qc_report` | `n_genes` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-12 | v5 | ok | `s1.fq.gz` | `hg38.fa` | 30 | `counts.tsv` | `qc.html` | 18 204 |
| 2026-11-03 | v3 | ok | `s1.fq.gz` | `hg38.fa` | 20 | `counts.tsv` | — *not in v3* | 17 950 |

## The table

- **Rows are runs; columns are inputs, outputs and run metadata.** The metadata columns are when it ran, workflow or tool version, state, reused, and a link to the run.
- **A transpose toggle** flips the table to one row per input or output, with runs as columns. This works because the grid is always uniform: a run that lacks a column gets a "missing" cell.
- **Each row links to its run.** In mode 1, the link opens the invocation with the same step selected. That needs the invocation deep links from 🎯 #24173. Mode 3 rows link to the job page.
- **Paginated, newest first, the user's own runs only.**
- **Deleted, purged and deleted-history items are shown, badged.** Subworkflow steps link to the subworkflow invocation. Mapped-over steps show the parameters of "job 1 of N".

### Cells

1. **The default is a link with a popover.** The link shows the name; hovering shows a dataset or collection summary.
2. **Metadata element.** Each column can be switched to show one metadata element in place of the link, for example `data_lines` or `columns`.
3. **Value.** `expression.json` outputs and parameter values render as the value itself.

Expanding a row opens a detail panel. It shows the standard history item for each output (peek, eye/edit/download, one click to its history) and the job's parameters (loaded lazily). Parameters is always a column that opens this panel; it is not one column per parameter.

<details><summary>What Galaxy has for each</summary>

- **Popover.** `client/src/components/Common/DatasetPopoverLink.vue` (`GPopover` + `DatasetInformation` from `datasetStore`) does this today for storage runs only. Generalise it. Its DOM id is `storage-run-item-dataset-${datasetId}`, which collides when the same input appears in many rows. For collections, `HDCASummary` + `CollectionDescription.vue` already render type, element count and state.
- **Metadata.**
  - You can't fetch a single element. `GET /api/datasets/{id}?keys=metadata_data_lines` ignores the key, and `keys=metadata` expands every `metadata_*` field (`managers/datasets.py:820-865`).
  - No endpoint lists the elements a datatype declares, so the column picker offers the union of keys seen on the page.
  - `data_lines` may be absent: it's optional, `None` past 100 000 lines, and skipped above `max_optional_metadata_filesize`.
  - So the query names the elements it wants, and the server puts them in the cells.
- **Values.**
  - No client code renders `output_values`, `expression.json` or `json_type` today. Two sources share one rendering path:
    - expression-tool outputs, which are `expression.json` HDAs in an invocation's `outputs`;
    - parameter values: `output_values` (`WorkflowInvocationOutputValue`, which can hold the `{"__class__": "NoReplacement"}` sentinel) and parameter inputs (`WorkflowRequestInputStepParameter`).
  - `ExpressionJson.json_type` is unreliable (strings come out as `"null"`, booleans as `"int"`). Instead, the server inlines small `expression.json` content (size-capped, `read_expression_json` in `workflow/modules.py`) as a value cell.
  - The client fallback is `/api/datasets/{id}/get_content_as_text` via `datasetTextContentStore`.

</details>

## Matching across versions

Comparing and transposing need each column to mean the same thing on every row.

- **Mode 1** matches the step by **label only**. Step labels are unique within a version (`managers/workflows.py:2156-2159`), and users see and control them.
  - An unlabelled step can't be compared. Its All runs tab is disabled with "Label this step to compare its runs".
  - A label added in v4 matches runs from v4 on. Renaming a label starts a new history for that step.
  - Columns are the job's input and output names, taken as the union across rows. A tool-version change can add or drop names, so a row missing one gets `Missing(not_in_version)`.
- **Mode 2** columns are workflow output labels plus input step labels, taken as the union across the versions on the page. They are ordered by the newest version, and columns that only older versions have go last, badged.
  - Unlabelled outputs and inputs can't be compared and are not shown.
  - Inputs are matched on their `label`. The serialized invocation's `inputs` dict is keyed by `order_index`.
  - Duplicate output labels can exist today (🎯 #24305). Flag the column rather than silently showing one.
- **Mode 3** columns are the union of job input and output association names, normalised: `__new_primary_file_{name}|…__` and `name|__part__|…` fold to the base output name. Rows span tool versions by default, with a version column and a version filter.

## Proposed Approach

Add three read-only GET endpoints that share one Pydantic query base and one `ComparisonTable` response, a resolver per mode, and one props-only table component in the `GTable` style (`@galaxyproject/galaxy-ui`) with a `ListHeader`-style column chooser. Ship mode 1 first; modes 2 and 3 are then a resolver and an entry point each. No migration.

<details><summary>Endpoints and models</summary>

- `GET /api/workflows/{workflow_id}/step_runs?step_label=…` — mode 1.
- `GET /api/workflows/{workflow_id}/output_runs?output_label=…` (repeatable; default all) — mode 2.
- `GET /api/tool_runs?tool_id=…` — mode 3. The tool id is a query param because Tool Shed ids contain slashes and most `/api/tools/{tool_id}` routes don't take a path id.

Each endpoint's query model subclasses one base, following the `*IndexQueryPayload` pattern. Responses set a `total_matches` header, as the workflow and history indexes do. Because the query is plain query params, a client route (`/comparisons?kind=…&…`) can forward it unchanged, and every entry point links there pre-filled.

```python
class ComparisonQueryBase(Model):
    limit: int = 25          # lt=1000, like WorkflowIndexQueryPayload
    offset: int = 0
    sort_by: Literal["create_time", "update_time"] = "create_time"
    sort_desc: bool = True
    states: Optional[list[str]] = None
    metadata_elements: list[str] = []   # extra per-cell values, e.g. ["data_lines"]
    inline_expression_values: bool = True

class StepRunsQuery(ComparisonQueryBase):
    kind: Literal["step_runs"] = "step_runs"
    workflow_id: DecodedDatabaseIdField   # StoredWorkflow
    step_label: str

class OutputRunsQuery(ComparisonQueryBase):
    kind: Literal["output_runs"] = "output_runs"
    workflow_id: DecodedDatabaseIdField   # StoredWorkflow
    output_labels: Optional[list[str]] = None

class ToolRunsQuery(ComparisonQueryBase):
    kind: Literal["tool_runs"] = "tool_runs"
    tool_id: str                           # versionless; Tool Shed version suffix stripped
    tool_versions: Optional[list[str]] = None
    history_id: Optional[DecodedDatabaseIdField] = None
    include_workflow_jobs: bool = True

AnyComparisonQuery = Annotated[Union[StepRunsQuery, OutputRunsQuery, ToolRunsQuery], Field(discriminator="kind")]

class ComparisonColumn(Model):
    key: str; label: str
    role: Literal["input", "output", "parameter"]
    present_in_versions: Optional[list[int]] = None

class ComparisonRow(Model):
    run: InvocationRef | JobRef | ImplicitCollectionJobsRef   # discriminated on `model`
    create_time: datetime; state: str
    version: Optional[int]; tool_version: Optional[str]
    reused: Literal["no", "partial", "yes"]
    history: HistoryRef                    # id, name, deleted
    cells: dict[str, Cell]                 # Dataset | Collection | Value | Missing, discriminated on `type`

class ComparisonTable(Model):
    query: AnyComparisonQuery              # echoed, so the client can page and re-link
    columns: list[ComparisonColumn]
    rows: list[ComparisonRow]
```

`Missing.reason` is one of `not_in_version`, `skipped`, `not_run_yet` or `no_output`. Dataset and collection cells carry the id, name, extension or collection type, state, `deleted`/`purged`, and any metadata elements that were requested.

There is precedent for discriminated models: `AnyJobStateSummary` on `model` (`schema/schema.py:2549-2558`), invocation messages on `reason` (`schema/invocation.py:121-330`), and workflow steps on `type` (`schema/workflows.py:262-268`).

</details>

<details><summary>Resolvers</summary>

- **Mode 1.**
  - Take the stored workflow's `Workflow` versions, find the `WorkflowStep` with `step_label` in each, then page over `WorkflowInvocationStep` joined to `WorkflowInvocation` and `History` (owner via `History.user_id`). This uses the indexes on `workflow_invocation_step.workflow_step_id` and `workflow_invocation.workflow_id`.
  - Batch-load the outputs (`WorkflowInvocationStepOutputDataset(Collection)Association`), the job or ICJ, job state counts, and `copied_from_job_id`.
- **Mode 2.**
  - The same invocation page, without the step join.
  - Batch-load `WorkflowInvocationOutputDataset(Collection)Association`, `WorkflowInvocationOutputValue`, `WorkflowRequestToInput*` and `WorkflowRequestInputStepParameter` by `workflow_invocation_id`.
  - Key the outputs by `WorkflowOutput.label` and the inputs by the input step's `label`.
- **Mode 3.**
  - Reuse `JobManager.index_query` filtering, with `tool_ids_like` to span versions since Tool Shed ids embed the version. Add a `tool_version` filter; neither `JobIndexQueryPayload` nor `index_query` has one.
  - A row is a `Job`, or its `ImplicitCollectionJobs` when mapped over. An ICJ has no timestamps or `tool_id`, so sort it by its `representative_job`.
  - Read inputs and outputs from the job association tables. `/api/jobs/{id}/inputs` omits collections, and `/outputs` omits implicit collections.
- **Reused.** Derived from `Job.copied_from_job_id` (set by the job cache). It is exposed only on job show (`EncodedJobDetails`); `JobBaseModel` and `JobSummary` lack it. An ICJ is `partial` when only some of its jobs were copied.
- **Tool version.** `Job.to_dict` emits `tool_version`, but `JobBaseModel` and `EncodedJobDetails` don't declare it, so it's stripped from responses (`JobInformation.vue:92-96`). Add it.
- **Cost.** A handful of statements per page, regardless of invocation count. Check with `EXPLAIN` against a workflow with hundreds of invocations. `job.create_time` isn't indexed, so mode 3 sorts on `update_time` or by id if the plan is poor.

</details>

<details><summary>Client</summary>

- **All runs tab.** Add an `All runs` `GTab` to `WorkflowInvocationStep.vue`, beside Jobs, Outputs and Step Config. Pass the step label; the client step `id` is the `order_index`.
- **Table component.** It is store-independent and takes props only: a `ComparisonTable` plus display settings (transpose, per-column metadata element, value rendering). That way two can later sit side by side.
- **Row detail.** Reuse `JobDetailsTabs.vue` (Information / Parameters / Outputs), or `GenericHistoryItem` + `JobParameters`. Mount these only on expand, so the table doesn't run N×M polling history items.
- **Standalone route.** `/comparisons?kind=…`, linked from the stored-workflow invocation list (mode 2) and the job page (mode 3).

</details>

<details><summary>Testing (red-to-green)</summary>

- **API** (`lib/galaxy_test/api/test_comparisons.py`):
  - Run a two-step workflow twice, edit it (insert a step, change a tool param), and run it again. Mode 1 returns 3 rows.
  - Rename the workflow, then run it. The rows are still found.
  - A step whose label changed in v3 returns only rows from v3 on.
  - An unlabelled step gives a 400.
  - A rerun with the job cache gives `reused=yes`. A mapped-over step gives a collection cell and `partial`.
  - Mode 2: an output label added in v2 gives `Missing(not_in_version)` in v1 rows, a parameter input shows as a value, and an `expression.json` output is inlined.
  - Mode 3: two tool versions, filtered and unfiltered.
  - Another user's runs aren't returned. A deleted history is badged.
- **Unit:** column alignment and name normalisation, as pure functions.
- **Client vitest:** transpose, the cell renderers (link, metadata, value, missing), and the popover id fix.
- **Playwright:** one test. Open an invocation, select a step, open All runs, and follow a row to the other invocation.

</details>

## Alternative Approaches

- **One `POST` taking a discriminated query body.** One endpoint, but reads become non-cacheable and non-linkable, and Galaxy's read endpoints are GETs apart from `/api/jobs/search`.
- **Extending `GET /api/invocations?view=element&step_details=true`.** This serialises every step of every invocation to show one step or one output set. Its `total_matches` is also counted before the security filter is applied (`managers/workflows.py:731-747`).
- **Per-row client fetches**, the way the step card loads outputs today, would cost 20–100 requests per page.
- **Matching steps by uuid, with label or position fallbacks.**
  - Step uuids change on a rename-only save, on shared-workflow import and on editor paste, and fallbacks need a badge to explain the guesses.
  - Labels are predictable and under the user's control.
  - Position breaks as soon as a step is inserted.
- **A row per `ToolRequest` in mode 3.** Not universal: legacy `/api/tools` submissions don't create one.

## Context

- 🎯 #10039 asks to see a step's outputs from previous invocations in the editor, and names the cross-version identity problem.
- Row links need 🎯 #24173 (invocation deep links).
- 🎯 #24174 (rerun lineage) would let rows show "rerun of".
- Mode 2 has to account for duplicate output labels, 🎯 #24305.
- A single-step rerun ([`rerun_single_step_from_invocation.md`](../../agents/gx_issues/internally_managed/rerun_single_step_from_invocation.md)) produces exactly a new mode 1 row.
- Galaxy has no comparison or diff feature today apart from page revisions.

**Later:**
- a side-by-side diff of two rows (outputs and parameter diff);
- per-node run-count badges in the invocation graph;
- a per-workflow Runs page with a version picker;
- mode 1 for steps inside subworkflows, reached through `WorkflowInvocationToSubworkflowInvocationAssociation`.

## Unresolved questions

1. Mode 3 row: one per Job/ICJ (recommended) or per ToolRequest? Include jobs run inside workflows by default?
2. Mode 3 entry: is the job page enough, or should the tool form also get a "previous runs" panel?
