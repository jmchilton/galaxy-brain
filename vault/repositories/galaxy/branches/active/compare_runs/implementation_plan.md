# Compare runs: implementation plan

The design lives in [plan.md](../../../../../projects/compare_runs/plan.md). This file turns it into phases that subagents can execute. Every name cited below was grepped in `WORKING_DIRECTORY` at `fd43a3c6ce8` (dev). Each phase runs as its own subagent, with a normal review in between, and each one must leave the branch green.

- **WORKING_DIRECTORY:** `/Users/jxc755/projects/worktrees/galaxy/branch/compare_runs`. Write all paths below relative to it.
- **BRANCH_DIRECTORY:** `vault/repositories/galaxy/branches/active/compare_runs/`. Optional reading there: `brain_research.md`.
- **Python style on dev:** PEP 604 (`X | None`), not `Optional`. Imports go at the top. Docstrings are one line.

## Conventions and commands

- **Python unit tests:** `source .venv/bin/activate && PYTHONPATH=lib pytest <path>`
- **API tests:** use the `/galaxy-backend-tests` skill, for example `./run_tests.sh -api lib/galaxy_test/api/test_comparisons.py[::Class::test]`. Run one at a time; the machine is shared.
- **Selenium/Playwright:** use the `/galaxy-playwright` skill, on `lib/galaxy_test/selenium/test_comparisons.py`.
- **Lint:** `.venv/bin/ruff check`, `.venv/bin/black`, `.venv/bin/isort` and `.venv/bin/mypy <changed files>` from the worktree root.
- **Client tests and lint:** run from `client/`:
  - `npm_config_use_node_version=22.20.0 pnpm exec vitest run <path>` (the version comes from `client/.node_version`). If localStorage errors appear, add `NODE_OPTIONS=--no-experimental-webstorage`.
  - `pnpm exec eslint <files>`
  - `pnpm exec prettier --check <files>`
  - `pnpm run type-check` (vue-tsc). It's slow, so run it once per client phase.
- **OpenAPI → TypeScript:** `make update-client-api-schema`.
  - It writes `client/packages/api-client/src/schema/schema.ts`. `client/src/api/schema/` only re-exports from it (`index.ts`).
  - It also regenerates the Tool Shed schema and runs `pnpm install`. Afterwards, `git status` and commit only the `api-client` `schema.ts` hunk.
  - Never hand-edit `schema.ts`.
- **Navigation selectors:** after editing `client/src/utils/navigation/navigation.yml`, run `make update-navigation-schema`. That regenerates `client/src/utils/navigation/schema.ts`, which is tracked.
- **Commits:** end every commit with the Claude `Co-Authored-By` trailer. Commits whose message starts "Baseline tests" stay first through every rebase.

## Cross-cutting decisions

The first two columns below are the decisions themselves. Items marked ❓ are repeated under Design questions.

| # | Decision | Why |
|---|---|---|
| D1 | Routes take the **StoredWorkflow** id, plus an optional `instance: bool = False` resolved through `WorkflowsManager.get_stored_accessible_workflow(trans, id, by_stored_id=not instance)`. This is the same convention as `get_versions` and `invocation_counts` in `services/workflows.py`. The echoed `query.workflow_id` is always the normalised StoredWorkflow id. | The step card only holds the invocation's Workflow id. `workflowStore.getStoredWorkflowIdByInstanceId` usually has the stored id, and `instance=true` covers the case where it doesn't. |
| D2 | `version` is **0-based** on the wire, matching `StoredWorkflow.version_of` and `/api/workflows/{id}/versions`. The client renders `version + 1`, as `WorkflowNavigationTitle.vue` does. `present_in_versions` uses the same base. | Matches the existing API. |
| D3 | `sort_by=create_time` sorts by **`id DESC`**. Neither `workflow_invocation.create_time` nor `job.create_time` is indexed, and `build_invocations_query` already defaults to `WorkflowInvocation.id.desc()`. `update_time` (indexed on both tables) sorts by that column. | Avoids an unindexed sort. |
| D4 | **Owner filter is always explicit in SQL.** Modes 1 and 2 use `History.user_id == trans.user.id`, through the invocation's history. Mode 3 uses `Job.user_id == trans.user.id`, **even when `history_id` is given**: `JobManager.index_query` drops the owner filter when `history_id`, `invocation_id` or the ICJ id is set (`managers/jobs.py:309-316`), and admins get every user's jobs. `total_matches` comes from `get_count` on the same filtered statement before paging. Anonymous callers get `rows=[]` with `total_matches: 0`, as `index_invocations` does. | Security, and the plan's rule that `total_matches` is counted after the filter. |
| D5 | Column `key` is `f"{role}:{name}"`, for example `input:input1` or `output:out_file1`, not the bare label. | In mode 2 an input-step label and an output label can coincide. In modes 1 and 3 a job input and output can share a name. Key and label then diverge. ❓ |
| D6 | **Query parameter names are plural and repeatable**: `output_labels`, `states`, `metadata_elements`, `tool_versions`. Use `query_parameter_as_list` (`api/common.py:259`; its alias must equal the parameter name) for `states`, `metadata_elements` and `tool_versions`. Use a plain repeatable `Query()` for `output_labels`, because labels may contain commas (see the `issue_24438_select_comma_split` branch). | plan.md writes `?output_label=` in the URL and `output_labels` in the model. ❓ |
| D7 | New files, not edits to hot files: `api/comparisons.py` (picked up by `include_all_package_routers`, `webapps/base/api.py:394`), `services/comparisons.py` and `schema/comparisons.py`. Managers stay flat, using the `workflow_extraction_*.py` precedent: `managers/comparisons.py` holds the resolvers and `managers/comparison_cells.py` holds batch loading and cell builders. Pure functions go in `managers/comparison_columns.py`. | Keeps conflicts with #24307 and #24288 small. |
| D8 | **Mode 3 does not page through `index_query`.** That method limits on Job rows, so one ICJ with 100 jobs fills a page and miscounts. The mode 3 resolver has its own submission-unit query (see Phase 2). The `tool_versions` filter is still added to `JobIndexQueryPayload`, `index_query` and `GET /api/jobs` as two additive lines, as the plan asks. | Correct pagination, with a minimal textual conflict with #24288. ❓ |
| D9 | Tool Shed id matching uses `Job.tool_id == base` OR `Job.tool_id.startswith(base + "/", autoescape=True)`. The existing `tool_ids_like` uses unescaped `.like()`, where `_` is a wildcard. A new `versionless_tool_id()` in `lib/galaxy/util/tool_version.py` sits next to `remove_version_from_guid` and `is_shed_guid`. | `remove_version_from_guid` would wrongly strip the tool segment from an id that is already versionless. |
| D10 | Mode 1 pages over **invocations of the versions that contain the label**, LEFT JOINed to `WorkflowInvocationStep`, not over `WorkflowInvocationStep` alone. | Invocation steps are created incrementally while scheduling (brain research: label follow-up). Paging over invocations gives not-yet-scheduled invocations a row with `Missing(not_run_yet)` instead of dropping them, and modes 1 and 2 share one pager. |
| D11 | `serialize_metadata` (`managers/datasets.py:739`, on `_UnflattenedMetadataDatasetAssociationSerializer`) gains an `included: Iterable[str] \| None = None` filter. Cells call it through `HDASerializer`. `MetadataFile` values are always skipped for cells. Non-scalar values are capped, for example lists of 50 or fewer items. | One reusable code path. It also makes a later fix to `?keys=metadata_x` trivial. |
| D12 | **`expression.json` inlining.** Inline only when `inline_expression_values` is set, the state is `ok`, the HDA is not purged, and `dataset.get_size()` is at most `COMPARISON_INLINE_EXPRESSION_MAX_BYTES` (a 4 KiB module constant). Read with `read_expression_json(hda)` (`workflow/modules.py:268`) wrapped in `try/except`; on failure, fall back to a Dataset cell. | `get_file_name()` can be slow or fail on non-local object stores, and without a step `read_expression_json` propagates errors. |
| D13 | No N+1 queries. Every per-object property is replaced with one batched query per page:<br>• `ImplicitCollectionJobs.representative_job`, `.job_list` and `.output_dataset_collection_instances` each issue one query per object. Use `ImplicitCollectionJobsJobAssociation` rows `WHERE implicit_collection_jobs_id IN (…)`, ordered by `order_index, job_id`, and take the first job per ICJ in Python.<br>• `StoredWorkflow.version_of` iterates all versions on every call. Build a `{workflow_id: version}` map once from `reversed(stored_workflow.workflows)`. | The plan's cost target. |
| D15 | **`row.state` and the `states` filter use the same vocabulary in each mode.** Mode 1: the step's `Job.state`. For an ICJ it is `summary_state(...)`, and the filter is `EXISTS` a member job in `states` (the same rule as mode 3). A row with no step yet has state `new` and is excluded by any filter that lacks `new`. Mode 2: `WorkflowInvocation.state`. Mode 3: job state, with the same ICJ `EXISTS` rule. `_page_invocations` therefore takes a mode-specific state predicate rather than filtering on the invocation state itself. | Otherwise the step tab would filter by invocation state while showing job state. |
| D14 | `tool_version` goes on `JobBaseModel`, and appears in both views because it is already in both `Job.dict_*_visible_keys`. `copied_from_job_id` goes on **`JobSummary` and into `Job.dict_collection_visible_keys`** (`model/__init__.py:1785`); the schema change alone does nothing. Afterwards, remove the `"tool_version" in job.value` cast in `JobInformation.vue:92-96`. | The plan's "Tool version … Add it". `copied_from_job_id` makes the cache visible in `/api/jobs` lists, including #24288's panel. ❓ |

## Models (`lib/galaxy/schema/comparisons.py`)

The sketch below is the contract shared by every phase. Phase 1 defines all three query models, so the discriminated union is complete from the start. Discriminators follow existing precedent: `AnyJobStateSummary` is discriminated on `model` (`schema/schema.py:3971`).

```python
ComparisonSortBy = Literal["create_time", "update_time"]
MissingReason = Literal["not_in_version", "skipped", "not_run_yet", "no_output"]

class ComparisonQueryBase(Model):
    limit: int = Field(25, ge=1, lt=1000)
    offset: int = Field(0, ge=0)
    sort_by: ComparisonSortBy = "create_time"
    sort_desc: bool = True
    states: list[str] | None = None
    metadata_elements: list[str] = []            # validated ^[A-Za-z_][A-Za-z0-9_]*$
    inline_expression_values: bool = True

class StepRunsQuery(ComparisonQueryBase):   kind: Literal["step_runs"] = "step_runs";   workflow_id: DecodedDatabaseIdField; step_label: str = Field(min_length=1)
class OutputRunsQuery(ComparisonQueryBase): kind: Literal["output_runs"] = "output_runs"; workflow_id: DecodedDatabaseIdField; output_labels: list[str] | None = None
class ToolRunsQuery(ComparisonQueryBase):   kind: Literal["tool_runs"] = "tool_runs";   tool_id: str; tool_versions: list[str] | None = None
                                             history_id: DecodedDatabaseIdField | None = None; include_workflow_jobs: bool = True
AnyComparisonQuery = Annotated[StepRunsQuery | OutputRunsQuery | ToolRunsQuery, Field(discriminator="kind")]

class InvocationRunRef(Model):      model: Literal["WorkflowInvocation"]; id: EncodedDatabaseIdField; state: str
class JobRunRef(Model):             model: Literal["Job"]; id: EncodedDatabaseIdField; state: str
class ImplicitCollectionJobsRunRef(Model): model: Literal["ImplicitCollectionJobs"]; id: EncodedDatabaseIdField
                                    representative_job_id: EncodedDatabaseIdField; job_count: int; states: dict[str, int]
AnyRunRef = Annotated[InvocationRunRef | JobRunRef | ImplicitCollectionJobsRunRef, Field(discriminator="model")]

class HistoryRef(Model):  id: EncodedDatabaseIdField; name: str; deleted: bool; purged: bool
class WorkflowRunVia(Model): invocation_id: EncodedDatabaseIdField; step_label: str | None; workflow_name: str | None   # mode 3 "via"

class DatasetCell(Model):    type: Literal["dataset"]; id; hid: int | None; name: str | None; extension: str | None; state: str
                             deleted: bool; purged: bool; history_id; metadata: dict[str, Any] = {}
class CollectionCell(Model): type: Literal["collection"]; id; hid; name; collection_type: str; element_count: int | None
                             populated_state: str; deleted: bool; history_id
class ValueCell(Model):      type: Literal["value"]; value: Any; source: Literal["parameter", "output_value", "expression_json"]
                             dataset_id: EncodedDatabaseIdField | None = None   # when inlined from expression.json
class MissingCell(Model):    type: Literal["missing"]; reason: MissingReason
AnyComparisonCell = Annotated[DatasetCell | CollectionCell | ValueCell | MissingCell, Field(discriminator="type")]

class ComparisonColumn(Model):
    key: str; label: str; role: Literal["input", "output", "parameter"]
    present_in_versions: list[int] | None = None   # None = every version on the page
    duplicate: bool = False                          # #24305: >1 WorkflowOutput with this label in some version
    metadata_keys: list[str] = []                    # union of scalar metadata names seen on the page (column chooser)

class ComparisonRow(Model):
    run: AnyRunRef                       # modes 1/2: invocation; mode 3: Job | ICJ
    step_job: JobRunRef | ImplicitCollectionJobsRunRef | None = None   # mode 1: the step's job/ICJ (row detail, reuse)
    subworkflow_invocation_id: EncodedDatabaseIdField | None = None    # mode 1 subworkflow steps
    via: WorkflowRunVia | None = None    # mode 3 jobs run inside a workflow
    create_time: datetime; update_time: datetime; state: str
    version: int | None = None; tool_version: str | None = None
    reused: Literal["no", "partial", "yes"] | None = None   # None when not applicable (mode 2)
    history: HistoryRef
    cells: dict[str, AnyComparisonCell]  # keyed by ComparisonColumn.key; every column present (uniform grid)

class ComparisonTable(Model):
    query: AnyComparisonQuery
    columns: list[ComparisonColumn]
    rows: list[ComparisonRow]
    tool_versions_available: list[str] | None = None   # mode 3 facet for the version filter
```

How this differs from plan.md:

- **Additions:** `hid`, `duplicate`, `metadata_keys`, `step_job`, `via`, `subworkflow_invocation_id`, `tool_versions_available`, and `ValueCell.source`/`dataset_id`.
- **Changes:** column keys are prefixed with the role (D5), and ICJ references carry state counts.

## Phase 0: Baseline tests (own commits, must pass on unmodified dev)

**Goal.** Pin the current behaviour of the code that later phases change.

**Not baselined:**
- `index_query`: D8 only adds a filter, so no existing behaviour changes.
- `WorkflowInvocationStep.vue`: #24307 rewrites its tabs, and Phase 3 adds only one lazy tab.

| Test | File | Layer | Pins |
|---|---|---|---|
| B1 | `lib/galaxy_test/api/test_jobs.py`: `test_index_and_show_job_field_sets` | API | The **exact key sets** dev returns for one `cat1` job: `GET /api/jobs?history_id=…` (collection view), and `GET /api/jobs/{id}` with and without `full=true`. **Run it first and record what is actually returned.** The index response model is the union `ShowFullJobResponse \| EncodedJobDetails \| JobSummary`, so do not assume which fields survive. Expected: `tool_version` is absent from both. `copied_from_job_id` is present on show and absent on index. |
| B2 | `client/src/components/Common/DatasetPopoverLink.test.ts`: two new cases | vitest | (a) The link's `id` equals the `GPopover` `target` prop. Select the link with `findComponent(RouterLinkStub)` or `a.text-monospace`, never `#storage-run-item-dataset-…`, so the test survives the id fix. (b) The link text is the dataset id and the route is `/datasets/{id}/details`. Do not pin the id string or the collision. |
| B3 | `test/unit/app/managers/test_HDAManager.py`: `test_serialize_metadata_tabular_keys` | unit | The key set `self.hda_serializer.serialize_metadata(hda, "metadata")` returns for a real tabular HDA built through `_create_vanilla_hda(extension="tabular")`. This keeps D11's `included=None` path identical. |

**Commands.**
- B1: `/galaxy-backend-tests`, `./run_tests.sh -api lib/galaxy_test/api/test_jobs.py::TestJobsApi::test_index_and_show_job_field_sets`.
- B2: vitest on `src/components/Common/DatasetPopoverLink.test.ts`.
- B3: pytest on that file with `-k serialize_metadata`.

**Commits.**
1. `Baseline tests for job index/show response fields`
2. `Baseline tests for DatasetPopoverLink link/popover wiring`
3. `Baseline tests for HDA metadata serialization`

**Acceptance.** All three pass on unmodified dev. The diff contains test files only.

## Phase 1: Backend core and mode 1 (`step_runs`)

**Goal.** Ship `GET /api/workflows/{workflow_id}/step_runs`, the shared models, the pager, the cell builder, and the regenerated client schema.

### Files

- **New** `lib/galaxy/schema/comparisons.py`: the models above.
- **New** `lib/galaxy/managers/comparison_columns.py`: pure functions with no DB access.
  - `normalise_io_name(name) -> str`. `__new_primary_file_{name}|…__` folds to `name`, and `name|__part__|…` folds to `name`. This mirrors `model/__init__.py:1904-1913` and `tool_util/parser/output_objects.py:531-541`.
  - `align_columns(declared: dict[int, list[ColumnSpec]], newest_version: int) -> list[ComparisonColumn]`. Orders columns by the newest version; columns found only in older versions go last with `present_in_versions` set; duplicates are flagged.
  - `missing_reason(column_in_version, step_state, job_state, run_terminal) -> MissingReason`.
  - `reused_state(copied: int, total: int) -> Literal["no", "partial", "yes"]`.
  - `summary_state(states: dict[str, int]) -> str`: the precedence for ICJ rows. Check whether one already exists before writing it: the client has `JobStateSummary` and the server has `summarize_invocation_jobs`.
- **New** `lib/galaxy/managers/comparison_cells.py`: `ComparisonCellBuilder`, which takes `sa_session`, `HDASerializer` and `IdEncodingHelper`.
  - `load_hdas(ids)` and `load_hdcas(ids)` each run one query, with `joinedload` on `dataset` and `collection`.
  - `dataset_cell(hda, metadata_elements)` follows D11 and D12. `collection_cell(hdca)` builds the collection cell.
  - `job_io(job_ids)` batch-loads `JobToInputDatasetAssociation`, `JobToInputDatasetCollectionAssociation`, `JobToInputDatasetCollectionElementAssociation`, `JobToOutputDatasetAssociation`, `JobToOutputDatasetCollectionAssociation` and `JobToImplicitOutputDatasetCollectionAssociation` by `job_id IN`.
  - `icj_io(icj_ids)` returns the output HDCAs (`HistoryDatasetCollectionAssociation.implicit_collection_jobs_id IN`, keyed by `implicit_output_name`) and the mapped inputs (`ImplicitlyCreatedDatasetCollectionInput.name` → `input_dataset_collection`). Non-mapped inputs come from the representative job's `job_io`.
  - `job_reuse(job_ids, icj_ids)` uses one grouped query over `Job.copied_from_job_id IS NOT NULL`.
  - Modes 1 and 3 share this module.
- **New** `lib/galaxy/managers/comparisons.py`: `ComparisonsManager`, which takes `sa_session`, `WorkflowsManager` and `ComparisonCellBuilder`.
  - `_version_map(stored_workflow) -> dict[workflow_id, int]` (D13).
  - `_page_invocations(trans, workflow_ids, query) -> (rows, total)` runs `select(WorkflowInvocation, History).join(History)` with:
    - `WorkflowInvocation.workflow_id.in_(workflow_ids)`;
    - `History.user_id == trans.user.id`;
    - an optional state predicate passed in by the mode (D15);
    - `get_count` before ordering and paging. Reuse `get_count` from `managers/workflows.py:2839`; don't add a sixth copy. #24288 adds one to `managers/base.py`; switch to it after that lands.
  - `step_runs(trans, query: StepRunsQuery) -> (ComparisonTable, total)`:
    1. Load `select(WorkflowStep.id, WorkflowStep.workflow_id).join(Workflow).where(Workflow.stored_workflow_id == sw.id, WorkflowStep.label == step_label)`.
    2. No match raises `ObjectNotFound`.
    3. Page the invocations of those `workflow_id`s.
    4. LEFT JOIN `WorkflowInvocationStep` on `(workflow_invocation_id, workflow_step_id)`, which is indexed.
    5. Batch-load the step outputs (`WorkflowInvocationStepOutputDatasetAssociation` and `…CollectionAssociation`, keyed by `output_name`), the job or ICJ, the representative jobs and `job_io`.
    6. Columns: inputs are the union of normalised job input names, and outputs are the union of step output names. Every row gets every key, with a Missing cell where absent (rule in Phase 2).
    7. `subworkflow_invocation_id` comes from `WorkflowInvocationToSubworkflowInvocationAssociation` on `(workflow_invocation_id, workflow_step_id)`.
  - **Lazy-load audit.** API tests run against a separate server process, so they cannot count statements. Instead, write `test/unit/app/managers/test_ComparisonsManager.py` on `GalaxyDataTestApp().model.session`, following `test_JobConnectionsManager.py`, which already imports `sqlalchemy.event`.
    - Hand-build a minimal fixture: a `StoredWorkflow` with 2 `Workflow` versions, each with a labelled `WorkflowStep`; N `WorkflowInvocation`s with `History(user=…)`; and `WorkflowInvocationStep` rows with a `Job` and output HDAs.
    - Count statements with `event.listen(session, "do_orm_execute", …)` for N=1 and N=5, and assert they are equal.
    - If building the fixture costs more than an hour, downgrade the check to a SQL-echo log (`echo=True`) in the debrief and say so.
- **New** `lib/galaxy/webapps/galaxy/services/comparisons.py`: `ComparisonsService(ServiceBase)`. It resolves the stored workflow (D1), checks anonymous callers (D4), calls the manager, and returns `(ComparisonTable, total)`.
- **New** `lib/galaxy/webapps/galaxy/api/comparisons.py`: `router = Router(tags=["comparisons"])` and an `@router.cbv` class with `service: ComparisonsService = depends(ComparisonsService)`.
  - Add a shared dependency `comparison_query_params(...)`. It declares the base `Query` parameters once and follows the `query_serialization_params` / `get_filter_query_params` dependency precedent.
  - `GET /api/workflows/{workflow_id}/step_runs` takes `step_label`, `instance` and the base parameters. It sets `response.headers["total_matches"]` and returns `ComparisonTable`.
- **Modify** `lib/galaxy/webapps/galaxy/fast_app.py` `api_tags_metadata`: add `{"name": "comparisons", …}`.
- **Modify** `lib/galaxy/managers/datasets.py` `serialize_metadata`: add `included=` (D11).
- **Regenerate** `client/packages/api-client/src/schema/schema.ts`.

### Tests first (red to green)

**Step 0: probe the real association names.** Do this before writing any normalisation fixture. Add API test `test_io_names_probe`, kept as a regular test that asserts the shapes it finds. It runs:
- `cat1` with a repeat (`queries_0|input2`);
- `multi_data_param` (a multiple data parameter);
- `multi_output_assign_primary` or `multi_output` (discovered `__new_primary_file_`);
- `cat1` mapped over a list (an ICJ).

Read the names through `GET /api/jobs/{id}?full=true`. Then write the unit fixtures from what it shows. Brain research says invented fixtures passed while the browser failed.

**Unit tests** in `test/unit/app/managers/test_comparison_columns.py`:
- `normalise_io_name` cases, taken from the probe;
- `align_columns`: newest-first order, old-only columns last with `present_in_versions`, duplicate flag;
- `missing_reason` truth table;
- `reused_state(0, 3) == "no"`, `(1, 3) == "partial"`, `(3, 3) == "yes"`;
- `versionless_tool_id` (D9), in a new `test/unit/util/test_tool_version.py`. No such file exists; `remove_version_from_guid` is only exercised indirectly, in `test/unit/workflows/test_modules.py`.

**API tests** in the new `lib/galaxy_test/api/test_comparisons.py`. Use `WorkflowPopulator.run_workflow(..., invocations=2)` (`populators.py:3051`, returns `RunJobsSummary`) for the first runs. For edits use `export_for_update` / `update_workflow`, or `refactor_workflow` with `update_step_label`. For the next run use `invoke_workflow_and_wait(workflow_id, request=summary.workflow_request)`.

1. **Three rows.** A two-step `cat1` workflow (labels `first_cat`, `second_cat`) runs twice. Then insert a step (v1) and run once more. `cat1` has no scalar parameter, only `input1` and `queries|input2`. Where a parameter change is wanted, add a `multiple_versions_changes` step and change its `inttest`.
   - `step_runs?step_label=second_cat` returns 3 rows, newest first, with versions `[1, 0, 0]`.
   - The `total_matches` header is `"3"`.
   - Input and output cells are `DatasetCell` with `hid` and `name`.
2. **Rename.** Rename the workflow (`refactor_workflow` with `update_name`) and run it. Rows are still found.
3. **Label change.** Relabel a step in v2. The new label returns only rows from v2 on, and the old label returns only rows before v2.
4. **Errors.** An empty `step_label` gives 400. A label in no version gives 404.
5. **Owner filter.** Share or publish the workflow (`share_with_user` / `make_public`), and have `_different_user()` run it twice.
   - The owner's call returns only the owner's rows, and `total_matches` excludes the other user's runs.
   - The other user sees only their 2 runs.
6. **Deleted history.** Delete the history of one run. Its row has `history.deleted == True` and is still returned.
7. **Paging.** `limit=1&offset=1` returns 1 row, and `total_matches` is still 3.
8. **`instance=true`.** Pass the invocation's `workflow_id`. The response has the same rows, and `query.workflow_id` is the **encoded** stored id.
9. **Metadata.** `metadata_elements=data_lines` puts `cells["output:out_file1"].metadata == {"data_lines": N}`, and `"data_lines" in column.metadata_keys`.
10. **Cache.** A rerun with `use_cached_job=True` gives the new row `reused == "yes"`. Reuse the input-copy pattern from `test_workflow_rerun_with_use_cached_job` (`test_workflows.py:9000`).
11. **Mapped step.** A `cat1` step mapped over a list gives a `CollectionCell` on output and input, `step_job.model == "ImplicitCollectionJobs"` and `job_count == 2`.
    - `partial`: rerun over a superset list with the cache on. If the cache doesn't hit per element, keep only the `yes` case and record why.
12. **Not scheduled yet.** Assert `Missing(not_run_yet)` where an invocation has no step row yet, if that is reliably reproducible: for example, a pause step before the target step. If not, cover it in the unit truth table only.
13. **Anonymous.** An anonymous caller gets `[]` with `total_matches: 0`.

### Commits
1. `Add comparison table models and column alignment helpers` (schema, pure module and unit tests)
2. `Allow filtering serialized dataset metadata by name` (D11, with B3 still green)
3. `Add step_runs comparison endpoint` (manager, cells, service, API and API tests)
4. `Regenerate client API schema`

### Acceptance
- Unit and API tests are green.
- `mypy` is clean on the new files, and lint is clean.
- No N+1: the statement count is constant across 1 and 5 rows.
- `schema.ts` contains `ComparisonTable`, and no Tool Shed schema churn is committed.

## Phase 2: Modes 2 and 3 backend

**Goal.** Add `GET /api/workflows/{workflow_id}/output_runs` and `GET /api/tool_runs`, plus the job model fields and the `/api/jobs?tool_version=` filter.

### Files

**`managers/comparisons.py` gains `output_runs`.** It reuses `_page_invocations`, without the step join, over all versions.

- **Batch loads** by `workflow_invocation_id IN`:
  - `WorkflowInvocationOutputDatasetAssociation` and `WorkflowInvocationOutputDatasetCollectionAssociation`, joined to `WorkflowOutput.label`;
  - `WorkflowInvocationOutputValue` (`.value`);
  - `WorkflowRequestToInputDatasetAssociation`, `WorkflowRequestToInputDatasetCollectionAssociation` and `WorkflowRequestInputStepParameter` (`.parameter_value`), joined to `WorkflowStep.label`.
- **Declared columns per version** come from `WorkflowOutput.label` and the labels of input steps (`WorkflowStep.type` in data_input, data_collection_input or parameter_input), for the versions on the page only.
  - Feed them to `align_columns`.
  - Parameter inputs get `role="parameter"` and a `ValueCell(source="parameter")`.
  - `output_values` give a `ValueCell(source="output_value")`. The `{"__class__": "NoReplacement"}` sentinel (`tools/parameters/workflow_utils.py:5`) becomes `Missing(skipped)`.
- **Duplicates:** when a version declares more than one `WorkflowOutput` with the same label, set `column.duplicate = True`. The cell holds the first output by `WorkflowOutput.id`.
- **Filtering:** `output_labels` filters columns only. Unlabelled outputs and inputs are never columns.
- **`expression.json`:** outputs with this extension and `inline_expression_values` become `ValueCell(source="expression_json", dataset_id=…)` (D12).

**`managers/comparisons.py` gains `tool_runs` (D8).**

1. `base = versionless_tool_id(query.tool_id)`.
2. **Filtered jobs:** `select(Job.id, icjja.implicit_collection_jobs_id, icjja.order_index)`, OUTER JOINed to `ImplicitCollectionJobsJobAssociation`, where:
   - `Job.user_id == me` (always, per D4);
   - the tool matches (D9);
   - optional `Job.tool_version.in_(tool_versions)`;
   - optional `Job.history_id == history_id`.
3. **Submission unit:** keep plain jobs, plus the representative job of each ICJ (lowest `order_index`, then `job_id`). In SQL, use `NOT EXISTS` with a sibling that has a lower `(order_index, job_id)`; a `row_number()` window also works on SQLite ≥ 3.25 and Postgres.
4. **States:** a plain job matches on `Job.state`. An ICJ row matches if `EXISTS` a member job in the requested states. Document this.
5. **`include_workflow_jobs=False`:** add `NOT EXISTS (WorkflowInvocationStep WHERE job_id = rep.id OR implicit_collection_jobs_id = icj_id)`.
6. **Ordering and count:** count on this statement. Order by `Job.id DESC` or `Job.update_time` (D3), then page.
7. **Rows:** use `JobRunRef`, or `ImplicitCollectionJobsRunRef` with state counts from one grouped query (or reuse `fetch_job_states`, `managers/jobs.py:1747`). Batch `via` from `WorkflowInvocationStep` and `WorkflowStep.label` by job or ICJ id. Cells come from `job_io` / `icj_io`.
8. **Facet:** `tool_versions_available` comes from `select(distinct(Job.tool_version))` with the same user and tool predicates.

**Missing cells in modes 1 and 3.** Give a missing name `not_in_version` only when no row with the same `tool_version` (mode 3) or workflow `version` (mode 1) has it. Otherwise:
- a missing output gives `no_output`, or `not_run_yet` while the job is non-terminal;
- a missing input gives `no_output`. ❓ An optional input that was not provided might deserve its own `not_provided` reason.

**Other changes.**
- `schema/schema.py`: add `tool_version: str | None` to `JobBaseModel`, and `copied_from_job_id: EncodedDatabaseIdField | None` to `JobSummary`. Remove the now-redundant `copied_from_job_id` from `EncodedJobDetails` (it inherits). Add `tool_versions: list[str] | None = None` to `JobIndexQueryPayload`.
- `model/__init__.py`: add `"copied_from_job_id"` to `Job.dict_collection_visible_keys`.
  - This affects every collection-view caller. Check that each one encodes the id:
    - `services/jobs.py:170` goes through a Pydantic model, so it is encoded;
    - `services/tools.py:451` passes through `encode_all_ids(rval, recursive=True)` at line 475, so it is encoded.
  - Grep for any other `job.to_dict(` collection-view caller and confirm none leaks a raw integer id.
- `managers/jobs.py` `index_query`: add `stmt = build_and_apply_filters(stmt, payload.tool_versions, lambda v: model.Job.tool_version == v)`, one line next to `tool_ids_like`.
- `api/jobs.py` `index`: add a `tool_versions` parameter through `query_parameter_as_list(ToolVersionQueryParam)` and pass it into `JobIndexPayload.model_construct`.
- `api/comparisons.py`: add the two endpoints.
  - `output_runs` takes `output_labels` as a plain repeatable `Query` (D6), plus `instance`.
  - `tool_runs` takes `tool_id` (required), `tool_versions`, `history_id` and `include_workflow_jobs`.
- `client/src/components/JobInformation/JobInformation.vue`: replace the `"tool_version" in job.value` cast with the typed field. Keep the `traceback` hack; it is out of scope.
- Regenerate `schema.ts`.

### Tests first

**Phase 0's B1 changes here.** Update its expected key sets: `tool_version` is added on index and show, and `copied_from_job_id` on index. This is the intended behaviour change, so the commit diff shows exactly which keys were added.

**New in `test_jobs.py`:** `test_index_tool_version_filter`. Run `multiple_versions` at `tool_version="0.1"` and `"0.2"`, as `test_jobs.py:1151` does. Filtering by one version returns only that version.

**Mode 2 tests** in `test_comparisons.py`:
1. Output label `n` is added in v1 through an `expression_forty_two` step. v0 rows get `Missing(not_in_version)`, and v1 rows get `ValueCell(42, source="expression_json")`.
2. An int parameter input `min_quality` gives `ValueCell` with `role == "parameter"`.
3. `output_labels=…` filters the columns.
4. Duplicate output labels: **unit-only**, through `align_columns`. Dev rejects them on save: `managers/workflows.py` raises `DuplicatedIdentifierException("Duplicated workflow output label …")` through `discovered_output_labels`, around line 2175. Legacy database rows can still hold duplicates (#24305), so the resolver keeps its flagging.
5. `inline_expression_values=false` gives a `DatasetCell`.
6. The owner filter, repeated briefly.

**Mode 3 tests:**
1. `multiple_versions` at 0.1 and 0.2. With no filter there are 2 rows and `tool_versions_available == ["0.1", "0.2"]`. `tool_versions=0.1` gives 1 row.
2. `cat1` mapped over a 3-element list gives **one** row (`ImplicitCollectionJobs`, `job_count == 3`), and `total_matches` counts it once.
3. `include_workflow_jobs=false` drops jobs run by an invocation. When included, those rows carry `via.step_label`.
4. Pass `history_id` of a public history owned by another user (`DatasetPopulator.make_public`, `populators.py:1808`). The response has 0 rows; this pins D4.
5. A Tool Shed-shaped id cannot be run in tests, so cover `versionless_tool_id` and the `startswith` escaping in unit tests only.

### Commits
1. `Expose tool_version and copied_from_job_id on job responses` (with the B1 update and the `JobInformation.vue` cleanup)
2. `Add tool_version filter to job index`
3. `Add output_runs comparison endpoint`
4. `Add tool_runs comparison endpoint`
5. `Regenerate client API schema`

### Acceptance
- All Phase 1 and Phase 2 API tests pass, and the touched `test_jobs.py` tests pass.
- mypy is clean.
- An `EXPLAIN` on Postgres, if available, of mode 3 and of the mode 1 pager with more than 100 invocations, pasted into the debrief. Otherwise record the SQL emitted on SQLite.

## Phase 3: Client table component and mode 1 entry

**Goal.** Build a props-only `ComparisonTable`, the cell renderers, transpose, the column chooser, lazy row detail, and the All runs tab.

### Files (new directory `client/src/components/Comparison/`)

- **`client/src/api/comparisons.ts`**: types aliased from `components["schemas"][…]`, and `fetchStepRuns`, `fetchOutputRuns` and `fetchToolRuns` through `GalaxyApi().GET`. Each returns `{ table, total }` parsed from the `total_matches` header, as `src/api/datasets.ts:63` does.
- **`comparisonTable.ts`**: pure helpers.
  - `transpose(table)`
  - `defaultDisplay(column, rows)`: `"value"` for parameter and expression columns, `"link"` otherwise, as in the mockup's `displayFor`.
  - `fieldKey(columnKey)`: GTable slot names are `cell(${key})`, so map a key such as `input:anno|ref` to a safe field key like `c0`.
  - `missingText(cell, row)`
  - `runLink(row, query)`: mode 1 gives `/workflows/invocations/{id}?step_label=<label>` (#24173's contract, ignored on dev); mode 2 gives the invocation; mode 3 gives `/jobs/{id}/view`.
- **`ComparisonTable.vue`**: **props only**.
  - Props: `table: ComparisonTable`, `transpose: boolean`, `columnDisplay: Record<string, string>`, `visibleColumns: string[]`, `currentRunId?: string`.
  - Emits: `update:transpose`, `update:columnDisplay`, `toggle-column`, `reset-columns`.
  - Uses `GTable` (`components/Common/GTable.vue`, which re-exports `@galaxyproject/galaxy-ui`) with dynamic `#[`cell(${f.key})`]` slots. The `head(key)` slot holds a per-column `GDropdown` with the choices "name + popover" / "value" / "metadata: k", where k comes from `column.metadata_keys`.
  - The meta columns (invoked, version, state, reused, history, run link) come first. `UtcDate` renders the time.
  - Use `ListHeader` (`components/Common/ListHeader.vue`) directly for show/hide columns, with `column-options`, `visible-columns`, `@toggle-column` and `@reset-columns`. That follows `DatasetList.vue:325`'s use of it, with `show-view-toggle=false`.
  - Row expansion uses GTable's `row-details` slot and `toggleDetails`, mounting `ComparisonRowDetail` only while expanded.
  - The current row gets a class through `TableItemClassMeta`.
- **`cells/ComparisonCell.vue`**: dispatches on `cell.type` and the display mode.
- **`cells/ItemPopoverLink.vue`**: **generalises `Common/DatasetPopoverLink.vue`**.
  - Props: `itemId`, `itemSrc: "hda" | "hdca"`, `label?`.
  - The DOM id comes from `useUid("item-popover-")` (`packages/ui/src/composables/uid.ts`, re-exported from `@/composables/utils/uid`), so ids no longer collide.
  - hda goes through `datasetStore` + `DatasetInformation`. hdca uses `fetchCollectionSummary` (`src/api/datasetCollections.ts:45`) + `CollectionDescription.vue`, or a `datasetCollectionStore` getter if one exists.
  - `DatasetPopoverLink.vue` becomes a thin wrapper, or switches to `useUid`, so `StorageOperationRunView.vue` is unchanged. Its existing tests that select `#storage-run-item-dataset-…` are updated in the fix commit; B2 stays green.
  - Respect the request budget from #23977: fetch only while the popover is shown, as the current component does.
- **`cells/MetadataCell.vue`, `cells/ValueCell.vue` (JSON pretty-printed when not scalar) and `cells/MissingCell.vue`**: the deleted/purged badges and `1 of N` follow the mockup.
- **`ComparisonRowDetail.vue`**:
  - A `GenericItem` (`components/History/Content/GenericItem.vue`, props `itemId` and `itemSrc`) for each output cell.
  - `<GTabs><JobDetailsTabs :job-id=…/></GTabs>`. `JobDetailsTabs` renders bare `GTab`s and must sit inside `GTabs`, as `ToolExecutionJobs.vue` and `HistoryGraphNodeBody.vue` do. For an ICJ row, use `representative_job_id` and the label "job 1 of N".
  - Mounted only while expanded, so the table does not poll N×M history items.
- **`StepRunsTab.vue`**: the container.
  - Props: `storedWorkflowId?`, `workflowInstanceId`, `stepLabel`, `currentInvocationId`. When the stored id is unknown, fall back to `instance=true`.
  - It fetches, owns state (page, transpose, display and visible columns), and paginates with `BPagination` from bootstrap-vue (as `JobStep.vue` and `DatasetList.vue` do), driven by `total`.
  - Persist display preferences per `(kind, workflow, label)` with `useUserLocalStorage` (`composables/userLocalStorage.ts`), keeping it best-effort.
  - Show a "View all in a page" link to `/comparisons?…`. The route arrives in Phase 4; until then the link can be hidden behind a constant.
- **`client/src/components/WorkflowInvocationState/WorkflowInvocationStep.vue`**: a **≤ 10-line** edit. Add one import and one
  `<GTab lazy title-item-class="invocation-step-all-runs-tab" :disabled="!stepLabel" :title="…">` containing `<StepRunsTab …/>`.
  - **`WorkflowStepTyped` has no `label`.** `WorkflowStepBase` in `schema/schema.py` declares none; this was verified. Take the label from `props.graphStep?.label` (`GraphStep extends Step`, and `workflowStepStore.ts` `Step.label`), falling back to `invocation.steps[workflowStep.id]?.workflow_step_label`. The invocation step only exists once the step is scheduled. Verify both against a live server.
  - When it is disabled, the tab title is "Label this step to compare its runs".
  - **#24307 rewrites these GTabs.** Keep the edit to a single block, and note in the debrief that the rebase needs to reapply one tab.

### Tests first (vitest)

- **`comparisonTable.test.ts`**:
  - transpose round trip;
  - uniform grid: every row has every column after transposing;
  - `defaultDisplay`;
  - `fieldKey` uniqueness;
  - `runLink` for each mode, including `step_label` encoding.
- **`cells/ItemPopoverLink.test.ts`**:
  - two instances with the same `itemId` have **distinct** ids, and each `GPopover` `target` matches its own link (red against a naive copy);
  - the hdca branch;
  - no fetch until hover or focus.
- **`cells/ComparisonCell.test.ts`**:
  - link, metadata (including the "not set" case), value, missing (each reason's text), deleted/purged badges.
- **`ComparisonTable.test.ts`**:
  - Given a fixture `ComparisonTable`, it renders the header labels with role badges and the cell types.
  - The transpose prop flips the axes.
  - Expanding a row mounts `ComparisonRowDetail`, and only then; stub it and assert the count.
  - Fixtures follow the **real API shape**: copy one response from a Phase 1 API test run into `client/src/components/Comparison/test-data/step_runs.json`.
- **`StepRunsTab.test.ts`**, using `useServerMock` from `@/api/client/__mocks__`:
  - it calls `/api/workflows/{workflow_id}/step_runs` with `step_label`;
  - it reads `total_matches`;
  - with no label it shows the disabled message.

### Commits
1. `Generalise DatasetPopoverLink into ItemPopoverLink with unique DOM ids`
2. `Add comparison table helpers and cell renderers`
3. `Add ComparisonTable component with transpose, column chooser and row detail`
4. `Add All runs tab to invocation step card`

### Acceptance
- vitest is green for `src/components/Comparison/` and `src/components/Common/DatasetPopoverLink.test.ts`.
- eslint, prettier and `pnpm run type-check` are clean.
- `WorkflowInvocationStep.vue` changes by 10 lines or fewer.
- A manual check against a dev server is optional; it can be left to Phase 4's E2E.

## Phase 4: Standalone route, mode 2 and 3 entry points, Playwright

**Goal.** Add `/comparisons?kind=…`, "Compare outputs", "Other runs of this tool", the selectors and one E2E test.

### Files
- **`client/src/components/Comparison/ComparisonView.vue`**: parses `route.query` into the matching query and kind, then shows a `Heading`, the mode-specific filters, and `ComparisonTable`. URL query parameters are the state, so pagination and filters `router.replace` the query.
  - Mode 2 adds output label chips.
  - Mode 3 adds a version select from `tool_versions_available`, an "include workflow runs" checkbox, and a state filter.
- **`client/src/entry/analysis/router.js`**: one route,
  `{ path: "comparisons", component: ComparisonView, props: (route) => ({ query: route.query }) }`.
  Add it near `workflows/:storedWorkflowId/invocations` as a single block; #24307 also edits this file.
- **`client/src/components/Workflow/StoredWorkflowInvocations.vue`**: a "Compare outputs" `GButton` linking to `/comparisons?kind=output_runs&workflow_id=<id>`. Keep `GridInvocation.vue` untouched; #24174 edits the invocation lists.
- **`client/src/components/JobInformation/JobInformation.vue`** `primaryActions`:
  - Add a `CardAction` with `id: "job-other-runs"` and the label "Other runs of this tool", linking to `/comparisons?kind=tool_runs&tool_id=<job.tool_id>`. The server strips the version (D9).
  - Gate it behind a new `includeOtherRunsLink` prop, set true in `JobDetails.vue`, so `JobDetailsTabs` inside the history graph and invocations doesn't gain it.
- **`client/src/utils/navigation/navigation.yml`**: a **new top-level `comparisons:` section** (#24307 and #24288 both edit `invocations:` and `jobs`). It holds:
  - `step_all_runs_tab`: `.invocation-step-card .invocation-step-all-runs-tab > a.nav-link`
  - `table`
  - `row(run_id)` via `data-run-id`
  - `row_link(run_id)`
  - `transpose_toggle`
  - `column_menu(key)`
  - `compare_outputs_button`
  - `other_runs_action`

  Then run `make update-navigation-schema`.
- **`lib/galaxy_test/selenium/test_comparisons.py`**, `TestComparisons(SeleniumTestCase)` with `ensure_registered = True`:
  - **Fixture:** `workflow_populator.run_workflow(WF_TWO_CAT, test_data=…, history_id=self.current_history_id(), invocations=2)`. Then make a new version with `export_for_update`, inserting a step or relabelling an unrelated one; `cat1` has no scalar parameter to change. Then `invoke_workflow_and_wait` once more.
  - **Flow:** `invocation_open_latest()` (`navigates_galaxy.py:2194`), then click a node. Copy the helpers `_click_node` and `_assert_step_card_title` from `test_workflow_invocation_graph.py:179-185`; extract them to a shared mixin only if the reviewer asks.
  - Open `comparisons.step_all_runs_tab` and wait for 3 rows. Assert the version column shows 2 and 1. Click the row link of an older invocation and assert the URL changed to that invocation id.
  - Take screenshots of the step tab, the transposed table, and the `/comparisons` mode 2 page.
  - **Do not assert on hover or popover content.** Selenium and Playwright differ on visibility (memory: opacity parity).

### Tests first
- **vitest:** `ComparisonView.test.ts` parses each `kind` from the query; an unknown `kind` shows an error alert.
- **vitest:** the `JobInformation` action appears only with the prop. Extend `client/src/components/JobInformation/JobInformation.test.js`.
- **vitest:** the `StoredWorkflowInvocations` button href.
- **E2E:** the test above, red until the tab exists. Run it once under Selenium and once under Playwright, if the skill supports both.

### Commits
1. `Add /comparisons route`
2. `Link Compare outputs and Other runs of this tool to comparisons`
3. `Add comparison selectors and E2E test`

### Acceptance
- vitest and lint are clean.
- The E2E test passes locally.
- Screenshots are saved to `BRANCH_DIRECTORY/screenshots/`.

## Phase 5: Expanded scope and polish

These are prioritised, to run after phases 0–4 are green, each as its own commit or commits with its own tests.

| Priority | Item | Effort | Risk | Notes and recommendation |
|---|---|---|---|---|
| 1 | **Side-by-side diff of two selected rows** | M | L | Uses `GTable` `selectable`. A diff panel shows cells that differ, highlighted. Parameters are diffed with `JobParameters` data from `jobParametersStore` for both jobs. All client-side. **Do it.** This is the plan's first "Later" item and the main payoff of a uniform grid. |
| 2 | **State and version filter UI in the step tab** | S | L | `states` already works per D15. A mode 1 version filter needs a `versions` query parameter, which adds 5 lines to the pager. **Do it.** |
| 3 | **CSV/TSV export of the current page** | S | L | A client `Blob` built from the table's displayed values, honouring transpose and display mode. **Do it.** |
| 4 | **Highlight changed cells against the current row** | S | L | Compare dataset `id`, value or metadata against `currentRunId`'s row, and add a CSS class. Cheap, and makes the table readable. **Do it.** |
| 5 | **ICJ "job k of N" pager in row detail** | S–M | L | Generalise `useToolExecutionJobs` / `ToolExecutionJobs.vue` to accept an ICJ id: `GET /api/jobs?implicit_collection_jobs_id=` already exists. That makes the abstraction reusable. **Do it if time allows.** |
| 6 | **Per-node run-count badges in the invocation graph** | M | M | Needs a counts endpoint: labels → run counts for the stored workflow, one grouped query. It touches the invocation graph, which #24307 also touches. **Defer.** Propose it as a follow-up PR. |
| 7 | **Mode 1 for subworkflow inner steps** | M–L | M | Needs label paths (`outer/inner`) and a walk through `WorkflowInvocationToSubworkflowInvocationAssociation`. Identity across subworkflow versions is unclear. **Defer;** it needs a design. |
| 8 | **Per-workflow Runs page with a version picker** | M | L | Mostly mode 2 plus `WorkflowVersionSelector.vue`. It overlaps `/comparisons?kind=output_runs`. **Skip.** Route to mode 2 instead. |
| 9 | **Tool-form "previous runs" panel** | M | M | Open question 2 in plan.md. **Skip** pending John. |

Recommended: items 1–4, plus 5 if time allows. Each needs vitest coverage. Item 2 also needs an API test for `versions`.

## Risks and unknowns

- **#24307 conflicts.** `WorkflowInvocationStep.vue`, `router.js` and `navigation.yml` are mitigated by the one-block edits and a new nav section. Whichever lands second rebases. Mode 1 row links rely on #24307's `?step_label=`; on dev, rows open the invocation without selecting the step.
- **#24288 conflicts.** `managers/jobs.py` (D8 adds one adjacent line), `schema.py` (`JobIndexQueryPayload` gains fields in both) and `api/jobs.py`. The conflicts are trivial. If #24288 lands first, switch `get_count` to its `managers/base.py` copy.
- **Job cache semantics:** `partial` may be hard to produce in an API test. See the job cache identifier branch (#24411): element identifiers must match.
- **Mode 3 SQL portability:** the representative-job `NOT EXISTS` or window must work on both SQLite (API tests) and Postgres (CI). Run API tests under Postgres if the skill supports it.
- **Index and response stripping:** only B1 shows which fields the union response model keeps. Phase 2 has to adapt if `JobSummary` wins the union.
- **`metadata_elements` size:** some datatypes hold large metadata lists, for example `column_names` with 10k entries. D11 caps them; confirm with `bam`/`vcf` if they are available.
- **Large pages:** at `limit=1000` with many columns the response is big. Consider capping `limit` at 200 for comparisons. ❓
- **Label source:** `workflowStep` (`WorkflowStepTyped`) has no label. Outside the graph view, `graphStep` may be absent; the label then exists only once the step is scheduled. Verify against a live server; brain research says fixtures misled before.
- **Duplicate output labels:** dev rejects them on save, so this is covered by unit tests only. #24305's "accepted by the API" claim may refer to an older code path. Check before relying on it.

## Design questions for John

1. **D5:** column keys `role:name` instead of bare labels. OK?
2. **D6:** plural, repeatable parameter names (`output_labels`, `tool_versions`, `states`, `metadata_elements`), and `output_labels` not comma-split. OK?
3. **D8:** mode 3 gets its own submission-unit query, while `index_query` only gains a `tool_versions` filter for `/api/jobs`. The alternative was a refactor extracting a filter builder from `index_query`, which would conflict with #24288. OK?
4. **D14:** also expose `copied_from_job_id` on `/api/jobs` index rows, not only on show?
5. **D1:** StoredWorkflow id plus `instance` flag (the existing convention). OK?
6. **D3:** `create_time` sorting implemented as `id DESC`. OK?
7. **Missing reasons:** add `not_provided` for optional inputs left unset, or fold them into `no_output`?
8. **Errors:** a step label in no version gives 404, and an empty label gives 400. OK?
9. **Mode 3 `states` on ICJ rows:** an ICJ matches if any member job is in a requested state. OK?
10. **Limit:** comparisons `limit` max 200, not 1000?
11. **Phase 5:** do items 1–4 (diff, filters, CSV, change highlight) and defer the graph badges and subworkflow mode 1?

## Contradicts or extends plan.md

- **Schema path:** `client/src/api/schema/schema.ts` doesn't exist. The generated file is `client/packages/api-client/src/schema/schema.ts`, produced by `make update-client-api-schema`.
- **`index_query`:** "Reuse `JobManager.index_query` filtering" doesn't work for paging, because ICJ rows would split pages (D8). Its `history_id` path also skips the owner filter (D4).
- **`tool_ids_like`:** "to span versions" over-matches, because `_` is a LIKE wildcard (D9).
- **`copied_from_job_id`:** adding it to `JobSummary` alone doesn't surface it. `Job.dict_collection_visible_keys` lacks it, while `tool_version` is in both key lists.
- **Mode 1 paging:** plan.md pages over `WorkflowInvocationStep`. This plan pages over invocations LEFT JOIN steps (D10), so `not_run_yet` rows exist.
- **Model additions taken from the mockup or needed by the UI:** `hid`, `duplicate`, `metadata_keys`, `step_job`, `via`, `subworkflow_invocation_id`, `tool_versions_available`, and role-prefixed column keys.
- **URL vs model name:** plan.md uses `?output_label=` in the URL and `output_labels` in the model. This plan uses `output_labels` (D6).
- **Unindexed sort columns:** `workflow_invocation.create_time` is unindexed, as well as `job.create_time` (the plan only mentions the job column). Both sort by id (D3).
- **Duplicate output labels:** dev already rejects them on save (`DuplicatedIdentifierException`), so plan.md's duplicate-label API test can only be a unit test.
- **Step label on the client:** `WorkflowStepTyped` has no `label`. The All runs tab takes it from `graphStep.label`, falling back to the invocation step's `workflow_step_label`.
