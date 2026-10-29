Run via Claude Opus 5.5 at high effort.

# Test challenges (re-harden after re-scope): extraction_hid_copies_pdf_sections_26.1

**Top line:** one change. I added a Selenium/Playwright test for the form-level symptom the re-scope fixed, as commit `d4a9284f451`; that's the new head (not pushed). Every other test was re-challenged and kept. Red on bare `release_26.1` was re-run for the whole API file. The Baseline test passes there; all 16 other branch-added API tests fail at their own assertion. Baseline commit `aa07cf68c2f` is still first, and no rebase was needed.

## Changes made

**New E2E test:** `test_extract_collection_with_in_history_copy` in `lib/galaxy_test/selenium/test_workflow_extraction.py`.
- Last round's "no E2E" call doesn't hold any more. Commit `902573855de` fixes a UI symptom: the form flatMaps every output of a checked input card. On base, the card for a list plus its in-history copy listed the source HDCA twice, so submitting posted `hdca_ids: [src, src]` and got a 400 (duplicates).
- No API test covers that client glue (`selectedInputs` + summary rows together). #24225 has no equivalent; its Selenium changes are notebook-only, and 26.1 has no notebooks.
- Setup: `create_list_in_history` plus `copy_collection`. It submits the default form through the existing `extract_workflow_and_download`, then asserts a single-step workflow whose one input is a `list` collection.
- Red by reasoning, per the process:
  - On base the summary lists the source HDCA once per copy, so the form posts `[src, src]`.
  - Base's own check rejects that: `release_26.1` `lib/galaxy/webapps/galaxy/services/workflows.py:275` raises "hdca_ids contains duplicates".
  - No workflow is created, so `get_workflow_by_name` fails its "Expected at least 1 workflow" assertion.
- Green: ran it under Playwright (headless, managed server on port 8796) after building the client: **1 passed**.
- Merge-forward: placed after `test_extract_with_copied_inputs`, not at the end of the file, where 26.2 appends its own tests. `git merge-file` of 26.1 base → 26.2 → this file merges with no conflicts. Every helper it uses (`extract_workflow_and_download`, `assert_input_step_collection_type`, `copy_collection`) exists on 26.2, in the `ExtractsWorkflows` mixin. It adds no `navigation.yml` selector.

## Challenged, kept

- **4 re-scope API tests** (two restored summary asserts, `test_copies_from_a_history_no_longer_shared_extract_by_local_ids`, `test_multi_file_upload_lists_one_input_per_file`) and the helpers `_rows_by_type`/`_only_row_listing`:
  - Diffed against `extract_next_followups`: identical except `connection_step_id` → `_connection_step_id`.
  - They test API behavior (rows per original, local ids, extraction under one name), not implementation. They're kept verbatim for merge-forward.
  - Nits (set vs list compare, `_only_row_listing` not filtering by type) fall under the mirror constraint.
- **`test_copies_of_job_less_collection_share_one_input_card`** (`811ca5b8277`, 26.1-only):
  - It covers the `DatasetCollectionCreationJob` (`is_fake`) branch, which no other test reaches.
  - Its `(input_row,) =` unpack is its count check. On base it fails "too many values to unpack (expected 1, got 2)", which is the per-copy-card bug.
  - It merges forward as a new test. 26.2+#24225's `_input_producer_name` takes the same `getattr(job, "name")` ("Dataset Collection Creation"), and `_collections_by_original` uses the same `contents_iter` order, so it should pass there.
- **Commit 4's API tests** (hid/by-ids copies, converted input, name-parallelism 400s, UDT non-owner row): unchanged from last round, and their bodies mirror #24225. Each covers a distinct path.
- **Markdown unit tests:** kept at the unit layer for the reasons last round gave.
  - The web report endpoint never expands `invocation_inputs`/`outputs`. Expansion runs only through `to_basic_markdown` (PDF), which needs weasyprint or celery.
  - The label edge cases aren't reachable via the API.
  - Mocks follow each file's existing style. No `SimpleNamespace`; nothing to turn into dataclasses.
- **Helper rule:**
  - `POST workflows/extract` and `POST histories/{id}/extract_workflow` go through `_extract_by_ids[_raw]` and `_extract_from_history_raw`.
  - `GET extraction_summary` goes through `_get_extraction_summary`.
  - `PUT histories/{id}/disable_link_access` is used once and matches #24225, so it gets no helper.
- **Baseline placement:** only `test_hid_extract_connects_implicitly_converted_input` passes on bare base, and it's already in the Baseline commit.

## Not acted on

- The mixin's `_copy_content_to_history` duplicates `DatasetCollectionPopulator.copy_collection`. It's pre-existing base code, and changing it is backport churn.
- The pre-existing `_extract_and_download_workflow` does a raw `GET workflows/{id}/download` instead of `workflow_populator.download_workflow`. Also base code, also left alone.
- The E2E test wasn't run red. The process says reasoning is enough for E2E. The 400 comes from base's own duplicate-ids check (`workflows.py:275` on `release_26.1`), not from anything the branch adds.
- The landing-order constraint is now one test longer. If this merges forward before #24225 is on `release_26.2`, the new E2E test fails there too, along with the 5 summary API tests. Land #24225 first.

## Red/green

Bare-base red: `markdown_util.py`, `histories.py`, `workflows.py` and `extract.py` were overwritten from `origin/release_26.1`. `populators.py` and the test files stayed at HEAD, so `copy_library_dataset` exists. I ran the full API file in one process on port 8795, then restored the files with `git checkout`; the tree is clean. Result: **16 failed, 49 passed, 1 skipped**.
- Baseline `test_hid_extract_connects_implicitly_converted_input` **passed**.
- All 48 pre-existing tests passed, so the refactored helpers are behavior-neutral.
- Each of the 16 non-baseline tests failed at its own check:

| Test | Failure on base |
|---|---|
| `test_extract_from_history_fewer_names_than_hids_rejected` | 500, expected 400 |
| `test_hid_extract_connects_whichever_copy_is_sent` | connection assert when only the copy's hid (`[2]`) is sent |
| `test_hid_extract_connects_tool_output_with_an_in_history_copy` | source-map assert |
| `test_hid_extract_collection_copied_from_another_history` | extract 400 "hid 4 does not appear to be a collection" (the bug) |
| `test_hid_extract_copies_sent_with_one_name_make_one_input` | `_assert_single_input_single_tool` step count (3 steps) |
| `test_hid_extract_copies_with_different_names_rejected` | 200, expected 400 |
| `test_extract_with_two_copies_of_one_input_makes_one_input` | "Expected 1 steps of type data_input, found 2" |
| `test_extract_with_two_copies_of_one_collection_makes_one_input` | summary outputs assert |
| `test_copies_of_job_less_collection_share_one_input_card` | 2 collection rows (unpack) |
| `test_copies_from_a_history_no_longer_shared_extract_by_local_ids` | hdca_row lists the source id |
| `test_copies_of_job_less_dataset_list_one_input` | `_only_row_listing`: 2 rows |
| `test_extract_by_ids_connects_implicitly_converted_input` | connection assert |
| `test_extract_copies_of_one_input_with_different_names_rejected` | 200, expected 400 |
| `test_multi_file_upload_lists_one_input_per_file` | row outputs assert (one row lists both) |
| `test_extract_names_not_parallel_to_ids_rejected` | 500, expected 400 |
| `test_extraction_summary_udt_step_invalid_for_non_owner` | summary 403 "Tool not accessible" (the bug) |

Unit red: with base `markdown_util.py`, the 5 new or modified markdown tests fail at their asserts. `test_inputs_section_expansion_keeps_labels_in_headings` fails at its own `validate_galaxy_markdown` because base emits invalid markup. The other 35 pass.

## Tests run

- `test/unit/app/managers/test_markdown_export.py` + `test/unit/workflows/test_workflow_markdown.py`: **40 passed** on head; 5 failed / 35 passed with base `markdown_util.py`.
- API `lib/galaxy_test/api/test_workflow_extraction.py` with base source: 16 failed / 49 passed / 1 skipped (table above).
- API, same file on head `d4a9284f451`: **65 passed, 1 skipped**. The skip is the existing unconditional `SkipTest` in `test_extract_copied_mapping_from_history_reimported`.
- Playwright `test_workflow_extraction.py::TestWorkflowExtractionSelenium::test_extract_collection_with_in_history_copy`: **1 passed**. The client was built in the worktree under node 22.20.0.
- The new test file passes `black`, `ruff` and the pre-commit hooks.
