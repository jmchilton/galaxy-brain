E1, E3 and E4 are done: one red-to-green commit each, pushed to `jmchilton/extract_next_followups` (head `05ab09a4b2c`). E3 is confirmed, but only on the PDF/basic-markdown export path. The JSON invocation report never runs that expansion, so the scope doc's API-test reproduction would have passed without the fix (a false green). E2 was not started.

## E1: names vs ids length → 400 (`471aa003bac`)
- `_validate_parallel_names(names, names_field, ids, ids_field)` in `services/workflows.py` gives a 400 when a names list is non-empty and its length differs from its ids. An empty list still means "use the defaults".
- It is called for datasets and collections on both paths: `extract_from_history` (legacy HID) and `_validate_extract_by_ids_payload`. On the by-ids path it runs before `_distinct_input_names`. That made the `names[len(content_ids):]` tail unnecessary, so it was removed. The copies rule is otherwise unchanged and left for E2.
- An over-long names list is now also a 400. Before, both paths silently ignored the extras. No test sent more names than ids, and the client always sends names parallel to ids (one per output id).
- The third caller, `api/workflows.py` (`from_history_id`), passes no names, so it is unaffected.
- Tests: `test_extract_fewer_names_than_ids_rejected` (by-ids) and `test_extract_from_history_fewer_names_than_hids_rejected` (legacy). Each uses 2 distinct uploads and 1 name, and asserts a 400 whose message names `dataset_names`.
- Red: both failed with 500 `IndexError: list index out of range`. Green after the fix.

## E3: quote or skip labels in the `invocation_inputs()`/`invocation_outputs()` expansion (`087d2dffc23`). Verdict: CONFIRMED, with narrower reach than claimed.
- Reach: `resolve_invocation_markdown` (where the expansion lives) is only called from `to_basic_markdown`, the PDF/basic export path. The JSON report (`ready_galaxy_markdown_for_export`) leaves `invocation_inputs(invocation_id=…)` unexpanded, and the client renders it with `WorkflowInvocationInputs`. So the bug shows up only in the PDF/export output, as an invalid directive block. Nothing crashes.
- Side note: even valid expanded sections keep `input="label"` without an invocation id, because the expansion output isn't rescanned. They render as raw directives in the PDF either way. This is pre-existing and was not changed.
- Fix: a new `_invocation_section(kind, content_type, label)` helper emits all 4 section kinds (input/output × dataset/collection). It always quotes the label, and it returns an empty string for a missing label or one that fails `is_quotable_argument_value`.
- Tests (`test/unit/workflows/test_workflow_markdown.py`), on the real `resolve_invocation_markdown` path, validated with `validate_galaxy_markdown`:
  - `test_inputs_section_expansion_quotes_or_skips_labels`: a collection input `my reads` becomes `input="my reads"`, and the dataset input `my "reads"` section is dropped.
  - `test_outputs_section_expansion_skips_unquotable_label`: the output `a "b"` section is dropped and `output_label` is kept.
  - `resolve_markdown` gained an optional `invocation` argument.
- Red: both failed with `ValueError: Invalid embedded Galaxy markup line` before the fix. Green after.

## E4: `HistoryBoundary.local_keys` from all history contents (`05ab09a4b2c`)
- New `HistoryBoundary.of(history)` keys `original_content_ref` over `history.all_contents`, so hidden collection elements and non-ready datasets now count. `summary_from_page` uses it.
- Copied element HDAs are history contents, so the collection's `dataset_instances` didn't need to be walked.
- Deleted and purged contents count as local. That matches the old behaviour, since summarize also iterates `all_contents` and only drops new/queued/running datasets.
- Test: `test_copied_history_seeds_producer_of_collection_element_as_step` (`test_pages_history_attached.py`):
  1. Create a list.
  2. Run cat1 on one element.
  3. Copy the history.
  4. Reference the copied cat1 output from a notebook.
  5. Assert the cat1 row is a seeded `tool` step.
- The assertion checks classification only, not wiring.
- Red: the cat1 output came back as an `input_dataset` row. Green after the fix.

## Test runs
- Unit: `test/unit/workflows/` (including `test_extract_*`), `test/unit/app/managers/test_markdown_export.py`, `test_markdown_to_html.py`, `test_workflow_extraction_summary.py`, `test/unit/app/test_markdown_validate.py`: 280 passed, 1 skipped.
- API, one at a time:
  - `test_workflow_extraction.py -k "fewer_names or names or copies"`: 8 passed (E1).
  - `test_pages_history_attached.py -k collection_element_as_step`: 1 passed (E4).
  - Full `test_workflow_extraction.py`: 109 passed, 1 skipped.
  - `TestNotebookWorkflowExtractionSummary`: 21 passed.
- mypy (from `lib/`) on the 3 touched modules: clean. The only error is the pre-existing, unrelated `notification.py:862`.
