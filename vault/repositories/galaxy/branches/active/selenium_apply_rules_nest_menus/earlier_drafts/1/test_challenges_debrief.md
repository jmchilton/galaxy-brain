# Test challenges: selenium_apply_rules_nest_menus

Head `8ec9fa777b9` → `49bb96219a2` (amended single commit, force-pushed to `jmchilton`). One change, a stronger assertion. Nothing dropped.

## What's under test

There's one new test, the E2E `test_tool_form.py::TestLoggedInToolForm::test_run_apply_rules_nest_from_menus`, and no unit, API, or Vitest tests. So the unit, mock, and helper-reuse challenges don't apply, and the E2E-coverage challenge is already met.

## Changes

- **Pinned the rules the menus build.** The basename column was a weak spot. `s1`/`s2` have no `/`, so basename(A) == A, and the inner-identifier check would pass even if the Column > Basename menu built some other column-copy rule. Now, after the menus are driven, the test reads the builder source with the existing `rule_builder_show_and_get_source_as_json` (same pattern as `test_workbook_mapping.py`) and asserts:
  - `rules == [add_column_metadata identifier0, add_column_basename target_column 0]`
  - mapping projected to `(type, columns) == [("list_identifiers", [0, 1])]`

  The first is what the menu-driven UI is supposed to produce, so the menu now has to build a basename rule specifically. The second checks that the A,B selection lands at the right column indices. The output collection checks stay as they were.

## Considered, not acted on

- **`_tool_open_apply_rules_builder` helper** to share the open → select input → edit rules steps with `_tool_apply_with_source`: the normal review already declined it (borderline with 2-3 callers, and it touches existing tests in a coverage-only PR). Same call here.
- **Identifiers with `/` so basename actually changes the value**: these run into element identifier validation, and the source-JSON assertion now covers the gap. `rules_dsl_spec.yml` covers basename semantics.
- **`history_wait_for_new_collection`**: left byte-identical to `jmchilton/selenium_collection_build_convert`. `git diff` against that branch shows no difference for it.
- **Red check**: E2E, so I reasoned about it instead of running it. The pre-existing red check (removing the basename call fails) still holds. Now a wrong rule type from the menu also fails, at the new source assertion.
- **Best practices** (`writing_tests.md`, vault E2E notes): setup goes through the populator (`create_list_in_history`), the UI does only the part under test, `@managed_history`, and SmartTarget waits with no sleeps. All followed.

## Verification

- Playwright: 1 passed (45s).
- Selenium: 1 passed (47s).
- Framework-managed server, client built in place. Pre-commit hooks passed on amend.
