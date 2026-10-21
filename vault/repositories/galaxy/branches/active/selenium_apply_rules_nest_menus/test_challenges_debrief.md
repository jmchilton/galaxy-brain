# Test challenges: selenium_apply_rules_nest_menus (round 2, after re-scope)

**Coordinator restack:** the example 3/4 assertions pin existing behavior ahead of a refactor, so they moved out of commit 2 into a first commit, "Baseline tests: check the rules built in rules examples 3 and 4" (`ceba1a96ba6`). It is green on its own under Playwright and Selenium, before the refactor. Head `f067892570d`, three commits, tip tree identical to `5d0ed609eef`.

Head `e53da3ac568` → `5d0ed609eef`. Still two commits; commit 1 (`3948673005b`) is unchanged. A fixup was folded into commit 2 and the branch force-pushed to `jmchilton`. One change: the existing tests that cover the re-scoped helpers now have stronger assertions. Nothing dropped.

## What's under test

- Commit 1 adds the E2E `test_tool_form.py::test_run_apply_rules_nest_from_menus`.
- Commit 2 changes four helpers: `rule_builder_sort`, `add_regex_groups`, `add_regex_replacement` and `remove_columns`. They're covered only by `test_uploads.py` rules examples 3 and 4.
- There are no unit, API or Vitest tests, so the mock, dataclass and populator-reuse challenges don't apply.

## Changes

**Examples 3 and 4 checked nothing (fixed in commit 2).** Both are GTN screenshot drivers and had no assertions. If a refactored helper picked the wrong column, or silently picked nothing, later steps could still pass:
- In example 4, a partial `remove_columns` still leaves a column B and a column C for the later mappings.
- `sort` and `regex_replacement` on A match the editor default of `target_column: 0`.

Both tests now read the builder source and assert the full `rules` list plus the `(type, columns)` projection of `mapping`. This follows the pattern round 1 used for the nest test.
- Example 3 adds `rule_builder_show_and_get_source_as_json()` after its last screenshot, so the GTN screenshots don't change. It pins:
  - `add_regex_groups` with target 3 at both call sites, with their group counts
  - `remove_columns [3]`
  - the indices for split and swap
- Example 4 parses the source it already fetched, using a new top-level `import json`. It pins:
  - `remove_columns [1, 2, 4, 5, 6]`, which is the multi-iteration lookup the refactor rewrote
  - `sort` and `add_column_regex` with the replacement URL
- I worked out the expected values by hand from the rule definition `save()` functions and the column shifts, before running anything. All of them matched on the first run.

**Why these go in commit 2 rather than a "Baseline tests" commit:** they guard a pure refactor, so they pass both before and after commit 2. The caller asked for two commits, and these strengthen existing tests rather than adding a new test set.

## Re-checked fresh, no change

- **Nest test:** the rules and mapping assertion, the collection structure check and the Sort-collection map-over hint are all still sound. The red check is reasoned, not run: without the basename helper or the target, the test fails at the source-JSON assertion.
- **Best practices** (`writing_tests.md` and the vault E2E notes): setup goes through populators, `@managed_history` is used, there are SmartTarget waits and no sleeps.
- **`history_wait_for_new_collection`** is byte-identical to `jmchilton/selenium_collection_build_convert`. I diffed it against a freshly fetched copy of that branch.
- **CI coverage:** CI runs examples 3 and 4. `gtn_screenshot` and `local` are only markers, and the selenium/playwright workflows don't deselect by marker. So the refactored helpers do get CI coverage.

## Considered, not acted on

- **Sort and regex-replacement targets:** these are column A, which is the editor default (0), so the new assertions can't catch a selector that silently fails for them. Changing the columns would change the GTN tutorial screenshots. `remove_columns` in example 4 and `add_regex_groups` (target 3) in example 3 do tell the cases apart.
- **Concatenate, split and swap helpers** still use raw lookups. They're the dev follow-up from the re-scope. Example 3 now pins their output anyway.

## Verification

The two examples and the nest test were run in one pytest invocation per backend, one backend after the other:
- Playwright: 3 passed (114s).
- Selenium: 3 passed (116s).

Pre-commit passed on the fixup and the amend.
