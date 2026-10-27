# Initial implementation debrief

All of the [plan](../../../../../projects/compare_runs/plan.md) is built (modes 1–3, three GET endpoints, a shared table, three entry points, the `/comparisons` page), plus Phase 5 polish: a two-row diff, filters, CSV/TSV export, changed-cell highlights and a batch job pager. Head `125ae963eb0` on `jmchilton/compare_runs`, base `dev` `fd43a3c6ce8`, 79 commits. Not yet hardened.

```
created .../compare_runs/differential-review/snapshots/20261027T103324Z-implementation-125ae963eb07.json
  implementation @ 125ae963eb07 vs origin/dev (merge-base fd43a3c6ce80)
  first snapshot: 79 commits, 101 files, 279 hunks
```

## What exists

- **API:**
  - `GET /api/workflows/{id}/step_runs?step_label=`, `GET /api/workflows/{id}/output_runs`, `GET /api/tool_runs?tool_id=`.
  - One `ComparisonQueryBase` and one `ComparisonTable` response. Cells are a discriminated union: Dataset, Collection, Value or Missing. Missing reasons are `not_in_version`, `skipped`, `not_run_yet`, `no_output` and `inaccessible`.
  - The owner filter is in SQL, and `total_matches` is counted after it.
  - One batched access check runs per page, so inputs from other users' histories that the caller can't read become `inaccessible`.
  - The statement count per page doesn't change with the number of rows; tests pin this.
  - Facets: `versions_available`, `output_labels_available`, `tool_versions_available`.
- **Job API:** adds `tool_version` and `copied_from_job_id` on job responses and a `tool_version` filter on `/api/jobs`.
- **Reusable helpers:**
  - `GalaxyRBACAgent.accessible_dataset_ids`, `SharableModelManager.accessible_ids`, `serialize_metadata(included=)`;
  - client `ItemPopoverLink`, which fixes the DOM id collision `DatasetPopoverLink` had;
  - `utils/download.ts`, `useExecutionJobs` (tool request or batch), `JobParametersDiff`;
  - a route `meta.keepMountedOnQueryChange`.
- **Client:**
  - A props-driven `ComparisonTable` (GTable) with transpose, a column chooser, a per-column display (link, metadata element or value), lazy row detail and a ★ current-run highlight.
  - The All runs tab on the step card. `WorkflowInvocationStep.vue` changes by 5 lines.
  - The `/comparisons?kind=…` page with filters and URL state.
  - "Compare outputs" on the stored-workflow invocations list, and "Other runs of this tool" on the job page.
- **Tests:**
  - 4 "Baseline tests" commits, plus 1 baseline commit for `useExecutionJobs`, which sits mid-branch.
  - 18+ API tests (also run on Postgres 16) and Python unit tests.
  - About 313 vitest tests.
  - 2 Playwright-run E2E tests in `test_comparisons.py`.

## Process

- Brain research came first, then a [phased plan](implementation_plan.md). Each phase was built by its own subagent, with a normal review between phases and a fix pass after each review.
- Review debriefs are in `subagents/`.
- Some review traffic was handled privately per SECURITY_REPORTS.

## Known gaps going into hardening

- The `useExecutionJobs` baseline commit isn't with the other baseline commits at the front of the branch.
- 79 commits: many fixups need folding into their feature commits.
- The E2E wasn't rerun after the last fix pass, and the row-detail parameter highlight has no E2E coverage.
- The Selenium (chromedriver) backend has never been run.
- `client/src/utils/navigation/schema.ts` was hand-edited because it is stale on dev.
- Open decisions are in [design_questions.md](design_questions.md).
