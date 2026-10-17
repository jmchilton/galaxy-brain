# Codex review (origin/dev...f1d8797ae2f) — debrief

Acted on all 3 findings, all CONFIRMED red-first and fixed, one commit each: `cec95bf0490` (copies card), `95a9a4ffc01` (indented galaxy cell), `1957861444e` (copied map output). Pushed; head `1957861444e`.

Not acted on:
- F1: a multi-file fetch (one job, several *distinct* originals) still gives one card with one name. Before this fix the form disabled Create; now Create is enabled and the server returns 400 ("workflow input names must be unique"). That card couldn't be extracted before either, so this isn't a regression, just out of scope. The fix would be a summary change: one card per original.
- F2: indented galaxy cells are dropped with a warning, not rewritten to labels (see the rationale below). Notebook seeding (`referenced_content_ids`) and dev's other `remap_galaxy_markdown_calls` callers still don't see indented fences either. Left as is because those are dev behavior.
- F3: none.

<details>

## F1 (P1): input card holding an upload and its copy can't be extracted. CONFIRMED

- Client: `WorkflowExtractionForm.vue:277-281` (at f1d8797ae2f) `hasDuplicateStepLabels` counted one name per *output* of a card, so a card listing an upload and its in-history copy gave a duplicate, and Create was disabled.
- Server, the half Codex missed: `services/workflows.py:112` `_validate_extraction_labels`, called at `:479` in `_validate_extract_by_ids_payload`, rejected the form's payload (`dataset_names=[X, X]` for `[hda, copy]`) with 400 before `extract_steps_by_ids` could collapse the copies. The existing API test passed only because it sent no names.
- Fix, in `cec95bf0490`:
  - Client: a new `selectedInputSteps` computed (checked input cards) that `selectedInputs` also uses now. The duplicate check counts one name per card. The payload is unchanged: every id is still sent under the card's name.
  - Server: a new `_distinct_input_names` drops a name that repeats one already seen for the same original. It reuses `normalize_output_label_key`, which access-checks and resolves to the original. Different originals that share a name are still rejected (existing `dataset_names: ["dup","dup"]` test, line ~1746).
- Tests:
  - Strengthened API tests `test_extract_with_two_copies_of_one_input_makes_one_input` and `..._collection_makes_one_input`. They now send repeated names and assert the label. Both were red (400) before the fix.
  - New vitest "submits an input card holding an upload and its copy under the card's one name" (`WorkflowExtractionForm.test.ts`). Red before the fix ("expected true to be false").
  - E2E: none added. Vitest plus the API test cover both halves.

## F2 (P2): indented ```galaxy fence keeps its instance id in the report. CONFIRMED

- Cause: `GALAXY_FENCED_BLOCK` (`markdown_util.py:104`) only matches fences that start in column 0. The client's `parseMarkdown`, and the branch's `remap_galaxy_markdown_cells` (`markdown_parse.py:158`), start a cell at any trimmed ``` line. Page validation (`_split_markdown_lines`) ignores an indented fence, and `ready_galaxy_markdown_for_import` (`markdown_util.py:152`) doesn't decode it. So the page stores the **encoded** id and the notebook renders it.
- Repro: the API test showed the extracted report still holding `history_dataset_display(history_dataset_id=<encoded>)` with no warning.
- Fix, in `95a9a4ffc01`: the final sweep (`_drop_instance_references._cell`) now drops a `galaxy` cell that still names an object, with a warning. The rewrite does not try to relabel it. Why not normalize indentation before the walk:
  - The indented cell's id is stored encoded, but the internal walker parses ids with `UNENCODED_ID_PATTERN` (`\d+`).
  - An encoded id that starts with digits would be misread as an unrelated numeric id. It could then resolve to the wrong dataset's label.
  - Fixing that means decoding at import, which changes dev's page save path. That's out of scope.
- Why `GALAXY_FENCED_BLOCK` stays unchanged: it is shared with import (`markdown_util.py:152`), export (`:429`), `populate_invocation_markdown` (`:1202`), `resolve_invocation_markdown` (`:1274`) and `resolve_job_markdown` (`:1467`).
- Tests:
  - New API test `test_report_drops_indented_galaxy_cell_naming_a_dataset`. It was red: the report kept the encoded id.
  - New unit param `test_drop_instance_references_drops_cells_the_client_parses[indented-galaxy]`. Red against the HEAD file.

## F3 (P2): copied-in map output also seeds its source history's input collection. CONFIRMED

- Cause: `workflow_extraction_summary.py:210-218` (at f1d8797ae2f) in `_backward_job_closure` called `_enqueue_mapped_input_collections` before checking the creating job with `_produced_elsewhere`. History A's mapped-over pair was then walked and became a boundary input, which is an extra disconnected seeded row.
- Fix, in `1957861444e`: map-over recovery moved inside the job loop, after the producer is accepted as a walked step. `_job_input_contents` already recovers the same collection for every output of an ICJ, so a walked map loses nothing.
- Reach: this also covers a map output whose producer isn't walked as a step for another reason (a missing/inaccessible or workflow-incompatible tool, or no creating job). Its mapped-over source isn't seeded either, which is the intended boundary behavior. `test_inaccessible_producer_output_seeded_as_input` still passes.
- Test: new API test `test_copied_map_over_output_seeds_only_itself` (`test_pages_history_attached.py`). It asserts there is no row for A's input collection and exactly one seeded `input_collection`. It was red: two input_collection rows.

## Test runs (after fixes)

- Unit: `test/unit/workflows`, `test_markdown_validate.py`, `test_markdown_export.py` and `test_workflow_extraction_summary.py` all pass: 278 passed, 1 skipped.
- Vitest: `WorkflowExtractionForm.test.ts` plus `WorkflowExtraction/`: 54 passed.
- API, run one at a time:
  - Full `test_workflow_extraction.py`: 107 passed, 1 skipped.
  - `test_pages_history_attached.py -k TestNotebookWorkflowExtractionSummary`: 20 passed.
- `ruff check` is clean. mypy on `services/workflows.py` shows only the pre-existing `notification.py:862` error. `ruff format --check` flags one pre-existing line in `services/workflows.py` that this work didn't touch, and pre-commit black passed.

</details>
