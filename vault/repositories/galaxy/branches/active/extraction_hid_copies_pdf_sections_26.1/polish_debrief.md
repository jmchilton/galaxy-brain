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
