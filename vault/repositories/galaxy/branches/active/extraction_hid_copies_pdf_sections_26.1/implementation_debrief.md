Run via Claude Opus 5.5 (coordinator); subagents Claude Opus 5.5 at high effort, Codex gpt-6-sol at medium.

# Implementation debrief: extraction_hid_copies_pdf_sections_26.1

**STATUS: READY.** The scope was expanded once and re-hardened. Head is `2f0cd130446` (8 commits on `origin/release_26.1` `19281d57645`) and has been pushed to `jmchilton`.

```
created .../differential-review/snapshots/20261029T022655Z-hardening-2f0cd1304462.json
  hardening @ 2f0cd1304462 vs origin/release_26.1 (merge-base 19281d57645f)
  first snapshot: 8 commits, 10 files, 42 hunks
```

## Commits

1. `aa07cf68c2f` **Baseline tests:** hid extraction connects an implicitly converted input. Passes on base.
2. `5c8c0d23489` Route by-ids test helpers through `_extract_by_ids[_raw]`. Test-only refactor.
3. `d24ba1df126` Build extraction summary input rows in one `input_row` helper. No behavior change; same shape as 26.2's `_input_extraction_row`.
4. `4ffc90509f7` PDF/basic export renders `invocation_inputs()`/`invocation_outputs()` by object id.
5. `96db02d899e` Extraction:
   - copies of one original become one input;
   - converted inputs and copied tool outputs connect;
   - copies sent with different names → 400;
   - names that aren't parallel → 400, not 500;
   - the user-tool summary returns `custom_tool_inaccessible` instead of a 403.
6. `d3e327d5dcd` Extraction summary: one input card per original, listing copies in this history. **Re-scope.**
7. `3f571f849c5` Test: copies of a job-less collection share one input card.
8. `2f0cd130446` E2E: the extraction form extracts a list and its in-history copy as one input.

## Hardening

- **Round 1** (`earlier_drafts/1/`):
  - The test challenge split out the Baseline commit.
  - Codex found nothing.
  - The thermo-nuclear review made one typing fix.
  - The baseline refactor moved the test-helper refactor ahead of the fixes.
  - The scope evaluation recommended **expanding**: the 26.1 summary still listed the source HDCA once per copy, which gives the UI 400 "hdca_ids contains duplicates", and it gave each job-less copy its own card.
- **Re-scope** (`implementation_rescope_debrief.md`):
  - The symptoms reproduced red, and the summary half of #24225 (`90b36ff9158`, `202d3b3570c`) was ported.
  - The original scope is kept as the alt `extraction_hid_copies_pdf_sections_26.1_alt_original_scope` (`6189791f58c`).
  - The review (`subagents/rescope_review.md`) approved it and added the job-less collection test.
- **Round 2:**
  - The test challenge added an E2E test, and E2E polish made it assert the single card in the form.
  - Codex found a real regression, now fixed: by-ids extraction replaced an explicit `""` input name with "Input Dataset". It now uses `is not None`, as base does, with a red→green test.
  - The thermo-nuclear review changed nothing; its declines are all about keeping #24225's shape.
  - The baseline refactor moved commit 3 ahead of the fixes.
  - The scope evaluation recommended **keeping** scope.
  - `make format` and mypy are clean.
  - `screenshot_debrief.md` has before/after screenshots. Before shows the duplicate listing and the 400; after shows one card with both hids.
- **Tests:**
  - API `test_workflow_extraction.py`: 66 passed, 1 skipped (a pre-existing unconditional skip).
  - Unit markdown tests: 40 passed.
  - The Playwright E2E test passed.

## Decisions

- Keys stay `("dataset"|"collection", id)`, and helper names match #24225 so the port merges forward cleanly.
- Deliberate divergence from #24225: by-ids default names use `is not None` there; #24225 still uses `or`. `extract.py` takes 26.2's side on merge-forward anyway.
- More summary rows for multi-file uploads and local ids for collection copies are accepted.
- Deferred to dev: the thermo-nuclear cleanups, and cross-history tool rows that still list the source collection. #24225 doesn't fix the latter on the history path either.

## Open for John

- **Landing order:** #24225 has to reach `release_26.2` before this merges forward. Otherwise taking 26.2's side of `histories.py`/`extract.py` drops the fixes while their tests come through and fail.
- Push the one-line `is not None` fix to #24225?
- File a dev issue for cross-history tool-row outputs?
- Decomposition options (one PR vs. splitting off the PDF fix) are in `scope_evaluation.md`.
- No `initial_implementation_debrief.md` or implementation snapshot. The branch predates this hardening session.
