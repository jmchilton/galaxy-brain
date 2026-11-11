# Re-scope debrief

The first [scope evaluation](earlier_drafts/1/scope_evaluation.md) recommended a modest expansion: generalize the reference_data-only parity test into a drift guard for every canonical YAML parameter type, fix the drift it finds, and fix the misleading YAML-only guard wording. The original scope is kept as `reference_data_followups_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)).

Changes (head `fba94da6222`):
- New commit "Fix YAML text defaults dropped by to_internal()": `YamlTextParameter.to_internal()` passed `default_value=` to a field aliased `value` without `populate_by_name`, so text defaults (also in conditional `whens`) were silently dropped. Fix passes `value=`. New `test_user_tool_fixture_parameters_load_like_their_authoring_models` runs every `lib/galaxy_test/base/data/user_tools/*.json` fixture × `GalaxyUserTool`/`GalaxyTool` × full/`exclude_unset` dump; red on the base (8 text/conditional cases), green after.
- Folded into "Reject reference_data unless the input source is a YAML tool's": message now "reference_data is only supported in GalaxyTool and GalaxyUserTool YAML tools"; adds `test_parameter_models_reject_classless_yaml_reference_data`.
- `exclude_none` dumps deliberately not in the fixture test: they erase explicit `value: null` (boolean/repeat/section fixtures fail). That is a separate issue in `custom_tool.py` / `lint.py` — see [normal review 2](subagents/normal_review_2.md).

Verification: unit 313 passed (reference_data, yaml_parameters, evaluation, parsing, parameter spec/test cases); API `test_user_tool_contract.py` 78 passed, `test_unprivileged_tools.py` 29 passed. Normal review 2: ready, one nit acted on.
