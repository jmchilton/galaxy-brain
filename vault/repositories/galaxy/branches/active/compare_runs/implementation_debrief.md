# Implementation debrief (after hardening iteration 2)

STATUS: READY for human review, with the open design decisions in [design_questions.md](design_questions.md). The biggest open decision is how to split the branch into PRs. Hardening iteration 3 is still to run.

Head: `565950820cd` on `jmchilton/compare_runs`, base `dev` `fd43a3c6ce8`, 63 commits. The diff is about 11.5k lines added and 0.3k removed, excluding the generated `schema.ts`; about 5k of the added lines are tests.

```
exists .../compare_runs/differential-review/snapshots/20261027T174159Z-hardening-565950820cd4.json
  hardening @ 565950820cd4 vs origin/dev (merge-base fd43a3c6ce80)
  since 20261027T103324Z-implementation-125ae963eb07:
    commits: 0 same, 9 rebased, 17 changed, 37 new, 53 dropped
```

## What the branch is

- **Scope:** all of [plan.md](../../../../../projects/compare_runs/plan.md), Phase 5 polish, the [re-scope](implementation_rescope_debrief.md) expansion and iteration 2's small expansion. See [initial_implementation_debrief.md](initial_implementation_debrief.md) for the base feature.
- **Endpoints:**
  - `GET /api/workflows/{id}/step_runs`, `GET /api/workflows/{id}/output_runs` and `GET /api/tool_runs`.
  - Cells are one of: dataset, dataset list, collection, value, or missing. A missing cell carries one of these reasons: not in this version, skipped, not run yet, no output, or inaccessible.
  - Filters: `states` (matches the state each row shows), `versions` for modes 1 and 2, and `tool_versions`.
  - Facets list available values only for versions the caller has run.
- **Entry points:**
  - All runs tab on the invocation step card;
  - "Compare outputs" on the stored-workflow invocation list;
  - "Other runs of this tool" on the job page and in dataset details;
  - "Compare runs of this step" in the workflow editor's NodeInspector (#10039);
  - the `/comparisons` page.
- **Table:** transpose, column chooser, per-column display, lazy row detail with highlighted parameter changes, two-row diff, CSV/TSV export, changed-cell highlights, batch job pager with a "reused" badge.
- **History** (backups: `compare_runs_pre_harden`, `compare_runs_pre_fold2`, `compare_runs_pre_refactor2`):
  - 7 "Baseline tests" commits come first.
  - Then 8 refactors that each stand alone on the base: metadata keys by name, workflow-fixtures helper, NavigatesGalaxy helper move, ItemPopoverLink, `totalMatches`, `downloadBlob`, `useExecutionJobs` with the Markdown selectors, and the router `reuseOnQueryChange` helper.
  - The feature follows, with one client schema regeneration.

## Iteration 2

Iteration 2 ran fresh hardening, with iteration 1's debriefs archived in `earlier_drafts/1/`.

- **[Test challenges](test_challenges_debrief.md):** dropped duplicate tests, moved unit tests to the API layer, added shared test utilities, and found dead fallback code, which was removed.
- **[Codex](codex_review.md):** two fixes:
  - the state filter now matches the row's displayed batch state;
  - rows now read their own version's columns.

  One question is left for John.
- **[Scope](scope_evaluation.md):** recommended a small expansion, which was taken in place rather than parking the branch. Changes:
  - the route meta was renamed `reuseOnQueryChange` to match #24307;
  - skipped outputs show as skipped in all modes;
  - an editor entry point;
  - the reused badge.

  This departs from the workhorse rule, which says to park when a second scope evaluation recommends a change. Each item was small and self-contained, and John asked for expanded scope.
- **[E2E polish](polish_e2e_tests_debrief.md):** E2E for the editor link, the mode 2 filter and the reused badge; 3/3 pass under Playwright.
- **[Thermo-nuclear](thermo_nuclear_review.md):** `comparisons.py` went from 969 to 501 lines, split by records, queries and state. Client run fields now come from one spec table, and row detail is pinned to the visible width.
- **[Baseline refactor](baseline_refactor.md):** the 8 base-level refactors listed under History.
- **Checks:** `make format` made no changes. `make mypy` shows 32 errors at the head and 32 identical errors at the base.
- **[Screenshots](screenshot_debrief.md):** 12 captures, all checked by eye.

## Tests (latest runs)

- API: `test_comparisons.py` 27/27, plus the moved probe in `test_jobs.py`.
- Unit tests and vitest for the comparison and touched directories: all pass.
- vue-tsc, eslint, prettier, ruff, black and isort: clean.
- Playwright E2E: 3/3. The Selenium/chromedriver backend has not been run locally.

## Known limits and follow-ups

- **Screenshots:**
  - The tool_runs heading is cut off without an ellipsis (`BreadcrumbHeading`).
  - The row-detail parameter diff is cramped at 1280px.
- Mode 1 assumes a version with no recorded outputs has every output seen on the page, because outputs aren't declared in the database.
- **Open upstream PRs:**
  - #24288 moves `get_count`, which will break CI for whichever of the two lands second.
  - #24307 overlaps on `WorkflowInvocationStep.vue` (5 lines here) and the router helper (names now match).
- Deferred: graph run-count badges, inner steps of subworkflows in mode 1, and the tool-form panel.

## Handoff

Not yet handed off; iteration 3 follows.
