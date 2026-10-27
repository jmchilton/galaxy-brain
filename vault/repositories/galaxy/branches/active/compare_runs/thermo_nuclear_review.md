# Thermo-nuclear code quality review (hardening iteration 3)

Review of `git diff fd43a3c6ce8...8696162134b`, excluding the generated `schema.ts` files. This was a fresh pass; I didn't read `earlier_drafts/`. The previous pass had already split `comparisons.py` into records, queries, states, cells and columns, and moved the client run fields to a spec table. This pass looked for what was left.

**Verdict:** there were no structural regressions left that block merging. I found six maintainability findings and addressed all of them in five commits on top of `8696162134b`, plus one commit that adds a test (HEAD is now `9b082b9f340`). Behaviour is unchanged and only one test assertion was rewritten (see 6). The items left open are listed at the end with reasons.

## Findings and fixes

### 1. SQL leaked back into the manager; three parallel dicts (`a2e33ef6952`)
- `comparison_queries.py` is meant to own the statements, yet `ComparisonsManager.tool_runs` built the whole submission page statement inline: the earlier-sibling subquery, the version, history and state filters, and the workflow-jobs exclusion. `_page_invocations` built its select inline as well.
  - **Fix:** `tool_submissions_stmt`, `invocations_stmt` and `tool_versions_stmt` now live in `comparison_queries`. `InvocationPageRow` and `ToolRunPageRow` moved with them, because they depend on the selects' column order.
  - `invocations_stmt` and `invoked_workflows_stmt` share one `_user_invocations` base.
  - The manager is now orchestration only: 502 → 403 lines.
- `step_runs` ran its own label query, then split the result into `steps_by_workflow`, `step_types` and `step_by_workflow`, and passed two of those down. **Fix:** a single `ComparisonRecordLoader.labelled_steps()` returns `dict[workflow_id, LabelledStep(id, type)]`.
  - **New test** (`9b082b9f340`): `test_labelled_steps_only_versions_with_the_label` checks that only the version carrying the label is returned, with the right step id and type, and that a missing label returns nothing.
  - The statement builders and `_compare` are moved code. The statement-count unit tests and the 26 API tests cover them.
- `versions_available` was computed the same way in `step_runs` and `output_runs`. **Fix:** one `_versions_available` helper.

### 2. Repeated access guards in the service (`a2e33ef6952`)
- All three service methods repeated `access = _access(trans); if access is None: return _empty(query)`.
- The manager also took `stored_workflow_id` alongside `query`, even though the service had already normalized `query.workflow_id` to that same id.
- **Fix:** one `_compare(trans, query, resolve)` guard. Manager methods now take `(access, query)`, so the service passes them directly.
- The order is preserved: the workflow accessibility check still runs before the anonymous short-circuit. The manager unit tests changed their call signature only.

### 3. `test_comparisons.py` was a new 1029-line file (`c821d24a686`)
- This crossed the 1k-line threshold.
- **Fix:** the endpoint and workflow helpers moved to a `ComparisonsApiTestCase` base with no tests of its own. This is the `BaseWorkflowsApiTestCase` pattern, so nothing is collected twice.
- The five tool-runs-only tests moved to `lib/galaxy_test/api/test_tool_runs.py` (177 lines), and `test_comparisons.py` is now 862 lines.
- `test_runs_state_filter_matches_mapped_batch_state` exercises both step and tool runs, so it stays in `test_comparisons.py`. No test bodies changed.

### 4. Duplicated cell spans (`5a01b02a80e`)
- Both GTable branches (runs as rows and runs as columns) built the same thing by hand: a changed-title `<span>` around `ComparisonCell`, with cell, role, metadata and loading bound separately. `ComparisonDiff` repeated the inner binding.
- **Fix:** a new `ComparisonColumnCell.vue` takes `(row, column, display, changed)` and is used at all three sites. `ComparisonCell`'s contract is unchanged, because `DatasetListCell` recurses into it. The table's DOM is identical. The diff panel's data cells now sit inside a bare `<span>`; no selector targets that level.
- `ComparisonTable` used to have both a `display()` function and a `displays` map built from it. Now it memoizes `displays` once, and `display()` reads from it.
- New tests: `ComparisonColumnCell.test.ts`.

### 5. Shared scaffolding between `/comparisons` and `StepRunsTab` (`9c293cd2892`)
- Both components declared a `table` ref, wired `useComparisonDisplay` to it, built their params from `metadataElements`, and then called `useComparisonFetch`.
  - **Fix:** `useComparison(knownKey, buildParams, fetcher)` owns all of that. Each caller now supplies only its params builder: the View merges URL metadata, and the Tab builds step params.
  - New test in `useComparison.test.ts`: the metadata a display needs triggers a refetch, and the display is saved under the key.
- Both callers copied `loaded-offset`, `sort-by`, `sort-desc` and `row-count` out of `table` into `ComparisonPager`. **Fix:** the pager now takes `table`. `ComparisonPager.test.ts` was rewritten for the new props and gained an empty-page case.
- `ComparisonFilters` used `versions === undefined` as a hidden mode flag even though it already receives `kind`. The View needed a special `versions` computed just to produce that `undefined`. **Fix:** visibility now comes from `kind`, and the View uses `urlList("versions")` like every other list filter.
- **Templates deliberately not unified:**
  - The View renders its filters before the table loads; the Tab renders them only once the table exists.
  - The two have different empty and loading messages.
  - The Tab has a toolbar slot; the View has a page-size selector.

  A wrapper component would forward about 12 props and v-models without removing any concept.

### 6. Spaghetti from the last fix pass (`6762e9314fb`)
- `StepAllRunsTab` worked out the disabled condition (`inSubworkflow || !stepLabel`) and the tooltip in two separate branches. **Fix:** a single `disabledReason` computed drives both.
- **Rewritten assertion:** `ComparisonView.test.ts` "describes the loaded sort order" used to assert the pager's `sortBy`/`sortDesc` props, which no longer exist. It now asserts the rendered summary text (" · newest first · "). The behaviour checked is the same, and the new check exercises more of the path.

## Not acted on
- **`ComparisonTable.vue` (414 lines), two GTable branches:** not split into two components. Each would need table, visible fields, keys, displays, changed set and selection passed in as props, which adds plumbing without removing any concept. The duplicated cell, which was the real problem, is fixed by 4.
- **Toolbar extraction from `ComparisonTable`:** optional. It is three buttons bound to local state (selection, export). Extracting them would mostly forward props.
- **`_step_rows` loops over the page twice.** The second loop needs every version's declared columns, which are only complete after the first loop and `_declare_defined_step_io`. Merging the loops would rely on `RowIo` aliasing a dict that is mutated later, which is worse than two loops.
- **`ComparisonDiff` recomputes `visibleFields` from the same inputs as the table.** It is cheap and keeps the diff self-contained; passing the value in would add a prop for no gain.
- **Other test files** are all under 500 lines (`ComparisonTable.test.ts` 367, `test_ComparisonsManager.py` 479). Left as they are.
- **Security:** nothing found; no report written.

## Checks
- **Python:** ruff, black, isort and flake8 are clean (pre-commit). mypy from `lib/` reports no errors in the four changed server modules or in `test_comparisons.py` and `test_tool_runs.py`; the 22–23 errors it does report are in unrelated imported files. `test_ComparisonsManager.py` has 37 mypy errors both before and after this pass, all pre-existing untyped-def errors.
- **Unit:** `test/unit/app/managers/test_Comparisons*` and `test_comparison_*`: 67 passed, plus the new `labelled_steps` test (`test_ComparisonsManager.py` 24/24).
- **API:** `test_comparisons.py` 21 passed, `test_tool_runs.py` 5 passed (run sequentially).
- **Client:**
  - vitest on `client/src/components/Comparison` and `WorkflowInvocationState`: 25 files, 231 tests passed.
  - vue-tsc: 0 errors. eslint and prettier are clean.
- **E2E:** after rebuilding and staging the client, `lib/galaxy_test/selenium/test_comparisons.py` passed 4/4 under Playwright on the embedded server. No external ports were used, and the processes on 8090 were left alone.
