# Phase 0–1 review fixes + Phase 2 implementation debrief

Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/compare_runs` (branch `compare_runs`, base `fd43a3c6ce8`). Not pushed. The 4 "Baseline tests" commits are still first.

## (A) Review findings

Findings 2–10 were folded into the Phase 1 commits with `fixup!` + `rebase --autosquash`. Finding 1 is its own commit. The Phase 1 "Regenerate client API schema" commit was regenerated after the fixups, so it matches the Phase 1 models.

| # | Finding | Status |
|---|---|---|
| 1 | Cells exposing items the caller can't access | **Done**: `007ebae471c Hide comparison cells the caller can't access`. Details below. |
| 2 | `not_in_version` instead of `not_run_yet` for unscheduled rows | **Done.** The fix is at the call site: an unscheduled row counts every column as present in its version. The truth table is unchanged. `test_step_runs_not_run_yet` now bumps the version (`update_name`) before the paused run and asserts versions `(1, 0)`. It was seen red first (`not_in_version`). |
| 3 | Reuse `Job.states` / `Job.non_ready_states` | **Done.** `comparison_columns.py` uses `JobState` members from `galaxy.schema.states`, since that module is pure and avoids importing the model. `comparisons.py` uses `Job.non_ready_states`. Note: `"failed"` **is** a member of `JobState` (`schema/states.py: FAILED = "failed"`), so the reviewer's aside doesn't hold. It is kept as `JobState.FAILED`. |
| 4 | Shared field types on cells | **Done.** Details below the table. |
| 5 | `get_size(calculate_size=False)`; skip when unknown | **Done.** Inlining is skipped when `dataset.file_size is None`. A real empty file is not treated as unknown, and its read failure falls back to a dataset cell. Three cell-builder unit tests, two of them red first. |
| 6 | Mapped step over an empty list | **Done.** Details below the table. |
| 7 | `ItemRef.src` Literal; `normalise` → `normalize` | **Done.** `normalize_io_name`, plus local variables, a docstring, and the probe test docstring in Baseline commit `8e40ca9ae7c`, which stays test-only. |
| 8 | Hoist limit/offset bounds and descriptions | **Done.** `schema/comparisons.py` exports `COMPARISON_LIMIT_DEFAULT/MIN/BOUND`, `COMPARISON_OFFSET_MIN` and `COMPARISON_QUERY_DESCRIPTIONS`. Both `ComparisonQueryBase` and `comparison_query_params` use them. I tried `Annotated[int, annotated_types.Ge(1)]` first, but FastAPI drops those constraints from the query-parameter OpenAPI. |
| 9 | Pin exact `hid` / `name`; cover expression.json | **Done.** Cells are compared with `get_history_dataset_details` for the same id, along with `extension`, `state` and `tool_id`. The expression.json inline path is covered end to end by mode 2 test 1. |
| 10 | `tool_id` on mode 1 rows | **Done.** `ComparisonRow.tool_id` comes from `JobRecord.tool_id`, which is selected in the same query. Mode 3 also fills it. |

**Finding 4 details.**
- `DatasetCell.state` is `DatasetStateField` (now required).
- `history_id` is `HistoryID`.
- `CollectionCell` uses `CollectionTypeField`, `ElementCountField` and `PopulatedStateField`.
- `JobRunRef.state` is `JobState`, and `InvocationRunRef.state` is `InvocationState`.
- `ImplicitCollectionJobsRunRef` now **subclasses `ImplicitCollectionJobsStateSummary`**, which gives it `states: dict[JobState, int]` and `populated_state`.
- **Not used:** `HistoryItemBase`. It makes `hid` required and adds a required `visible`, and cells don't need either.

**Finding 6 details.**
- `load_implicit_collection_jobs` now starts from `ImplicitCollectionJobs`, with OUTER JOINs to the association and `Job`. It still runs one query. `representative` became `Optional`.
- An empty batch's row state comes from `populated_state` (ok→ok, failed→error, otherwise new), and `reused` is `None`.
- New API test `test_step_runs_mapped_over_empty_list`, seen red first (`step_job` was None).

**Finding 1 details.**
- **One choke point.** `ComparisonCellBuilder.item_cells(refs, access, metadata_elements, inline)` loads the items, runs a single batched access check, and only then builds cells. An inaccessible item becomes `MissingCell(reason="inaccessible")`, without name, hid, metadata or inlined value. Metadata keys and expression inlining run only for accessible items. All three modes go through it.
- **New reusable helpers**, one query each:
  - `GalaxyRBACAgent.accessible_dataset_ids(role_ids, dataset_ids)` (`model/security.py`). It applies the same rule as `can_access_dataset` / `datasets_are_public`: a dataset with no access rows, or one whose access roles are all among the user's. It keys on `hda.dataset_id`, because permissions live on the Dataset.
  - `HistoryManager.accessible_history_ids(user_id, history_ids)`. It applies the HDCA show rule: owner, `importable`, or shared with the user. No per-collection queries.
- **Access context.** `ComparisonAccess(user_id, role_ids, is_admin)` is built once in the service, from `trans.get_current_user_roles()`. Admins bypass the check, as the HDA and history managers do.
- **DI.** `GalaxyRBACAgent` is now registered in the app container (`app/__init__.py`, one line), so `ComparisonCellBuilder` can inject it.
- **Tests:**
  - unit tests for both helpers; the security one was seen red first;
  - the statement-count fixture now gives every row a foreign private HDA (plain) or a foreign-history HDCA (mapped), and asserts exactly `inaccessible` for those cells and non-missing for every other cell;
  - API test `test_step_runs_hides_inaccessible_items`, seen red first. The workflow invocation **copies** the other user's input into the caller's history, and the copy shares the restricted Dataset, so keying on `dataset_id` matters here.
  - The HDCA branch is covered in mode 3 by `test_tool_runs_owner_filter_and_access`: the owner unpublishes and disables the link. A mutation check that skipped the history check made that test fail.

## (B) Phase 2 commits

| SHA | Subject |
|---|---|
| `5cfebd261ac` | Expose tool_version and copied_from_job_id on job responses (B1 updated: index gains `tool_version` and `copied_from_job_id`, show gains `tool_version`; red first) |
| `a65b0375aff` | Add tool_version filter to job index (`test_index_tool_version_filter`, red first) |
| `f79938bb309` | Add output_runs comparison endpoint |
| `bcda3c6e044` | Add tool_runs comparison endpoint |
| `a2de1bf2bf8` | Regenerate client API schema |
| `7f2cd31b971` | Read typed tool_version in JobInformation |
| `28475abda1d` | Read comparison metadata keys from the datatype spec (N+1 fix, see below) |

**Job responses.**
- `tool_version` is on `JobBaseModel`. `copied_from_job_id` moved to `JobSummary`; it was removed from `EncodedJobDetails`, which inherits it. It was also added to `Job.dict_collection_visible_keys`.
- I checked every collection-view `to_dict` caller:
  - `services/jobs.py` and `JobImportHistoryResponse` go through Pydantic.
  - `services/tools.py` uses `encode_all_ids(recursive=True)`, which encodes `*_id`.
  - Invocation-step `jobs` use `get_job_attributes(Job.dict_collection_visible_keys)`, but the response model is `list[JobBaseModel]`, so `copied_from_job_id` is dropped and `tool_version` now appears. All three step routes in `api/workflows.py` return `-> InvocationStep`. `test_workflows.py::test_invocation_usage` and `::test_invocation_with_collection_mapping` both pass.
  - `api/library_datasets.py:583` encodes only `id`. Its job is always a fresh upload, so `copied_from_job_id` is None there.

**Mode 2: `GET /api/workflows/{workflow_id}/output_runs`.**
- It reuses `_page_invocations` over all versions, and the `states` filter is on invocation state.
- Declared columns come from labelled input steps and labelled `WorkflowOutput`s of the versions on the page, in step order:
  - parameter inputs get `role="parameter"` and key `parameter:<label>`;
  - outputs get `output:<label>`.
- Six batched loads by `workflow_invocation_id IN`, through one generic loop over the association columns: 3 request-input tables and 3 output tables.
- Cell rules:
  - an output label declared twice: the first `WorkflowOutput.id` wins, and `align_columns` flags the column `duplicate`;
  - the `NoReplacement` output value becomes `Missing(skipped)`;
  - `output_labels` filters columns by label, for both inputs and outputs.
- Missing reasons: `not_in_version`; `not_run_yet` while the invocation is new, ready or requires_materialization; otherwise `no_output`.

**Mode 3: `GET /api/tool_runs`.**
- It has its own submission-unit query, Job OUTER JOIN `ImplicitCollectionJobsJobAssociation`:
  - representative job = `NOT EXISTS` an earlier sibling by `(order_index, job_id)`;
  - `Job.user_id == me` always;
  - tool match: `tool_id == base OR startswith(base + "/", autoescape=True)`.
- Filters:
  - `tool_versions` and `history_id`;
  - `states`: a plain job on `Job.state`, an ICJ when `EXISTS` a member job in the requested states. The outer Job is never filtered on state.
  - `include_workflow_jobs=false`: `NOT EXISTS` a `WorkflowInvocationStep` with this `job_id` or `implicit_collection_jobs_id`.
- Rows: `JobRunRef` or `ImplicitCollectionJobsRunRef`. `via` is filled in one batched query (invocation, step label, workflow name).
- Cells: new `job_outputs` / `implicit_collection_outputs` loaders, plus the shared `_submission_inputs`.
- `not_in_version` is decided per `tool_version` on the page.
- `tool_versions_available` is sorted with `parse_tool_version`; the test pins `["0.1", "0.1+galaxy6", "0.2"]`. It ignores the version and history filters.

**Shared code.** The cell filling (`_cells`), the history ref, `_set_metadata_keys` and the job/batch inputs (`_submission_inputs`) are shared by all modes. `missing_reason` is reused in all three.

**N+1 found by EXPLAIN.**
- Without `metadata_elements`, `metadata_keys(hda)` touched `hda.metadata`, which loads the deferred `_metadata` column once per HDA: 63 statements for mode 2 on Postgres.
- Every earlier statement-count test had passed `metadata_elements`, which masked it.
- It now reads `hda.datatype.metadata_spec`, and every statement-count test runs with metadata both on and off. Red first: 3 failures, e.g. `[16, 24]`.

## Deviations

1. `/api/jobs` uses the singular alias `?tool_version=` (payload field `tool_versions`), matching `tool_id` / `tool_id_like` and the plan's Goal line. The comparison endpoints keep the plural `tool_versions` (D6).
2. Mode 2 test 1 adds output `n` with `export_for_update`, appending to the step's `workflow_outputs`. `update_output_label` only renames an existing workflow output. `expression_forty_two` is in v0 but unlabelled, so v0 rows get `not_in_version`.
3. Mode 2 column order is step order. Format2 import puts `forty_two`, which has no inputs, before `first_cat`. The test pins that.
4. Mode 2 test 1 waits for the `completed` state (`wait_for_invocation_and_completion`). It was flaky between `scheduled` and `completed`.
5. The JobInformation.vue cleanup is its own commit after the schema regen, because the typed field only exists after regen. It needed `pnpm run build` in `client/packages/api-client`; `dist` is gitignored and was stale, so `type-check` failed until it was rebuilt.
6. Extra unit coverage beyond the plan:
   - Tool Shed id matching without LIKE wildcards. A mutation to `.like()` failed it.
   - Mode 2 and mode 3 statement counts, with foreign inputs.
   - Mode 2 duplicate labels, with an ORM fixture.
7. The access check lives in the cell builder, not the manager, so no mode can skip it.
8. `psycopg2-binary` was installed into the worktree `.venv` for the EXPLAIN and Postgres runs.

## Tests run (final tree)

- **Comparison API tests on SQLite.** `GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES=true GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS=true ./run_tests.sh --skip-common-startup -api lib/galaxy_test/api/test_comparisons.py`: **18 passed**.
  - The probe, 11 mode 1 tests, 2 mode 2 tests and 4 mode 3 tests.
- **The same on Postgres 16** (docker, `GALAXY_TEST_DBURI=postgresql://…/apitests`): **18 passed**. This confirms the `NOT EXISTS` sibling, `startswith` escape and the `EXISTS` state predicates are portable.
- **`test_jobs.py`.** `… -api lib/galaxy_test/api/test_jobs.py` (whole module): **63 passed**. B1 and `test_index_tool_version_filter` had already been run individually: 1 passed each.
- **Unit tests.** `source .venv/bin/activate && PYTHONPATH=lib pytest test/unit/app/managers/test_ComparisonsManager.py test/unit/app/managers/test_comparison_columns.py test/unit/util/test_tool_version.py test/unit/app/managers/test_HDAManager.py test/unit/app/managers/test_HistoryManager.py test/unit/data/test_galaxy_mapping.py`: **134 passed, 18 skipped**. The skips are pre-existing postgres-only mapping tests.
- **Client** (from `client/`, with `npm_config_use_node_version=22.20.0`):
  - `pnpm exec vitest run src/components/JobInformation/JobInformation.test.js`: 9 passed.
  - eslint and prettier are clean.
  - `pnpm run type-check` exits 0, after rebuilding the api-client `dist`.
- **Python lint.** `ruff`, `black --check` and `isort --check` are clean on every changed `.py` file.
- **mypy** (`cd lib && ../.venv/bin/mypy <17 changed modules>`): 0 errors in touched files. The 23 remaining errors are in untouched files (stub and env issues).
- **OpenAPI lint.** `make lint-api-schema` exits 0, with only the pre-existing warnings.

## EXPLAIN (Postgres 16, docker)

The script was a throwaway in the session scratchpad. It reused the unit fixtures with `MockTrans(database_connection=postgres)`:
- N=150 invocations of a mapped step;
- 150 plain-step invocations, using a different tool id;
- 150 output-run invocations.

The listener captures every emitted statement with its parameters, then ran `EXPLAIN ANALYZE` on it. It ran twice, once normally and once with `SET enable_seqscan = off` to prove index paths exist on small tables. The key plans are pasted below (trimmed, `enable_seqscan=off`).

**Statement counts per call:**

| Call | Statements |
|---|---|
| step_runs (mapped, page 25) | 15 |
| step_runs, `states=ok`, `offset=100` | 15 |
| output_runs | 13 (63 before the N+1 fix) |
| tool_runs, plain, `include_workflow_jobs=false`, `states` | 3 (the page is empty, so loaders are skipped) |
| tool_runs, mapped batches, `sort_by=update_time` | 12 |

- **No seq scans.** With `enable_seqscan=off` there are **0 Seq Scans** across all statements; every statement has an index path. All execution times are under 0.4 ms at this size.
- **Mode 1 pager.**
  - `ix_workflow_invocation_workflow_id` + `history_pkey` nested loop, then a top-N sort on `workflow_invocation.id DESC` over that workflow's invocations.
  - The states predicate becomes hashed SubPlans. The job branch hashes `ix_job_state` matches (`state='ok'`) against the invocation steps. On a large instance, `state='ok'` matches most jobs, so this deserves a check on production-sized data. A rewrite that drives from `workflow_invocation_step.workflow_step_id` → `job_pkey` is possible if needed.
- **Mode 3 page.**
  - With `sort_by=update_time`: `Index Scan Backward using ix_job_update_time` filtered by user and tool, `Nested Loop Anti Join` on `ix_implicit_collection_jobs_job_association_implicit_co_ea04` for the sibling `NOT EXISTS`, and `Memoize` on history.
  - With id sort: `ix_job_user_id` bitmap plus a tool_id filter. The `OR tool_id LIKE 'base\/%'` stops a `tool_id` index from being used, so cost scales with the user's job count.
  - The workflow-job anti-join uses a BitmapOr of `ix_workflow_invocation_step_job_id` and the ICJ index.

### Mode 1 pager (`step_runs`, `states=ok`, `offset=100`, N=150 mapped)

```
Limit  (actual time=0.305..0.307 rows=25)
  ->  Sort  Sort Key: workflow_invocation.id DESC  (rows=125)
        ->  Nested Loop  (rows=150)
              ->  Index Scan using ix_workflow_invocation_workflow_id on workflow_invocation
                    Index Cond: (workflow_id = ANY ('{1,2}'))
                    Filter: ((hashed SubPlan 2) OR (hashed SubPlan 4) OR (hashed SubPlan 6))
                    SubPlan 2   -- step job in states
                      ->  Hash Join  Hash Cond: (job.id = workflow_invocation_step.job_id)
                            ->  Bitmap Heap Scan on job  ->  Bitmap Index Scan on ix_job_state (state = 'ok')
                            ->  Hash  ->  Bitmap Index Scan on ix_workflow_invocation_step_workflow_step_id
                    SubPlan 4   -- any ICJ member job in states
                      ->  Hash Join  Hash Cond: (job_1.id = implicit_collection_jobs_job_association.job_id)
                            ->  Bitmap Index Scan on ix_job_state
                            ->  Merge Join  (ix_workflow_invocation_step_implicit_collection_jobs_id,
                                             ix_implicit_collection_jobs_job_association_implicit_co_ea04)
                    SubPlan 6   -- step without job in states
                      ->  Index Scan using ix_workflow_invocation_step_state
              ->  Index Scan using history_pkey on history  (loops=150)
Execution Time: ~0.3 ms
```

### Mode 3 page (`tool_runs`, mapped batches, `sort_by=update_time`)

```
Limit  (rows=25)
  ->  Incremental Sort  Sort Key: job.update_time DESC, job.id DESC  Presorted Key: job.update_time
        ->  Nested Loop Anti Join            -- NOT EXISTS earlier sibling
              ->  Nested Loop Left Join
                    ->  Nested Loop
                          ->  Index Scan Backward using ix_job_update_time on job
                                Filter: (user_id = 1) AND ((tool_id = 'cat1') OR (tool_id ~~ 'cat1\/%'))
                          ->  Memoize (history.id)  ->  Index Scan using history_pkey on history
                    ->  Index Scan using ix_implicit_collection_jobs_job_association_job_id
              ->  Index Scan using ix_implicit_collection_jobs_job_association_implicit_co_ea04
                    Filter: (order_index < outer.order_index) OR (order_index = outer.order_index AND job_id < outer.job_id)
Execution Time: 0.118 ms
```

With the id sort and `include_workflow_jobs=false`, the driver is a `Bitmap Index Scan on ix_job_user_id` with a tool_id filter. The sibling anti-join is unchanged, and a second anti-join uses a `BitmapOr` of `ix_workflow_invocation_step_job_id` and the ICJ index.

## New design questions for John

1. **Admins.** Comparison cells don't hide items from admins, matching the HDA and history managers. Should admins see foreign items there too, or should comparisons apply the owner-level rule even to admins?
2. **HDCA access rule.** An HDCA is inaccessible when its history is not owned, importable or shared with the caller, which is the HDCA show rule. Its datasets may still be individually public. OK, or should a collection count as accessible when all its datasets are?
3. **Unset optional parameter inputs** render as `ValueCell(value=null, source="parameter")`, not Missing. OK, or fold into the `not_provided` question (plan Q7)?
4. **Mode 3 performance on big instances.** There's no composite `(user_id, tool_id)` index, and the Tool Shed `OR LIKE` prevents using `ix_job_tool_id`. Add an index or a separate `UNION` path for shed ids later?
5. **`tool_versions_available`** ignores `history_id` and `include_workflow_jobs`; it covers user + tool only, as the plan says. Should it follow those filters?
6. **Mode 1 `states` filter on huge `job` tables** (see EXPLAIN): verify on a production-sized database before release?

## Housekeeping

- The docker container `compare-runs-pg` (postgres:16, port 55432, started with `--rm`) was stopped after the runs.
- Nothing was written outside the worktree except throwaway session scratchpad files and this debrief.
