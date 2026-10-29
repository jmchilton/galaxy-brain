Run via gpt-6-sol at medium effort.

# Codex review (re-harden): extraction_hid_copies_pdf_sections_26.1

I acted on Codex's single finding, which I confirmed: the by-ids path turned an explicitly empty input name into the default label. It now keeps `""` again, which matches base. The fix and a red→green test are folded into the extraction commit (`0174a1c6417`); head is now `ed8b2b5b188`.

Not acted on: none.

- **Divergence from #24225:** #24225 (`extract_next_followups:lib/galaxy/workflow/extract.py:956,960`) still has the `or` form, so the same regression exists there. Diverging costs nothing on merge-forward, since we already take 26.2's side of `extract.py`. Worth a one-line fix on #24225 as well.

<details>
<summary>Full review</summary>

- **Scope:** `git diff origin/release_26.1...352a092d820`. The brief was taken from the branch record (no reasoning included).
- **Coverage:**
  - Reviewed: the implementation files plus `history_contents.py`, `collections.py`, `model/__init__.py`, `schema/workflows.py` and `WorkflowExtractionForm.vue`.
  - Test diffs were read selectively; no tests were run.

**Finding P2 (correctness, certain): `extract.py:721`. ID extraction replaces an explicitly empty input name with a default.**
- **Codex's report:** the by-ids path uses `group.name or "Input Dataset"`, and likewise for collections, while the previous by-ids path and the current hid path keep `""`.
- **Codex's failure scenario:** `hda_ids=[id]`, `dataset_names=[""]` gives a step named and labelled `Input Dataset`.
- **Verdict: CONFIRMED.**
  - Base: `release_26.1` `extract.py:652` uses `dataset_names[i]`, which keeps `""`.
  - Hid path: `group.name if group.name is not None`.
- **Fix:** `is not None` on both by-ids branches.
- **New test:** `TestWorkflowExtractionByIdsApi::test_extract_by_ids_keeps_empty_input_name`.
  - Without the fix it fails with label `Input Dataset`. With the fix it passes.
  - The downloaded label is `None`, because export normalizes the stored `""`.
- **Full run:** `test_workflow_extraction.py` with the fix gave 65 passed, 1 skipped (the existing unconditional skip). The new test failed in that run only because of its first-draft assert; the pinned assert now passes.
- **Lint:** ruff, black and mypy are clean.

</details>
