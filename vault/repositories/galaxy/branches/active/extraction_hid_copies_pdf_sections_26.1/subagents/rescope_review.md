Run via Claude Opus 5.5 at high effort.

# Re-scope review: `902573855de` (summary input cards per original)

**Top line:** approve. The port is faithful to `90b36ff9158` + `202d3b3570c` and has no real bugs. I acted on one coverage gap: the `DatasetCollectionCreationJob` (job-less collection) copy path had no test. I added `test_copies_of_job_less_collection_share_one_input_card`, red-checked it against the pre-rescope `histories.py`, and committed it as `811ca5b8277` (new head, not pushed). The nits below are left as-is to keep merge-forward clean.

## Not acted on

- **`_original_key` / `IdKey` imported across modules as private names.** 26.1 has no public equivalent (`extract.py` `__all__` exports only 4 names). Renaming touches 7 sites and diverges from 26.2, which replaces this body with the public `original_content_ref`. The brief says to keep 26.1's helper names. Accepted.
- **Dedup by object identity.** The port uses `copy not in copies`; the reference compares `.id`. Both are equivalent inside one session (identity map), so not worth a commit.
- **Placeholder typing.** `jobs_list: list[Union[WorkflowExtractionJob, IdKey]]` uses the key as the slot marker; the reference uses a `None` row in a tuple. Equivalent and readable. Left.
- **Nested closures lengthen `create_workflow_extraction_summary`.** 26.2 splits this into module functions. On merge-forward, 26.2's side wins, so extracting here would only add churn.
- **`_only_row_listing` doesn't filter by type**, so an encoded HDA id could in principle coincide with an HDCA id. It matches the reference text, and in its current uses the collection elements are hidden and skipped. Left.
- **Set compare in `test_copies_of_job_less_dataset_list_one_input`.** It could be an ordered list compare, but that would diverge from the test text the branch restored from #24225 and cause a merge-forward conflict. Left.
- **Tool rows for copied cross-history tool-produced collections** still list the source HDCA once per copy. This is pre-existing, display-only (the form sends `job_ids` for tool rows), and covered in 26.2 by the boundary-producer handling that was deliberately not ported.
- **Landing order (serious, already documented).** If this branch merges forward before #24225 is on `release_26.2`, taking 26.2's side of `histories.py` drops the fix. The 4 summary tests from this commit, plus the new one, would then fail on 26.2. Land #24225 on 26.2 first.

<details>
<summary>Full review</summary>

## Verdict

Approve. No real bugs. One test-coverage gap, now fixed.

## Fidelity to #24225 (`90b36ff9158` + `202d3b3570c`)

- **Input-producer classification.** 26.2's `_input_producer_name` treats a non-`Job` key and a non-workflow-compatible tool as an input. 26.1 does the same via `is_fake` and `not tool.is_workflow_compatible`. A `tool is None` row stays an invalid tool row in both. 26.2's cross-history boundary branch is intentionally not ported, since 26.1 has no closure.
- **Grouping.** Both group by original ref across producers. The row goes where the original was first seen, and the copy list fills in later. Same algorithm.
- **Collection copies.** `collections_here` is built from `history.contents_iter(types=["dataset_collection"])` keyed by `_original_key`, the same as `_collections_by_original`. It falls back to the item itself, which only datasets reach: every collection key comes from a local HDCA, because `summarize` iterates this history.
- **Tests.** The restored assert, `test_copies_from_a_history_no_longer_shared_extract_by_local_ids` and `test_multi_file_upload_lists_one_input_per_file` match the reference, except for `_connection_step_id`.

## Correctness on 26.1

- **`checked`.** This is now computed over local copies, not the source HDCA's deleted state. That's an improvement.
- **Deleted and hidden copies.** `all_contents` already includes deleted, hidden and purged items, so these were listed before too. `contents_iter` with no filter is consistent with that. Deleted HDCAs pass `get_dataset_collection_instance`, which does no deleted check, so a checked card that posts a deleted copy doesn't 400.
- **Client** (`WorkflowExtractionForm.vue`).
  - `selectedInputs` flatMaps every output of a checked input card under the card's `newName`. After the merge, copies post one name, so the branch's "copies … different names" 400 is unreachable from the UI.
  - `getInputName` uses `outputs[0]`. That's now a local item, so the default `Input <hid>` uses a local hid rather than the source history's.
- **Mixed upload rows.** An upload or fetch that produced both datasets and collections used to be one row typed by its first output. It's now one row per original, each correctly typed.
- **Queries.** There's one extra HDCA query per summary. The `_original_key` walks hit relationships `summarize` already loaded for the same objects.

## Coverage gap (acted on)

The commit rewrites two paths: the non-workflow-compatible producer path and the `is_fake` path. Every collection-copy test built its list with fetch (`create_list_in_history(...)["outputs"][0]`), so those copies take the upload path. `FakeJob` was covered only for HDAs (the library import).

The `DatasetCollectionCreationJob` path (`direct_upload=False`, then a copy) was untested. That's the scope eval's "one card per copy, each listing the source id" symptom.

New test `test_copies_of_job_less_collection_share_one_input_card`:
- Asserts one `input_collection` row with `tool_name == "Dataset Collection Creation"` (proving it reached that branch) and outputs `[hdca, copy]`.
- Extracts both under one name and expects one `data_collection_input`.
- Red against `6189791f58c`'s `histories.py`: 2 collection rows (`too many values to unpack`). Green on the fix.

## Style and REVIEW_FOCUS

- Imports are at module top.
- The two new comments are one line each and say something non-obvious.
- No reuse missed: `_original_key` and `IdKey` are the existing 26.1 abstractions, and `summarize` is reused as before.
- No trivial unit tests. The coverage is API-level.

## Validation

- `lib/galaxy_test/api/test_workflow_extraction.py`, full file, one process, port 8793, on `811ca5b8277`: **65 passed, 1 skipped** (was 64/1; +1 new). The skip is the existing unconditional `SkipTest`.
- On the test file: `ruff check`, `black --check`, `isort --check` and `mypy` are clean, and the pre-commit hooks passed. `histories.py` (unchanged by this review) also passes `ruff`, `black` and `mypy`.

</details>
