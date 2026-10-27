# Phase 5 implementation: expanded scope and polish

Items 1–5 of the Phase 5 table are done, in 11 new commits on `compare_runs` after `c574a68acdb`, up to `fab4c476ebe`. Nothing was pushed. Items 6–9 stay deferred.

## Commits

| sha | What |
|---|---|
| `c2c380c9b4c` | Pure helpers with tests: cell comparison (now `comparisonChanges.ts`), page export (`comparisonExport.ts`), and the job-parameter diff (`JobParameters/jobParameterDiff.ts`). `noJobMessage` moved from `ComparisonRowDetail.vue` to `noJobReason(row)` in `comparisonUtils.ts`. |
| `ee558678bdd` | Item 4: changed-cell highlight. |
| `e6550a0dc97` | Item 1: side-by-side diff. Also renames `comparisonDiff.ts` to `comparisonChanges.ts` (see Deviations). |
| `35f7a506230` | `utils/download.ts` `downloadBlob`, adopted by the sample-sheet workbook download and the citations BibTeX download. |
| `0967109cbc3` | Item 3: CSV/TSV export. |
| `42facbf4591` | Item 2 backend: `versions` filter and `versions_available`, with the unit test, the API test and a schema regen. |
| `4044fba8d4f` | Item 2 client: `ComparisonFilters.vue`, used by the step tab and `/comparisons`. |
| `fe3524e6223` | Baseline tests for `ToolExecutionJobs` (current tool-request behaviour). |
| `7f36e52573d` | Item 5: the batch job pager. |
| `c5e8642afda` | E2E: a diff step in `test_step_all_runs_across_versions`. |
| `fab4c476ebe` | Polish: while the panel is open, Compare selected reads "Hide comparison" with `aria-expanded` instead of a pressed state, which looked disabled. Adds a test that a late response for an older batch can't replace a newer one's jobs. |

## Per item

### 1. Side-by-side diff (headline)

- **Selection.** Selection lives in `ComparisonTable.vue`, so the step tab and `/comparisons` both get it.
  - In row mode it uses GTable `selectable` with `no-select-on-click`, so expand buttons, links and popovers don't toggle selection.
  - Selection is kept as run ids, not GTable indices, so it survives transposing.
  - Transposed, each run's column header gets a checkbox (`.comparison-select-run`).
  - At most two runs: selecting a third drops the one selected first.
  - Selected runs that leave the page are dropped. Below two selected, the panel closes.
- **Toolbar button.** "Compare selected (n/2)" is disabled until two runs are ticked, with a disabled title explaining why. While the panel is open it reads "Hide comparison" (`aria-expanded`).
- **`ComparisonDiff.vue`.** A card above the table:
  - Columns are A and B, in table order, each with the run's anchor cell (time link, "this run" badge).
  - Lines are the meta fields (version / tool version / state / reused / history) and every data column, rendered with `ComparisonCell` in the table's current display.
  - It shows "n of m fields differ", an "Only differences" switch (on by default) and a close button.
  - Lines carry `data-diff-key` and a `comparison-diff-{differs,same,uncompared}` class.
- **Parameters.** `JobParameters/JobParametersDiff.vue` diffs the two jobs' `parameters_display` through `jobParametersStore` (cached, all client-side). It is reusable for any two job ids.
  - Parameters are paired by ancestor path, so same-named parameters in different sections stay apart, and repeated paths by occurrence.
  - Dataset values compare by `src:id`.
  - Parameters only one job has are shown as "absent" on the other side.
- **Edge cases.**
  - Batch rows compare their representative job and say so: "Run B is a batch of 3 jobs: job 1 shown."
  - A side without a job gives `noJobReason`, or "ran a subworkflow".
  - `output_runs` rows say that a workflow run has no single job.
- **Reuse.** The role badge and label were extracted from `ComparisonColumnHeader` into `ComparisonColumnLabel.vue`, which the diff also uses.

### 2. State and version filter in the step tab

- **Backend.**
  - `StepRunsQuery.versions: list[int] | None` comes in as a typed repeated `list[int]` Query, not `query_parameter_as_list`, because `model_construct` skips validation and a list of strings would silently match nothing. A non-integer value gives 400.
  - The filter intersects the workflow ids that have the step with the requested versions, after the existing 404 check.
  - `ComparisonTable.versions_available` lists the 0-based versions that have the step, whatever `versions` selects.
- **Client.**
  - `ComparisonFilters.vue` holds the state checkboxes (moved out of `ComparisonView`) and the version checkboxes, labelled `v1`, `v2`… from the 0-based values. The version filter is hidden when the step is in only one version.
  - The step tab keeps local `states` and `versions`. Changing either resets `offset` with a `flush: "sync"` watcher, so the refetch already asks for page 1 instead of making a second request; a test pins the request count.
  - "View all in a page" carries both filters.
  - `/comparisons` accepts `versions` for `step_runs` (`PARAMS` gains `versions: "list"`) and writes it to the URL.

### 3. CSV/TSV export

- An "Export" dropdown in the table toolbar offers CSV or TSV of the current page.
- It honours the visible columns, transpose and each column's display. Dataset links are written as `hid: name`, values as one-line JSON, metadata as its value, and missing cells as their text, e.g. "not run yet".
- `exportFilename` gives names like `runs_of_second_cat_1-6.csv`.
- CSV quotes fields containing `,`, `"` or line breaks. TSV replaces tabs and newlines with spaces.
- **Reuse.** `createAndClickDownloadLink` was moved out of `Collections/sheet/workbooks.ts` into `utils/download.ts` as `downloadBlob`. `CitationsList.vue`'s copy now uses it too. No other copies were found.

### 4. Highlight cells that differ from the current run

- `changedCells(rows, columns, displayOf, currentRunId)` builds the set of changed cells.
- GTable's existing per-item `cellClass` applies `comparison-cell-changed` (a yellow-200 background with a yellow-600 inset bar) in both rows and transposed mode. A `title` "Differs from the run you are viewing" sits on the cell content, so the mark isn't colour-only.
- It only marks anything when the current run is on the page.
- **What "differs" means, by display mode:**
  - **Value:** deep comparison, ignoring key order.
  - **Metadata:** the element's value. An unset element counts as `null`. A collection compares by type and count.
  - **Link:** item id, but outputs are **uncompared**, because every run makes new HDAs and they would always be marked.
  - **Missing vs present**, or different missing reasons: differs.

### 5. Batch "job k of N" pager in row detail

- **`useExecutionJobs(source)`** (in `useToolExecutionJobs.ts`) takes `{toolRequestId}` or `{implicitCollectionJobsId}`.
  - Batch jobs come from `GET /api/jobs?implicit_collection_jobs_id=&order_by=create_time`, reversed so the oldest is first. Each source has its own error and empty messages.
  - `useToolExecutionJobs(id)` is kept as a thin wrapper.
  - Stale responses are now dropped. The old watcher claimed to be race-safe but wasn't. A gated-response test pins this, and it fails when the check is removed.
- **`ToolExecutionJobs.vue`.** `toolExecutionId` is now optional, plus new `implicitCollectionJobsId` and `initialJobId` props. Its existing callers (`HistoryGraphNodeBody`, `HistoryGraphToolExecutions`) are unchanged, and the baseline tests still pass.
- **Row detail.** `rowJob` now also returns `implicitCollectionJobsId`. A batch row's detail renders `ToolExecutionJobs` opened on the representative job, under a heading "Batch of N jobs" that replaces "Job 1 of N".
- The meta cell note is now "mapped over N jobs"; "· details from job 1" was dropped because it was no longer true.

## Deviations

- **Module rename.** `comparisonDiff.ts` became `comparisonChanges.ts` in the item 1 commit, because `comparisonDiff.test.ts` and `ComparisonDiff.test.ts` collide on macOS's case-insensitive filesystem. The Write tool silently hit the old file.
- **Baseline tests aren't first.** The `ToolExecutionJobs` baseline commit sits right before its change, not at the start of the branch: the brief said new commits only, with no history rewrite.
- **Export.** Times are written as full ISO `create_time`, not the elapsed "3 hours ago" the table shows. `reused` is written as `yes`/`partial`/`no`; the table shows nothing for `no`.
- **Diff scope.** The diff panel lists every column, hidden ones included; the export writes only the visible ones.
- **Changed tests.** Existing `ComparisonTable` test indices were shifted by one for the selection column. The row-detail "uses a mapped step's first job" test was replaced by a "pages through a mapped step's jobs" test, because the behaviour changed. The `rowJob` expectation gained `implicitCollectionJobsId`. No assertion was weakened.

## Tests

- **Vitest** (`cd client && npm_config_use_node_version=$(cat .node_version) pnpm exec vitest run src/components/Comparison src/components/JobParameters src/components/History/Graph src/utils/download.test.ts src/components/Citation src/components/Collections/sheet src/components/WorkflowInvocationState`): 35 files, 298 passed.
  - New this phase: `comparisonChanges` 8, `comparisonExport` 9, `jobParameterDiff` 5, `JobParametersDiff` 4, `ComparisonDiff` 8, `ToolExecutionJobs` 4 baseline + 4, `download` 1.
  - Additions to existing files: `ComparisonTable` +9, `StepRunsTab` +2, `ComparisonView` +1.
- **Red first:** the helpers (module missing), the highlight, selection and export tests, the filter tests and the item 5 tests were all seen red. `jobParameterDiff` and `ComparisonDiff` tests were written alongside their code and passed on the first run.
- **`vue-tsc --noEmit`:** clean.
  - First rebuild the api-client `dist` after a schema regen: `pnpm --filter @galaxyproject/galaxy-api-client run build`. Until then vue-tsc checks against stale types and passes wrongly.
- **eslint and prettier:** clean on every changed file; the pre-commit hooks passed.
- **Python unit tests** (`PYTHONPATH=lib pytest test/unit/app/managers/test_ComparisonsManager.py test/unit/app/managers/test_comparison_columns.py`): 55 passed, including the new `test_step_runs_versions_filter`, which was red first.
- **API tests** (`pytest lib/galaxy_test/api/test_comparisons.py` with the skill's env): 18 passed. `versions` assertions were added to `test_step_runs_across_versions` (filter, repeated values, 400 for a non-integer) and `versions_available` to `test_step_runs_label_change`.
- **Python lint:** ruff, black and isort are clean.
- **mypy:** run from `lib/` on the three changed backend files, it reports 22 errors in 11 other files and none in the changed files.

## E2E

`lib/galaxy_test/selenium/test_comparisons.py` passed 2/2 under Playwright in 102 s, headless. The diff step ran a second time to capture its screenshot.

- **Servers.** 8080 and 5173 were held by another worktree, so Galaxy ran on 127.0.0.1:8091 (`scratchpad/start_galaxy.sh`) and vite on 5174. Both were killed by PID afterwards; `lsof` is empty for both ports.
- **The new step:**
  1. Tick the newest (v2) run and an older (v1) run (selector `row_select`, which clicks the checkbox label).
  2. Press Compare selected; the diff panel shows.
  3. The `version` line has the `comparison-diff-differs` class and contains both v2 and v1.
  4. Take the screenshot `comparisons_step_all_runs_diff`.
  5. Toggle the panel closed.
- **New selectors** in `navigation.yml` and `navigation/schema.ts`: `row_select`, `compare_selected`, `diff_panel`, `diff_changed_line`.
- **Screenshot check.** The panel renders as intended. "2 of 6 fields differ": the Version line and `input1` are marked, and `out_file1` is listed uncompared and greyed.

## Left over / known limits

- **Batch size.** The batch pager uses `/api/jobs`'s default `limit=500`, so a batch of more than 500 jobs is cut short. Because the list is reversed, the oldest jobs would be the ones missing.
- **Batch order.** Batch order is by `create_time`, but the server's representative job is first by `order_index`. When two jobs share a `create_time`, the pager numbering can differ from the "job 1" the table and diff mean; it still opens on the representative.
- **Future consumer.** `Markdown/Sections/Elements/handlesMappingJobs.ts` (`useMappingJobs`) fetches the same endpoint and could move onto `useExecutionJobs`. It was not touched.
- **Pressed buttons.** A pressed outline GButton renders greyish, close to its disabled look. Compare selected no longer uses the pressed state; Transpose still does. This is existing GButton styling.
- **Stale screenshot.** The `comparisons_step_all_runs_diff` screenshot predates `fab4c476ebe` and still shows the old pressed button. The E2E wasn't rerun, because the class and the click behaviour are unchanged.
- **Scope of the new filters.** `output_runs` gets no `versions` filter; the plan scoped it to mode 1, and it would be about five more lines. Highlight against the current run only happens in the step tab, because `/comparisons` has no current run; the diff panel covers that page.

## Design questions

1. **Outputs in link mode** are never highlighted, and the diff shows them as "uncompared", because each run's outputs are new HDAs. OK? Or compare by name or `hid`, or by the underlying dataset (which would need a server field)?
2. **Selection cap:** a third tick drops the first one. OK, or disable the other checkboxes instead?
3. **Diff and hidden columns:** the diff lists hidden columns; export omits them. Should the diff follow `visibleColumns` too?
4. **Export of the reuse field:** write `no` for reuse, or leave it blank as the table does?
5. **`versions` style:** repeated parameter only (typed `list[int]`), unlike the comma-or-repeated `states`. OK?
6. **Batch pager size:** raise `/api/jobs` `limit` for batch pagers, or pass the known `job_count`?
7. **Mockup parameter highlight:** the mockup highlights parameters in an expanded row that differ from the ★ run. That isn't built. `JobParametersDiff` against the current run's job would make it cheap. Follow-up?
