Run via Claude Opus 5.5 (coordinator); checklist + strengthening subagents Claude Opus 5.5 (medium / high), CI check Sonnet at low.

# Polish debrief: extraction_hid_copies_pdf_sections_26.1

**Top line:** no code changes; head stays `2f0cd130446`. Description, titles, tags written; strengthening round fixed wording only.

```
created .../differential-review/snapshots/20261029T183826Z-polishing-2f0cd1304462.json
  polishing @ 2f0cd1304462 vs origin/release_26.1 (merge-base 19281d57645f)
  since 20261029T022655Z-hardening-2f0cd1304462:
    commits: 8 same, 0 rebased, 0 changed, 0 new, 0 dropped
    hunks:   42 carried, 0 changed, 0 new, 0 dropped
```

## Steps

- **CI:** unrelated only. 6 Selenium/Playwright `test_library_contents.py::test_delete_dataset` reds (`has_n_items()` TypeError) also fail on `release_26.1`; CWL conformance failed with no failed job. Branch tests green.
- **Checklist** (`pr_checklist.md`): GENERAL only (extraction, not editor/scheduler); all 6 pass.
- **Strengthening:** no dev tasks. Wording fixes applied: 26.1-shipped-feature framing, API-safety and churn highlights, hid vs by-ids "connects" claim corrected, cross-history collection-copy fix added, 3 (not 2) 26.1-only tests, 16 of 17 tests red on base (empty-name test guards a draft regression), PDF "raw directives" wording, review advice no longer defers to draft #24225.
- **Galaxy checks:** `make format` no diff; mypy on 4 changed lib files clean.

## Open for John

- **Merge-forward is not clean.** Simulated #24225 on 26.2 + this branch: conflicts in 8 files. Take 26.2's side of code, keep both sides of tests, `populators.py`, `navigation.yml` (E2E needs its 2 selectors).
- **Push `is not None` fix to #24225?** Now required: otherwise `test_extract_by_ids_keeps_empty_input_name` fails on 26.2 after merge-forward.
- Keep PR draft until #24225 lands on 26.2? Split PDF commit (Option B) so it isn't gated?
- Optional: PDF export before/after screenshot (only fix without a visual).

## Re-framing: land first (2026-10-30)

John: this lands ahead of #24225, not after. Description flipped; gate removed.

- Merge-forward prepared: `extraction_hid_copies_pdf_sections_26.1_merge_26.2` @ `a599e531691` (merge of `2f0cd130446` into `release_26.2` `62dcd7b0a7a`), resolved toward #24225's 26.2 versions; summary fix hand-ported into `workflow_extraction_summary.py`. API extraction 107 passed / 1 skipped; pages 48 passed.
  - Dropped `test_extract_by_ids_keeps_empty_input_name` in the merge (John approved): 26.2 400s on `""` first; `test_extract_empty_input_name_rejected` covers it.
  - Changed 26.2's `test_referenced_copied_collection_normalizes_to_original` to #24225's `800163a0a04` expectation (one row listing the copy's id; stricter).
- #24225 rebased onto the merge: `extract_next_followups_on_26.1_merge` @ `1419d722008` (PR head `409c23e0b59` untouched; backup `backup/extract_next_followups_pre_26.1_merge_rebase_20261029`). 67 → 66 commits; 121 passed / 1 skipped. Library diff shrinks (e.g. `extract.py` 443→392, `markdown_util.py` 97→47); test file grows 891→919 from ordering moves. Several commit messages no longer match their (now test-only) contents.
- Open: reorder the merge's test file to #24225's positions and redo the rebase (~919→~380 test lines).
