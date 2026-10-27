Added E2E coverage for the editor "Compare runs of this step" link, the mode 2 output-label filter and the batch pager "reused" badge, with a `data-column-key` DOM hook and new navigation.yml targets; all 3 tests in `test_comparisons.py` pass under Playwright, and all 8 screenshots show their subject.

## Commits (compare_runs, on top of b527b296a74)

- `08c9ff68c85` Key comparison column headers by column key in the DOM: `:data-column-key="column.key"` on `ComparisonColumnHeader`'s root span, with a vitest assertion in `ComparisonTable.test.ts`. Matches the existing `data-diff-key` / `data-pk` hooks, so tests can find a column's header without matching label text.
- `dade380ac8b` Cover editor link, output filter and reused badge in comparisons E2E.
- `f2b1accd6ad` Share the comparison page check and frame the row detail screenshot: adds an `_assert_comparison_page(kind)` helper (wait for the view, then check the `kind=` URL) used at 5 entry points, and scrolls the changed parameter into view before `comparisons_step_all_runs_row_detail`. Before this, the highlight sat below the fold of the step card.

## What changed in the E2E

- **Mode 2 output-label filter** (`test_comparison_pages_from_entry_points`): `WORKFLOW_TWO_CAT` gained labelled outputs `first_out`/`second_out`, because without labelled outputs the filter never mounts. The test checks `second_out`, then asserts `output_labels=second_out` is in the URL, the `output:first_out` header is gone, and `output:second_out` and `input:input1` remain. This runs before the `states=failed` step, which empties the table.
- **Editor link** (same test, last step): opens `workflows/edit?id=…` and selects `second_cat` with the existing `workflow_editor_ensure_tool_form_open`. It asserts the link is visible once the node inspector shows. The screenshot shows the tool form fully loaded with the link still present, so loading the form does not flip `hasChanges` and hide the link. Then it takes a screenshot (`comparisons_editor_compare_runs_link`), clicks the link, and asserts `kind=step_runs`, `step_label=second_cat` and all 3 rows.
- **Reused badge** (new `test_mapped_step_reused_job`): a 2-element list `WORKFLOW_MAPPED_CAT` is run, then rerun with `use_cached_job: True`. The test opens `/comparisons?kind=step_runs…mapped_cat` directly and expands the reused row. It asserts the badge is visible, scrolls the badge into view and takes a screenshot (`comparisons_mapped_step_reused_job`). It then expands the original row, waits for its job pager, and asserts the badge is absent. Every job in the rerun is reused, so the assertion does not depend on which job the pager shows first. The default test server's job cache returned reused jobs with no extra config.
- **Mode 3 (job page → tool_runs)** was already covered (`jobs/{id}/view` → `other_runs_action`, plus the dataset details entry). Not duplicated.
- New navigation.yml targets under `comparisons:` (mirrored in `schema.ts`, which is hand-maintained with no generator): `row_detail_job_pager`, `row_detail_reused_badge`, `column_header(key)`, `output_filter(label)`, `editor_compare_runs_link`.

## Audit of the existing file

- No raw CSS/DOM selectors, sleeps or `time.sleep` were found. Every wait uses navigation.yml targets or `retry_assertion_during_transitions` helpers.
- Shared helpers (`invocation_graph_*`, `assert_current_url_contains`) already live in NavigatesGalaxy. They were not touched, so `test_workflow_invocation_graph.py` was not rerun.
- Required screenshots are all present: `comparisons_step_all_runs` (All runs tab), `_transposed`, `_row_detail` (parameter highlight), `_diff` (two-row diff), `comparisons_compare_outputs_page` (mode 2), `comparisons_tool_runs_page` (mode 3), plus the new `comparisons_editor_compare_runs_link` and `comparisons_mapped_step_reused_job`. Existing screenshot names are unchanged.

## Validation

- Playwright: `test_comparisons.py` reported 3 passed on 8091/5174 (127s, then 133s with screenshots). After the last commit it reported 3 passed again (134s) on 8093/5176, because another worktree had taken 8091 in between. 8080/5173 belonged to another worktree throughout. All 8 screenshots were checked by eye: each shows its subject. Servers were killed by PID after each run, and the temporary `bind` was removed from the worktree's ignored `config/galaxy.yml`. Selenium (chromedriver) is not installed locally, so it was not run.
- The run needed `GALAXY_TEST_EXTERNAL` without `GALAXY_TEST_END_TO_END_CONFIG`. With the configured login user, login failed with `.loggedin-only` timeouts likely because that user does not exist in this worktree's DB.
- Client: vitest `ComparisonTable.test.ts` 23 passed. prettier, eslint and `vue-tsc --noEmit` are clean. black, ruff and isort are clean on the test file. mypy reports only the untyped-def/decorator errors that every selenium test file has.

## Not acted on / observations

- UI: the expanded row detail sits inside the table's horizontal scroller. At the 1280px test width (tool and history panels open), the batch pager and badge are off-screen until scrolled. The screenshot scrolls the badge into view; the layout was not changed.
- The mode 2 screenshot is taken before the output filter is applied, keeping the earlier unfiltered view and name.
- No security issues found.
