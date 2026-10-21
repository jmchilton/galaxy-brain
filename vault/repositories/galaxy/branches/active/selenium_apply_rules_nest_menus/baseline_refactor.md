# Baseline refactor: selenium_apply_rules_nest_menus

The `rule_builder.rule_editor_column_selector` target and the move of the 4 single-column `rule_builder_*` helpers onto it now come as a refactor commit ahead of the new test. Order: baseline tests → refactor → new test + new helpers. The final tree is identical to `f3017abfe05`.

Head `f3017abfe05` → `c1dc296ac86`, force-pushed to `jmchilton` (lease on `f3017abfe05`).

## New history (on `origin/release_26.2`)

1. `74022c11369` Baseline tests: check the rules built in rules examples 3 and 4. Unchanged: `assert_rule_builder_source` plus the example 3/4 assertions.
2. `ad080f29d40` Add rule_editor_column_selector target for single-column rule builder helpers. Adds the target to `navigation.yml` and `schema.ts`, and moves `rule_builder_sort`, `add_regex_groups`, `add_regex_replacement` and `remove_columns` onto it. This is old commit 3's patch, which applied cleanly to the baseline, plus the target taken out of old commit 2.
3. `c1dc296ac86` Test nesting a list with Apply rules from the rule builder menus. The old commit 2 message is reused unchanged. Every line is an addition: `history_wait_for_new_collection`, `rule_builder_add_column_basename` (which uses the target from commit 2), and `test_run_apply_rules_nest_from_menus`.

## Why restack

- Old commit 3 rewrote existing helpers without changing behavior and needed nothing from the new test. The baseline commit exists to guard exactly that refactor. Putting the refactor right after the baseline means the guarded change can be checked against its guard on its own.
- The feature commit is now additions only, so a reviewer reads the refactor and the new coverage separately.
- The target belongs with the refactor: four existing helpers use it. In the feature commit, the basename helper is just one more consumer.
- It costs almost nothing. The tree is identical, the patch applied cleanly, and the `history_wait_for_new_collection` commit placement relative to `selenium_collection_build_convert` doesn't change.

## Not done

- No split of the nav target into its own commit apart from the 4 helpers. It has no use without them.
- No change to the dev follow-ups from the thermo review: the concatenate/split/swap indexed target and the editor-handle refactor.

## Verification

- `git diff f3017abfe05 c1dc296ac86` is empty.
- `history_wait_for_new_collection` is byte-identical to `jmchilton/selenium_collection_build_convert` (same shasum for the function body). `git merge-tree` against that branch is clean.
- Pre-commit passed on both new commits.
- Commit 2 alone (`ad080f29d40`), examples 3 and 4: Playwright 2 passed, Selenium 2 passed.
- Tip (`c1dc296ac86`), nest test plus examples 3 and 4: Playwright 3 passed, Selenium 3 passed.
- The baseline commit is unchanged, so its earlier green runs on the unmodified base (`thermo_nuclear_review.md`) still stand.
- Tests used a framework-managed server and the already-built client.
