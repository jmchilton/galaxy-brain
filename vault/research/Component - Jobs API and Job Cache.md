---
type: research
subtype: component
tags:
  - research/component
  - galaxy/api
  - galaxy/lib
  - galaxy/models
  - galaxy/tools
  - galaxy/collections
status: draft
created: 2026-10-30
revised: 2026-10-30
revision: 2
ai_generated: true
component: Jobs API and Job Cache
galaxy_areas:
  - api
  - lib
  - models
  - tools
  - collections
summary: "Job read path (index_query, response models, inputs/outputs/parameters_display) and job cache reuse (JobSearch, copied_from_job_id)"
sources:
  - "vault/agents/gx_research/archive/jobs_api_and_job_cache.md"
  - "https://github.com/galaxyproject/galaxy/pull/24436"
  - "https://github.com/galaxyproject/galaxy/pull/24288"
related_prs:
  - 24436
  - 24288
related_notes:
  - "[[Component - Dataset and Collection Access Checks]]"
  - "[[Component - Collection Models]]"
  - "[[Component - Job Completion Lifecycle]]"
  - "[[Component - Workflow API]]"
  - "[[PR 20935 - Tool Request API]]"
  - "[[PR 21842 - Tool Execution Migrated to api jobs]]"
  - "[[Component - Pulsar Input Staging]]"
---

# Jobs API and Job Cache

Verified against Galaxy `origin/dev` @ `65e6daff2334c8cfd4971682eecfb87f38a224be`. Line numbers are at that SHA. Paths are under `lib/galaxy/` unless they start with `client/` or `lib/galaxy_test/`.

## Scope

In scope:

- The read path for jobs: `GET /api/jobs` (`JobsService.index` and `JobManager.index_query`), `GET /api/jobs/{id}`, and the `/inputs`, `/outputs` and `/parameters_display` sub-resources.
- The response models and which fields each one actually serializes.
- The job cache: early (`Tool.completed_jobs`) and late (job wrapper) searches, `JobSearch` matching rules, `Job.copy_from_job` and `copied_from_job_id`.
- How `Job.tool_request_id` and `ImplicitCollectionJobs` group jobs.

Out of scope: job scheduling, the job handler's dispatch loop (apart from the cache-hit branch in it), runners, and job completion (see [[Component - Job Completion Lifecycle]]).

The request named `Job.copy_from`. At this SHA the method is `Job.copy_from_job` (`model/__init__.py:1873`). `copy_from` exists on HDAs and `DatasetCollection`, and `copy_from_job` calls both.

## Layers

| Layer | Symbol | Location |
|---|---|---|
| Route | `FastAPIJobs.index`, `show`, `inputs`, `outputs`, `parameters_display_by_job`, `search` | `webapps/galaxy/api/jobs.py:284, 610, 419, 436, 486, 563` |
| Service | `JobsService.index`, `show`, `get_job`, `dictify_associations` | `webapps/galaxy/services/jobs.py:145, 133, 195, 219` |
| Manager | `JobManager.index_query`, `get_accessible_job`, `_user_can_access_job` | `managers/jobs.py:203, 363, 378` |
| Cache | `JobSearch.by_tool_input`, `__search`, `_filter_jobs`, `_build_stmt_for_hda/ldda/hdca/dce` | `managers/jobs.py:443-1590` |
| Display | `summarize_job_parameters`, `summarize_job_outputs` | `managers/jobs.py:2018, 2188` |
| Model | `Job.dict_collection_visible_keys` / `dict_element_visible_keys`, `Job.to_dict`, `Job.copy_from_job` | `model/__init__.py:1786-1811, 2398, 1873` |
| Schemas | `JobIndexQueryPayload`, `JobBaseModel`, `JobSummary`, `JobDetails`; `EncodedJobDetails`, `JobAssociation`, `JobParameter` | `schema/schema.py:1982, 2510, 2571, 2645`; `schema/jobs.py:173, 51, 243` |

## `GET /api/jobs`

The route (`api/jobs.py:284-322`) builds a `JobIndexPayload` with `model_construct` (no validation beyond FastAPI's per-parameter parsing) and calls `JobsService.index`.

### `JobIndexQueryPayload` (`schema/schema.py:1982-1997`)

`states`, `user_details`, `user_id`, `tool_ids`, `tool_ids_like`, `date_range_min`, `date_range_max`, `history_id`, `workflow_id`, `invocation_id`, `implicit_collection_jobs_id`, `tool_request_id`, `order_by` (`create_time` | `update_time`, default `update_time`), `search`, `limit` (default 500), `offset`. `JobIndexPayload` adds `view` (`collection` | `admin_job_list`, `services/jobs.py:104-110`).

There is no `tool_version` filter.

### `JobManager.index_query` (`managers/jobs.py:203-352`)

The query starts at `select(Job)`.

**Owner scoping** (`:303-316`):

- Admins see every job. `user_id` narrows to one user, and `user_details` outer-joins `Job.user` for e-mail search.
- Non-admins get `Job.user_id == trans.user.id` (or `Job.session_id` for anonymous sessions, else `RequestParameterMissingException`) **only when none of `history_id`, `invocation_id`, `implicit_collection_jobs_id` is set**. With one of those set the owner filter is dropped, and the docstring makes the caller responsible for checking each job.
- `workflow_id` and `tool_request_id` don't drop the owner filter.

**Filters** (`:318-328`). Each list filter ORs its values (`build_and_apply_filters`, `:221-230`):

- `states` → `Job.state ==`.
- `tool_ids` → `Job.tool_id ==`.
- `tool_ids_like` → `Job.tool_id.like(pattern)`. The pattern is passed through unescaped, so `_` and `%` are wildcards. Tool Shed ids contain `_`.
- `date_range_min` / `date_range_max` → compare **`update_time`**, not `create_time`.
- `history_id` → `Job.history_id ==`; `tool_request_id` → `Job.tool_request_id ==`.

**Workflow and ICJ joins** (`:330-341`):

- `workflow_id` or `invocation_id` → `add_workflow_jobs()` (`:232-254`). It joins `WorkflowInvocationStep` twice and UNIONs the results: once directly (`WorkflowInvocationStep.job_id`), once through `ImplicitCollectionJobsJobAssociation` to the step's `implicit_collection_jobs_id`. Because of the UNION, ordering uses the subquery's columns (`sq.c`). The code comments that SQLite rejects `Job.foo` there.
- `implicit_collection_jobs_id` → join `ImplicitCollectionJobsJobAssociation` for that ICJ.

**Search** (`:256-301`): `tool:`/`t:` always; `user:`/`u:` only with `user_details`; `runner:`/`handler:` only for admins. Raw text matches the same columns.

**Ordering and paging** (`:345-352`): `create_time DESC` or `update_time DESC`, with no tiebreaker column. Then `offset`/`limit`. Rows with equal timestamps have no stable order across pages. The method returns a `ScalarResult` and doesn't count.

### `JobsService.index` (`services/jobs.py:145-178`)

1. Non-admins can't use `admin_job_list`, `user_details`, or another user's `user_id` (`_check_nonadmin_access`, `:180-193`).
2. If `invocation_id`, `implicit_collection_jobs_id` or `history_id` was given, every returned job must pass `security_check(trans, job.history, check_accessible=True)`. The first failure raises `ItemAccessibilityException` for the whole request; jobs aren't filtered out one by one.
3. Each job is serialized with `job.to_dict(view.value, system_details=is_admin)`. `admin_job_list` adds `decoded_job_id`, and `user_details` adds `user_email` and `user_id`.

### Open PR #24288 (not on `dev`)

[#24288](https://github.com/galaxyproject/galaxy/pull/24288) ("Add jobs panel to activity bar", open against `dev`) changes `index_query` and `JobsService.index` to return `(rows, total)` and adds a `total_matches` response header. Every `GET /api/jobs` then runs one extra `COUNT(*)`. See `vault/repositories/galaxy/reviews/active/24288/learning_galaxy.md`.

## Response models and what they actually serialize

`Job.to_dict` (`model/__init__.py:2398-2461`) starts from the `Dictifiable` key lists:

- `dict_collection_visible_keys` (`:1786-1796`): `id`, `state`, `exit_code`, `update_time`, `create_time`, `galaxy_version`, `tool_id`, `tool_version`, `history_id`.
- `dict_element_visible_keys` (`:1797-1811`): the same plus `command_version`, `copied_from_job_id`, `user_id`, `implicit_collection_jobs_id`.
- `system_details` (admins) adds `external_id`, `command_line`, `traceback`, `handler`, `job_runner_name`. `admin_job_list` adds `user_email`, `info`, `session_id`, `remote_host`.
- The `element` view adds `params` (every `JobParameter` row, minus names that are also dataset inputs), `inputs` and `outputs` (HDA and LDDA associations only, as `{id, src, uuid}`), and `output_collections` (`{id, src: "hdca"}` per `JobToOutputDatasetCollectionAssociation`).

FastAPI then validates the dict against a Pydantic response model. `Model` (`schema/schema.py:345-348`) doesn't set `extra`, so **keys the model lacks are dropped**:

| Model | Fields (beyond its parent) | Used by |
|---|---|---|
| `JobBaseModel` (`schema/schema.py:2510`) | `id`, `history_id`, `model_class`, `tool_id`, `state`, `exit_code`, `create_time`, `update_time`, `galaxy_version` | `InvocationStep.jobs` (`schema/invocation.py:426`), `JobImportHistoryResponse` |
| `JobSummary` (`:2571`) | `external_id`, `handler`, `job_runner_name`, `command_line`, `user_email`, `user_id` | Index collection view |
| `EncodedJobDetails` (`schema/jobs.py:173`) | `command_version`, `params`, `inputs`, `outputs`, `copied_from_job_id`, `output_collections`, `user_id`, `implicit_collection_jobs_id` | `GET /api/jobs/{id}`, `POST /api/jobs/search` |
| `ShowFullJobResponse` (`api/jobs.py:222`) | stdout/stderr variants, `job_messages`, `dependencies`, `job_metrics` | `GET /api/jobs/{id}?full=true` |
| `JobDetails` / `JobFullDetails` (`schema/schema.py:2645, 2727`) | decoded-id `inputs`/`outputs`, required stdout fields | **No Python references at this SHA** |

Consequences:

- **`tool_version` is never returned** by `GET /api/jobs` or `GET /api/jobs/{id}`, although both `to_dict` views include it. No model in the chain declares it. `client/src/components/JobInformation/JobInformation.vue:93-97` reads it through an `"tool_version" in job.value` cast and a comment that wonders why. Admin `traceback` is dropped the same way.
- **`copied_from_job_id` appears on show and search only.** It is in `dict_element_visible_keys` and `EncodedJobDetails`, but not in the collection key list or `JobSummary`. A job list can't show a reused flag without an extra show call per job.
- The index route's return type is the union `ShowFullJobResponse | EncodedJobDetails | JobSummary` (`api/jobs.py:305`). Collection-view dicts lack the required `params`, so in practice they validate only as `JobSummary`.

**Proposed on the `compare_runs` branch (not on dev).** Add `tool_version` to `JobBaseModel` and `copied_from_job_id` to `JobSummary` and to `Job.dict_collection_visible_keys`. Add a `tool_versions` filter to `JobIndexQueryPayload` / `index_query`. Derive `reused` (`no` / `partial` / `yes`) from `copied_from_job_id` over a job or ICJ. Mode 3 pages through its own submission-unit query, not `index_query`, because `index_query` limits by Job rows and one ICJ can fill a page. See `vault/repositories/galaxy/branches/active/compare_runs/implementation_plan.md` (D8, D14).

## Job sub-resources

### Access

Every `/api/jobs/{id}/...` read route goes through `JobsService.get_job(job_id=...)` → `JobManager.get_accessible_job` (`services/jobs.py:195-217`, `managers/jobs.py:363-391`). That allows the owner (or the owning anonymous session), admins, and anyone who can access all of the job's outputs or, failing that, the job's history. [[Component - Dataset and Collection Access Checks]] has the full rule.

The decision is made once, for the job. The items these routes return (input ids, output ids, the `hid`/`name` of data parameters) aren't re-checked against the caller one by one.

The deprecated `/api/datasets/{dataset_id}/parameters_display` and `/metrics` routes instead check the **dataset** (`hda_manager.get_accessible`) and then return its `creating_job` with no job-level check (`services/jobs.py:204-214`). The `job_parameters_input_access_25.1` branch record tracks per-input handling for `parameters_display`.

### `GET /api/jobs/{id}/inputs` (`api/jobs.py:419-431`)

- Reads only `job.input_datasets` and `job.input_library_datasets` through `__dictify_association` (`services/jobs.py:225-232`).
- Each row is `{name, dataset: {src: "hda"|"ldda", id}}`: id only, with no `hid`, `name` or state.
- **Collection inputs are missing.** `input_dataset_collections` (HDCA) and `input_dataset_collection_elements` (DCE) are never read. A tool mapped over or reducing a collection shows its element HDAs only if they were also recorded as dataset inputs. `_record_inputs` (`tools/actions/__init__.py:1053-1111`) records an HDCA or DCE input as a collection association, and records adapter parts and the expanded `inp_data` HDAs as dataset associations.
- An unset optional data input is recorded as a `JobToInputDatasetAssociation` with no dataset (`tools/actions/__init__.py:294`, `:1128-1131`). `__dictify_association` then builds `JobAssociation(dataset=None)`, which fails validation. See `research_issues/jobs-inputs-endpoint-unset-optional-input.md`.

### `GET /api/jobs/{id}/outputs` (`api/jobs.py:436-451`)

- `output_datasets` and `output_library_datasets` become `JobOutputAssociation {name, dataset: {src, id}}`.
- `output_dataset_collection_instances` become `JobOutputCollectionAssociation {name, dataset_collection_instance: {src: "hdca", id}}` (`services/jobs.py:234-246`).
- `output_dataset_collections`, the `JobToImplicitOutputDatasetCollectionAssociation` rows that point at a bare `DatasetCollection` (`model/__init__.py:2918`), are not returned. A mapped element job's part of the implicit output exists only there and through its ICJ.

### `GET /api/jobs/{id}/parameters_display` (`api/jobs.py:486-500`)

`summarize_job_parameters(trans, job)` (`managers/jobs.py:2018-2172`) reloads the tool by `job.tool_id`, `job.tool_version` and dynamic-tool uuid, then calls `tool.get_param_values(job)`. If that raises, it retries with `ignore_errors=True` and sets `has_parameter_errors`. If the tool is missing it returns no parameters and `has_parameter_errors: true`.

`inputs_recursive` emits `{text, depth, value, notes}` rows:

- Repeats flatten.
- Sections and conditionals emit a header row; a conditional's value is its active case.
- Upload groups show "N uploaded datasets".
- Parameters added after the job ran get the note "not used (parameter was added after this job was run)".
- `data`/`data_collection` values become lists of `{src: "hda", id, hid, name}`, `{src: "hdca", id, hid, name}` or `{src: "dce", id, name: element_identifier}`. `None` stays `None`, and anything else raises.
- The response model `JobParameter.value` (`schema/jobs.py:254`) is `list[EncodedJobParameterHistoryItem | None] | float | int | bool | str | None`. `EncodedJobParameterHistoryItem` (`schema/schema.py:2636-2638`) requires `name`; `hid` is optional.

`outputs` comes from `summarize_job_outputs` (`:2188-2212`): HDA, LDDA and HDCA output associations keyed by output name, each `{label, value: {src, id}}`. Labels are rendered with `tool.render_output_label`, and rendering errors are swallowed. Implicit `DatasetCollection` outputs aren't included here either.

Consumers include `client/src/components/JobParameters/` and the `job_parameters` Markdown directive (`markdown_util.handle_job_parameters`), which formats `{hid}: {name}`.

## Job cache

Turned on per request:

- `POST /api/jobs` `use_cached_jobs` (`services/jobs.py:88, 297`) → `QueueJobs.use_cached_jobs` → `JobSubmitter.queue_jobs` (`managers/jobs.py:2333`).
- Legacy `POST /api/tools` `use_cached_job`.
- Workflow invocations `use_cached_job` (`workflow/run_request.py:343`, stored as a meta parameter at `:678`, read back at `:719-720` for subworkflows).

Each path ends in `Tool.completed_jobs` and also writes `__use_cached_job__` into the job's parameters (`tools/__init__.py:2408-2409`, `workflow/modules.py:3341-3342`, `tools/execute.py:298-299`).

### Two searches

**Early search, at submission.** `Tool.completed_jobs` (`tools/__init__.py:2323-2346`) runs `JobSearch.by_tool_input` once per expanded parameter combination, if the user is logged in. It passes `tool_version=self.version` and `require_name_match = (__when_value__ is not False)`.

On a hit, the tool action:

- reuses the old output's `Dataset` instead of creating one (`tools/actions/__init__.py:635-642`);
- skips permission setup (`:661`);
- copies blurb, peek and metadata (`:685-688`);
- calls `job.set_copied_from_job_id(completed_job.id)` (`:821-822`).

The job is still created and queued. When the handler picks it up, it sees `copied_from_job_id`, calls `job.copy_from_job(copied_from_job)` (state, stdout/stderr, metrics, `tool_version`, `tool_state`, …), runs non-immediate post-job actions, and never dispatches it (`jobs/handler.py:511-521`).

**Late search, in the job wrapper.** After `tool_evaluator.build()` renders the command (`jobs/__init__.py:1426-1458`), and only if `use_cached_job` is set and the evaluator saw no `$input.name` read (`consumes_names`), it searches again with `require_name_match=False`.

- `consumes_names` is set by `DatasetFilenameWrapper.__getattr__("name")` (`tools/wrappers.py:561-563`).
- If the command read `$input.element_identifier` (`consumes_identifiers`, `wrappers.py:444-451`), the job's recorded `|__identifier__` parameters are passed as `element_identifiers`, so identifiers must still match.
- On a hit it runs `copy_from_job(job_to_copy, copy_outputs=True)` and all non-immediate post-job actions, commits, and returns `False`, so the job is never submitted to a runner.

The early search is the strict one; the late search can hit when a tool never reads names.

### Candidate jobs: `_filter_jobs` (`managers/jobs.py:694-783`)

- `Job.tool_id == tool_id`.
- The job is the requesting user's, **or** sits in a published history and was not imported (`History.published` and `Job.imported IS NOT TRUE`, `:709-717`).
- `Job.copied_from_job_id IS NULL`, so a hit always points at an original job and `copied_from_job_id` never chains.
- `Job.tool_version == tool_version` when a version is given.
- Optional `history_id`.
- State in `job_state`. `by_tool_input` defaults to `(OK,)`. The `POST /api/jobs/search` route passes `payload.state`; `None` means `{new, queued, waiting, running, ok}`. A skipped request (`__when_value__ is False`) only matches `skipped` jobs.
- Non-data parameters must match `JobParameter` rows exactly as JSON. Dataset ids are wildcarded (`"id": %` LIKE).
- The result is wrapped in a CTE.

`_exclude_jobs_with_deleted_outputs` (`:785-824`) drops jobs with any deleted output HDA or HDCA. It orders by `job_id DESC`, so the newest original wins.

`__search` (`:550-692`) then checks each candidate:

1. It remaps the request's dataset ids to the ids that job used and requires an exact parameter match.
2. It requires the same number of non-`__` parameters, ignoring `chromInfo`, `dbkey` and `|__identifier__` keys.

`IGNORED_NON_JOB_PARAMETERS` (`:446`) is `__use_cached_job__`, `__workflow_invocation_uuid__`, `__when_value__` and `__input_ext`.

### Input matching

| Input `src` | Rule |
|---|---|
| `hda` (`_build_stmt_for_hda`, `:827-898`) | The job's input HDA must share the requested HDA's underlying `Dataset` (copies match). Extension and metadata must match, either now (with no update since job creation, or `dataset_version` 0 / current) or through an `HistoryDatasetAssociationHistory` row at the recorded `dataset_version`. With `require_name_match`, the HDA **name** must match too. The requested HDA must have `_state IS NULL`, and at least one side must not be deleted. |
| identifier (same builder) | If the request carries an element identifier, the job must have a `{name}|__identifier__` `JobParameter` with that JSON value. If it doesn't and `require_identifier_match` is set, jobs that recorded any `|__identifier__` for that input are excluded (`NOT EXISTS`, `:869-872`). |
| `ldda` (`:900-915`) | Same `ldda_id` only. |
| `hdca` (`:937-1194`) | Structural signature: for every leaf, `element_identifier` at each level plus `dataset_id`, aggregated into a sorted array (`array_agg` on PostgreSQL, `group_concat` on SQLite). The candidate HDCA must be in the user's or a published history and have an identical array. An empty collection matches any populated empty collection of the same type. |
| `dce` (`:1196-1590`) | A DCE pointing at a child collection uses the same signature approach, including the root identifier. A DCE pointing at an HDA matches on HDA dataset plus `element_identifier`. |

Names and identifiers are compared because output labels and content can depend on them. [PR #24436](https://github.com/galaxyproject/galaxy/pull/24436) (merged to `release_25.1` as `c0a142e8346`, on `dev` here) fixed reuse across element identifiers and dataset names, for issue #24411:

- name match now applies to mapped requests;
- the `NOT EXISTS` identifier guard;
- `consumes_identifiers` and identifier matching in the late search (`bee03e79f3c`);
- hiding workflow outputs and running all post-job actions on late hits (`a37741571e6`, `2181da6601e`).

The PR description in `vault/repositories/galaxy/branches/merged/issue_24411_job_cache_identifier_25.1/pr_description.md` still says `element_identifier` sets `consumes_names`. The merged code uses the separate `consumes_identifiers` flag.

Tools that read neither name nor identifier (e.g. `cat1`) still reuse across plain and mapped runs, and across histories. Tests: `test_use_cached_job_*` in `lib/galaxy_test/api/test_jobs.py:889-1045`, and `test_job_cache_*` / `use_cached_job` tests in `test_tools.py:1760-2110`.

### `Job.copy_from_job` (`model/__init__.py:1873-1943`)

- Sets `copied_from_job_id`.
- Copies metrics, dependencies, state, all four std streams, `command_line`, `traceback`, `tool_version`, `exit_code`, runner name and external id, and `tool_state`.

With `copy_outputs=True` (late hits only):

- Matching HDA outputs get `copy_from(out_data, include_metadata=True)` and keep their own `visible` flag, since a map-over element job hides its outputs and a plain job shows them.
- Discovered `__new_primary_file_*` outputs are copied into this job's history, unless they belong to a discovered output collection.
- Output collections are copied at the `DatasetCollection` level (`DatasetCollection.copy_from`). An HDCA on either side is unwrapped to its collection.

### What `copied_from_job_id` means

- Set: this job's outputs come from job N, which actually ran, by either search.
- `NULL` on a job that used the cache: no candidate matched.
- A copied job reports the original's `tool_version`, metrics and runner name. It has its own `create_time`/`update_time`, `history_id` and `user_id`.
- The original may belong to another user if it is in a published history.
- For a mapped run, reuse is per element job, so an ICJ can be partly reused.

At the collection level, `ExecutionTracker` (`tools/execute.py:765-806`) is supposed to set `copied_from_history_dataset_collection_association_id` on implicit output HDCAs when every element job was a cache hit. That never happens at this SHA; see `research_issues/icj-cached-hdca-copied-from-never-set.md`.

## Grouping jobs

### `Job.tool_request_id`

`Job.tool_request_id` (`model/__init__.py:1705`, indexed, nullable) points at a `ToolRequest` (`:1459`). `ToolRequest` has `history_id`, the `request` JSON, `state` and `tool_source`, and its `jobs` relationship is ordered by `Job.id`.

- `POST /api/jobs` creates the ToolRequest (`services/jobs.py:279-285`) and `execute` stamps it on every job it creates (`tools/execute.py:329-330`). For a map-over it also records `ToolRequestImplicitCollectionAssociation` rows for each implicit output HDCA (`:727-732`, model `:1494-1510`).
- Workflow tool steps mint a ToolRequest best-effort, with `state` left NULL (`workflow/modules.py:2604-2641`), and pass it to `execute` (`:3356`).
- Legacy `POST /api/tools` creates none, so those jobs have `tool_request_id IS NULL`.

One ToolRequest is one submission: one job for a plain run, N jobs for a map-over or batch.

### `ImplicitCollectionJobs`

`ImplicitCollectionJobs` (`model/__init__.py:3048`) groups the element jobs of one mapped execution:

- `ImplicitCollectionJobsJobAssociation` (`:3126`) carries `order_index`, the job's slice index, set in `ExecutionTracker.record_success` (`tools/execute.py:840-856`).
- Each implicit output HDCA points at the ICJ (`implicit_collection_jobs_id`). `Job.implicit_collection_jobs_id` (`:1760-1763`) is a property derived from the association, and `EncodedJobDetails` exposes it.
- `WorkflowInvocationStep.implicit_collection_jobs_id` links a mapped step to its ICJ. That is why `add_workflow_jobs` UNIONs the direct and ICJ paths.
- `representative_job` (`:3085`) picks the lowest `order_index`, then the lowest id.

For an API-submitted map-over, the ToolRequest and the ICJ group the same jobs. Workflow steps always have an ICJ for mapped runs, and only a best-effort ToolRequest. Legacy tool runs have only the ICJ.

## Research issues found

- `vault/agents/gx_research/research_issues/icj-cached-hdca-copied-from-never-set.md`
- `vault/agents/gx_research/research_issues/jobs-inputs-endpoint-unset-optional-input.md`
- `vault/agents/gx_research/research_issues/job-response-models-drop-tool-version.md`
- `vault/agents/gx_research/research_issues/jobs-resume-endpoint-missing-raise.md`
- `vault/agents/gx_research/research_issues/jobs-search-files-loop-reads-annotations.md`

## Related

- [[Component - Dataset and Collection Access Checks]]: `get_accessible_job` in full.
- [[Component - Collection Models]]: ICJ, HDCA, `job_source_type`.
- [[Component - Job Completion Lifecycle]]: what happens to jobs that do run.
- [[Component - Workflow API]]: invocation step job listings.
- [[Component - Pulsar Input Staging]]: the runner-only `/api/jobs/{id}/files` routes, authorized by `job_key`.
- [[PR 20935 - Tool Request API]] and [[PR 21842 - Tool Execution Migrated to api jobs]]: where `ToolRequest` and `tool_request_id` come from.
