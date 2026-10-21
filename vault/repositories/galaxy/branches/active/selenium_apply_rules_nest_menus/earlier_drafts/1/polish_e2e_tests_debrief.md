# Polish E2E tests: selenium_apply_rules_nest_menus

Swapped the last raw CSS selector in the new code (`.rule-column-selector` in `rule_builder_add_column_basename`) for a new `rule_builder.rule_editor_column_selector` navigation.yml target; nothing else needed polishing.

Head `49bb96219a2` → `f04af2bc80c` (amended single commit, force-pushed to `jmchilton`).

Coordinator follow-up: added the missing `rule_editor_column_selector` entry to `client/src/utils/navigation/schema.ts` (kept in sync with navigation.yml by hand). Green under Playwright and Selenium; head `3948673005b`.

## Changes

- `navigation.yml`: `rule_builder.rule_editor_column_selector: '.rule-edit-${rule_type} .rule-column-selector'`.
- `rule_builder_add_column_basename` passes that SmartTarget to `select_set_value` (which accepts targets and waits on them), so it no longer needs the yielded editor element.

## Checklist

- **Selectors**: the test itself uses only components and helpers. The helper had the one raw selector, now fixed.
- **Shared abstractions**: `rule_builder_add_column_basename` and `history_wait_for_new_collection` are already helpers. The open → select input → edit rules sequence was declined by both the normal review and the test challenge (2-3 callers, touches existing tests); same call here.
- **Sleeps**: none. All waits are SmartTarget or `_wait_on` based.
- **Screenshots**: `tool_apply_rules_nest_from_menus` is already captured. Apply rules has many sibling tests with screenshots anyway.

## Not acted on

- The 12 sibling `rule_builder_*` helpers use the same `editor_element.find_element(By.CSS_SELECTOR, ".rule-column-selector")` pattern. They could all move to the new target, but that rewrites existing helpers in a coverage-only PR on a release branch. Good dev follow-up.
- `history_wait_for_new_collection` left alone: still byte-identical to `jmchilton/selenium_collection_build_convert`.

## Verification

- Playwright: 1 passed (48s).
- Selenium: 1 passed (54s).
- Framework-managed server, client built in place. Pre-commit (black) wrapped the new `select_set_value` call over three lines on amend. It's whitespace only, so the tests weren't rerun.
