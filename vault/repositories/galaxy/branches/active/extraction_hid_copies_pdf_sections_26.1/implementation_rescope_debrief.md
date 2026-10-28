Run via Claude Opus 5.5 at high effort.

# Re-scope: extraction_hid_copies_pdf_sections_26.1

**Top line:** the scope eval's inferred symptoms reproduced on the 26.1 branch, so I ported the 26.1-shaped half of #24225's "one summary card per original" (`90b36ff9158` + `202d3b3570c`) into `HistoriesService.create_workflow_extraction_summary`. One new commit `902573855de` on top of the 4 existing ones (baseline still first). New head **`902573855de`**. Not pushed; the `jmchilton` remote's branch is still at the pre-baseline `6336ce84404`, so it needs a force-push. Original scope kept as `extraction_hid_copies_pdf_sections_26.1_alt_original_scope` (`alts/original_scope.md`).

## Red

Run on head `6189791f58c` with tests added, one process, port 8791. All 4 failed at a summary assert (not at a helper or setup error):

| Test | Failure on 26.1 |
|---|---|
| `test_extract_with_two_copies_of_one_collection_makes_one_input` (restored assert) | one row, outputs `[hdca, hdca]`: the source HDCA listed once per copy, never the local copy |
| `test_copies_of_job_less_dataset_list_one_input` (restored assert) | 2 rows, expected 1: each job-less copy gets its own card |
| `test_copies_from_a_history_no_longer_shared_extract_by_local_ids` (ported from `202d3b3570c`) | collection row lists the source HDCA id, not the two local copies. The source-id extraction is already rejected (400/403), so the card was unusable |
| `test_multi_file_upload_lists_one_input_per_file` (ported from `90b36ff9158`) | one row listing both uploaded files |

UI-level symptoms, confirmed with a throwaway probe test (not committed). It posted each checked input card's outputs under that card's one name, the way `WorkflowExtractionForm.vue` `selectedInputs` does:
- List plus in-history copy: payload `hdca_ids: [src, src]` → **400 "hdca_ids contains duplicates"**. After the fix: `[src, copy]` → 200.
- Library import plus copy: two cards. Distinct card names → **400 "hda_ids includes copies of one dataset with different dataset_names"** (this branch's own new 400, reachable by renaming one card). After the fix: one card, one name → 200.

## What changed

`lib/galaxy/webapps/galaxy/services/histories.py` (+46/−31):
- The fake-job and not-workflow-compatible branches built the same input `WorkflowExtractionJob`; both now call `add_inputs(producer_name, datasets)`, and one local `input_row` builds the row.
- `add_inputs` groups across producers by `_original_key` (reused from `extract.py`). Each original gets one row placed where it was first seen; a key placeholder in `jobs_list` holds the slot, filled after the loop.
- For collections, rows list this history's HDCAs with that original (`history.contents_iter(types=["dataset_collection"])`, keyed by `_original_key`), not the source HDCA `summarize()` recorded. Falls back to the item itself.
- `checked` is computed over the merged copies; producer name is the first producer's.
- Tool rows and the invalid-tool row are unchanged. A `tool is None` row stays a tool row.
- Imports `_original_key` and `IdKey` from `galaxy.workflow.extract` (same module `summarize` already came from) and `HistoryItem` from `galaxy.model`.

`lib/galaxy_test/api/test_workflow_extraction.py` (+83/−1): `_rows_by_type` and `_only_row_listing` mixin helpers, the two restored asserts, and the two ported tests. Bodies match #24225 except `connection_step_id` → 26.1's `_connection_step_id`.

## Commits

1. `aa07cf68c2f` Baseline tests: hid extraction connects an implicitly converted input
2. `5c8c0d23489` Route by-ids extraction test helpers through `_extract_by_ids[_raw]`
3. `40125f461e5` Expand `invocation_inputs`/outputs to object ids so PDF export renders them
4. `6189791f58c` Extraction: copies of one original are one input; 400 for unparallel names
5. **`902573855de`** Extraction summary: one input card per original, listing in-history copies (new)

## Tests

- API, full `lib/galaxy_test/api/test_workflow_extraction.py` on `902573855de`, single process, port 8791: **64 passed, 1 skipped** (was 62/1; +2 new tests). Skip is the existing unconditional `SkipTest`. No other API file covers `extraction_summary` (grep).
- Unit: `test_markdown_export.py` + `test_workflow_markdown.py` 40 passed; `test/unit/workflows -k "extract or summar"` 11 passed.
- Lint on both changed files: `ruff check`, `black --check`, `isort --check`, `mypy` clean. Pre-commit hooks passed.
- Selenium not run. `lib/galaxy_test/selenium/test_workflow_extraction.py` counts only tool-step cards (`tool_card_checkbox`), so input-card regrouping doesn't change its assertions.

## Client

No client change. The response schema (`WorkflowExtractionSummary`/`WorkflowExtractionJob`/`WorkflowExtractionOutput`) is unchanged; only row grouping and which ids are listed differ. `WorkflowExtractionForm.vue` already flatMaps every output of a checked input card under one name, which is exactly what the merged rows need. `WorkflowExtractionForm.test.ts` uses mocked fixtures. `90b36ff9158`'s client hunk is a comment inside `hasDuplicateStepLabels`, which 26.1 lacks. No openapi/schema regen needed.

## Decisions

- **More rows for multi-file uploads: accepted.** One row per original makes it inevitable, and on 26.1 the old single card silently lost distinct names (the second step went unlabeled via the `step_labels` dedup). Now each file is its own card, extractable under its own name.
- **Local ids for collection copies: accepted.** The old source id caused the duplicate-`hdca_ids` 400, or an access failure once the source history went private. Grouping by original is unchanged, so copies are still one card and one input step.
- **`_original_key` imported as a private name** rather than renamed public. Renaming touches 7 sites in `extract.py`; the import is the single reuse point and 26.2 replaces the whole body anyway. Easy to flip if a reviewer objects.
- **Not ported:** #24225's seeded/closure/boundary-producer handling ("copies from a cross-history producer share one seeded row"). 26.1 has no notebook closure.
- **Per-job `outputs`/`checked`** moved into the tool `else:` branch, the only place still using them, so input jobs don't serialize unused outputs.
- **Merge-forward:** `histories.py`'s summary body already conflicts with 26.2 (moved to `workflow_extraction_summary.py`); take 26.2's side. Test-file additions match #24225's text. **Landing order:** that only holds once #24225 is on `release_26.2`, which it isn't yet. If this branch merges forward first, taking 26.2's side drops the fix, but the restored asserts and two new tests still merge in and would fail on 26.2. Commit 4 already had this constraint; this commit adds 4 more dependent tests. Land #24225 on 26.2 first, or merge forward only after it does.

## Remaining

- Hardening re-run (normal review, test challenge) for the new commit per the re-scope process.
- `index.md` SHAs and status are stale (still `6336ce84404`).
- Force-push needed.
