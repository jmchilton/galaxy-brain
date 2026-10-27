# Test challenges debrief

Not blocked. Four new commits on `compare_runs` (not pushed), from `0fa14c972ac` to `b308005cdee`:

- 8 Python unit tests dropped and 1 parametrized test added (7 cases).
- 1 API test added and 1 extended, with helpers.
- 4 vitest tests dropped, 2 merged, 2 switched to `shallowMount`.
- 1 E2E test extended.

All touched suites pass. The red checks fail where the rule requires them to.

| Commit | What |
|---|---|
| `7bd682e8ed2` | Unit: pure `inlinable_expression` gate, drop the API duplicates, dataclass for the trans |
| `d058c7ad58c` | API: mixed-state mapped batch test, absent-version case, `inputs_by` on `invoke_workflow_and_wait`, `_invoke_and_wait`/`_hda` helpers, `_tool_runs(admin=)` |
| `8ab3140c99e` | Client: drop the E2E-covered and implementation-mirroring tests, `shallowMount` |
| `b308005cdee` | E2E: row-detail parameter highlight on an older run, and the detail is gone once collapsed |

**Bisect note:** `7bd682e8ed2` drops the mixed-state and mapped-exclusion unit tests, and its message says the API tests cover them. That API test only arrives in the next commit, `d058c7ad58c`. I couldn't amend, so fold the two commits together when the history is next rewritten.

## Counts (before → after)

- **Python unit** (comparison, columns, tool_version, HDA/History managers, `test_accessible_dataset_ids`): 125 → 124 passed.
- **API** `test_comparisons.py`: 18 → 19 passed, run as a whole module (140s).
- **Vitest** (branch test files under `client/src`, same filter both runs): 24 files with 243 tests → 23 files with 239 tests, all passing. The `packages/ui` `GTable.test.ts` also passes. The changed `shallowMount(..., { global: localVue })` shape matches existing tests such as `Login.test.ts`; I didn't run vue-tsc.
- **E2E** `test_comparisons.py` under Playwright (Galaxy 8091, vite 5174): 2/2 passed (102s). Both servers were killed by PID afterwards, and the ports are free.

## Drops and rewrites

### Python unit (`test/unit/app/managers/test_ComparisonsManager.py`)

| Test | Action | Reason |
|---|---|---|
| `test_step_runs_versions_filter` | dropped | The API test `test_step_runs_across_versions` already covers `versions=1`, `[0,1]` and `versions_available`. Its one extra case (a version without the step gives 0 rows and keeps `versions_available`) moved there as `versions=7`. |
| `test_tool_runs_state_filter_matches_any_mapped_member`, `test_step_runs_state_filter_matches_any_mapped_member` | rewritten at the API layer | Easy to test for real: `fail_identifier` mapped over `[fail, pass]` in a workflow gives a batch with one `ok` and one `error` job. The new API test `test_runs_state_filter_matches_any_mapped_member` checks that `states=error` and `states=ok` both match the batch in `step_runs` and `tool_runs`, that `running` doesn't, and that `states == {"ok":1,"error":1}`. |
| `test_tool_runs_excludes_mapped_workflow_jobs` | rewritten at the API layer | Folded into the same API test: `include_workflow_jobs=false` drops the mapped workflow batch. `test_tool_runs_workflow_jobs` already covers plain jobs outside workflows. |
| `test_output_runs_output_labels_filter_outputs_only` | dropped | Its `mock.patch.object(load_hdas, wraps=...)` checked an internal call (testing the implementation). Its column and facet assertions duplicate `test_output_runs_across_versions`. |
| `test_expression_value_cell_{skips_unknown_size,inlines_small_value,skips_large_value}` | restructured | `ComparisonCellBuilder._expression_value_cell`'s gate is now a module function, `inlinable_expression(hda)`. It gets a 7-case parametrized test on sessionless model objects with no mocks, covering size ≤/> cap, unknown size, state, purged and extension. The API test already covers reading a small value (`n == 42`, `source == expression_json`). |
| `_stored_workflow_with_runs(member_states=)` | removed | Only the dropped tests used it. |

Kept, with reasons:
- **Statement-count tests:** an N+1 guard that only a unit test can pin.
- **Tool Shed version matching without wildcards:** the API can't run Tool Shed ids.
- **Admin sees inaccessible items.**
- **Duplicate output labels:** the format2 import won't build them.
- **`present_in_versions` with an unlabelled version.**
- **Metadata file-skip and cap tests.**
- **`test_step_module_type_names_every_module`:** a cheap guard against the Literal drifting from `module_types`.
- **`test_comparison_columns.py`:** pure helpers, already good unit tests.

### Python unit (other)
- `test_galaxy_mapping.py::test_accessible_dataset_ids`: `SimpleNamespace(sa_session=...)` became a `SessionTrans` dataclass.
- `test_HDAManager`, `test_HistoryManager::test_accessible_ids` and `test_tool_version.py` were kept.

### API (`lib/galaxy_test/api/test_comparisons.py`, `populators.py`)
- `WorkflowPopulator.invoke_workflow_and_wait` takes `inputs_by`, which `invoke_workflow` already had.
- **Repeated hand-built requests:** six places built `{"history": "hist_id=…", "inputs": json.dumps(…), "inputs_by": "name"}` by hand. They now use one `_invoke_and_wait`, or `invoke_workflow_and_assert_ok(..., inputs_by="name")` for the paused run.
- **Admin query:** the one-off `_get("tool_runs", admin=True)` now goes through `_tool_runs(admin=True)`.
- **Baselines untouched:** `test_io_names_probe` and `test_jobs.py::test_index_and_show_job_field_sets` were left as they are.
- **Left inline:** the pause-step `PUT` and the history unpublish/disable_link `PUT` each occur once. Neither the populators nor `api/sharable.py` has a reusable helper for them, so they stay inline.

### Vitest
| Test | Action | Reason |
|---|---|---|
| `utils/download.test.ts` (whole file) | dropped | It stubs `createObjectURL`/`revokeObjectURL`/anchor `click` and replays `downloadBlob`'s steps (implementation mirror). The export test in `ComparisonTable.test.ts` uses `downloadBlob` as its boundary. |
| `ComparisonTable` "emits the transpose toggle" | dropped | The E2E clicks transpose, checks `aria-pressed`, and checks the transposed layout both ways. |
| `StoredWorkflowInvocations` "links Compare outputs…" + "hides … from anonymous users" | merged into "offers Compare outputs to registered users only" | The E2E follows the link to `kind=output_runs`, so the href check is dropped. The anonymous-only test passed on base, because the link didn't exist there, so it now has a registered-user control and fails without the feature. |
| `JobInformation` "links to the tool's runs only when asked to" + "hides the link from anonymous users" | merged into "offers the link to registered users who ask for it, and only them" | Same reasoning: the E2E follows Other runs to `kind=tool_runs`, and the merged test keeps a positive control. |
| `JobDetails` showHeader test, `ComparisonPager` | `mount` → `shallowMount` | Their children were all stubbed anyway (README prefers `shallowMount`). |

Kept on `mount`, deliberately: ComparisonTable (asserts GTable-rendered rows and cells), ComparisonView (asserts ComparisonFilters inputs), StepRunsTab, ComparisonDiff, ComparisonRowDetail, ComparisonCell, ItemPopoverLink, ToolExecutionJobs, JobParametersDiff, StoredWorkflowInvocations (breadcrumb from a child) and the JobInformation file (consistency).

Also kept:
- **ComparisonDiff "emits close":** the E2E hides the diff with the Compare toggle, not the close button.
- **ComparisonTable export test:** its `vi.mock("@/utils/download")` is the module boundary.

There are no layout fakes (`getBoundingClientRect`, `scrollIntoView`, `useElementBounding`) in the branch.

### E2E
- **Row detail:** `test_step_all_runs_across_versions` used to expand the newest row, which is the run being viewed, so there was nothing to diff. It now expands an older run and asserts that the parameter diff marks a changed row with "Concatenate Dataset" (cat1 `input1`, a new dataset per run). After collapsing, it asserts `row_detail` is gone. This adds the `row_detail_changed_parameter` selector, in `navigation.yml` and the hand-maintained `schema.ts`.
- **Coverage judgement:** the two E2E tests now cover the step tab, row detail and param diff, select-two diff, transpose, the view-all page, filters, and both entry points. That's enough for the feature.
- **Not in E2E:**
  - CSV/TSV download (browser download).
  - The mapped-batch job pager (vitest covers it).

## Red / baseline checks

- **Baselines:** the 5 "Baseline tests" commits were verified passing on dev at `6128074d3e9` during history cleanup (see `subagents/history_cleanup.md`). Their content is unchanged.
- **Tests on pre-existing components, run against base:** I made a scratch worktree at `fd43a3c6ce8` with the branch's test files copied in and `node_modules` symlinked. Each test failed at its own assertion:
  - GTable `detailsShowing`: `['undefined','undefined']` vs `['false','false']`.
  - JobDetails ×2: `includeOtherRunsLink` was `undefined`.
  - JobInformation link: `false` to be `true`.
  - StoredWorkflowInvocations: `false` to be `true`.
  
  The 20 pre-existing tests in those files passed. The worktree was removed afterwards.
- **By reasoning:**
  - `test_jobs.py::test_index_tool_version_filter`: on base, the extra `tool_version` query param is ignored, so both jobs come back and the `{0.1}` assertion fails.
  - The new API test and the `versions=7` addition hit new endpoints, which 404 on base.
- **Red only by construction** (new module, function or kwarg, so failure is at import or call):
  - Python: `serialize_metadata(included=)`, `accessible_ids`, `accessible_dataset_ids`, `inlinable_expression`, `versionless_tool_id`.
  - Client: `totalMatches`, `versionlessToolId`, `routerViewKey`.
  
  Their assertions are specific (exact sets and dicts).
- **E2E change:** by reasoning, the changed-parameter row only exists with the branch's RowDetail/JobParametersDiff.

## Not acted on
- **Bulk `mount` → `shallowMount`:** see the kept list above. Converting would break child-DOM assertions.
- **E2E for export and the batch pager:** browser downloads are brittle, and vitest covers the pager.
- **ComparisonPager:** I didn't trim its default-order case, which the E2E summary assertion also checks. It's one row of an `it.each`.
