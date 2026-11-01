Run via claude-opus-5-5 at medium effort.

## General

- [x] What does the user see when it fails? Nothing new in the UI; error text only swaps `kind` for `src` (`services/workflows.py:504,510,533,540`, `workflow/extract.py:1032`). Pre-rename API callers get 404 on the old route and 422 for missing `src`; a stale `report_title` is silently ignored (base `Model` doesn't forbid extras). All names are new in 26.2, so no released client is affected.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. API tests exercise the renamed route and fields end to end (`test_pages_history_attached.py:423,708,720`; `test_workflow_extraction.py:1484-1936`); the client test checks the payload the form sends (`WorkflowExtractionForm.test.ts:385,635,648`).
- [x] Are baseline tests in their own leading commits (if applicable)? N/A, pure rename; existing tests were updated in the same commits.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## Workflow-related

- [x] Which existing workflows change behavior (if any)? None. Extraction output is unchanged; the report title was already `report_title or workflow_name` and the client never sent `report_title` (`services/workflows.py:434`).
- [x] Who hits this in practice and what is the evidence? API clients of the new 26.2 extraction endpoints. Without this, 26.2.0 would freeze `/workflow_extraction_summary` beside histories' `/extraction_summary` (`api/histories.py:865`) and a `kind` field against the Galaxy `(src, id)` convention (`schema/workflows.py:364,377`).
- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not? Yes (`scope_evaluation.md`). Shipping only the route rename would freeze `kind`. Renaming the internal `OutputLabelKind`/`kind` params isn't needed before the freeze and would add conflicts with `extract_next_followups`. Reusing an existing `src` value set has no precedent for `implicit_collection_jobs`.

<details>

Schema check: `schema.ts` changes are limited to the path/operation rename, `kind`→`src` on `OutputLabelHint`/`StepLabelHint`, and the `report_title` removal. Nit, not a checklist failure: internal helpers in `workflow/extract.py` still use `kind` (`output_label_to_id_key`, `normalize_output_label_key`, `OutputLabelKind`), which `scope_evaluation.md` defers on purpose.

</details>
