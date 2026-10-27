Folded the comparison state filter into a compact State dropdown where job error and failed share one "failed" option, kept the disabled All runs tab's label short, covered both in `test_comparisons.py`, and moved its last raw selectors into navigation.yml.

## Commits (on `compare_runs`, not pushed)

- `1b37f64ffc7` Fold the comparison state filter into a dropdown, one option per label
- `fc43f60ee4b` Cover the state menu and subworkflow All runs tab in comparison E2E
- `8696162134b` Keep a disabled All runs tab labelled All runs, explained in its tooltip

## Client polish

- **"failed (failed)" ambiguity.** The collision isn't between a job and an invocation. Job states `error` and `failed` (`Job.mark_failed`) both read "failed" through `statePlaceholders`. Output runs only offer invocation states, so their `failed` was never ambiguous.
  - A "failed (job)" / "failed (invocation)" relabel would not separate the two job states.
  - Instead, the new `stateFilterOptions` (in `comparisonUtils.ts`) gives states that read alike one shared option. Ticking it writes both raw states to the URL; either state in the URL checks it.
  - This matches the State column, which already shows both as "failed", and the server's own `ERROR_STATES` grouping for mapped batches. The tradeoff is that you can no longer filter `error` without `failed`.
  - The `offeredOptions` collision suffix is gone, since it had no other caller.
- **Compact chooser.** `ComparisonFilters.vue` now puts the states in a `GDropdown` + `GDropdownForm` + `GCheckboxGroup` (the NodeInspector pattern), laid out in a 2-column grid.
  - The menu stays open while you tick several states.
  - The toggle names the selection: "State: any", "State: failed", or "State: 3 selected".
  - The URL still carries the raw `states` values. The route has `reuseOnQueryChange`, so a URL update doesn't remount the view or close the menu.
  - I didn't use ListHeader's column-chooser pattern because each `GDropdownItem` click closes the menu.
  - Grouping by kind (step vs job) was skipped, because the dropdown already makes the list compact.
- **Disabled All runs tab label.** The E2E screenshot showed that a disabled tab used its whole explanation ("Steps inside a subworkflow can't be compared across runs yet") as the label, which wrapped to 5 lines in the tab bar.
  - The tab now always reads "All runs", via GTab's `#title` slot. The explanation stays in the `title` tooltip and `data-tab-title`.
  - `StepAllRunsTab.test.ts`: the two disabled cases now expect "All runs" and pin the explanation in the tab's `title`. They were red before the fix and green after.
- **Edge case.** A hand-edited output_runs URL with `states=error` would merge into the invocation "failed" option, because the label collides. Ticking that option would then write `error` back. I left this as is, since only a hand-edited URL can reach it.
- **vitest.**
  - `ComparisonView.test.ts`: 4 new or changed tests covering the single "failed" label, invocation failed on its own, check/uncheck URL sync of both states, and the toggle summary.
  - `comparisonUtils.test.ts`: the old collision test was replaced with `stateFilterOptions` tests. This is an intended behavior change.
  - `StepRunsTab.test.ts`: now expects `states=error&states=failed`.

## E2E polish (`lib/galaxy_test/selenium/test_comparisons.py`)

- New navigation.yml targets (`schema.ts` updated):
  - `comparisons.state_filter_toggle`
  - `invocations.workflow_invocations_table_rows`, which replaces the raw `.grid-table [data-description="grid item"]`. The existing `invocations_table_rows` is scoped to `#invocations-grid`, while this page uses `#invocations-workflow-grid`.
  - `_.loading_message`, which replaces the raw selector in `_screenshot_settled`.
- `test_comparison_pages_from_entry_points` now opens the State menu, ticks failed and cancelled in one open menu, asserts both are in the URL, and adds the `comparisons_state_filter_menu` screenshot.
- New test `test_subworkflow_step_all_runs_disabled` uses `WORKFLOW_NESTED_SIMPLE`. It opens the subworkflow's own invocation (via `subworkflow_invocation_id`), clicks `random_lines`, asserts the All runs tab has `aria-disabled="true"` and a subworkflow `data-tab-title`, and takes a screenshot.
- **Sleeps.** One `sleep_for(UX_RENDER)` remains in `_screenshot_settled`, now with a comment saying no DOM signal marks the end of fade-ins. The custom all-elements wait stays as it was, with a comment saying a target wait checks only the first match.
- **Shared abstractions.** The NavigatesGalaxy helpers added earlier (`invocation_graph_*`, `assert_invocation_step_card_title`, `assert_current_url_contains`) are reused by the new test. Nothing else is repeated across files.
- **BreadcrumbHeading ellipsis: no E2E.** The ellipsis is pure layout and only shows with a long title. vitest already pins the current-crumb class and its `title` tooltip, so an E2E check would have to assert computed CSS.

## Checks

- Playwright, embedded server, client rebuilt and staged: `test_comparisons.py` **4/4 passed**, three module runs in total (one before the tab fix, two after).
- vitest: Comparison, WorkflowInvocationState and Workflow/Invocation, 231 passed. vue-tsc clean. eslint and prettier clean on the changed files.
- black, isort and ruff clean. Single-file mypy on the test shows only the usual untyped-def noise from framework.py and test methods.
- No long-lived servers were started; the embedded Galaxy exited with pytest. The other worktree's process on port 8093 was not touched.

## Not acted on / follow-ups

- The caller's suggested "failed (job)" / "failed (invocation)" relabel was not done, because both "failed" states are job states. They were merged instead (see above).
- The workflow-version, output and tool-version filters are still inline checkbox groups. They are usually short; the same dropdown could be reused if they grow.

New screenshots were copied to `screenshots/` (not committed).

No security findings.
