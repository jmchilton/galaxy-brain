screenshots successfully obtained

Hardening iteration 2. `test_comparisons.py` passed 3/3 under Playwright (headless, 142s), and 12 screenshots were checked by eye. The previous 4 PNGs are now in `earlier_drafts/1/screenshots/`.

## Changes made (worktree commit `565950820cd`, not pushed)

- **New `_screenshot_settled(label, subject)` helper in `test_comparisons.py`.** Before capturing, it waits until no `[data-description="loading message"]` is visible, then waits `UX_RENDER` for `JobInformation`'s 0.3s fade-in. Then it scrolls the subject into view and takes the screenshot.
  - Used for the row detail, reused badge, job page and dataset details shots.
  - Before this, the Job Execution Details cards were captured half-faded or empty, with "Loading dataset…" spinners. On the dataset page the link scrolled out of frame once the card expanded.
- **3 new screenshots** of entry points this branch changed: the stored-workflow invocations heading, the job page, and dataset details.
- **`NodeInspector.vue`: the "Compare runs of this step" button changed from `mb-2` to `mb-3`.** The tool form's sticky header underlay paints white 1rem above itself, which cut off the button's bottom border. Vitest `NodeInspector.test.ts` passes 5/5 and prettier is clean.

## Index

| File | Shows | Notes |
| --- | --- | --- |
| `comparisons_step_all_runs.png` | Invocation step card, "All runs" tab: 3 runs, v2 marked "this run", the changed input highlighted | Input/output columns run off to the right; the table scrolls horizontally. |
| `comparisons_step_all_runs_row_detail.png` | Expanded older row: "Parameters against the run you are viewing" (1 of 1 differ), with the job details beside it | **At this width the parameter table is narrow and "Concatenate Dataset" breaks mid-word ("Concatenat/e").** The detail's heading sits just under the step-card header because the shot scrolls to the changed parameter. |
| `comparisons_step_all_runs_diff.png` | "Selected runs" diff panel: 2 of 5 fields differ, version and input1 highlighted, "Only differences" on | Fine. |
| `comparisons_step_all_runs_transposed.png` | Transposed: runs as columns, fields as rows | Fine. The input1 row's "name" sub-label is clipped at the bottom edge of the card. |
| `comparisons_stored_workflow_invocations.png` | `/workflows/{id}/invocations`: breadcrumb "Workflows / two cats v2 / Invocations" with the "Compare outputs" button; grid shows 3 runs | "Workflows" ellipsizes to "Workfl…" with the tool panel open. That is by design in `BreadcrumbHeading`. The tool panel still shows "Loading Toolbox…" (side panel only). |
| `comparisons_compare_outputs_page.png` | `/comparisons?kind=output_runs`: breadcrumbs, filters (state, version, outputs), 3 runs | The output columns are off-screen right (horizontal scroll). Newest run is "scheduled" (invocation state), the others "completed". |
| `comparisons_job_other_runs_action.png` | `/jobs/{id}/view`: Job Execution Details card fully loaded, with "Other runs of this tool" at the bottom | Fine. |
| `comparisons_tool_runs_page.png` | `/comparisons?kind=tool_runs`: 6 cat1 runs with "job in workflow … step …" context, tool version 1.0.0 | **The single-item heading "Runs of Concatenate multiple datasets or collec…" is cut off with no ellipsis.** `BreadcrumbHeading` makes inactive items `nowrap` and non-shrinking, and the heading hides overflow. The History column is clipped (horizontal scroll). |
| `comparisons_dataset_details_other_runs_action.png` | Dataset details: Job Execution Details with "Other runs of this tool" next to "Rerun" | Fine. |
| `comparisons_editor_compare_runs_link.png` | Workflow editor node inspector for `second_cat`, with the "Compare runs of this step" button above the tool form | The button was clipped before the `mb-3` fix; it is now fully visible. |
| `comparisons_mapped_step_reused_job.png` | Step-runs page for a mapped step: reused row expanded, "Batch of 2 jobs" pager with the "reused" badge, job details showing "Copied from Job API ID" | Fine. |
| `invocation_graph_step_card.png` | Existing `test_step_card_navigation` (not modified): the step card tab strip now includes "All runs" | That test captures before the Job tab's details load, so the card body is empty. This predates the branch and was left alone. |

## Visual concerns for John

1. **Tool-runs page heading clips without an ellipsis** when the tool name is long. Two possible fixes:
   - Shorten the title in `ComparisonView` (e.g. use the tool id, or a "Tool runs" breadcrumb plus the name in the description).
   - Let `BreadcrumbHeading`'s last inactive item ellipsize. This is a shared component.
2. **The row-detail parameter diff is cramped** at 1280px with the history panel open, so parameter names wrap mid-word.
3. **Wide comparison tables scroll horizontally** at the test width. Expected, but output columns aren't visible in the mode 2 and 3 shots.

## Environment

- Galaxy ran on 8091 (temporary `bind` in the ignored `config/galaxy.yml`, reverted afterwards) and Vite on 5174. Both listeners' cwd was confirmed to be this worktree.
- 8080 and 5173 belonged to the `invocation_graph_embedded_outputs` worktree.
- `GALAXY_TEST_EXTERNAL=http://127.0.0.1:5174/` without an end-to-end config, so `ensure_registered` creates its own user.
- Both servers were killed by PID afterwards.
- The scratchpad shot directories held stale 12:0x PNGs from an earlier session, so the new captures got `-1` suffixes. The final set came from a uniquely named directory, so every file is from this run.
