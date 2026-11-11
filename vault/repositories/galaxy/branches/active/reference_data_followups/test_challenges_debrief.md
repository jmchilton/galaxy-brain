Run via Claude Opus 5.5 at reasoning_effort=15 effort.

# Test challenges debrief (re-harden after re-scope)

I made three fixups and folded each into the commit that introduced the test. No tests or assertions were dropped or weakened. No new API helpers or E2E tests were needed. The branch head is now `b333e14eab4`, and the four Baseline commits are still first.

## Changes

1. **Fixture parity test moved to the functional YAML fixtures** (folded into `b333e14eab4` Fix YAML text defaults...; the commit message was updated to match).
   - `test_user_tool_fixture_parameters_load_like_their_authoring_models` lived in `test_yaml_parameters.py` and globbed `lib/galaxy_test/base/data/user_tools/*.json` through `PROJECT_ROOT`. It is now `test_yaml_fixture_parameters_load_like_their_authoring_models` in `test/unit/tool_util/test_user_tool_source_fixtures.py`. That module already collects every classed YAML fixture (`_YAML_FIXTURES`) and validates it against `DynamicToolSources`, and the moved test reuses that collector and adapter.
   - The functional set covers everything the old one did, and more:
     - Every `user_tools/*.json` fixture has a `test/functional/tools[/parameters]/*.yml` twin with identical `inputs`.
     - The functional set adds `data`, `data_collection`, `integer` and `float`, so all 11 YAML v1 parameter types are now under the drift guard. The user_tools set had 7.
     - The functional tool directory ships with the package, so the test no longer reaches into `lib/galaxy_test`.
   - The forced `GalaxyUserTool`/`GalaxyTool` class flip is kept. One combo is excluded at collection time through `_GALAXY_TOOL_ONLY_FIXTURES`: `implicit_conversion_shared_input_y.yml` as a GalaxyUserTool, because it uses fields only a GalaxyTool allows.
   - The case count is now 130 (33 fixtures × 2 classes − 1, × full/`exclude_unset`), against 48 before.
   - I factored a small `_fixture_id` helper out of the module's existing lambda `ids=`.
2. **Reject tests unified** (folded into `0e5d89af384` Reject reference_data...).
   - There is now one `NON_YAML_TOOL_CLASS_SOURCES` parametrization (`xml_bare`, `xml_with_options`, `classless_yaml`). Two tests share it:
     - `test_tools_outside_the_yaml_tool_classes_cannot_declare_reference_data` (Tool load, `create_tool_from_source`)
     - `test_parameter_models_reject_reference_data_outside_the_yaml_tool_classes` (factory)
   - These replace three tests: `test_xml_tools_cannot_declare_reference_data`, `test_parameter_models_reject_xml_reference_data` and the one-off `test_parameter_models_reject_classless_yaml_reference_data`.
   - **New coverage:** a classless YAML tool now has a Tool-load case. The wording fix is aimed at exactly this case, since the old message said "only supported in YAML tools" for a YAML tool. The match string is shared as `ONLY_IN_YAML_TOOL_CLASSES`. The `ToolSource` import was dropped.
3. **Baseline parity test reuses `DynamicToolSources`** (folded into `b02887560b1` Baseline tests: Pin reference_data loading...). `UserToolSource if ... else YamlToolSource` is replaced by `TypeAdapter(DynamicToolSources).validate_python(...)`, which is the union discriminated on `class`. The `YamlToolSource` model import was dropped.

## Challenges with no change

- `test_reference_data_loads_like_its_authoring_model` (Baseline) is kept even though it overlaps the fixture parity test. It covers four things the fixtures don't:
  - a GalaxyTool-class reference_data input (both reference_data fixtures are GalaxyUserTool)
  - the `exclude_none` dump (lint.py)
  - `label`
  - `optional: true`
  It also passes on dev lib, which shows the factory refactor kept behavior.
- `test_form_uses_the_authoring_model_coerced_flags` stays. On dev it fails at its own assertion (`assert 'false' is False`), not at load. Disk YAML `get_bool` returns the raw string there.
- These were settled in the earlier pass; I re-checked them and they still hold:
  - `test_definitions_the_authoring_model_rejects_fail_to_load`: disk-only. The API already validates through `UserToolSource`.
  - The parametrized closed-after-submit job test: an API test can't reach job time after an admin config change.
  - The contract harness and the admin API test already use the `loaded_tool` harness and populators.
  - No E2E: there is no client change, and reference_data renders as the existing select.
  - The upstream `Bunch`/monkeypatch bundle test predates the branch.
  - Upstream `test_run_with_reference_data` overlaps the contract harness. Dropping it is John's call.
- `exclude_none` stays out of the fixture parity test, as the re-scope decided: it erases explicit `value: null`, which is a separate issue.

## Red/green

- **Dev-lib check:** I overwrote all 9 changed `lib/galaxy/` files with their `origin/dev` versions, ran the tests, then restored them from HEAD. The tree was clean afterwards. 22 non-baseline tests failed, and each failed at its own assertion:
  - factory reject, all 3 sources: `DID NOT RAISE ParameterDefinitionError`
  - Tool-load reject:
    - `xml_with_options`: `DID NOT RAISE`
    - `xml_bare` and `classless_yaml`: regex mismatch only. Dev already rejects these, but with the old "only supported in YAML tools" wording, so these two cases are wording reds.
  - `authoring_model_rejects[filter, options, non_bool_multiple]`: `DID NOT RAISE ValidationError`
  - `coerced_flags`: `'false' is False`
  - fixture parity: 12 cases, `configfile_user_defined`, `expect_failure_invalid_inputs_y` and `gx_user_boolean_conditional` × 2 classes × 2 dumps, all at the `==`.
  - Baselines passed on dev lib, including the edited `loads_like_its_authoring_model` (12 cases).
- **Text-fix-only check:** I put `default_value=` back in `yaml_parameters.py` (the `3137e9b28e4` version). The same 12 fixture cases fail at the `==`, where `default_value='hello!'` became `None`, and the other 118 pass. As with any drift guard, most cases are green on the base.
- **At HEAD:**
  - unit tests: 438 passed (`test_reference_data.py`, `test_yaml_parameters.py`, `test_user_tool_source_fixtures.py`, `test_evaluation.py`, `test_parsing.py`, `test_parameter_specification.py`, `test_parameter_test_cases.py`)
  - `test_reference_data.py` at the intermediate commit `0e5d89af384`: 28 passed
- No API test or fixture changed, so the API suites were not re-run. The re-scope run had `test_user_tool_contract.py` at 78 passed and `test_unprivileged_tools.py` at 29 passed.
- ruff, black, isort and flake8 are clean, and pre-commit passed on every fixup.
