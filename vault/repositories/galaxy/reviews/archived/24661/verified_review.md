### P2 1: New reset test passes without ToolSuccess's reset (implementation verified)

`goes back to the first job when a new response has fewer jobs` still passes with `watch(jobResponse, () => { currentIndex.value = 0; })` deleted from `ToolSuccess.vue`. Shrinking 3 → 2 jobs triggers `GPagination`'s own clamp to page 1 (already covered in `GPagination.test.ts`), so ToolSuccess's rule that any new submission returns to job 1 is unguarded.

Add a case where the new response has the same number of jobs with new ids, and assert page `1` and the first new job id. It fails without the watcher (`expected '2' to be '1'`) and passes with it. The fewer-jobs test can stay.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort, [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort, and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 1: Twin `BPagination` in `ToolExecutionJobs` left unmigrated (implementation verified)

`History/Graph/ToolExecutionJobs.vue` renders the same pager (same props, same 1-index bridge) into the same `JobHeader` `pagination` slot. After this PR the two job pagers look and behave differently (joined Bootstrap group vs separate buttons, arrow keys vs Tab), and the `JobHeader` row rules tuned for the wider `GPagination` also apply to the `BPagination` caller. Migrating it is a few lines: swap the import and `size="sm"` → `size="small"`. The component had no unit test; a small one with the pager in place passes after the swap and fails before it. How the wider pager fits the `GTabs` `nav-end` slot, including inside the narrow `HistoryGraphNodeBody` graph node, was not checked in a browser.

Both components now carry the same 0-to-1-index bridge; a small shared `useJobPager(jobs)` composable (index, page, current job, reset) could replace the two copies as a follow-up.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: Scoped `.job-pagination` style re-implements `mb-0` (implementation verified)

`GPagination` puts its default margin under `:where(.g-pagination)` so a margin utility class wins, and Bootstrap's `mb-0` is `!important` anyway. The new `job-pagination` class and `<style scoped>` block only set `margin-bottom: 0`; the sibling `ToolExecutionJobs` pager and other G-component call sites use `mb-0`.

Keep `class="mb-0 unselectable"` and drop the style block.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 3: Pager landmark keeps the generic "Pagination" name (implementation verified)

`GPagination` renders a `<nav>` landmark labelled "Pagination" by default. Passing `aria-label="Jobs"` names what it pages through, and the test selectors can key off it instead of the default string.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 4: `shows a pagination control for each job` asserts `> 0` (implementation verified)

The PR rewrites this test's selector, but `toBeGreaterThan(0)` passes for any pager. Assert the exact page labels (`["1", "2"]`) and that `1` is the current page.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 5: No E2E coverage of the job pager (implementation verified)

No Selenium/Playwright test reaches the tool success job pager or the `JobHeader` row layout; the swap to `GPagination` and the wrap change are only fully observable in a browser. A small test in `lib/galaxy_test/selenium/test_tool_form.py` could batch-run `cat1` over two datasets, assert pages `1` and `2`, click `2`, check the header switches jobs, and take a screenshot. It needs a `data-description` on the `GPagination` and matching `navigation.yml` selectors.

A new `test_tool_success_job_pagination` in `test_tool_form.py` batch-runs `cat1` over two datasets from the form, asserts the pager shows exactly pages `1` and `2` with `1` current, clicks `2`, and asserts the current page moves and the job id chip switches to the other `cat1` job (both ids checked against the history's jobs), then screenshots. It adds `data-description="tool success job pagination"` on the pager, `tool_success` selectors plus `tool_form.parameter_data_input_multiple` in `navigation.yml`. Passes under Playwright.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>
