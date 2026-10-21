# original_scope

Branch `selenium_apply_rules_nest_menus_alt_original_scope` (`3948673005b`), pushed to `jmchilton`.

The first hardening round's result: the Apply rules test commit alone, with `rule_builder_add_column_basename` as the only helper on the new `rule_builder.rule_editor_column_selector` target. The parent adds a second commit that moves `rule_builder_sort`, `rule_builder_add_regex_groups`, `rule_builder_add_regex_replacement` and `rule_builder_remove_columns` onto that target too, per [the scope evaluation](../earlier_drafts/1/scope_evaluation.md).

Pick this one if the release branch PR should touch no existing helpers.
