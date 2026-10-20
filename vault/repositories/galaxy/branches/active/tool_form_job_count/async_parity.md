# Async tool request parity (2026-10-20)

This scoping started from mvdbeek's question on #24217. On dev the tool form submits through `submitAsync` (tool requests, then `expand_meta_parameters_async`) whenever `enable_tool_requests` is on, celery is on, and the tool has typed parameters. `/api/tools` (legacy) is only the fallback. The preview counts the flat `/build` state on the legacy path.

## Verified: counts agree

- The client's `buildNestedState` maps `{batch: true, values}` to `{__class__: "Batch", values}`. Both shapes classify the same way.
- `buildNestedState` drops `product`/`linked`. That doesn't matter because tool form variants are `BATCH.LINKED` only, so the form never sends unlinked batches. Unlinked batches only reach the server through the API.
- `formData` covers only the active conditional case: `useFormState.rebuildIndex` uses `visitInputs`, not `visitAllInputs`. So legacy flat splitting gets no stale keys from inactive cases.
- `TestNestedMetaExpansionParity` (`fff553be2d4`) runs the same request flat through `summarize_meta_expansion` and legacy expansion, and nested through `validate_matched_batch_lengths` and async expansion. It covers batches in a repeat, in a conditional, and in a section linked to a top-level batch, unlinked batches across containers, and a mismatch across containers. All pass with no implementation change.
- End to end, `test_multi_run_in_repeat` already runs batch-in-repeat in the `legacy`, `21.01` and `request` formats.
- Remap: the async path calls the same `_ensure_expansion_is_valid` check (`expand_incoming_async`), so blocking Run on a multi-job remap is right on both paths.

## Differences that remain (timing and wording, not counts)

- On async, only linked dataset-batch length mismatches fail at submit (`validate_matched_batch_lengths`). Collection-shape mismatches and multi-job remaps fail later in the celery task, as a failed tool request. The preview blocks Run for all of them on both paths. Only the PR description's "Run is disabled only where `/api/tools` would reject" is legacy-specific and should be reworded.

## Unverified

- **Empty batch on async.** `test_map_over_empty_collection` runs legacy only. Async `buildJobResponse` returns `jobs: []` and no implicit collections. `ToolForm.vue` then skips `saveLatestResponse` and redirects to the success page. Legacy takes the same branch. Check live what the success page shows, since this branch keeps Run enabled for empty batches.
- **E2E coverage of the default path.** `enable_celery_tasks` defaults to false, so `test_tool_form.py` (including the job-count E2E tests) uses the `/api/tools` fallback. Only `test_tool_form_harness.py` runs with celery. The job-count E2E tests don't click Run, so the preview behavior is path-independent.
- **Client test for `buildNestedState`.** There's no test with a batched value inside a repeat or conditional. That test would cover the client side of the chain.
