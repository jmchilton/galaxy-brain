Run via Claude Opus 5.5 at high effort.

One test-only refactor now sits on the base, right after the Baseline commit: the by-ids extraction helpers go through shared `_extract_by_ids_raw`/`_extract_by_ids` (formerly the last commit, `c95d91a4995`, plus the `_extract_by_ids_raw` it depended on). No production code was refactored ahead of the fixes. Final tree identical to old head `c95d91a4995`. New head `6189791f58c`. Not pushed; needs a force-push.

## New history

Base `origin/release_26.1` `19281d57645` (unchanged).

1. `aa07cf68c2f` Baseline tests: hid extraction connects an implicitly converted input (unchanged SHA).
2. `5c8c0d23489` Route by-ids extraction test helpers through _extract_by_ids[_raw] (**refactor**, new). It adds `_extract_by_ids_raw` and `_extract_by_ids` to `_ExtractionHelpersMixin`. It routes the three by-ids helpers already on base through them: `_extract_and_download_workflow_by_ids`, `_extract_workflow_id_by_ids` and `_assert_extract_rejected`. The download goes through `workflow_populator.download_workflow`. Test code only, with no behavior change.
3. `40125f461e5` Expand invocation_inputs/outputs to object ids so PDF export renders them (was `fdc85e9625c`; clean rebase).
4. `6189791f58c` Extraction: copies of one original are one input; 400 for unparallel names (was `f1fc27272b8`, same message). The `_extract_by_ids_raw` hunk moved to commit 2. Its test diff no longer touches the three base helpers.

Old `c95d91a4995` was folded into commit 2; the rebase dropped it as already applied. Restore point: local `backup/extraction_hid_copies_pdf_sections_26.1_pre_baseline_refactor` at `c95d91a4995`. `backup/..._pre_baseline` was not touched.

## Test applied

A candidate moves to the base only if it changes code that's already on `release_26.1`, keeps base behavior, and has a caller there. The final tree has to stay byte-identical, so merge-forward to #24225 (`extract_next_followups`) is unaffected.

## Candidates considered, not moved

- **`_invocation_section` (markdown_util).** It is the fix itself: directives change from label-based to id-based. A base-behavior version would have to keep base's unquoted `input={label}` collection quirk. The fix would then rewrite its whole body, so the split adds churn and reviewers gain nothing.
- **`_validate_parallel_names` and the widened `except` in `histories.py`.** Both change behavior (500→400, and a 403→per-row flag).
- **Hoisting `IdKey`/`IdAssociations` and adding `InputKind`; adding `_original_key`.** On base these only serve the by-ids path, and the fix removes the sites they would replace (input loops move into `group_inputs_by_original`). Splitting them out means hand-cutting interleaved hunks in `extract.py` just to save about 10 lines in the fix diff.
- **Dropping the `WorkflowSummary` hid bookkeeping.** It can only be removed once the hid path stops keying by hid, so it belongs to the fix.
- **`copy_library_dataset` populator.** It has no caller on base. Making it a refactor means converting unrelated inline sites in other API test files. #24225's baseline pass declined it for the same reason.
- **Moving `_get_extraction_summary` into the mixin; `_extract_from_history_raw`.** At the boundary, the first would have no caller outside the summary class, and the second has no base caller. The hid-path base helper posts to `workflows` with `from_history_id`, not `extract_workflow`. Both stay with the new tests that need them.
- **Thermo-review deferrals** (one input-group type and builder for both paths, `_INPUT_FIELDS` tuples, default-name rule). These stay deferred to dev/26.2, because they'd diverge from #24225's shape.

## Validation

- `git diff c95d91a4995 HEAD` is empty.
- At `5c8c0d23489` (base source plus the refactor), API `test_workflow_extraction.py::TestWorkflowExtractionByIdsApi` ran as one process on port 8791: 23 passed. This shows the refactor is behavior-neutral on base.
- Unit `test_markdown_export.py` + `test_workflow_markdown.py`: 40 passed at `40125f461e5` and 40 passed at head `6189791f58c`.
- `ruff check`, `black --check`, `isort --check-only` and `mypy` on `lib/galaxy_test/api/test_workflow_extraction.py` were clean at `5c8c0d23489` and at head. Nothing under `lib/galaxy` changed.
- Full API `test_workflow_extraction.py` was not re-run at head. The tree is identical to `c95d91a4995`, where the thermo review recorded 62 passed and 1 skipped.

## Notes

- SHAs cited in `test_challenges_debrief.md` and `thermo_nuclear_review.md` (`c95d91a4995`, `f1fc27272b8`, `fdc85e9625c`) are now only reachable via the backup ref. `index.md` status is still stale.
- Nothing security-sensitive found.
