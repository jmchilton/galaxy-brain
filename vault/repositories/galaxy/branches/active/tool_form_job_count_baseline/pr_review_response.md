# mvdbeek review of #24217 (2026-10-20): approved, one question, three nits

## Question: should the tests and job count focus on the non-legacy path?

The premise is only partly right. The baseline already has `test_async_*` tests (dataset, `dce`, unlinked, mismatch) and `validate_matched_batch_lengths` tests. The gaps are:

- No sync tests with `input_format="21.01"`.
- No batches inside repeats, conditionals or sections. `BATCH_TOOL_CONTENTS` has only top-level params.

The bigger point is on the main branch. On dev, `client/src/components/Tool/submit/index.ts` sends the tool form through `submitAsync` (tool requests, then `expand_meta_parameters_async`) whenever `enable_tool_requests` and celery are on and the tool has typed parameters. `/api/tools` (legacy) is only the fallback. The `tool_form_job_count` preview counts the flat `/build` state with `_is_legacy_batch`. `scope_evaluation.md` #5 treated counting on the async path as having no consumer, but it is actually the default submission path.

Work this implies (main branch, not #24217):

- Parity test: send the same form state flat through `summarize_meta_expansion` and nested through async expansion (`buildNestedState` shape), and assert the job counts are equal. Include inputs nested in containers.
- Reword "Run is disabled only where `/api/tools` would reject the request". On async, `validate_matched_batch_lengths` catches only linked dataset batch mismatches up front. A collection mismatch fails later in the celery task, as a failed tool request.
- Check that the multi-job remap block matches how the async path behaves.
- Add container-nested batch cases to `test_meta_expansion.py` (a tool with a repeat/conditional/section), for both the legacy and async paths.

## Nits

1. `__collection_multirun_parameter` re-derives "is batch" (`batch or __class__ == "Batch"`). Fix: gate it on the classifier's `batch` result and keep only the shape check. Small.
2. `_batch_collection` vs `_load_batch_collection`: the docstring exists ("Load the populated collection a batch value maps over…"). Make it say that it decodes the id and raises if not `populated_optimized`. One line.
3. Drop `bool(...)` in `_is_async_batch`. One line.
4. `sleep_for(UX_RENDER)` after the helper in `test_rerun_dataset_collection_element` was already removed by the 2026-10-20 rebase. Dev's #24223 replaced it with a wait on the map-over hint, and the conflict resolution kept that wait.

Applying 1–3 changes approved commit 3 (`Share meta classifier…`) and then requires re-cutting the main branch (fixups + `rebase --autosquash --update-refs`). John decides.
