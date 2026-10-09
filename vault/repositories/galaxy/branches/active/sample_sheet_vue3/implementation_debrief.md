# sample_sheet_vue3 — implementation debrief

**STATUS: READY.** This is a recovery pass on a branch that predates the current process. The branch is now `5b921635fb2` on the fork: 4 commits on dev `02a2e659909`. Before this pass it was `ed2a6de8339`.

## Implementation
The sample sheet ag-grid components move to Vue 3 patterns: rows come from a watched source bound with `v-model`, a typed `parseSampleSheetValue` parses edits, and duplicate checks reuse `enforceColumnUniqueness`. The shared `useAgGrid` wrapper opts into compat `MODE: 3`. This fixes six editing bugs. Details are in the [initial debrief](initial_implementation_debrief.md) and the [polish debrief](polish_debrief.md).

## Recovery steps
- **Test challenge (`a0a45ce7795`)**, [debrief](test_challenges_debrief.md):
  - Dropped `DisplayCollectionAsSheet.test.ts`, which mocked `useAgGrid`, and replaced it with E2E `test_collection_sheet.py` (View Sheet happy path, plus a load error that was red on dev's ordering).
  - Collapsed one grid case that the parser table already covers.
- **Codex review (`c215573d915`, `29fce0cf9e5`)**, [codex_review.md](codex_review.md): two findings, both confirmed and fixed red-first.
  - `element_identifier` cells skipped the special-character check that the server enforces. This was a regression; the earlier "`.` accepted" claim was wrong.
  - FetchGrid refilled an array that ag-grid had marked raw, so a third target showed stale rows. The fix assigns a fresh array, and the new `FetchGrid.test.ts` runs on the real ag-grid.
- **Scope**, [scope_evaluation.md](scope_evaluation.md): no change. `AgRowData` union, `useGridHelpers` for `file_type`/`dbkey`, FetchGrid E2E and ag-grid 36 stay as follow-ups or separate branches.
- **Screenshots (`5b921635fb2`)**, [screenshot_debrief.md](screenshot_debrief.md): 11 shots, including the View Sheet grid, the load error alert and the filled chipseq grids. One line was added to capture the error alert. The duplicate-identifier toast isn't captured, since no E2E test renames identifiers.
- **PR description:** updated after each phase. The tests section now lists the new E2E and `FetchGrid.test.ts`, the wrong `.`-identifier behaviour change is gone, and the FetchGrid fresh-array fix is noted.

## Validation
- Vitest for Landing, Collections and RuleBuilder: 152/152 on node 22.20.0.
- vue-tsc, eslint and prettier are clean, apart from the existing hyphenation warnings.
- Both new E2E tests pass under Playwright and Selenium, and both chipseq E2E tests pass under Playwright. All were run one at a time.
- Fork CI on `5b921635fb2` has not been seen yet.

## Open for John
- Whether to add a toast for rejected edits. They revert silently, as on dev, and stricter float parsing makes that happen more often.
- `ag_grid_36` is still stacked on the pre-rebase `4dd34fe8db3`. Restacking it onto `5b921635fb2` will hit an add/add conflict on `FetchGrid.test.ts`, and probably a conflict on `SampleSheetGrid.test.ts`. Its `FetchGrid.vue` fresh-array hunk matches this branch.
