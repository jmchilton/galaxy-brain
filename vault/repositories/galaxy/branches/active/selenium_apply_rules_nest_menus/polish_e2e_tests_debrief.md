# Polish E2E tests: selenium_apply_rules_nest_menus (round 2, after re-scope)

I added one helper, `assert_rule_builder_source`, which replaces the rules/mapping assert pair repeated across the three tests. Nothing else needed polishing.

The head moved from `f067892570d` to `cca6ff1c87a`, still three commits, and was force-pushed to `jmchilton`.

## Changes

- `framework.py`: `TestWithSeleniumMixin.assert_rule_builder_source(rules, expected_rules, expected_mapping)`. It sits next to the other `assert_*` helpers. It asserts the full `rules` list plus the ordered `(type, columns)` projection of `mapping`, and keeps `rules` as the failure message. Its inputs and the asserts it makes are the same as the inline pairs it replaces.
  - It takes parsed JSON rather than fetching the source itself. Example 4 needs the raw `source` string for `write_screenshot_directory_file`.
  - It lives in the test framework, not `navigates_galaxy.py`, so the baseline commit stays out of the driver package.
- The work was folded into the commits with fixups and autosquash:
  - Commit 1 (`d816893cc95`, Baseline tests) gets the helper and the `test_uploads.py` examples 3 and 4 call sites.
  - Commit 2 (`0043245ad2f`) gets the nest test call site.
  - Commit 3 (`cca6ff1c87a`) is unchanged.
- `git diff f067892570d cca6ff1c87a` shows only this refactor. The GTN screenshot names and their order are untouched.

## Checklist

- **Selectors**: the tests use only components and helpers. The new and migrated `rule_builder_*` helpers use the `rule_editor_column_selector` target.
- **Shared abstractions**: the new one is above. `rule_builder_show_and_get_source_as_json`, `rule_builder_add_column_basename` and `history_wait_for_new_collection` were already shared.
- **Sleeps**: none in the branch diff.
- **Screenshots**: the nest test captures `tool_apply_rules_nest_from_menus`. Examples 3 and 4 are GTN screenshot drivers.

## Not acted on

- The radio, regex and number input lookups that are still raw inside `rule_builder_add_regex_groups` and `rule_builder_add_regex_replacement`. The branch doesn't change those lines, and the re-scope review scoped them out. They go with the dev follow-up for concatenate, split and swap.
- The open → select input → edit rules sequence. It was declined twice in round 1, and nothing has changed since.
- `history_wait_for_new_collection` is untouched and still byte-identical to `jmchilton/selenium_collection_build_convert`. navigation.yml and schema.ts are also untouched.

## Verification

- Commit 1 alone (`d816893cc95`), examples 3 and 4:
  - Playwright: 2 passed (95s).
  - Selenium: 2 passed (87s).
- Tip (`cca6ff1c87a`), examples 3 and 4 plus the nest test:
  - Playwright: 3 passed (115s).
  - Selenium: 3 passed (115s).
- Server was framework-managed and the client was already built. Pre-commit passed on both fixups.
