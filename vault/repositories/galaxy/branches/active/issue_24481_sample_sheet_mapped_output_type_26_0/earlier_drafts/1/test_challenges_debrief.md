Run via Claude Opus 5.5 at high effort.

# Test challenges debrief: issue_24481_sample_sheet_mapped_output_type_26_0

I changed two unit test files in one commit, `381ea4573e1` ("Simplify sample sheet multiply unit tests"). I didn't change any production code. I kept the API, client and workflow-module tests as they were, and didn't add an E2E test.

## Changes made

### `test/unit/data/dataset_collections/test_structure.py`: rewritten

- **Removed the `object.__new__(DatasetCollectionManager)` hack.** The `_precreate` helper built a manager without running its constructor, only to call `precreate_dataset_collection`. That method just copies `structure.column_definitions` and `structure.columns_metadata` onto the new collection. The unit under test is `Tree.multiply`, so the tests now check the multiplied tree's `column_definitions` and `columns_metadata` directly. The API tests already check the persisted collections:
  - `test_map_paired_output_over_sample_sheet` checks that columns survive on `sample_sheet:paired`.
  - `test_map_list_output_over_sample_sheet` checks that columns are absent on `list:list`.

  I considered extracting `precreate_dataset_collection` into a module-level function so the hack could go without dropping coverage. I rejected it: it would be a refactor of a manager on a release branch, and the API layer already covers that path.
- **Merged the five test functions into two parametrized tests.**
  - `test_multiply_sample_sheet_keeps_columns` covers dataset, paired, record and paired_or_unpaired outputs, plus `sample_sheet:paired` × dataset.
  - `test_multiply_sample_sheet_by_nested_collection_demotes_to_list` covers `list`, `list:paired`, `sample_sheet:paired` × `list`, and the unlinked `Tree × Tree` cross-product case. That last case was its own test before.
- **Dropped the `collection_type_description.validate()` calls.** Type validity is already pinned in `test_type_descriptions.py`.

### `test/unit/data/dataset_collections/test_type_descriptions.py`: trimmed

- I removed four parametrized rows that pass without the fix: `sample_sheet × paired|record|paired_or_unpaired` and `list × list`. They were added in the fix commit, not a baseline commit, so they broke the "non-baseline tests must fail without the change" rule. The baseline `test_multiply_sample_sheet_keeps_columns` cases still cover the valid sample_sheet compositions, because `Tree`/`UninitializedTree.multiply` go through `map_over_collection_type`.
- I renamed the test to `test_multiply_sample_sheet_by_invalid_suffix_demotes_to_list`.

## Tests challenged and kept

- **`collectionTypeDescription.test.ts` (`append over sample_sheet`):** a pure-function test with no mocks, which follows client/README best practice. The "keeps" case is in a baseline commit and passes without the fix. The "demotes" case fails without the fix.
- **`test/unit/workflows/test_modules.py` map-over rows:** these go through the real `_resolve_collection_type` path on step dicts, with no mocks. The three valid-type rows are in the baseline commit. Without the fix, the two demotion rows (test_case39 and test_case40) fail.
- **API (`test_tool_execute.py`):**
  - Both tests use the `TargetHistory`/`RequiredTool` fluent helpers.
  - `with_sample_sheet` was extended rather than duplicated, and no raw HTTP calls are repeated.
  - `test_map_paired_output_over_sample_sheet` is a baseline test. `test_map_list_output_over_sample_sheet` is the end-to-end regression; per the initial debrief, it fails on the type assertion before the fix.
  - There is no "all jobs ok" helper. A two-iteration loop over `assert_has_job(i).with_final_state("ok")` is fine and doesn't justify adding one.
  - I didn't change these tests, so I didn't re-run them here.
- **Unit tests overlapping the API tests:** the structure and type tables cover combinations the API tests don't: `list:paired`, `paired:paired`, `sample_sheet:paired` mapping, and unlinked cross products. They are cheap pure-object tests, so I kept them. One structure row, `sample_sheet × list`, duplicates the API regression. It stays as the anchor row of the table.

## E2E

I didn't add one. The client change is a composition rule in `CollectionTypeDescription.append`, which vitest covers directly. The runtime behavior is covered by the API test. An editor Selenium test would need a sample sheet input wired to a tool with a nested collection output, then inspection of terminal types. That would cost a lot and only re-check the same string rule.

## Fail-without-fix verification

I reverse-applied the non-test source diff (`git diff ... | git apply -R`, no stash) and ran the unit and vitest suites:

- Python, before my changes: 11 failed. These were the 4 structure demotion cases, 5 type-description demotion rows and 2 test_modules demotion rows. Every baseline and valid-composition case passed.
- Python, after my changes: 9 failed in the two edited files. These were the 4 structure demotion cases and 5 type rows, each failing at its first (type) assertion. The 5 keep-columns cases passed.
- Vitest: only the "demotes" test failed.

I then reapplied the fix. With the fix in place, `test_structure.py` and `test_type_descriptions.py` give 30 passed, the earlier full run of those plus `test_modules.py` gave 123 passed, and vitest gave 8 passed. ruff, black and isort are clean.
