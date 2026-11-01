Run via Claude Opus 5.5 at high effort.

# Test challenges debrief (round 2, after re-scope): issue_24481_sample_sheet_mapped_output_type_26_0

I made one test-only commit, `129e3244b7b` ("Share absent sample sheet metadata assertion in API tests"). It changes no production code. I dropped no tests and added no E2E test. I re-ran every check below from scratch; the round-1 debrief ([earlier_drafts/1/test_challenges_debrief.md](earlier_drafts/1/test_challenges_debrief.md)) was used only for context.

## Changes made

- **`lib/galaxy_test/api/test_tool_execute.py`:** I added `_assert_no_sample_sheet_metadata(details)` next to the existing `_assert_sample_sheet_metadata_preserved`. Two tests had hand-rolled the "no column definitions, no element columns" check, each in a different form. `test_unlinked_map_over_list_and_sample_sheet` now runs the full check at both levels. Before, it checked only `column_definitions` on the outer collection and element columns on the inner ones.
- **`lib/galaxy_test/base/populators.py`:** `DescribeToolExecutionOutputCollection.assert_collection_type_is` used a bare `assert`, so failures said only `AssertionError`. It now reports the expected and actual type. Without the fix, the two regression API tests now fail with `Expected collection type list:list but found sample_sheet:list` and `... found list:sample_sheet`.

## Tests challenged and kept

**`test/unit/data/dataset_collections/test_structure.py`**
- These are pure object tests of `Tree.multiply` with no mocks. They assert outcomes: the result type, the child identifiers, and whether `column_definitions`/`columns_metadata` are present.
- They cover structure combinations the API tests don't: `list:paired` outputs, `sample_sheet:paired` mapping, Tree × Tree cross products, inner `sample_sheet:paired`, and `UninitializedTree` children. They're cheap, so I kept them.
- `test_multiply_by_sample_sheet_output_demotes_uninitialized_structure` pins the structure-level retyping. The runtime `type_source` path still creates sample sheet children; the rescope debrief records this as a known limitation. That makes the test a structure-contract test, not a runtime one.
- `_sample_sheet_tree` picks its child structure with a string check on `collection_type`. A `child=` parameter would read slightly better, but the gain is too small to justify the churn.

**`test/unit/data/dataset_collections/test_type_descriptions.py`**
- `test_multiply_sample_sheet_by_invalid_suffix_demotes_to_list` is a pure-function table. Each row also calls `validate()`, which ties the demotion to the real validity rule instead of a hard-coded string.
- Some rows overlap the structure table, because `Tree.multiply` composes through `map_over_collection_type`. I kept both: this table is the canonical type rule, and the structure table adds the column behavior.

**`test/unit/workflows/test_modules.py`**
- The new map-over rows exercise `_resolve_collection_type` in `managers/workflows.py` through real step dicts, with no mocks.
- The three valid-type rows are baseline. The two demotion rows (test_case39 and test_case40) cover the `workflows.py` call-site change, which nothing else tests.

**`collectionTypeDescription.test.ts`**
- This is a pure function test with no mounts or mocks, which matches client/README best practice.
- The "keeps" case is baseline. The two demotion `describe`s fail without the fix.

**API tests (`test_tool_execute.py`)**
- All three use the `TargetHistory`/`RequiredTool` fluent helpers. `with_sample_sheet` was extended rather than duplicated, and there are no raw HTTP calls, so there's nothing to fold into a new helper.
- Two tests repeat a `for i in range(n): execute.assert_has_job(i).with_final_state("ok")` loop. These are already helper calls, not raw HTTP, so I didn't add an "all jobs ok" helper.
- `test_map_list_output_over_sample_sheet` and `test_unlinked_map_over_list_and_sample_sheet` are the end-to-end regressions. The unit tables don't make them redundant, because only these tests check the persisted collection and the job-time population (`populated_state`, inner elements).

## E2E

I didn't add one. The client change is a string-composition rule in `CollectionTypeDescription.append`, and vitest covers it directly. A Selenium editor test would need a sample sheet input wired to a nested-collection output, then an inspection of terminal types. It would only re-check the same rule at a much higher cost.

## Fail-without-fix verification (fresh)

I wrote the non-test source diff (`collectionTypeDescription.ts`, `workflows.py`, `structure.py`, `type_description.py`) to a patch and reverse-applied it with `git apply -R`, without using stash. After the runs I reapplied it, and the worktree came back clean.

- **Python unit** (`test_structure.py`, `test_type_descriptions.py`, `test_modules.py`): 18 failed and 108 passed.
  - The failures were 7 structure cases, 9 type rows and 2 `test_modules` rows. Every one failed at its type assertion, for example `sample_sheet:list` instead of `list:list`.
  - Every baseline case and every valid-composition case passed.
- **Vitest:** 2 failed (both demotion `describe`s) and 7 passed.
- **API** (`-k sample_sheet`): 2 failed and 2 passed. The two failures were the regression tests, each on its collection-type assertion. The baseline paired test and the pre-existing test passed.

## With the fix

- Python unit: 126 passed.
- Vitest: 9 passed.
- API `-k sample_sheet`: 4 passed, run after the commit's changes.
- ruff, black and isort are clean on the changed files.
