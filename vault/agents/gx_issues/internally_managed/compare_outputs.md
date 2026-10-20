# Compare runs: one table for a step, a workflow's outputs, or a tool across runs

A user should be able to pick a *slice* of their past work, such as one workflow step, all of a workflow's outputs, or one tool, and see every run of it in a single table: one row per run, with inputs, outputs, state, version and reuse side by side.

Merges John's requirements chat (2026-10-20) with the client ask [`step_runs_across_invocations.md`](step_runs_across_invocations.md). The client's ask is mode 1 below and the first deliverable. The chat supplies the general shape that mode 1 is built on. Tags: **[client]** and **[chat]** mark where each requirement comes from, **[research]** marks what Galaxy code adds or contradicts (read from `origin/dev` @ `2cca856`).

## Three comparison modes [chat]

| Mode | Slice | One row per | Columns | Entry point |
| --- | --- | --- | --- | --- |
| 1. Step across invocations **[client]** | stored workflow + one step | invocation | that step's inputs, outputs, parameters | **All runs** tab on the invocation step card |
| 2. Workflow outputs across invocations | stored workflow | invocation | workflow inputs + labelled workflow outputs | **Compare outputs** on `/workflows/:storedWorkflowId/invocations` (`StoredWorkflowInvocations.vue`) |
| 3. Tool across runs | tool id (all versions by default) | tool submission (job, or mapped-over batch) | tool inputs, outputs, parameters | **Other runs of this tool** on the job page (`jobs/:jobId/view`) |

Mode 1 pins a single step. Mode 2 covers the whole workflow but only its labelled outputs. The two differ in both what the columns are and how they are matched across versions.

What the table looks like for mode 1 (from the client doc):

| Invoked | Version | State | Reused | Inputs | Outputs | Parameters |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-11-12 ★ current | v5 (current) | ok | | `sample_counts.tsv` | `counts` ▸ | ▸ |
| 2026-11-10 | v5 | ok | reused | `sample_counts.tsv` | `counts` ▸ | ▸ |
| 2026-11-03 | v3 | ok | | `sample_counts.tsv` | `counts` ▸ | ▸ |

Mode 2 for a workflow with inputs `reads`, `ref` and outputs `counts`, `qc_report`, `n_genes` (an `expression.json` rendered as a value):

| Invoked | Version | State | `reads` | `ref` | `counts` | `qc_report` | `n_genes` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-12 | v5 | ok | `s1.fq.gz` | `hg38.fa` | `counts.tsv` | `qc.html` | 18 204 |
| 2026-11-03 | v3 | ok | `s1.fq.gz` | `hg38.fa` | `counts.tsv` | — *not in v3* | 17 950 |

## Shared table [chat + client]

- **Rows are runs and columns are inputs, outputs and run metadata** **[chat]**. Metadata columns are when the run happened, workflow or tool version, state, reused, and a link to the run.
- **Transpose toggle** **[chat]**. Flip to one row per input or output with runs as columns. This view suits comparing a few runs closely. It works because the grid is always uniform, with a "missing" cell where a run lacks a column (see *Column alignment*).
- **Each row links to its run** **[client]**. Mode 1 links to the invocation *with the same step selected*. That deep link is 🎯 #24173 (not yet implemented, the route takes no `?step=` today). Mode 3 links to the job page.
- **Paginated, newest first, owner's runs only** **[client]**. "Owner" means invocations reached through `History.user_id` (an invocation has no user column) and jobs through `Job.user_id`.
- **Show deleted things honestly** **[client]**. Deleted or purged outputs and deleted histories stay as rows, badged.
- **Mode 1 extras** **[client]**. Subworkflow steps link to the subworkflow invocation. Mapped-over steps show "parameters of job 1 of N".

### Cell display [chat recap; see Q1]

The chat's middle section about cells wasn't captured; only its summary was. As stated in that summary:

1. **Default: a link with a popover.** It shows the name and opens a hover summary.
2. **Show a chosen metadata element instead.** This is a per-column setting, for example `data_lines` or `columns`.
3. **Show the value itself for `expression.json`.**

Reconciling with the client's ask, which expands an output into the standard history item (peek, eye/edit/download, one click to its history): the link-with-popover is the cell, and expanding a row opens a detail panel with `GenericHistoryItem` for its outputs and the existing `JobParameters` display for Parameters (loaded lazily from `/api/jobs/{id}/parameters_display`). Both asks are met, and the table never mounts N×M polling history items.

<details><summary>What Galaxy has for each display [research]</summary>

- **Link + popover.** `client/src/components/Common/DatasetPopoverLink.vue` already does this (`GPopover` + `DatasetInformation` from `datasetStore`), but only for storage runs. Its DOM id is `storage-run-item-dataset-${datasetId}`, which collides when the same input dataset appears in many rows of one table. Generalise it rather than write a new one. Collections: `HDCASummary` + `CollectionDescription.vue` already render type, element count and state.
- **Metadata element.** You can't fetch just one element. `GET /api/datasets/{id}?keys=metadata_data_lines` silently ignores the key, and `keys=metadata` expands every `metadata_*` field (`managers/datasets.py:820-865`). No endpoint lists the metadata elements a datatype declares, so the column picker would have to offer the union of keys seen on the page. `data_lines` is unreliable: it's optional, `None` past 100 000 lines, and skipped above `max_optional_metadata_filesize`. Recommendation: the slice names the elements it wants and the server adds them to the cells, so the table doesn't need one fetch per cell.
- **`expression.json` values.** There's no client rendering of `output_values`, `expression.json` or `json_type`. Two sources need **one** rendering path:
  - expression-tool outputs are `expression.json` HDAs and appear in an invocation's `outputs`;
  - parameter outputs (parameter steps marked as outputs, `pick_value` passthroughs) are `WorkflowInvocationOutputValue` rows in `output_values`, which can hold the `{"__class__": "NoReplacement"}` sentinel.

  `ExpressionJson`'s `json_type` metadata isn't reliable (strings come out as `"null"`, booleans as `"int"`), so read the content. Recommendation: the server inlines small `expression.json` values (size cap, `read_expression_json` in `workflow/modules.py`) as `value` cells, the same shape as `output_values`. The client fallback is `/api/datasets/{id}/get_content_as_text` via `datasetTextContentStore`.

</details>

## Slice model [chat]

A Pydantic **base comparison slice** with one subclass per mode, discriminated on `kind`. Each subclass resolves against the data model in its own way, and all three return the same table model. Galaxy already has this pattern:
- `AnyJobStateSummary` gives one shape backed by Job, ICJ or invocation, discriminated on `model` (`schema/schema.py:2549-2558`);
- invocation messages are discriminated on `reason` (`schema/invocation.py:121-330`);
- workflow steps are discriminated on `type` (`schema/workflows.py:262-268`).

The slice is plain JSON, so it can also go in a URL. A `/comparisons?slice=…` route can render any slice, and each entry point links to it pre-filled. The step-card tab embeds the same component.

<details><summary>Model sketch</summary>

```python
class ComparisonSliceBase(Model):
    kind: str
    limit: int = 25          # lt=1000, like WorkflowIndexQueryPayload
    offset: int = 0
    sort_by: Literal["create_time", "update_time"] = "create_time"
    sort_desc: bool = True
    states: Optional[list[str]] = None
    metadata_elements: list[str] = []   # extra per-cell values, e.g. ["data_lines"]
    inline_expression_values: bool = True

class WorkflowStepSlice(ComparisonSliceBase):
    kind: Literal["workflow_step"]
    workflow_id: DecodedDatabaseIdField   # StoredWorkflow
    step_label: str                       # the only cross-version key

class WorkflowOutputsSlice(ComparisonSliceBase):
    kind: Literal["workflow_outputs"]
    workflow_id: DecodedDatabaseIdField   # StoredWorkflow
    output_labels: Optional[list[str]] = None   # default: all labelled outputs
    include_inputs: bool = True

class ToolRunsSlice(ComparisonSliceBase):
    kind: Literal["tool_runs"]
    tool_id: str                           # versionless; Tool Shed version suffix stripped
    tool_versions: Optional[list[str]] = None
    history_id: Optional[DecodedDatabaseIdField] = None
    include_workflow_jobs: bool = True

AnyComparisonSlice = Annotated[Union[WorkflowStepSlice, WorkflowOutputsSlice, ToolRunsSlice], Field(discriminator="kind")]

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
    cells: dict[str, Cell]                 # Cell = Dataset | Collection | Value | Missing (discriminated on `type`)

class ComparisonTable(Model):
    slice: AnyComparisonSlice
    columns: list[ComparisonColumn]
    rows: list[ComparisonRow]
    total_matches: int
```

`Missing.reason` is one of `not_in_version`, `skipped`, `not_run_yet` or `no_output`. The `Dataset` and `Collection` cells carry the id, name, extension or collection type, state, `deleted`/`purged`, and any metadata elements that were asked for.

</details>

## Column alignment across versions [research — neither source covers this]

Transposing and comparing both need the same column to mean the same thing on every row. The rules:

- **Mode 1.**
  - *Rows* are matched to the step by **step label only** (John, 2026-10-20). This replaces the client's "uuid by default, label/position as possible matches", and makes modes 1 and 2 use the same key: labels.
    - Step labels are enforced unique within a version (`managers/workflows.py:2156-2159`). Labels are also what users see and control.
    - uuids are not stable enough anyway. A **rename-only save regenerates every step uuid**: the workflow list's Rename action (`WorkflowCardList.vue:132`) sends a name-only `PUT`, which calls `Workflow.copy()` (`api/workflows.py:465-472`), and that never copies step or output uuids (`model/__init__.py:9285`, 9588, 9796). Shared-workflow import and editor duplicate/paste also mint new uuids.
    - Cost: **an unlabelled step can't be compared.** The All runs tab is disabled there with "Label this step to compare its runs". A label added in v4 matches runs from v4 on. Renaming a label starts a new history for that step.
  - *Columns* are the job's input and output association names. A tool-version change can add or drop names. Use the union, and fill `Missing(not_in_version)` where a row lacks one.
- **Mode 2.**
  - Columns are **workflow output labels** plus **input step labels**, as the union across the versions on the page. They're ordered by the newest version, and columns only older versions have go last with a badge.
  - Unlabelled outputs are left out by default. Their fallback key, `"<name> (Step N)"`, changes from version to version, and `output_values` drops them entirely.
  - Inputs must be matched on `label`, not on the `inputs` dict key. That key is `order_index`.
  - Duplicate output labels are possible because the server check is broken (see side findings), and `to_dict` keeps whichever comes last. Flag the column instead of silently dropping one.
- **Mode 3.**
  - Columns are the union of job input and output association names, normalised: strip `__new_primary_file_{name}|…__` and `name|__part__|…` to their base output name.
  - Rows span tool versions by default, with a version column and a version filter.

## Proposed Approach

Build one read-only endpoint, a resolver per slice kind, and one props-only table component in the `GTable` house style (`@galaxyproject/galaxy-ui`), with a column chooser like `ListHeader` `columnOptions`. Phase 1 ships mode 1 (the client's ask) on the generic model. Modes 2 and 3 are then each just a new resolver and an entry point. No database migration.

<details><summary>Endpoint: one POST vs three GETs (decision — Q2)</summary>

- **Recommended: `POST /api/comparisons/query`** with an `AnyComparisonSlice` body that returns a `ComparisonTable`. The slice is already a JSON model, and a discriminated union doesn't fit FastAPI query params. Galaxy already has read-only POSTs: `/api/jobs/search` and `/api/histories/{id}/contents/bulk/storage/preview`. Mark it `unstable=True` at first, like `parameters_display`.
- **Alternative:** three GETs (`/api/workflows/{id}/step_runs`, `/api/workflows/{id}/output_runs`, `/api/tools/{id}/runs`) that share `ComparisonTable`. Each is easy to cache and link to, but there are three query payloads to keep in step and no single home for the slice.
- **Rejected:** extending `GET /api/invocations?view=element&step_details=true`. It serialises every step of every invocation to show one step or one output set, and it has a known bug: `total_matches` is counted before the security filter (`managers/workflows.py:731-747`).

</details>

<details><summary>Resolvers [research]</summary>

- **Mode 1.**
  - Look up `stored_workflow_id`, then all `Workflow` versions, then the `WorkflowStep` with that label in each version.
  - Then page over `WorkflowInvocationStep` joined to `WorkflowInvocation` and `History` (owner), using the indexes on `workflow_invocation_step.workflow_step_id` and `workflow_invocation.workflow_id`.
  - Batch-load outputs (`WorkflowInvocationStepOutputDataset(Collection)Association`), the job or ICJ, job state counts, and `copied_from_job_id`.
  - `workflow_step.label` isn't indexed, but the step lookup is limited to one stored workflow's versions, so that's fine.
- **Mode 2.**
  - The same invocation page query, without the step join.
  - Batch-load `WorkflowInvocationOutputDataset(Collection)Association`, `WorkflowInvocationOutputValue` and `WorkflowRequestToInput*` / `WorkflowRequestInputStepParameter`.
  - Join through `WorkflowOutput.label` and `WorkflowStep.label`. All of these are keyed by `workflow_invocation_id`.
- **Mode 3.**
  - Reuse `JobManager.index_query` filtering (`tool_ids_like` to span versions, because Tool Shed ids embed the version) and add a `tool_version` filter. Neither `JobIndexQueryPayload` nor `index_query` has one today.
  - A row is a `Job`, or its `ImplicitCollectionJobs` when it was mapped over. An ICJ has no timestamps or `tool_id`, so sort it by its `representative_job`.
  - `ToolRequest` would be the natural grouping, but legacy `/api/tools` submissions don't create one.
  - Job inputs and outputs come from the association tables directly. `/api/jobs/{id}/inputs` leaves out collections, and `/outputs` leaves out implicit collections.
- **Reused.**
  - `copied_from_job_id` is set when a job is served from the job cache. Its only API exposure is `EncodedJobDetails` (job show), and `JobBaseModel` / `JobSummary` lack it.
  - Set `reused` from it per job. For an ICJ, report `partial` when only some of its jobs were copied.
  - The column has no index or FK. That doesn't matter because the value is read off rows we already load.
- **Tool version.** `Job.to_dict` emits `tool_version`, but `JobBaseModel` / `EncodedJobDetails` don't declare it, so FastAPI strips it (`JobInformation.vue:92-96` notes this). Add it while we're here.
- **Cost.** A handful of statements per page, however many invocations there are. Check with `EXPLAIN` on a workflow with hundreds of invocations. `job.create_time` isn't indexed, so mode 3 should sort on `update_time` or by id if the plan is poor.

</details>

<details><summary>Client [research]</summary>

- **Mode 1 tab.** Add an `All runs` `GTab` to `WorkflowInvocationStep.vue` (its `<GTabs>` block holds Jobs, Outputs and Step Config). Pass the step label, not the client step `id`, which is the `order_index`.
- **Table component.** It is store-independent and takes props only: `ComparisonTable` plus display settings (transpose, metadata elements, value rendering). Two can sit side by side later.
- **Row detail.** Reuse `JobDetailsTabs.vue` (Information / Parameters / Outputs) or `GenericHistoryItem` + `JobParameters`.
- **Standalone route.** `/comparisons?slice=<json>`, linked from the stored-workflow invocation list (mode 2) and the job page (mode 3). Galaxy has no user-facing job list or "previous runs" panel on the tool form today, so the job page is the only existing place for mode 3.

</details>

<details><summary>Testing (red-to-green)</summary>

- **API** (`lib/galaxy_test/api/test_comparisons.py`):
  - run a two-step workflow twice, edit it (insert a step, change a tool param), and run it again: mode 1 returns 3 rows;
  - **rename-only save + run**: the row is still found (red against uuid matching);
  - a step whose label changed in v3 returns only v3+ rows;
  - a re-run with the job cache sets `reused=yes`;
  - a mapped-over step gives a collection cell and `partial`;
  - mode 2: an output label added in v2 gives `Missing(not_in_version)` in v1 rows, and an `expression.json` output inlines as a value;
  - mode 3: two tool versions, filtered and unfiltered;
  - another user's invocations aren't returned;
  - a deleted history is badged.
- **Unit:** column alignment and name normalisation, as pure functions.
- **Client vitest:** table transpose, the cell renderers (link, metadata, value, missing), and the popover id fix.
- **One Playwright test:** open an invocation, select a step, open the All runs tab, and follow a row's link to the other invocation.

</details>

## Alternative Approaches

- **Per-row client fetches** (what the step card does per output today) would mean 20–100 requests per page **[client]**.
- **Matching by uuid, with label/position fallbacks** **[client]**: uuids are lost on workflow rename, shared import and editor paste, and fallbacks need a `matched_by` badge that explains guesses to users. Label-only is predictable and the user controls it. **Position** breaks when a step is inserted.
- **Three separate tables and components**, one per mode, would triple the work and still not give side-by-side diffing **[chat]**.
- **A row per ToolRequest for mode 3** isn't universal (legacy submissions have none), so use Job/ICJ.

## Context and follow-ups

- 🎯 #10039 (see outputs of previous invocations) asks for mode 1 from the editor, and itself names the cross-version identity problem. No other prior art turned up in searches for compare invocations, compare jobs or job comparison. Galaxy has no comparison or diff feature apart from page revisions.
- Pairs with [`rerun_single_step_from_invocation.md`](rerun_single_step_from_invocation.md): a rerun's result is exactly a new mode 1 row. 🎯 #24174 (rerun lineage) would let rows show "rerun of".
- **Later:** side-by-side diff of two rows (outputs + parameter diff; the row carries every id needed), per-node run-count badges in the graph, a per-workflow Runs page with a version picker, and mode 1 for steps *inside* subworkflows (reachable only through `WorkflowInvocationToSubworkflowInvocationAssociation`, whose `workflow_step_id` isn't indexed).

<details><summary>Side findings worth their own issues [research]</summary>

- **A rename-only workflow save regenerates every step uuid and output uuid** (`api/workflows.py:465-472` → `Workflow.copy`). An editor save of the same workflow keeps them, so the two disagree for no stated reason. No longer blocks this feature (labels only).
- **The duplicate workflow-output-label check is broken** (`managers/workflows.py:2166-2175`). It tests and records the *step* `label` instead of `output_label`, and only runs for the dict form of `workflow_outputs`, not the usual list form. The editor only lints. The result is that duplicate output labels are saved, and `to_dict` silently keeps the last.
- **`tool_version` is stripped from job API responses** (missing from `JobBaseModel` / `EncodedJobDetails`).

</details>

## Unresolved questions

1. Cell display detail was lost from the chat. Is it right that "selectable metadata element" is a per-column setting, and that value rendering covers `expression.json` only, or other small text too?
2. Endpoint: one `POST /api/comparisons/query` with a slice body, or three GETs?
3. Mode 2 unlabelled outputs: leave them out, or allow opting in with a version-unstable key?
4. Mode 3 row: one per Job/ICJ (recommended) or per ToolRequest? Include jobs run inside workflows by default?
5. Mode 3 entry: is the job page enough, or should there be a "previous runs" panel on the tool form?
6. Do the inputs columns in mode 2 include parameter inputs, or only datasets and collections?
7. Should the rename-uuid side finding go to `to_file/`? It needs a reproduction first: rename, then GET to compare step uuids. (The output-label check is being prepared as `to_file/proposed_duplicate_workflow_output_labels_accepted.md`.)
8. The file is `compare_outputs.md`, but the doc covers comparing runs (steps, outputs and tools). Rename it to `compare_runs.md`?
