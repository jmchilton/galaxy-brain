# Test challenges debrief (round 2)

**Outcome: no tests dropped. Three tests pass on `release_25.1`, so I moved them into a new leading "Baseline tests" commit. I folded the ftpfile fix into the main fix commit and strengthened the linter test. The history is now 4 commits; the head is `09d4aa1e11b`.** The old head `9343c213aba` is kept as `backup/issue_24438_pre_challenge_2`. The pushed `_alt_original_scope` is untouched. The fork needs a force-push.

## History

1. `82a6d15cf4e` **Baseline tests for comma-splitting tool test values**
   - `test_ftpfile_value_split_on_commas`.
   - `select_comma_value.xml` with only the `multi` param and its two `value_json` list tests, plus the `sample_tool_conf.xml` registration.
2. `d5ad8013146` **Don't comma-split single-valued select test values**
   - The `parse.py` fix, now including the ftpfile default that was previously separate commit `6caf89ba51d`.
   - Adds `rep`/`cond` to the tool, with tests 0 and 1.
3. `2d81ad155af` **Lint value= on multiple selects with comma option values**
4. `09d4aa1e11b` **Document comma-containing select test values** (xsd only; committed with `SKIP=trailing-whitespace`)

## Per-test decisions

- **`test_ftpfile_value_split_on_commas`** (unit): kept, moved to Baseline.
  - Base `split_if_str` always split ftpfile values, so this test is green on base. It only guards against a regression that the first version of the fix introduced.
  - It stays a unit test because there's no ftpfile sample tool and staging an FTP dir in framework tests isn't practical.
  - Simplified: it now uses `get_tool_source(tool_source_class="XmlToolSource", raw_tool_source=...)` instead of writing the tool to `tmp_path`.
  - Mutation check: dropping the `param_type == "ftpfile"` default turns it red (`['a.txt,b.txt'] != ['a.txt', 'b.txt']`).
- **`select_comma_value` tests 2 and 3** (`multi` `value_json` lists): kept, moved to Baseline.
  - Ran them on base: both pass. They back the xsd docs, not the fix.
  - No other sample tool covers a `value_json` list on a multiple select, so they aren't redundant.
- **`select_comma_value` tests 0 and 1**: kept, in the fix commit. With base `parse.py`, each one fails on its own:
  - Test 0 fails with `Parameter 'rep' ... Parameter 'mode': multiple values provided but parameter is not expecting multiple values`.
  - Test 1 (the `value_json` string) fails with the `rep` error.
- **`test_tests_param_multiple_select_comma_options`** (linter): kept and strengthened.
  - Linter unit tests are the normal layer for linters.
  - Red without the linter: `[] == [...]`, and `test_list_linters` fails at 142.
  - Added test 4 with a comma `value=` on `multi` inside a `<section>` and on `sect|multi_true`. The `split("|")[-1]` mutation now goes red.
  - The `.//param` → `param` mutation still passes. During linting, `XmlToolSource.parse_tests_to_dict` (`__expand_input_elems`) has already flattened the nested test elements to `a|b` names in place. So the `|` handling is the path that matters, and that's the one now covered. In the fixture, the `sect|multi_true` param comes before the `<section>`, so the warnings come out in the same order whether or not the tests were flattened first. I checked with a direct, unflattened `lint()` call.
- **Old to new SHAs:** `4b8173d90ec`+`6caf89ba51d` → `d5ad8013146`; `f2619beeaa2` → `2d81ad155af`; `9343c213aba` → `09d4aa1e11b`. `implementation_rescope_debrief.md` still cites the old SHAs.
  - The linter gives zero warnings on `select_comma_value.xml`, which matches the docs.

## Other process items

- Mocks / SimpleNamespace / restructuring: none in the branch.
- API/integration helpers: no API tests touched.
- E2E: not warranted, because this is a test-framework parse fix with no UI.

## Results

- Units (`test_tool_linters.py`, `test_test_definition_parsing.py`, `test_parameter_test_cases.py`): 103 passed, 1 skipped.
- Framework `-k 'select_comma_value or multi_select'`: 6 passed.
- Baseline commit on base code: the 11 parsing units and the 2 `select_comma_value` tests pass.

Later rewrites (codex round 2, thermo round 2): linter `2d81ad155af` → `30baf371bf0`, docs `09d4aa1e11b` → `386a1c925b0`; baseline and fix SHAs unchanged. Backup branches deleted.
