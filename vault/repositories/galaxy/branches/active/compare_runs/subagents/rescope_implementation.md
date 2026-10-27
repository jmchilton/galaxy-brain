# Re-scope implementation: "finish the abstractions" + Codex follow-ups

**Top line.** I did all 7 items in 11 new commits on `compare_runs`, on top of 548c8bebcc3. The tip is 9aa33beef03. Nothing is pushed and nothing in galaxy-brain is committed.
- Every behaviour change went red to green.
- Both refactors got a baseline first (2 new "Baseline tests" commits) or are covered by the existing caller tests.
- Item 6 differs from the brief's wording; see below.
- 7(b) is the smallest correct version and needs no toolbox. Its limits are listed below.

| # | Item | Commit(s) |
|---|------|-----------|
| 6 | mypy: `retry_assertion_during_transitions` export | `ca889b89628` |
| 1 | `totalMatches` for 12 header parses | `22a2cc2fe51` |
| 2 | `useMappingJobs` on `useExecutionJobs` | `8bb6da34019` (baseline), `dcefeadc251` |
| 3 | `?keys=metadata_<name>` | `6106e77aa89` (baseline), `26d7090efa5` |
| 4 | `output_runs` `versions` filter + page UI | `ee0a0408bfa` (API + schema), `f0b7e86f36f` (client) |
| 5 | DatasetDetails "Other runs of this tool" | `2fd4afadcf9` |
| 7a | skipped job outputs → `Missing(skipped)` | `b4270c95532` |
| 7b | step_runs declared columns from step definition | `9aa33beef03` |

## Per item

### 6. mypy: departs from the brief
- **Cause.** The branch moved `retry_assertion_during_transitions` from `galaxy_test/selenium/framework.py` into `galaxy.selenium.navigates_galaxy` (in `0fa14c972ac`). `framework.py` imports it back, but its `__all__` lists only `retry_during_transitions`.
- **Scope.** Every selenium test that imports it from `.framework` fails mypy, not only `test_comparisons.py`; `test_invocation_grid.py` reproduced the same error. All of them use that import.
- **Fix.** I added the name to `framework.__all__` rather than changing one import.
- **Evidence.** Running mypy on every `selenium/test_*.py` that imports it, plus `framework.py`, now reports no errors in those files. Before the fix, `test_comparisons.py:1` and `test_invocation_grid.py:2` both errored.

### 1. `totalMatches`
- **Sites.** I moved 12 parses in 11 files onto `totalMatches(response)`: `api/{datasets,pages,visualizations,remoteFiles,workflows,histories.archived}.ts`, `api/histories.ts` (2 sites), `Grid/configs/invocations{,History,Workflow}.ts` and `HistoryDatasetPicker.vue`.
- **`workflows.ts`.** It read `"Total_matches"`. Header lookup is case-insensitive, so this changes nothing.
- **Left alone:**
  - `getStorageOperationRunItemsWithTotal` (`histories.ts`) returns `null` for a missing or NaN header, which the helper would turn into `0`.
  - `CuratedWorkflowList` and `historyItemsStore` read a body field, not the header.
- **Behaviour.** It is identical for any numeric or missing header. Eight of the sites had no `|| 0` (HistoryDatasetPicker, the 3 invocation configs, histories.archived, both histories.ts sites, remoteFiles), so for those a present but non-numeric header now gives `0` instead of `NaN`. The other four (datasets, pages, visualizations, workflows) already had it.
- **Evidence.** `vitest related` on the 11 files: 338 files and 3065 tests passed.

### 2. `useMappingJobs` on `useExecutionJobs`
- **Baseline (`8bb6da34019`).** It passes on the old code. The `/api/jobs` mock honours `order_by` and defaults to the server's `update_time` descending.
- **What the baseline pins:**
  - options numbered most recently updated first (`a, c, b`; creation order would give `a, b, c`);
  - the `"N: <date>"` label (regex match, so it doesn't depend on the time zone);
  - the first job selected by default;
  - a user's selection becomes the target;
  - a new batch re-selects its first job;
  - a single job never fetches.
- **Change.**
  - The batch source of `useExecutionJobs` takes `recentlyUpdatedFirst?: boolean`. With it set, the request uses `order_by=update_time` and the list is not reversed.
  - `ExecutionJob` gains an optional `create_time`.
  - `useMappingJobs` keeps its signature and return value (`selectJobOptions` is now a computed), so the three Markdown elements and `JobSelection` are unchanged.
- **Behaviour differences, all minor:**
  - A failed load now leaves the selector empty instead of throwing from the watcher (`rethrowSimple`).
  - Options clear while a new batch loads.
  - The request sends `order_by=update_time` explicitly, which is the server's default anyway.
- **Evidence.**
  - The baseline (4 tests) and `ToolExecutionJobs.test.ts` pass after the change.
  - `vitest related`: 26 files and 283 tests passed.
- **History note.** The baseline commit sits on top of the branch because I was told "new commits only". Move it into the baseline group at the next history cleanup. The same applies to `6106e77aa89`.

### 3. `?keys=metadata_<name>`
- **Change.** `DatasetAssociationSerializer.serialize` collects `metadata_<name>` keys that aren't registered serializers or serializable keys; I grepped and none exist. It returns those elements through `serialize_metadata(included=)`. `keys=metadata` still expands everything and wins when both are given.
- **Baseline API test (`6106e77aa89`):**
  - history contents `keys=name,metadata` returns exactly `name` plus every tabular `metadata_*`;
  - `/api/datasets/{id}?view=summary&keys=metadata` returns all of them;
  - the summary view has none.
- **Red-to-green tests:**
  - Unit: `test_serialize_prefixed_metadata_keys`.
  - API: `test_show_single_metadata_key`, red on the old serializer: `{'name': ...}` without `metadata_columns`. It checks `keys=name,metadata_columns,metadata_not_an_element` → exactly `{name, metadata_columns}`, the summary view plus one key, and `metadata_columns,metadata` → everything.
- **Note.** `GET /api/datasets/{id}` always adds the `detailed` view to `keys`, and that view already contains all metadata. So a single element is only observable with `view=summary` or on history-contents `keys=`. Both are tested. This also changes history-contents `keys=`.
- **Pre-existing oddity, not touched.** `keys=metadata` together with the `detailed` view also returns a raw `metadata` key: the view and keys each list it, and `_pluck_from_list` removes only one.

### 4. `output_runs` `versions`
- **Backend.**
  - `workflow_id` and `versions` moved onto a new `WorkflowComparisonQueryBase`.
  - A `_selected_versions` helper is shared by step_runs and output_runs.
  - The `output_runs` route takes `VersionsQueryParam`.
  - `versions_available` is every version of the stored workflow, mirroring step_runs' "every version with the step". I updated the schema description and regenerated the schema; the histogram diff is purely additive except the description line.
- **Client.**
  - `comparisonQuery.ts` accepts `versions` for `output_runs`; unknown keys are rejected otherwise.
  - `ComparisonView` exposes the version filter for every kind except `tool_runs`.
  - `ComparisonFilters` is reused as is.
- **Tests:**
  - `test_output_runs_across_versions` was extended and was red first (`versions_available` None). It covers the facet, `versions=0`, `[0, 1]`, an absent version and a 400 on `v1`.
  - The ComparisonView vitest is parameterised over `step_runs` and `output_runs`, and was red for `output_runs` first.

### 5. DatasetDetails
`include-other-runs-link` on its `JobInformation`, which reuses the existing gate (registered user and `tool_id`). The vitest was red on the old view. The test's module stub now declares the prop as `Boolean`.

E2E check: no Selenium/Playwright test asserts rows of `table#job-information` positionally. `test_tool_form.py` reads `#dataset-details` by key name; `test_workflow_invocation_details.py` reads `#galaxy-tool-id`. I didn't run an E2E.

### 7a. Skipped outputs
- **Change.** In step_runs and tool_runs, a single job whose state is `skipped` gets its `output:*` io replaced by `MissingCell(reason="skipped")` before cells are built. The keys stay in the version's declared set, so this is not `not_in_version`.
- **Cost.** No new statements; skipped placeholders are no longer loaded at all.
- **Test.** `test_step_runs_skipped_step` flipped from `value: null` to `missing/skipped`, for both `inline_expression_values` true and false, plus the tool_runs row. It was red first.
- **Limits, recorded and not fixed:**
  - Mapped batches keep their collection cells.
  - output_runs workflow outputs from a skipped step still show the null value. Fixing that needs a creating-job lookup: one more batched statement.
  - A skipped subworkflow step (below) also still shows a null value.

### 7b. Declared-in-version columns
- **Change.**
  - A new `_defined_step_io(step_ids)` makes one `UNION ALL` statement per page.
  - It collects the compared step's `WorkflowStepInput` names (connected inputs), the `output_name`s of its `WorkflowOutput`s and outgoing `WorkflowStepConnection`s, and, for a subworkflow step, the subworkflow's labelled outputs.
  - Names are normalised like io names.
  - These keys are added to a page version's declared set only for columns some row observed, so no empty columns appear. `present_in_versions` reflects them.
  - `_step_rows` now takes `step_by_workflow`.
- **No toolbox, no trans.**
- **Statement-count unit tests** stay flat (57 unit tests pass).
- **Role column.** The role is a SQL string constant (`literal_column("'input'")`), not a bind parameter, so PostgreSQL resolves the `UNION ALL` column as text. I checked the compiled PostgreSQL SQL, but no PostgreSQL server was reachable, so **7b has run on SQLite only**; CI's PostgreSQL run is the first real check.
- **Red to green.** `test_step_runs_unsupplied_optional_input_is_in_version` (`data_optional` with an optional `names` input connected in both versions; v0 run unsupplied, v1 supplied). The v0 cell went from `not_in_version` to `no_output`.
- **Probe result, contrary to the Codex note.** A `when:`-skipped subworkflow step does record its output: the subworkflow still runs and its skipped inner step writes a null placeholder. So that case was never `not_in_version`. `test_step_runs_skipped_subworkflow_step` pins it as `value null / expression_json`; it passes before and after, and went in with the 7b commit.
- **Remaining limits:**
  - A tool input that no version connects isn't known, so a column from another version can still read `not_in_version` when the tool has the input but this version doesn't wire it. Arguably that is correct for "the version".
  - Outputs that are neither marked nor connected are known only from runs. Tool outputs are always recorded, even when skipped or errored. Only `filter`-excluded outputs can be missed.
  - An unsupplied optional input reads `no_output`, the existing reason for every terminal gap.

## Validation
Commands, from the worktree root:
- **API**, one module or `-k` at a time:
  ```
  source .venv/bin/activate && GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES=true GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS=true GALAXY_TEST_TOOL_CONF="lib/galaxy/config/sample/tool_conf.xml.sample,test/functional/tools/sample_tool_conf.xml" pytest <path> [-k ...] -q --tb=short -p no:cacheprovider
  ```
  `<path>` was `lib/galaxy_test/api/test_comparisons.py`, `lib/galaxy_test/api/test_datasets.py`, or `test_datasets.py` plus `test_history_contents.py` with `-k "metadata or keys or test_show or custom_serialization or test_view"`.
- **Unit:** `source .venv/bin/activate && PYTHONPATH=lib pytest -q test/unit/app/managers/test_ComparisonsManager.py test/unit/app/managers/test_comparison_columns.py test/unit/app/managers/test_HDAManager.py`
- **Vitest:** `cd client && npm_config_use_node_version=$(cat .node_version) pnpm exec vitest run <dirs>`, or `vitest related --run <changed files>`.
- **Static checks:**
  - `cd client && pnpm --filter @galaxyproject/galaxy-api-client run build && npm_config_use_node_version=$(cat .node_version) pnpm exec vue-tsc --noEmit`
  - `cd lib && ../.venv/bin/mypy <changed files>`
  - `.venv/bin/{ruff check,black --check,isort --check-only} <changed files>`

Results:
- **API**, one module at a time:
  - `test_comparisons.py`: 24 passed (6m53s).
  - `test_datasets.py`: 70 passed, 2 failed (`test_permissions_changed_while_queued_survive_job_finish`, `test_display_application_link`). Both are URL `fetch_data` Celery `ProcessExpired` timeouts. They also fail with the base `datasets.py`, so they are environmental and unrelated.
  - Keyword run over `test_datasets.py` and `test_history_contents.py` (metadata, keys, show, view): 12 passed.
- **Unit:**
  - `test_ComparisonsManager.py` + `test_comparison_columns.py`: 57 passed.
  - `test_HDAManager.py`: 33 passed.
- **Vitest** (node 22.20.0) on Comparison, DatasetInformation, Markdown/Sections/Elements, History/Graph, Grid, SelectionDialog, api, FilesDialog, Workflow/List and JobInformation: 61 files, 540 tests passed. Plus the `vitest related` runs above.
- **Static checks:**
  - vue-tsc is clean after the api-client build.
  - eslint shows 0 errors; the 2 pre-existing `any` warnings are in the `DatasetDetails.test.ts` stub.
  - prettier is clean.
  - ruff, black and isort are clean.
  - mypy on every changed Python file: no errors in those files.
- **Schema.** `make update-client-api-schema` was run and is in `ee0a0408bfa`.

## Open questions
1. Should the 7a null-to-skipped mapping also cover output_runs workflow outputs and skipped subworkflow steps? That needs one batched creating-job-state lookup, keyed on the job state or the HDA's skipped blurb.
2. For output_runs, `versions_available` means every version, which mirrors step_runs. Should it be only the versions the caller has invoked, like `output_labels_available`?
3. Should an unsupplied optional input read `no_output`, or get a new reason such as `not_supplied`?
4. Move the two new "Baseline tests" commits (`8bb6da34019`, `6106e77aa89`) into the baseline group at the next history cleanup.

No security findings.
