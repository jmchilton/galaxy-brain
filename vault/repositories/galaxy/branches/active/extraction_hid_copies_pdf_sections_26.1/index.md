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
- History extraction summary: another user's (or deactivated) user tool marks its row `custom_tool_inaccessible` instead of 403ing the whole summary.

## Status

`branches_implemented_needs_ci`: two commits on `release_26.1`, head `6336ce84404`, pushed 2026-10-28.

Red check: every ported test except the converted-input guard failed on bare `release_26.1`. With the fixes, `test_workflow_extraction.py` 62 passed / 1 skipped, and workflow + markdown unit tests 249 passed.

## Decisions and references

- Scope: tests ported from #24225 that fail on bare `release_26.1`. `test_extract_from_history_duplicate_input_names_rejected` was left out: it's a 26.2 feature test that already exists on `release_26.2`.
- Not ported: one summary card per original (`90b36ff9158`). It rewrites `workflow_extraction_summary.py`, which doesn't exist on 26.1. So the 26.1 versions of `test_extract_with_two_copies_of_one_collection_makes_one_input` and `test_copies_of_job_less_dataset_list_one_input` assert only the extraction, not the summary card. Both still fail without the fix.
- Merge-forward into 26.2 conflicts with #24225's `ContentRef` rewrite of `extract.py`; take 26.2's side. Helper names match the 26.2 branch (`group_inputs_by_original`, `group_hid_inputs_by_original`, `_unconverted`, `_invocation_section`).
