---
upstream_base_branch: release_26.1
---

# extraction_hid_copies_pdf_sections_26.1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.1...jmchilton:galaxy:extraction_hid_copies_pdf_sections_26.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/extraction_hid_copies_pdf_sections_26.1)

The `extract_next_followups` (#24225) fixes whose bugs also exist on `release_26.1`, ported onto 26.1's code (keys stay 26.1's `("dataset"|"collection", id)`; no `ContentRef`).

- PDF/basic export of default-report `invocation_inputs()`/`invocation_outputs()` renders the datasets (by id) instead of raw directives.
- Hid and by-ids extraction: copies of one original are one input, wired whichever copy is sent; tool outputs with in-history copies connect; implicitly converted inputs connect; copies sent with different names → 400.
- Input names not parallel to their ids/hids → 400 instead of 500.
- History extraction summary: one input card per original, listing this history's copies (no more "hdca_ids contains duplicates" 400 from the form); another user's (or deactivated) user tool marks its row `custom_tool_inaccessible` instead of 403ing the whole summary.

## Status

`branches_ready_for_final_review`: polished, 8 commits on `release_26.1`, head `2f0cd130446`, pushed 2026-10-28.

CI: unrelated reds only (on-base library Selenium, CWL setup).

## Polish

- [PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md), [checklist](pr_checklist.md), [debrief](polish_debrief.md).

## Decisions and references

- Scope expanded during hardening to port the summary-card half of #24225 (`90b36ff9158`, `202d3b3570c`) into 26.1's `histories.py`; original scope kept as alt `extraction_hid_copies_pdf_sections_26.1_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)).
- `test_extract_from_history_duplicate_input_names_rejected` left out: 26.2 feature test.
- By-ids default input names use `is not None` (keeps explicit `""`, as base); #24225 still has `or`.
- Landing order: #24225 must reach `release_26.2` before this merges forward. Merge-forward conflicts in `extract.py`/`histories.py`; take 26.2's side. Helper names match #24225 (`group_inputs_by_original`, `group_hid_inputs_by_original`, `_unconverted`, `_invocation_section`, `_original_key`).
