# Presentation capture debrief (stage 1)

presentation screenshots successfully obtained. 16 PNGs cover beats 1–14 (13 and 14 were optional). Every image was checked by eye. No product fixes were needed.

- PNGs: `../screenshots/presentation/` (gitignored), 3200 px wide (1600 CSS px at device scale factor 2).
- Capture module: [capture_comparisons_presentation.py](capture_comparisons_presentation.py). It is a copy of the uncommitted `lib/galaxy_test/selenium/test_comparisons_presentation.py` in the worktree.
- Environment, ports, PIDs and the run command: [environment.md](environment.md).
- No product patch, so there is no `product_fixes.patch`. The worktree's only change is the new, untracked capture module.

## How the harness works

- It runs in the same `SharedStateSeleniumTestCase` framework as the E2E suite, one test per beat. `setup_shared_state` builds the demo data once.
  - `PRESENTATION_STATE_FILE` caches the demo user and ids, so later runs skip the data build.
  - The module is skipped unless `GALAXY_TEST_PRESENTATION=1` is set.
- **Viewport.** 1600×1000 CSS px at device scale factor 2.
  - The framework's Playwright page is fixed at 1280×1000, and its scale factor can only be set when a context is created.
  - So the module wraps `driver_factory.get_playwright_driver` and swaps in a page from a new context with `viewport` and `device_scale_factor` set.
  - With scale 2, the framework's per-step debug `snapshot()` screenshots hung in `Page.screenshot` during login. The class overrides `snapshot` to do nothing, and real captures work.
- **Panels.**
  - The Tools panel and any other activity panel are closed by clicking their active activity. This is the real UI, and the choice is remembered.
  - The history panel is collapsed with its FlexPanel button.
  - The one DOM tweak: a style rule hides the floating "History" re-open tab, which otherwise sits over the page's top-right buttons ("Rerun").
  - On invocation pages the run-summary header is collapsed through its own "Collapse header" button.
  - Panels are closed again just before each capture, because some pages reopen Tools after their first render.
- **Settling.** Captures wait until no loading message, `.fa-spin`, spinner or skeleton is visible. They then blur focus, park the mouse in the bottom-right corner, and wait one render cycle.
- **Cropping.** Full-page table views are clipped just below their content (`crop_to=".comparison-view > *"`, minimum height 450 CSS px), so there's no empty lower half. The masthead and activity bar stay in for context.
- **Columns.**
  - Output columns show `metadata: data_lines` through the real column menu.
  - The always-empty "Reused" column is hidden through the real cog column chooser, except where reuse is the point (09b, 12).

### Demo data, all real runs

- Datasets: `1.bed` ("CCDS coding exons") and `2.bed` ("RefSeq coding exons"), in history "Exon selection study".
- Workflow "Exon selection": input `exons`, then "Keep long exons" (Filter1, `cond`), then "Top exons" (head) and "Random sample" (random_lines1, seed `galaxy`), then "Exon report" (cat_list).
  - Outputs are renamed "Long exons", "Top exons", "Random sample" and "Exon report".
  - The workflow has `doc`, `license` and a creator.
- Versions and runs:
  - v1: `c3-c2>=200`, top 10. Runs on CCDS and RefSeq.
  - v2: `c3-c2>=100`. Runs on CCDS and RefSeq.
  - v3: top 5. Runs on CCDS. This is the newest run, "this run".
- Results:
  - Long-exon line counts: 22/26 under v1, 42/48 under v2 and v3.
  - Report: 15 lines under v1 and v2, 10 under v3.
- "Exon selection (batch)": Filter1 mapped over a two-element list "Exon sets", in history "Exon selection batch". It runs once, then again with `use_cached_job`; both jobs of the rerun are verified as copied from the first run.
- "Exon selection (nested)": the filter step inside a subworkflow labelled "Select long exons", then head.

### Layout check

I compared all four options on the editor canvas (exploration test `test_99_layout_options`, `PRESENTATION_EXPLORE_DIR=...`):

- **No positions:** nodes stacked in a pile. This was the original problem.
- **gxformat2 `apply_layout(strategy="layered")`:** spacing is 220 px horizontally and 100 px vertically, smaller than editor nodes (about 250 px wide, 130 px tall). The nodes touch, and "Top exons" and "Random sample" overlap.
- **Editor Auto Layout (ELK):** clean. But it renumbers steps (Random sample becomes 3 and Top exons 4), and it only exists as an unsaved editor change. It would have to be saved before the runs.
- **Hand-set `position:` values (chosen):** columns 270 px apart and branches 200 px apart. Clean in both the editor and the invocation graph, and deterministic.

## Screenshots

| File | Beat | Shows | Remaining weaknesses |
| --- | --- | --- | --- |
| `01_invocation_step_all_runs_tab.png` | 1. Problem and entry point | <ul><li>Invocation of v3 with a tidy 5-node graph at 90%.</li><li>"Keep long exons" selected, its card on "All runs".</li><li>Five runs, the v3 run tagged "this run".</li><li>RefSeq rows have the changed-input highlight, and the output line counts are highlighted where they differ from this run.</li></ul> | <ul><li>The "Showing 1–5 of 5" footer is just below the fold.</li><li>The minimap takes the graph's bottom-right corner.</li><li>The "Overview / Steps…" tab bar is still shown.</li></ul> |
| `02_step_runs_page.png` | 2. Full-page step runs across versions | `/comparisons?kind=step_runs`: breadcrumb, version checkboxes, five runs across v1–v3, input names, and output line counts (22/26 to 42/48) | <ul><li>**No "this run" badge and no changed-input highlight:** the full page has no viewed run, by design (see below). Beat 1 carries both.</li><li>Wide strip (3200×962).</li></ul> |
| `03_row_detail_parameter_diff.png` | 3. Row detail parameter diff | <ul><li>The invocation's **Steps** tab (full width, page scroll), "All runs".</li><li>The v1 CCDS row expanded.</li><li>"Parameters against the run you are viewing: 1 of 3 parameters differ", `c3-c2>=200` against `c3-c2>=100`, beside the job's details.</li></ul> | <ul><li>The changed-parameter row isn't highlighted strongly; its row tint is subtle at this size.</li><li>The output column shows names, not line counts.</li><li>The run summary header is expanded (Steps tab).</li><li>Job details are cut at the bottom.</li></ul> |
| `04_selected_runs_diff_only_differences.png` | 4. Selected runs diff | v3/CCDS against v1/RefSeq, "Only differences" on: "3 of 5 fields differ" (version, input, output 42 vs 26), and "Job parameters: 2 of 3 differ" (input and condition) | Good. Run headers read "2 minutes ago" / "3 minutes ago" (relative times only). |
| `05_transposed.png` | 5. Transposed | Runs as columns; rows Version/State/History/input/out_file1. The "name" and "metadata: data_lines" sub-labels are fully visible (the original clipped one). | All column headers are relative times, which don't distinguish runs well. |
| `06_stored_workflow_invocations_compare_outputs.png` | 6. Invocations list | `/workflows/{id}/invocations`, five completed runs, "Compare outputs" top right | The stock grid shows no version column, so the five rows look identical. The button is small at top right. |
| `07_output_runs_page.png` | 7. Compare outputs | `kind=output_runs`, all three output columns **visible** with line counts: long exons 22–48, top exons 10/5, exon report 15/10 | Good. Output headers use the monospace label style. |
| `08a_filters_v1_successful.png` | 8. Filters (result) | "State: successful" plus version v1 ticked: two v1 rows | Banner-shaped crop. |
| `08b_filters_state_menu_open.png` | 8. Filters (menu) | The same with the state checklist open, "successful" ticked | The open menu covers the v1 checkbox and the left of the table, as a popover does. Use 08a for the result. |
| `09a_job_page_other_runs_action.png` | 9. Job page entry point | `/jobs/{id}/view` for the v3 Filter job: stdout "Filtering with c3-c2>=100, kept 64.62%…", "Other runs of this tool" at the card's bottom right | The link is small relative to the page. Job Metrics run off the bottom (fine). |
| `09b_tool_runs_page.png` | 9. Tool runs page | "Runs of Filter": eight rows across three workflows. Batch rows say "batch of 2 jobs… mapped over 2 jobs", one is marked "reused". All columns are visible, History included. | Tall (3200×1488). Includes the nested and batch runs, which is a busier story than beat 2. |
| `10_dataset_details_other_runs_action.png` | 10. Dataset details entry point | "19: Long exons" (42 regions), tool parameters, job details, "Other runs of this tool" beside "Rerun" at the bottom | The page is scrolled so the link sits at the bottom, and the dataset's own info rows are scrolled off. API ids and the UUID are visible (test ids only). |
| `11_editor_compare_runs_link.png` | 11. Editor entry point | Tidy canvas (five nodes, no overlaps or invalid terminals), "Keep long exons" inspector with "Compare runs of this step" at the top and the `c3-c2>=100` condition | <ul><li>"Best Practices" still shows a "!" badge (probably the missing readme or step annotations).</li><li>The lower half of the canvas is empty.</li><li>The node title "2: Keep long exons" wraps to two lines.</li></ul> |
| `12_mapped_step_batch_reused_job.png` | 12. Mapped step and job cache | Batch workflow's step runs: reused row expanded, "Batch of 2 jobs" with pager 1/2, a "reused" badge in the row and in the pager, "Copied from Job API ID", output "7: Long exons — a list with 2 bed datasets" | The left "Outputs" column is mostly empty space under one card. |
| `13_subworkflow_all_runs_disabled.png` | 13. Subworkflow limitation (optional) | Subworkflow invocation, "Keep long exons" selected, "All runs" tab greyed, Job tab loaded | <ul><li>The native tooltip explaining why can't be captured.</li><li>The greyed tab is a subtle cue.</li><li>Graph at 100% with lots of empty canvas.</li></ul> |
| `14_export_menu.png` | 14. Export (optional) | Export dropdown open with CSV/TSV over the step-runs table | The menu covers the out_file1 header. The file itself isn't shown. |

## Gaps and things I couldn't do

- **Beat 2's "this run" and changed-input highlight on the full page.**
  - `/comparisons` takes no viewed-run parameter.
  - `ComparisonTable` only shows "this run" and changed cells when it has a `currentRunId`, and row details only show the parameter diff with a `currentJobId`. Only the step tab (`StepRunsTab`) passes these.
  - Showing them on the full page is a feature change, not a presentation fix, so I didn't make it.
  - Beat 1 (tab at full width) and beat 3 (Steps tab) carry these cues. The full-page beats (2, 4, 5, 7, 8) show versions and real differences.
- **Beat 3 on the full page.** For the same reason, the row-level parameter diff only exists in the tab, so beat 3 uses the invocation's Steps tab, the widest place the tab appears. That fixes the original's narrow, tall layout.
- **Relative timestamps.** Every "Invoked" cell reads "N minutes ago" because the data is minutes old. I didn't fake times.
- **The username is a random test user** (`analyst-xxxx`), and the quota meter is in the masthead. I left both alone.
- **The nested workflow's name.** An embedded subworkflow is named from its gxformat2 `label`, and is otherwise "Workflow". The module sets `label`, so in the final set 13's header and 09b's first row read "Select long exons".
- **Machine quirks** (no zsh, no fonts, missing Chrome libraries) are worked around without sudo; see `environment.md`.
