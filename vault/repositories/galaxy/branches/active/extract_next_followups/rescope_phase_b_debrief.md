E2 is done with the full shape, not the fallback. The summary now emits one input card per original, listing its in-history copies. One server helper, `group_inputs_by_original`, groups the selected ids, and both validation and `extract_steps_by_ids` use it. A multi-file upload now gives one card per file and extracts, where before it returned a 400. One commit, `df78226dea9`, pushed to `jmchilton/extract_next_followups`.

## Shape and why
- **Full shape, not fallback.** Neither extraction E2E file nor the extraction vitest uses `fetch_hdas` or a multi-file fetch, and the E2E card counts are on tool cards only. No other test asserts the summary row shape. A single upload plus its copies still makes one card. So the plain-history form changed only where it was wrong. Both E2E files passed unchanged.
- **Summary (`workflow_extraction_summary.py`).**
  - `_summary_rows` sends every non-step job's outputs through one grouping by `original_content_ref`. Non-step jobs are FakeJob/DatasetCollectionCreationJob, upload/fetch (not workflow-compatible), and cross-history producers.
  - Each group becomes one input row, at the position where it first appears, with duplicate ids removed. Step rows and invalid tool rows are unchanged.
  - `_input_producer_name` classifies jobs. `_extraction_row` became `_tool_row`, which handles step and invalid rows only.
  - `_boundary_producer_rows` and its `seeded_copies` set are gone. Copies of one cross-history output now share one seeded row.
- **Server (`extract.py`).**
  - `group_inputs_by_original(trans, kind, ids, names) -> list[InputGroup]` access-checks each id and groups by original. It keeps the first copy (for `collection_type`) and its name.
  - `_accessible_content` is now shared with `normalize_output_label_key`.
  - `extract_steps_by_ids` builds input steps from the groups in one loop, replacing the two loops that each had an inline repeat-skip.
  - The service's `_distinct_input_names` became `_input_names(groups)`. Validation now checks the names that extraction actually assigns.
- **Contract change.** If copies of one original arrive with *different* names, the request is now a 400 ("copies of one hda were given different input names"). Before, both names passed validation and extraction silently kept the first. The client never sends this, because each card has one name and is now one original.
- **Client.** No logic change: one name per card is now correct by construction. Only the `hasDuplicateStepLabels` comment changed.

## Bugs found along the way
- On dev, a copied collection in a plain history was listed twice under its original id. `WorkflowSummary.__summarize_dataset_collection` swaps in the original before appending.
- What I observed: the summary listing `[X, X]` (this is the red API assertion).
- What I inferred from code: the card then sends `hdca_ids=[X, X]`, and the service's "contains duplicates" check rejects it with a 400. The dev client flattens outputs per card, and that check and the summary append are both on `origin/dev` and `origin/release_26.2`.
- This is relevant to the retarget question. Removing duplicate ids from the group fixes it.

## Tests (red → green)
- `test_multi_file_upload_lists_one_input_per_file` (new, `test_workflow_extraction.py`): one `fetch_hdas` call with 2 pasted files, then cat1 on both. It asserts one input row per file, then extracts under 2 names and asserts 2 inputs, each wired. Red: one row with both outputs.
- `test_extract_with_two_copies_of_one_collection_makes_one_input` (strengthened): adds a summary assertion that the row lists the original once. Red: `[X, X]`.
- `test_extract_copies_of_one_input_with_different_names_rejected` (new): red, because the request returned 200.
- `test_twice_copied_output_seeds_one_input` (`test_pages_history_attached.py`), changed for the new contract:
  - Old assertion: two rows, seeded `[False, True]`.
  - New assertion: one input row holding both copies, seeded.
  - Red against the old summary module (`too many values to unpack`).
  - This replaces an assertion. It doesn't weaken one, because the extraction wiring assertions below it are unchanged.

## Runs
- Unit: `test/unit/workflows/`, `test_workflow_extraction_summary.py`, `test_markdown_export.py`: 270 passed, 1 skipped.
- API, one at a time:
  - Full `test_workflow_extraction.py`: 111 passed, 1 skipped.
  - `TestNotebookWorkflowExtractionSummary`: 21 passed.
- Client: extraction vitest 54 passed; `vue-tsc --noEmit` clean.
- E2E: Playwright, headless, my own Galaxy on :8097 and Vite on :5193, no `GALAXY_TEST_END_TO_END_CONFIG`. Both servers were stopped by PID afterwards.
  - `test_workflow_extraction.py`: 13 passed.
  - `test_notebook_workflow_extraction.py`: 7 passed.
- mypy (from `lib/`) on the 3 modules: clean apart from the pre-existing `notification.py:862`. ruff, black and the pre-commit hooks are clean.

## Limitations / not done
- **Legacy HID `extract_steps` was not changed.** It wires each step by the hid of the dataset the job consumed. Copies have distinct hids, so it makes one input step per hid and does not merge copies. Copies sent under one name already get a 400 from `_validate_extraction_labels`. Moving it to ContentRef wiring is a separate change, and the current client does not use this path.
- **FakeJob copy grouping is untested.** These are copies of an HDA with no creating job (e.g. a library import). They now merge into one card, but no API fixture creates that case cheaply.
- **No new E2E test for the multi-file card.** The API test covers the row shape and the extraction.
