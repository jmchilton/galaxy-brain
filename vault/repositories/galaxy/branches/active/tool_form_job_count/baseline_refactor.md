The branch now starts with three commits on dev, ahead of the feature. First, baseline tests for meta-parameter expansion. Second, a behavior-preserving refactor of the `meta.py` expansion classifier and collection loading. Third, a small fix that raises `ObjectNotFound` for unknown batch collection ids. The feature commits were replayed on top. The final tree matches the old HEAD except for added tests in `test/unit/app/tools/test_meta_expansion.py`.

## New history (`git log origin/dev..HEAD`, oldest first)

1. `f0604e6d1d0` **Baseline tests for meta parameter batch expansion.** New `test/unit/app/tools/test_meta_expansion.py`. Passes on dev (24 tests). It pins:
   - `expand_meta_parameters` (legacy/sync): hda batch, list, list:list, list:paired→paired, nested map-over, dce, linked/unlinked/mixed, empty, length mismatch, shape mismatch, unpopulated, invalid map_over_type.
   - `expand_meta_parameters_async`: hda batch, hdca map-over, list:list leaves, dce, unlinked multiply, mismatch.
   - `validate_matched_batch_lengths`: raises on a mismatch, ignores collections and unlinked batches, does not mutate state.

   Dev had no unit coverage of the async or validate paths, and the refactor rewires both.
2. `1eb010d86a9` **Share meta classifier and collection loading across expansion paths.** All of the branch's generic `meta.py` restructuring, moved onto dev:
   - `_meta_value_classifier` (including the `expand_collection=None` mode used by validate)
   - `_split_meta_inputs`
   - `_is_legacy_batch` / `_is_async_batch` / `_is_meta_wrapper`
   - `_batch_collection` / `_load_batch_collection` / `_collection_batch_values`

   The sync, async and validate callers were switched over. This absorbs the refactor half of the old `e424de1`, the "tidy meta helpers" half of `92e2dd1`, and all of `a5020190c6e`. Unknown ids still go through `session.get_one`, so the dev error behavior is kept here. Baseline tests pass unchanged.
3. `2ee3cb1e6a3` **Raise ObjectNotFound for unknown batch collection ids.** On dev, sync raised `NoResultFound` and async raised `AttributeError` on None. Adds `test_unknown_collection_id` and `test_async_unknown_collection_id`, red-to-green: both fail on commit 2.
4. Feature commits replayed:
   - `b373a280c89` Preview job count in tool build response. `meta.py` is the final summary code minus the access check.
   - `7ee022aad37` Check collection access in job-count preview. The message was trimmed to the access check, since its tidy parts moved to commit 2.
   - `f5c92500f90`, `8c3859fcd2d`, `da8d4a5c75e` (client).
   - `75e32b6127a` Split job expansion API test.
   - `d89de270820`, `497a6122fa5` (E2E).
   - `f89f6b20889` Count shared child collections once per reference.

   Dropped as empty after absorption: `084c1767a07` (its type-narrowing asserts are already in the baseline helpers) and `a5020190c6e` (entirely in commit 2).

## Behavior deltas in the refactor commit (dev → commit 2), judged equivalent for valid input

- **`validate_matched_batch_lengths` batch test.** Dev required `__class__ == "Batch"`. Commit 2 uses `_is_async_batch` (default `"Batch"`) plus the `"values"` wrapper check. In `tool_util_models.parameters`, the only model with a `values` field is `BatchRequest`, and it requires `__class__`. Validated request-internal state therefore can't hold a `values` dict without `__class__`, and dev's async expansion already treated such a dict as a batch.
- **Dropped collection-value forms.** The sync `"id|subcollection_type"` string and non-dict id forms were dead on dev: `src` was unbound, so they crashed with `UnboundLocalError`. The async non-dict fallback is unreachable because `BatchCollectionInstanceInternal` / `BatchData*Internal` require `src` and `id`.
- **Shallow copies.** `_split_meta_inputs` classifies from a shallow copy, where dev used the original incoming dict and, for async, `input_state` directly. `reorder_parameters` already `state_copy`s and doesn't mutate, so the values are identical.

## Not moved to the base

Everything else has no dev consumer and stays with the feature:
- `DatasetCollection.element_count_at_depth`
- `subcollections.split_count`
- `permutations.count_combos`
- `summarize_meta_expansion` / `incoming_has_batch`
- the build-response `job_expansion`
- the client components

The `ToolForm.vue` cleanups (stale tool-load guard, removed footer-slot Run button) are tangled with the job-count wiring in `475c20b`, so they weren't split out.

## Verification

- Invariant: `git diff tool_form_job_count_pre_baseline HEAD` touches only `test/unit/app/tools/test_meta_expansion.py`: the baseline async/validate/unknown-id tests were added, and the class was renamed `TestSummarizeMetaExpansion` → `TestMetaExpansion` with an updated module docstring. All other files are byte-identical, so earlier end-state API/E2E/client results still apply.
- Baseline commit on dev (temporary worktree): 24 passed.
- Refactor commit: 24 passed. With commit 3's tests on top: 2 failed (the unknown-id tests, as expected), 24 passed.
- `b373a280c89`: test_meta_expansion + test_misc 51 passed.
- `7ee022aad37`: 30 passed.
- HEAD: test_meta_expansion + `test/unit/data/model/db/test_misc.py` 52 passed.
- mypy (`cd lib`) on meta.py/subcollections.py: no errors in those files. The 23 errors reported are pre-existing environment noise in unrelated modules.
- Not run: API tests through the async/validate path at the refactor commit (e.g. `test_jobs.py` ~736 regression). Unit coverage of both paths was added instead.
- The old history is kept as the local branch `tool_form_job_count_pre_baseline`. Nothing was pushed.
