# Re-scope debrief

Trigger: the first round's scope evaluation (`earlier_drafts/1/scope_evaluation.md`) recommended a modest expansion. E2E polish had added a `rule_builder.rule_editor_column_selector` target used only by the new `rule_builder_add_column_basename`, leaving its single-selector siblings on raw `.rule-column-selector` lookups.

- Original scope parked as `selenium_apply_rules_nest_menus_alt_original_scope` (`3948673005b`), pushed; see `alts/original_scope.md`.
- New commit `e53da3ac568` moves `rule_builder_sort`, `rule_builder_add_regex_groups`, `rule_builder_add_regex_replacement` and `rule_builder_remove_columns` onto the target. Concatenate, split and swap have two selectors each and need an indexed target: dev follow-up.
- Tests: `test_uploads.py` rules examples 3 and 4 (cover all four helpers) plus the new test, green under Playwright and Selenium.
- Re-scope normal review (`subagents/rescope_normal_review.md`): no code changes; confirmed rule_type classes, same DOM node as the old editor-scoped lookup (`v-if` keeps only the open editor), no leftover bindings. Record fixes applied.
- Still clean-merges with `selenium_collection_build_convert`; `history_wait_for_new_collection` unchanged.
- Round-1 debriefs moved to `earlier_drafts/1/`; re-hardening follows.
