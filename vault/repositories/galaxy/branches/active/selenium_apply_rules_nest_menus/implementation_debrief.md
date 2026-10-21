# Implementation debrief

**STATUS: READY.** Base `release_26.2`, head `c1dc296ac86`, three commits, +125/−10. Pushed to `jmchilton`. No CI yet.

## The two requested items

- **Apply rules test from menus (`galaxy_ui_driver` `00c72c7fa3c`).** It's this branch. On 26.2 it uses `tool_set_value(..., expected_type="data_collection")`, not dev-only `tool_form_fill`.
- **`history_wait_for_new_collection` in the convert test (`b96ef661d45`).** Already upstreamed: `selenium_collection_build_convert` (`25ce2409856`) has it byte-identically, and that session is hardening it. This branch carries the same copy, and the two branches merge cleanly (`git merge-tree`). The gxui collection-convert caller stays on `galaxy_ui_driver`.

## Commits

1. `74022c11369` Baseline tests: GTN rules examples 3/4 assert the rule source they build (`assert_rule_builder_source` in `framework.py`). Green on the unmodified base.
2. `ad080f29d40` `rule_builder.rule_editor_column_selector` target (navigation.yml + schema.ts); sort, add_regex_groups, add_regex_replacement and remove_columns use it.
3. `c1dc296ac86` `test_run_apply_rules_nest_from_menus` + `rule_builder_add_column_basename` + `history_wait_for_new_collection`. Asserts the built rules/mapping, nested inner and outer identifiers, and the exact "one job per list" map-over hint.

## Verification

- Every commit green for the tests it touches under Playwright and Selenium (framework-managed server, client built in place).
- Red check: without the Basename step, the test fails (no column B to map).

## Hardening

- Round 1: normal review → exact hint + inner identifiers. Test challenges → rule source asserts. E2E polish → nav target. Codex: no findings. Thermo and baseline refactor: no changes. Scope evaluation: expand (move siblings onto the target).
- Re-scope: siblings moved; original kept as `selenium_apply_rules_nest_menus_alt_original_scope`. Review clean.
- Round 2: test challenges → baseline asserts on examples 3/4 (split into a Baseline tests commit). Polish → `assert_rule_builder_source`. Codex: no findings. Thermo → param rename/types. Baseline refactor → refactor ordered ahead of the new test. Scope: keep.
- Screenshots skipped: no UI change.

## Decisions for John

- Decomposition: one PR (as is), or baseline + refactor separately from the new test, or ship only the alt (test alone). See `scope_evaluation.md`.
- Dev follow-ups: an editor-handle refactor for all `rule_builder_*` helpers (concatenate/split/swap still use raw `[i]` lookups; the regex helpers mix styles); fold `test_workbook_mapping.py`'s mapping asserts into `assert_rule_builder_source`.
- On restack of `galaxy_ui_driver` onto a 26.2 with this merged: drop `00c72c7fa3c`.
