Run via gpt-6-sol at medium effort.

**Acted on 1 of 2.** Collection URIs with invalid sample-sheet metadata are now rejected before any history is created. Not acted on: the URI dataset-vs-collection check, because dev's own tests rely on the current behavior. That one needs a decision from John.

- **Not acted on — URI dataset for a collection input step (NEEDS-DECISION).** Codex is right: URI requests skip `validate_input_content`, so `{"src": "url", ...}` given to a `data_collection_input` step is accepted. I tried adding the check, and it broke dev's `test_run_workflow_from_url_with_implicit_conversion_on_collection`. That test feeds a dataset URL to an untyped `collection` input and expects the workflow to run. Rejecting this case would mean changing that test, which looks like it mis-declares its input. The ID path (`src: hda` to a collection input) is rejected on the branch, so the two paths are now inconsistent. Reverted.

<details><summary>Findings and triage</summary>

Scope: `git diff origin/dev...HEAD` at `456acb2f1d8`. Brief: the change's goal and house style only; no reasoning or prior findings.

1. **P1, "Invalid collection metadata leaves a committed history" (`run_request.py`): CONFIRMED and fixed.**
   - `derefence_collection_to_model` (`lib/galaxy/model/dereference.py:202`) validates sample-sheet metadata only after `_add_data_input_to_history` runs, which is after the new history is committed.
   - Fix: made `_validate_sample_sheet_metadata` public as `validate_sample_sheet_metadata`, and called it from `_resolve_data_input` for `DataRequestCollectionUri`.
   - New API test `test_run_with_invalid_sample_sheet_uri_input_creates_no_history`: a `list` collection URI with `rows`. It expects a 400, no invocation and no new history.
   - Dev shows the same post-commit behavior, so this isn't a regression from the branch, but it falls within the branch's "nothing left behind" goal.
   - Red check: the test fails on the pre-fix `run_request.py` at the no-history assertion (the history exists), and passes with the fix. The related selection (URI, collection, deleted, library and nonexistent inputs, mapping, sample sheet) gives 36 passed, 1 skipped.
   - Squashed into "Validate workflow run requests before creating histories". Head is now `9a14236cf7e`, pushed.
2. **P1, "URI inputs bypass the collection step type check" (`run_request.py:376`): CONFIRMED, NEEDS-DECISION.** See above.

Coverage notes from Codex: it reviewed the full diff and the surrounding paths relevant to its findings, and skipped unrelated workflow code.

</details>
