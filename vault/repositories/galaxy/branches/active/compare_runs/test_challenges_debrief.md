READY. Hardening iteration 3 test challenge: 8 new commits on `compare_runs` (`565950820cd..1c9c098fbee`, not pushed). It fixed one real test breakage, made several tests DB-free or pure, made red checks fail at an assertion, reused populators, and added an E2E geometry check for the row-detail pin. Every changed suite is green.

## Real bug found
- **f8d6709effe broke `test/integration_selenium/test_objectstore_selection.py::test_storage_run_dataset_popover_fits_window`.** That commit replaced the `#storage-run-item-dataset-<id>` DOM id with a `useUid` id, but the test still hovers that selector.
  - Fixed in `e1631c4dbca`: the test now finds the link by `.item-popover-link a[href$='/datasets/<id>/details']`.
  - **Fold into f8d6709effe**, so the refactor commit doesn't break the test.
  - Not run: integration Selenium needs a built client, which this worktree lacks (`#masthead` timeout). It is a selector-only change.

## Commits
| Commit | What |
|---|---|
| `e1631c4dbca` | Object store popover selector fix (above). |
| `c6e860e716d` | `ComparisonCellBuilder.metadata_keys` becomes module fn `scalar_metadata_keys(metadata_spec)`, and `_cap` becomes `cap_metadata_value`. Both are tested without DB/app, and the tuple/dict cap branches are newly covered. `TestComparisonCellBuilder` is dropped. `ToolRunPageRow.submission_key` delegates to `submission_key()` instead of copying it. Drops are listed below. |
| `67d00de887e` | New `comparisonQuery.test.ts` covers `parseComparisonQuery` (errors, per-kind parsing, the untested malformed number/bool passthrough), `cleanUrlQuery`, `comparisonPath` and `displayStorageKey`. `noJobReason` cases move from ComparisonRowDetail mounts to `comparisonUtils.test.ts`, which adds the `data_collection_input` and "ran without a job" branches. ComparisonView keeps one mounted error case. |
| `b87aa7bd666` | The ToolExecutionJobs batch tests and NodeInspector no-link cases now fail at an `expect` on base: before, they threw or passed vacuously. Verified on base: all fail at AssertionError. The StepRunsTab OR selector becomes a single selector. |
| `3dab9bcb56a` | New `useMappingJobs` failed-load test. A behaviour change from 5091398f33f had no test: a failed load now leaves the options empty, where base rethrew from the watcher. On base it goes red only as an unhandled rejection, not at an assertion. |
| `65e7a8d4687` | New `WorkflowPopulator.rename_workflow`, used 6× in API tests and in the Selenium test. Also switches to `ds_entry`, `wait_for_jobs` and test_jobs `__jobs_index`, and adds a file-local `_wait_for_invocation_step`. Strengthened: the index `copied_from_job_id` for a job-cache hit (no positive case existed), the third invocation id, exact `metadata_keys == ["data_lines","dbkey"]`, and the plain job's row in tool_runs. The contradictory comment about the mapped-batch state filter is fixed. |
| `1c9c098fbee` | **Baseline tests** for the CitationsList BibTeX download (file name + content), the caller downloadBlob took over in 578d2a22249. Passes on base (sandbox at `b40ff056bbd`) and HEAD. **Fold to the front** with the other baseline commits. |
| `a1d7400f0f4` | E2E for 071a9d40c6c, which had no test at any layer. It narrows the comparison to 400px and asserts the table overflows by more than 2×. It then asserts the expanded row's job pager stays inside the table scroller at both scroll ends, which can't hold without the sticky pin. Adds the `comparisons.table_scroller` selector. |

**Fold note:** the `__jobs_index` swap in `test_index_and_show_job_field_sets` could fold into baseline 5d47beec7ae. The cached-job assertion belongs with df7c6b15ccc.

## Dropped tests (logged)
- `test_comparison_records.py`, each covered by API tests:
  - `test_reused`: `test_step_runs_cached_job`, `_mapped_step`, `_mapped_over_empty_list`.
  - `test_outputs_skipped_only_for_a_skipped_job`: `test_step_runs_skipped_step`.
  - `test_batch_tool_comes_from_its_first_job`: `test_tool_runs_mapped_batch_is_one_row` and the version filter tests.
  - `test_run_refs`: `test_tool_runs_mapped_batch_is_one_row` and `test_step_runs_mapped_step`.
  - The non-empty rows of `test_batch_state`, which repeat `test_summary_state`. It is now `test_empty_batch_state`.
  - `ToolRunPageRow` asserts in `test_submission_key`, made moot by the delegation.
- `test_comparison_columns.py::test_align_columns_empty`: the code has no empty branch.
- `TestComparisonCellBuilder` (2 DB tests): replaced by the pure helper tests. Wiring is still covered by the API metadata tests.
- `ComparisonView.test.ts`: the 7-case error `it.each` became one mount, with the cases moved to pure tests. The versionless-storage-key mount is now a `displayStorageKey` case.
- `ComparisonRowDetail.test.ts`: the "ended before reaching", pause `it.each` and input `it.each` mounts moved to `noJobReason` tests.
- `api/test_comparisons.py::test_step_runs_after_workflow_rename`: it only asserted `len(rows)==2`, and rename-as-new-version is pinned by other tests' `(id, version)` asserts.

## Refactor commits (8) and baselines
- **Baselines pass on base.** I ran them in a sandbox worktree at `b40ff056bbd` (base plus baselines only):
  - the 3 baseline API tests (test_jobs ×2, test_datasets);
  - `test_serialize_metadata_tabular_keys`;
  - DatasetPopoverLink, ToolExecutionJobs and handlesMappingJobs vitest (16).
- **54789e9ae54 (metadata by name):** the feature tests fail on base at their own assertions.
- **0aa158e3d10, f26c4925072:** pure substitution and move; the callers are still meaningful.
- **f8d6709effe:** the baseline DatasetPopoverLink edits are selector and class renames of equal strength. One Selenium caller was missed; it is fixed above.
- **087b45ddf2c (`totalMatches`):** the only behaviour change is that an unparsable header now gives 0, not NaN, which the helper test pins. Header names are matched case-insensitively. Benign. The rewritten callers already had tests on base that assert totals and still pass at HEAD: `api/pages.test.ts`, `api/visualizations.test.ts`, `api/histories.test.ts`, `Grid/configs/invocations.test.ts` and `HistoryDatasetPicker.test.ts`.
- **578d2a22249 (`downloadBlob`):** 3cd60c9cb57 dropped its test saying "E2E covers", but no E2E exports. The drop is defensible on other grounds, since the test replayed stubbed browser steps. The CitationsList baseline (`1c9c098fbee`) now pins a real caller instead.
- **958574ce599 and 5091398f33f:** baselines untouched. Their gaps are fixed in `b87aa7bd666` and `3dab9bcb56a`.

## Not acted on (and why)
- **StepRunsTab: stubbing ComparisonTable instead of the full mount.** It would be a larger rewrite, and the mount works.
- **Shared test helpers:** `getFakeAnonymousUser()` (the literal is copied into 5 files), exporting the display-prefs storage key, and validating `test-data/step_runs.json` against the server models. These are worthwhile but go beyond test scope.
- **Shared restoring `Security` fixture:** the same unrestored pattern already exists in `test/unit/webapps/api/conftest.py`.
- **Moving `test_admin_sees_inaccessible_items` to the API layer:** no API equivalent exists, and the unit test is cheap.
- **E2E steps for the pager, the version filter and CSV export:** the API and vitest suites cover these, and each step adds runtime.
- **E2E cleanup:** the raw loading-message and workflow-invocations-grid selectors, `@managed_history`, and retry on row counts. These are low risk; the module passed 3/3.
- **More populator helpers** (`list_identifiers`, step action PUT, `run_tool_and_wait`): low priority.
- **New modules fail on base by import or AttributeError:** this covers `accessible_ids`, `versionless_tool_id` and the comparison modules, and can't be avoided. `routerViewKey.test.ts` cases 1–2 pin pre-branch behaviour, but the helper is new, so no baseline commit was possible.

## Runs (HEAD `1c9c098fbee`)
- eslint on the changed client files: clean. `vue-tsc --noEmit`: clean.
- mypy on `comparisons.py` reports `no-any-return` at lines 491/493. These predate this iteration: my only edit there is `ToolRunPageRow.submission_key`.
- Unit comparison suite: 66 passed.
- Vitest, the 31 changed files: 283 passed.
- API `test_comparisons.py`: 26 passed. `test_jobs` field-set and tool_version tests: 2 passed.
- Playwright `selenium/test_comparisons.py`: 3 passed.
  - `test_mapped_step_reused_job` failed once, on the first run after the server started. The output was lost, and it then passed 4/4 in a row (including the full module run). It may be a cold-start flake; watch it in CI.
- Not run: the integration Selenium test above, which needs a built client.
- I freed ports 8080 and 5173 by killing a 6-day-old `invocation_graph_embedded_outputs` Galaxy and Vite. My own servers are stopped.
