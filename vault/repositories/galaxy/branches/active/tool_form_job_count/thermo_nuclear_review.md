# Thermo-nuclear review — tool_form_job_count

Acted on all backend findings in one commit, `a5020190c6e` ("Share meta classifier and collection loading across expansion paths"; `meta.py` net -27 lines): dev's `validate_matched_batch_lengths` now uses the branch's shared `_meta_value_classifier`; the async expansion path reuses `_split_meta_inputs`; sync and async collection batches share one loader and one values builder; `_batch_element_count` deleted; `summarize_meta_expansion` lost an exception re-wrap and a duplicate handler. Client findings were not acted on: they are judgement calls with no clear simplification, and changing them would mean rerunning E2E.

Scope: `git diff origin/dev...HEAD` at `81d3d9146d6`.

## Not acted on

- **ToolForm.vue `buildRequestId` guards (5 checks)**: the client has no existing "latest request wins" composable, and one call site does not justify a new one. The checks are local to two functions. If a second form needs this, extract a `useLatestRequest` composable then.
- **`jobExpansion` computed hides a server mismatch when the client already flags the batched field**: this special case is about UI wording, not structure. Moving it into `jobCountNotices` would make that function take validation state. Left as is.
- **`findInputByDottedName(...) as FormInputNode | null` cast in jobCount.ts**: needed because `Form/utilities.js` is untyped JS. Fixing it means converting that shared module, which is out of scope.
- **`element_count_at_depth` in model `__init__.py`**: the file is already very large (no 1k-line threshold is crossed), and the method sits next to the other `DatasetCollection` query helpers. Codex already reviewed its shape. Kept.
- **`_split_meta_inputs` still branches on `nested` twice**: the flat path needs `expand_flat_parameters_to_nested` plus a key-based classifier adapter. Splitting it into two functions would duplicate the reorder call. Kept.

## Details

### 1. Duplicate inline classifier in dev's `validate_matched_batch_lengths` — ACTED
Dev added its own classifier: it matches a linked `__class__ == "Batch"` value only when it is not a collection map-over. This duplicates the branch's `_meta_value_classifier`. Fix: `_meta_value_classifier(is_batch, expand_collection=None)`. With no collection expander, collection map-overs stay SINGLE and are left to collection matching, which is exactly the validator's documented contract. The validator becomes `_meta_value_classifier(_is_async_batch, None)`.
Equivalence check: dev required `__class__ == "Batch"` strictly, while `_is_async_batch` defaults a missing `__class__` to Batch. In validated `RequestInternalToolState`, `values` only appears on `BatchRequest`, whose `__class__` field is required (`tool_util_models/parameters.py` `allow_batching`). So the two predicates agree on every input that reaches the validator.

### 2. Async expansion re-implemented `_split_meta_inputs(nested=True)` — ACTED
`expand_meta_parameters_async` called `reorder_parameters(...)` and then `split_inputs_nested(...)` by hand, which is the same as `_split_meta_inputs(tool, state, True, classifier)`. Now it calls that helper, so the sync and async paths split inputs the same way.

### 3. Sync and async collection loaders were near-copies — ACTED
`_batch_collection` (sync) and `__expand_collection_parameter_async` both validated `src`, loaded the dce or hdca, and checked for a child collection. `__expand_collection_parameter` and its async twin also both built the "split subcollections or list datasets" result. Extracted two helpers:
- `_load_batch_collection(session, src, item_id)`: loads the dce or hdca, raises ObjectNotFound for an unknown id, raises on a missing child collection or an invalid src.
- `_collection_batch_values(collection, subcollection_type)`: builds the batch's values.

Both expanders and the sync `_batch_collection` (decode + load + populated check) are now 3-4 lines each. Side effect: an unknown id on the async path now raises `ObjectNotFound` instead of an `AttributeError` on `None`. That only changes an error path, and it matches the sync behaviour the branch already introduced.

### 4. `_batch_element_count` was a wrapper over `split_count` — ACTED
`element_count_at_depth(leaf_depth)` is what `split_count(collection, "single_datasets")` already computes. The helper was deleted, and its caller now uses `split_count(collection, subcollection_type or "single_datasets")`.

### 5. `summarize_meta_expansion` exception routing — ACTED
- A collection-shape mismatch was re-raised as `InputMatchedException` only so that a later handler would map it to `batch_mismatch`. It now returns the `batch_mismatch` summary directly.
- The separate `MessageException` and `Exception` handlers both returned `unknown`. They are merged into one handler that logs at debug level with the traceback.
- The `incoming_has_batch` and classifier wrapper checks now share `_is_meta_wrapper`.

### 6. Client (ToolForm.vue / ToolFormJobCount.vue / jobCount.ts) — NOT ACTED (see list above)
The structure is reasonable: pure notice logic lives in `jobCount.ts` with unit tests, and the component is presentational. Removing the dead `v-slot:footer` Run button is correct, because `ToolCard` has no `footer` slot (it renders the `buttons` slot in its footer). ToolForm.vue is 666 lines, well under 1k.

### Verification
- Unit: `test_meta_expansion.py` + `test_misc.py` + `test_execution.py`: 51 passed.
- API: `test_tool_execute.py -k "multirun or multi_run or map_over_collection or map_over_dce or map_over_data_param_with_list_of_lists or identifier_map_over"`: 25 passed. This covers the flat, nested and request (async + validator) formats, including the mismatched-lengths 400.
- API: `test_tools.py -k test_build_job_expansion`: 2 passed.
- mypy (`cd lib`): no errors in `meta.py` or `tools/__init__.py`. The pre-commit hooks (black/ruff/flake8) passed.
- Client was not touched, so vitest and E2E were not rerun.
