screenshots successfully obtained

Hardening iteration 3. Under Playwright (headless), all 4 tests in `test_comparisons.py` and `test_workflow_invocation_graph.py::test_step_card_navigation` passed (5/5). After two small fixes, the affected tests were re-run: 3/3, then 2/2. I read all 14 PNGs. The two earlier PNGs from `screenshots/` (state filter, subworkflow tab) are now in `earlier_drafts/2/screenshots/`.

## Checked changes from iteration 3

- **Parameter-diff word breaking works.** The row-detail parameter table wraps at word boundaries. The old "Concatenat/e" split is gone.
- **Compact state dropdown looks right.**
  - Closed, it shows "State: any".
  - Open, it shows a two-column checklist, and the button label summarizes the selection ("State: cancelled, failed").
- **Tool-runs heading ellipsis works.** It now reads "Runs of Concatenate multiple datasets or coll…".
- **Disabled-tab tooltip.** "All runs" is greyed against the blue sibling tabs.
  - The tooltip is a native `title` on the `li` (`GTabs`), and native tooltips can't be captured in a screenshot.
  - The disabled `a.nav-link` has `pointer-events: none`, so hover should still reach the `li` and show the tooltip to real users. That comes from reading the CSS; I did not hover-test it.
  - The test asserts `aria-disabled` and the "subworkflow" title text.

## Changes made (worktree commits, not pushed)

- **`61064c7e5a1` fixes a regression in `BreadcrumbHeading.vue`.** Iteration 3 let the current crumb shrink alongside its ancestors. On the stored-workflow invocations page that turned "Invocations" into "Invocati…", even though "Workfl…" could have absorbed the overflow. In iteration 2, "Invocations" showed in full.
  - Any shrink at all, even sub-pixel, triggers the ellipsis. So I first tried a 100:1 shrink weight, and it still showed "Invocatio…".
  - The fix: the current crumb keeps `flex-shrink: 0` and gets `max-width: 100%`. Ancestors absorb the overflow first, and a title wider than the whole heading (the tool-runs page) still ellipsizes.
  - Vitest `BreadcrumbHeading.test.ts` passes 7/7 and prettier is clean.
- **`a002706f6e7` settles two screenshots in `test_comparisons.py`.**
  - The subworkflow shot now waits for the step's job details.
  - The editor shot now waits for the tool form's label input.
  - Both go through `_screenshot_settled`. Before this, the subworkflow shot showed the Job Execution Details skeleton and the editor shot showed the tool-form spinner.

## Index

| File | Shows | Notes |
| --- | --- | --- |
| `comparisons_step_all_runs.png` | Invocation step card, "All runs" tab: compact "State: any" dropdown, version checkboxes, 3 runs, v2 marked "this run", changed input highlighted | Input/output columns scroll horizontally. |
| `comparisons_step_all_runs_row_detail.png` | Expanded older row: "Parameters against the run you are viewing" (1 of 1 differ) beside the job details | The words now wrap cleanly. The narrow parameter column still makes the values tall, and the heading wraps onto 2 lines. |
| `comparisons_step_all_runs_diff.png` | "Selected runs" diff: 2 of 5 fields differ, "Only differences" on | Fine. |
| `comparisons_step_all_runs_transposed.png` | Transposed: runs as columns, fields as rows | The input1 "name" sub-label is clipped at the bottom edge of the card. This predates iteration 3. |
| `comparisons_stored_workflow_invocations.png` | `/workflows/{id}/invocations`: "Workfl… / two cats v2 / Invocations" with the "Compare outputs" button | Shows the breadcrumb fix. The tool panel still says "Loading Toolbox…" (side panel only). |
| `comparisons_compare_outputs_page.png` | `/comparisons?kind=output_runs`: full breadcrumb, filters, 3 runs | Output columns are off-screen right. |
| `comparisons_state_filter_menu.png` | The same page with the state dropdown open, cancelled and failed checked | The menu covers the version checkboxes and the "no runs" alert, as expected for a popover. |
| `comparisons_job_other_runs_action.png` | `/jobs/{id}/view`: loaded Job Execution Details with "Other runs of this tool" | Fine. |
| `comparisons_tool_runs_page.png` | `/comparisons?kind=tool_runs`: heading ellipsized, 6 cat1 runs with workflow and step context | The History column is clipped (horizontal scroll). |
| `comparisons_dataset_details_other_runs_action.png` | Dataset details: "Other runs of this tool" next to "Rerun" | Fine. |
| `comparisons_editor_compare_runs_link.png` | Editor node inspector for `second_cat`: "Compare runs of this step" above the fully loaded tool form | Settled in this pass. |
| `comparisons_mapped_step_reused_job.png` | Step-runs page for a mapped step: "Workfl… / Workf… / Runs of step "mapped_cat"", reused row expanded, "Batch of 2 jobs" pager with the "reused" badge, "Copied from Job API ID" | The current crumb is whole; before the fix it read "mapped_c…". The IN column header is clipped right. |
| `comparisons_subworkflow_all_runs_disabled.png` | Subworkflow invocation, step `random_lines`: "All runs" tab greyed, Job tab loaded | Settled in this pass. The tooltip is native, so it isn't visible here. |
| `invocation_graph_step_card.png` | Existing `test_step_card_navigation`: the tab strip includes "All runs" | The card body is empty because that test captures before details load. This predates the branch and was left alone. |

## Visual concerns for John

1. **The `BreadcrumbHeading` change touches a shared component** used by about 38 views. Titles that fit and ancestor truncation now behave as they did before the branch; only an over-long current title changes, and it now ellipsizes. Edge case: when the current title alone is wider than the heading, the ancestors collapse, and the tail of the current crumb, including its ellipsis, can be clipped by about the width of the separators. That case was clipped without any ellipsis before the branch.
2. **The row-detail parameter diff is still narrow** at 1280px with both side panels open. It is readable now but tall.
3. **Wide comparison tables scroll horizontally** at the test width, so output columns aren't visible in the mode 2/3 and tool-runs shots.

## Environment

- Galaxy ran on 8091 (temporary `bind` in the ignored `config/galaxy.yml`, now reverted). Vite ran on 5174 under node 22.20.0 with `GALAXY_URL=http://127.0.0.1:8091`. All watched ports were free at the start.
- `GALAXY_TEST_EXTERNAL=http://127.0.0.1:5174/`, so `ensure_registered` created its own users.
- I confirmed the cwd of all my processes (run.sh, gunicorn, pnpm/vite) was this worktree, then killed them by PID. The ports are clear.
- Final set:
  - 5 PNGs from the first full run: the 4 `step_all_runs*` shots and `invocation_graph_step_card`. Their pages don't use `BreadcrumbHeading`.
  - The subworkflow shot from the second run.
  - The other 8 from the final run, which includes the breadcrumb fix.
