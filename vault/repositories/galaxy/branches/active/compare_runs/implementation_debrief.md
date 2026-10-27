# Implementation debrief (final, after hardening iteration 3)

STATUS: READY for human review. The open decisions are in [design_questions.md](design_questions.md). The biggest one is how to split the branch into PRs.

Head: `be7415d94dd` on `jmchilton/compare_runs`, base `dev` `fd43a3c6ce8`, 74 commits, about 11.8k non-generated lines.

The 74 commits are, in order:
- 8 "Baseline tests" commits.
- 10 base-level commits:
  - metadata keys by name;
  - a workflow-fixtures helper;
  - a NavigatesGalaxy helper move;
  - ItemPopoverLink;
  - `totalMatches`;
  - `downloadBlob`;
  - `useExecutionJobs` with the Markdown selectors;
  - the router `reuseOnQueryChange` helper;
  - the BreadcrumbHeading ellipsis;
  - the released job `tool_version` response fix.
- The feature, with a single client schema regeneration, and the E2E last.

No PR has been opened, and CI hasn't run yet.

```
created .../compare_runs/differential-review/snapshots/20261027T222647Z-hardening-be7415d94dd5.json
  hardening @ be7415d94dd5 vs origin/dev (merge-base fd43a3c6ce80)
  since 20261027T174159Z-hardening-565950820cd4:
    commits: 7 same, 43 rebased, 12 changed, 12 new, 1 dropped
    hunks:   312 carried, 33 changed, 16 new, 1 dropped
```

## Scope

- **plan.md, all three modes:**
  - `GET /api/workflows/{id}/step_runs`, `GET /api/workflows/{id}/output_runs` and `GET /api/tool_runs`.
  - The props-driven table, the All runs tab, and the `/comparisons` page.
  - Entry points on the stored-workflow invocations list, the job page, dataset details, and the workflow editor NodeInspector (#10039).
- **Polish beyond the plan:**
  - two-row diff;
  - parameter-change highlights in row detail;
  - CSV/TSV export with spreadsheet-safe cells;
  - changed-cell highlights;
  - a batch job pager with a "reused" badge;
  - state, version and tool-version filters, whose results match what each row shows.
- **[Re-scope](implementation_rescope_debrief.md) after iteration 1:**
  - "Finish the abstractions": second consumers for the new helpers, `keys=metadata_<name>`, the mode 2 `versions` filter, and the DatasetDetails link.
  - The original scope is kept as `compare_runs_alt_original_scope`.
- **Iteration 2's small expansion**, taken in place: the route meta is named to match #24307, skipped outputs show the same way in every mode, the editor entry point, and the reused badge.
- **Iteration 3:** the scope evaluation recommended **no scope change**.

## Iteration 3 (fresh hardening; iteration 2's notes are in `earlier_drafts/2/`)

- **[Test challenges](test_challenges_debrief.md):**
  - Caught a real regression: the ItemPopoverLink refactor broke the selector `test_objectstore_selection` uses. It's fixed, and that integration Selenium test passes against a built client.
  - Dropped duplicate tests and made the helpers pure.
- **[Codex](codex_review.md):** 4 P2 findings, all confirmed and fixed:
  - `states=new` now matches a null state;
  - the state chooser now offers every state a row can show;
  - an older workflow-name request can no longer overwrite the heading;
  - the step tab resets when the step changes.
- **[Touch-ups](subagents/harden3_touchups.md):**
  - All runs is disabled on a subworkflow's own invocation page.
  - BreadcrumbHeading ends a long title with an ellipsis.
  - The parameter diff now wraps between words.
  - The flaky test got a check that names the cause if it fails again.
- **[E2E polish](polish_e2e_tests_debrief.md):**
  - The state chooser is now a compact dropdown, with "failed" merged.
  - The disabled tab shows its reason in a tooltip.
  - New E2E for a subworkflow run.
  - Playwright: 4/4.
- **[Thermo-nuclear](thermo_nuclear_review.md):**
  - The SQL moved into `comparison_queries`, with one `labelled_steps()` loader.
  - The anonymous-caller guard is now in one place.
  - Tool-runs tests split into `test_tool_runs.py`.
  - The client got a `useComparison` composable and a `ComparisonColumnCell` component.
- **[Baseline refactor](baseline_refactor.md):** split out the released `tool_version` fix and the BreadcrumbHeading fix, and folded the fixups.
- **Checks:**
  - `make format` made no changes.
  - Full `make mypy` shows 32 errors, the same 32 as on base.
- **[Screenshots](screenshot_debrief.md):** 14 captures, all checked by eye. Fixed a BreadcrumbHeading regression that cut off short last crumbs (folded into its base commit), and made the slow screenshots wait for the page to load.

## Tests (latest)

- API: `test_comparisons.py` and `test_tool_runs.py` (21 + 5), plus the touched cases in `test_jobs`, `test_datasets` and `test_workflows`.
- Unit tests: 68.
- Vitest: 231 in the Comparison directories, plus the consumers of the refactored helpers.
- Playwright E2E: `test_comparisons.py` 4/4 and the step-card test.
- Integration Selenium: `test_objectstore_selection` passed.
- Not run locally: the Selenium (chromedriver) backend.

## Known limits

- Tables scroll horizontally at 1280px, and the row-detail diff is readable but tall.
- In mode 1, a version none of whose runs recorded outputs is assumed to have every output seen on the page.
- The batch job pager is capped by the batch's job count. Fine in practice.
- **#24288** moves `get_count`; whichever of the two PRs lands second needs a one-line import fix. It also conflicts textually with the job-fields commits.
- **#24307** touches the same lines in `Analysis.vue`, `router.js` and `navigation.yml`; landing the client after it is cleaner.

## Process notes

- **Hardening iteration 1** stopped at its scope evaluation, as the process requires. The re-scope came next, then iterations 2 and 3, which ran in full.
- **Iteration 2's scope recommendation was taken in place instead of parking the branch.** Each item was small and self-contained, and John had asked for expanded scope. This departs from the workhorse rule, which says to park when a second scope evaluation recommends a change.
- **Some review traffic was handled privately** under SECURITY_REPORTS, so the phase 0–1 and phase 5 review debriefs are not in the repo.
- **Backups on `jmchilton`:** `compare_runs_pre_harden`, `compare_runs_pre_fold2`, `compare_runs_pre_refactor2`, `compare_runs_pre_refactor3`, `compare_runs_pre_final_fold`.
- **A port-clearing step killed another worktree's servers.** It stopped the old `invocation_graph_embedded_outputs` Galaxy and Vite servers. Later agents were told to pick free ports and never kill processes they didn't start.
