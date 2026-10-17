# extract_next_followups: test challenges debrief (second pass)

**Top line:** All E1–E4 tests fail on `d4d504fb3c1` code at a behaviour check, and the baseline tests still pass on `origin/dev`. Nothing dropped. Small tightening: one shared "only row listing these copies" helper (3 tests), a `copy_library_dataset` populator helper, and the by-ids names test now also covers extra names. No history reorder needed; baselines are still the first two commits.

Commit: `dce789aa030` "Tighten copies/names extraction tests; add copy_library_dataset populator" on `737377a6efa`. Pushed to `jmchilton/extract_next_followups` as a fast-forward.

## Changes

- **`_only_row_listing(summary, ids)`** (mixin): returns the one summary row listing any of the ids, asserting there is exactly one. Replaces `(row,) = (generator)` destructuring in `test_copies_of_job_less_dataset_list_one_input`, `test_twice_copied_output_seeds_one_input` and `test_extract_with_two_copies_of_one_collection_makes_one_input`. On `d4d504fb3c1` two of these died with `ValueError: too many values to unpack`; now they fail at an assert that prints the rows. The collection test now also checks the copy appears in no other row.
- **`DatasetPopulator.copy_library_dataset(history_id, ld_id)`**: `POST histories/{id}/contents` with `source=library`. Used by the job-less test. The same inline post exists in `test_histories.py`, `test_datasets.py` and `test_history_contents.py` (dev code); left alone to keep the diff on-topic.
- **`test_extract_fewer_names_than_ids_rejected` → `test_extract_names_not_parallel_to_ids_rejected`**: also posts 3 names for 2 ids. E1 made extra names a 400 too, and nothing tested it. Both legacy and by-ids tests now check the error names both fields (`dataset_names` and `hda_ids`/`dataset_hids`).
- **`test_workflow_extraction_summary.py`**: dropped the unused `local_keys` param from `_closure`.

## Per-test decisions (E1–E4, tests since `d4d504fb3c1`)

Red check: swapped the 4 E-range lib files (and the form `.vue`) back to `d4d504fb3c1` with `git show`, ran the HEAD tests, restored.

| Test | On `d4d504fb3c1` | Decision |
|---|---|---|
| `test_extract_names_not_parallel_to_ids_rejected` (was `fewer_names`) | 500 (IndexError) vs expected 400 | keep, extended |
| `test_extract_from_history_fewer_names_than_hids_rejected` | 500 (IndexError) vs 400 | keep, stronger msg check |
| `test_extract_copies_of_one_input_with_different_names_rejected` | 200 vs 400 | keep |
| `test_multi_file_upload_lists_one_input_per_file` | one row lists both uploads | keep |
| `test_copies_of_job_less_dataset_list_one_input` | two rows (unpack error) | keep; helper assert |
| `test_extract_with_two_copies_of_one_collection_makes_one_input` (changed) | row lists the hdca twice | keep; helper assert |
| `test_twice_copied_output_seeds_one_input` (changed) | two rows (unpack error) | keep; helper assert |
| `test_copied_history_seeds_producer_of_collection_element_as_step` | cat1 row is `input_dataset`, not `tool` | keep |
| `test_inputs_section_expansion_quotes_or_skips_labels` (unit) | `validate_galaxy_markdown` rejects `input="my "reads""` | keep |
| `test_outputs_section_expansion_skips_unquotable_label` (unit) | rejects `output="a "b""` | keep |

The two markdown unit tests stay unit tests: `invocation_inputs`/`invocation_outputs` expansion is only reached by PDF/basic export, which an API test can't cheaply drive. They use the file's existing `MockTrans`/`example_invocation` fixtures; no new mocks.

## Whole branch, fresh look

- No `SimpleNamespace`, `MagicMock`, `monkeypatch` or `patch(` added anywhere in the branch's test diff. First-pass decisions still hold.
- **E2E:** none needed for E1–E4. E2 changed only what the summary API returns (one card per original); the form renders rows as before and the API tests pin the rows. E1/E3/E4 have no UI.
- `test_extract_button_visible_in_notebook_editor`: still redundant (recommend drop, John decides, as in pass 1).

## Baseline tests vs `origin/dev`

Ran the 3 tests in a temporary detached worktree at `d5f6696cc6a`, which is `origin/dev` plus the two baseline commits, with that tree's `lib` on the path:
- `test_403_for_other_users_private_page`, `test_403_for_published_page_without_history_access`, `test_failed_report_rewrite_creates_no_workflow`: 3 passed.

Both "Baseline tests" commits are still first. No rebase.

## Runs

All API runs use `GALAXY_TEST_TOOL_CONF` and `GALAXY_TEST_REQUIRE_ALL_NEEDED_TOOLS=1`, one file at a time.
- **Red check vs `d4d504fb3c1`:** `test_workflow_extraction.py` E tests 6 failed, `test_pages_history_attached.py` E tests 2 failed, markdown unit 2 failed. Each failure is in the table above.
- **`test_workflow_extraction.py`, whole file at the new head:** 112 passed, 1 skipped. The skip is the dev-era `Mapping connection for copied collections not yet implemented in history import/export` skip.
- **`test_pages_history_attached.py`, whole file:** 57 passed.
- **Python unit tests** (`test_workflow_extraction_summary`, `test/unit/workflows/`, `test_markdown_validate`, `test_markdown_export`): 280 passed, 1 skipped.
- **Linters:** black and isort clean, pre-commit passed. mypy (from `lib/`, on populators and both API files) shows only the unrelated `notification.py` error.
- **Formatter:** Galaxy formats with black, not `ruff format`. `ruff format` 0.17 would reflow 4 branch files, 3 of them already like that on dev, so I ignored it.
