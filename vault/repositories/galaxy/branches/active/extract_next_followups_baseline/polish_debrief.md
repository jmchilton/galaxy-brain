# extract_next_followups_baseline: polish debrief (2026-10-22)

Cut from `extract_next_followups` at its 7th commit, `bb9c9ad754a`, following DECOMPOSE_BASELINE_CHANGES_AND_POLISH. This was a light polish.

## Cut

- The 3 "Baseline tests" commits and 4 refactors form a clean prefix of the branch, matching `baseline_refactor.md`. Nothing was reordered.
- Not rebased. It merges cleanly into `release_26.2` `cd04fbc2dcd`, and it keeps #24225's SHAs, so that PR's diff shrinks once this merges.
- **Backport check:** later commits touch the baseline tests only to swap in feature-branch helpers (`ba571788952`, `d4142584e89`, `ccbe6ca1552`). They don't touch the refactored helpers. Nothing was backported.

## Verification (local, `bb9c9ad754a`)

- **Unit:** `test/unit/workflows/test_extract_{report,summary,parameters}.py` plus `test/unit/app/managers/test_markdown_*`, `test_workflow_extraction_summary.py`, `test/unit/app/test_markdown_{directives_doc,validate}.py` — 130 passed.
- **API:** `test_workflow_extraction.py` and `test_pages_history_attached.py` — 139 passed, 1 skipped. That skip isn't a baseline test: `test_hid_extract_connects_implicitly_converted_input` passes when run alone.
- **Fork CI:** none. Pushing the new branch started no runs, possibly because its commits were already on the fork.

## Checklist (GENERAL + WORKFLOW_RELATED)

No FAILs; the human-read item is left for John.
- The refactor keeps the same check order and exception types.
- Only difference: the `from_page_id` no-history 400 message now reads "Workflow extraction is only available…" instead of "Workflow report extraction…". The description notes it under Risks.
- **Optional items, not applied:** a change here would make this branch diverge from #24225's prefix.
  - `test_hid_extract_connects_implicitly_converted_input` doesn't assert that a conversion actually happened.
  - `get_accessible_notebook`'s error text names "Workflow extraction", a feature-specific wording on a general manager method.
  - `f2fef8905f5`'s message says "Pins dev behavior", but the base is `release_26.2`.

## Skipped per process

The strengthen subagent. The PR description follows the DECOMPOSE template.

## Not done

The main branch's full re-polish. #24225 is an open draft in John's review, and about 10 commits (E5–E8) landed after its 2026-10-17 polish.
