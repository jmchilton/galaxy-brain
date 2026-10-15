# Invocation selection URLs — implementation handoff

STATUS: READY — reviewed implementation ready for human handoff; CI pending.

Issue [#24173](https://github.com/galaxyproject/galaxy/issues/24173) is implemented on `issue_24173_invocation_selection_urls`, based on `88127f42979` (`dev`). Implementation commit `585d65817ed` and browser-test commit `43167c36a4c` are pushed to `jmchilton/galaxy`. Final branch head: `43167c36a4c`. No PR was opened.

## Result and choices

The invocation Overview and Steps views accept zero-based `step_index`, one-based `step_number`, or an unambiguous `step_label`, with that precedence. Selection writes a unique readable label or falls back to a step number. Named card tabs (`jobs`, `outputs`, `config`), mapped-job dialogs, step outputs, and workflow outputs restore from URLs and update the URL as the user navigates. Share copies the current selection URL. Subworkflow error links preserve actual step indexes, including zero.

A route-only injected selection context owns synchronization; embedded invocation views retain local behavior. Query replacements keep the consolidated invocation component mounted. An explicit route metadata opt-in protects legacy query-driven report routes. Report notebook ids remain independent of selection fields.

Complete labels come from the workflow store's deduplicated editor-style workflow download, shared with graph/list loading. The summary API omits labels and incremental invocation records cannot define all unscheduled steps, so the final tests deliberately model those boundaries. Invocation records are matched by `order_index`, not array position. Graph centering waits for positive viewport and node dimensions. Step cards adapt named tabs to existing positional GTabs behavior with scoped rebuild/disposal guards; a shared tabs redesign is outside this issue. GenericItem exposes optional controlled expansion while preserving uncontrolled dataset/collection behavior.

The [scope evaluation](scope_evaluation.md) recommends retaining this scope. Standalone job-page links that would need to discover the job's step remain the issue's explicit follow-up. No other scope change or user decision is proposed.

## Validation

- Fresh independent [test challenge](test_challenges_debrief.md): **83 tests across 11 client suites pass**, including all 26 final selector cases, real router/Pinia/MSW workflow loading, modal filtering/paging, dynamic tabs, output expansion, embedded behavior, imported-step order, graph measurements, and route component lifetime. Graph-only confirmation after mechanical import cleanup also passes.
- Earlier consolidated client run: **92 tests across 15 suites pass**; the fresh run covers the final changed selector/lifecycle surfaces. These overlapping counts are not additive.
- Full `vue-tsc --noEmit` and production `vite build`: pass after the complete-workflow label remedy.
- Prettier and the implementation commit's pre-commit hooks, including client ESLint: pass. Python Black/Ruff checks and whitespace checks pass for the browser test.
- Existing browser `test_job_details`: passes (96.70 seconds), with an inspected step-job screenshot.
- Final browser `test_mapped_job_selection_urls`: **passes (82.35 seconds)**. Real API-created mixed-state mapped jobs verify all three aliases, state filter, page two, matching job dialog, Previous/query synchronization, close, and graph-node selection with unchanged invocation DOM identity. See `/tmp/issue24173-polish-mapped-verified-e2e.log`.
- Seven useful screenshots recorded; coordinator additionally inspected the baseline, final label-dialog, and changed-node captures. Full image QA and inventory: [screenshot debrief](screenshot_debrief.md).
- Vault `make validate`: 124 files, zero errors, 15 pre-existing advisory warnings. `make check-dashboard`: passes. The vault index already had unrelated drift; this work adds branch records without note frontmatter and does not regenerate unrelated catalog content.

All normal phase reviews, the [strict quality review](thermo_nuclear_review.md), [label-resolution follow-up review](subagents/label_resolution_review.md), and [final E2E delta review](subagents/final_e2e_review.md) have no outstanding recommendations. Browser details belong in [E2E polish](polish_e2e_tests_debrief.md). Environment and repeatable commands are recorded in [validation environment](validation_environment.md).

## Practical limits

CI has not run. Local acceptance uses headless Playwright with a real Galaxy development backend and API-created workflow jobs. Early runs exposed an unrealistic summary-label fixture, then a graph target clipped by the tool panel; the fixture boundary and browser zoom setup were corrected and independently reviewed. An intermittent upload setup timeout required a task-backend restart and successful disposable upload warmup. Screenshots remain local and gitignored.

The branch is registered in `branches_implemented_needs_ci`. READY means ready for review, with upstream CI still outstanding; no approval to open a PR was inferred.
