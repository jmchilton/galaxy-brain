# PR checklist: issue_24273_dataset_edit_alert_26.0

Evaluated at head `c11610da344` against `release_26.0` (`f90a897bfbe`); re-checked 2026-10-23 at rebased head `c6795829fb1` on `release_26.0` `817a4795098` (`git range-diff`: all 22 fix commits identical; line references still hold). Checklist: `gx_pr_checklists/GENERAL.md`. `WORKFLOW_RELATED.md` does not apply: the change is limited to the dataset view, preview, edit, and details UI. It does not touch workflows, invocations, or collection mapping.

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? **Pass.** A failed first load still blocks with "Dataset Not Available". A failed background refresh keeps the last loaded content and adds a warning that ends in "showing the last loaded version". Failed saves show the server's message.
  <details>

  - First load error: `DatasetView.vue:116` (unchanged block), test `blocks the view when the dataset cannot be loaded`.
  - Refetch error: the warning at `DatasetView.vue:121` (`.dataset-refresh-error`). Tests: `keeps the open tab and shows an alert when a refetch fails`, and `drops the refresh alert once a retried refetch succeeds`.
  - Preview recheck error: `DatasetDisplay.vue:106` (`.dataset-preview-refresh-error`). If the check fails before the preview loads, it is still a danger alert. Tests: `keeps the preview when a later preview check fails` and `reports a failed preview check before the preview loads`.
  - Details refresh error: `DatasetDetails.vue:119`. Test: `keeps the last details when refreshing them fails`.
  - Save error: `DatasetAttributes.vue:68`, backport of #23985. Test: `shows why saving failed`.
  - While metadata is set, the Datatypes tab shows an info alert (`DatasetAttributes.vue:161`). Test: `stays on the Datatypes tab while a datatype change sets metadata`.
  - Soft spot, see the open questions: if the form reload after a *successful* save fails, the success alert is replaced by a red "reload failed" (`DatasetAttributes.vue:92`). Test: `keeps the forms when reloading them after a save fails`.
  </details>
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? **Pass.** The tests mount components with MSW responses and assert on the DOM, including element identity to show a tab stayed mounted. Two weak assertions are already flagged in [test challenges](test_challenges_debrief.md) and are waiting on John.
  <details>

  - Store getters (`isLoadingDataset`, `getDatasetError`) are asserted only as setup preconditions, to prove a refetch is actually in flight. The behavior under test is checked on the DOM. Examples are `DatasetView.test.js` "Background refresh" and `DatasetDisplay.test.ts` `keeps the preview frame…`.
  - The flagged weak tests are `settledDataset.test.ts:57` `is null until the dataset first loads`, and `DatasetDisplay.test.ts:129`, which asserts the store name rather than the component.
  - Minor: the `findAll("button").length).toBe(6)` check at `DatasetAttributes.test.ts:253` counts buttons. It copies the existing pattern at line 86.
  </details>
- [x] Are baseline tests in their own leading commits (if applicable)? **Yes, merged ahead in #24297.** `b7db9b4199a`, `976a7079009` and `27be4062dab` (tests only), the baseline refactors `f02f5b494c8`, `d339169598f`, `9eb5612045e` and the #23985 backport `498f65b48a3` are now on `release_26.0`; the branch carries only the 22 fix commits.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A. The `settledDataset.ts:15` docstring describes the blanking that happens when a view gates on the store's loading state. It does this only to explain why the composable exists, not as a history.

## Fixes made

None. No item failed.

## Open questions for John

1. If the form reload after a successful save (or after a background update) fails, `DatasetAttributes.vue:92` replaces the success alert with a red danger alert. Should it keep the success message and show the reload error as a non-blocking warning instead? The other components handle refresh errors that way.
2. That same `fetchForms` catch still reads `error.response?.data?.err_msg`, while `submit` now uses `errorMessageAsString` (the #23985 backport). Should they be aligned? The cost is a tiny extra change outside the bug's direct scope.
3. Test removals from test challenges, already pending: the `settledDataset` "is null until…" test and the store-name assertion in `DatasetDisplay`.

## Validation

- vitest (node 22.20.0), on `src/components/Dataset/`, `src/components/DatasetInformation/` and `src/composables/settledDataset`: 10 files, 73 passed, 2 skipped.
- The worktree is clean.
- 2026-10-23 at `c6795829fb1`: same vitest result (73 passed, 2 pre-existing skips); `vue-tsc --noEmit` exit 0; eslint 0 errors (4 pre-existing warnings), prettier clean.
