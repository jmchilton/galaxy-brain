Run via Claude Opus 5.5 at reasoning_effort=15 effort.

# Test challenges debrief

Three small fixups, folded into their commits. No tests dropped. One assertion removed (parity test). No new API helpers or E2E tests needed. Branch head now `c4c0b2aa8a9`, and the four Baseline commits are still first.

## Changes

1. **XML guard tests now load a real tool** (folded into `aa619027828` Reject reference_data...).
   - `test_xml_tools_cannot_declare_reference_data` built a param against `cast("Tool", Bunch(app=app, profile=26.1))`. It now loads an XML tool with `create_tool_from_source`, so the test shows what users see: an XML tool that declares reference_data fails to load. Checked first that `ParameterValueError` propagates and isn't wrapped. `Tool.parse_inputs` swallows the factory's error, so the `basic.py` guard is what fires.
   - `test_parameter_models_reject_xml_reference_data` checks the factory guard directly. It now shares `_xml_tool_source()` and the `bare`/`with_options` parametrization, and gains a `with_options` case. That case also passes the factory on dev.
   - Dropped the `Bunch`, `XML` and `ToolParameter` imports.
2. **Parity test slimmed** (folded into `03d82719007` Baseline tests: Pin reference_data loading...).
   - **Removed assertion:** `options.elem().attrib == {"from_data_table": "t"}`. It poked a synthesized element inside `YamlReferenceDataOptions`. The contract harness already asserts the offered options across all 3 load paths.
   - Kept the `parsed == to_internal()` check. Since `540cece21b3`, both sides go through `model_validate().to_internal()`, so on the branch it only guards the dump round trip. The three dump policies match production sites: full (user tool storage), `exclude_unset` (admin `managers/tools.py`), `exclude_none` (`lint.py`). It also catches a factory that drifts back to raw-dict parsing. On dev it proved the refactor kept behavior.
3. **API error assertion uses `assert_error_message_contains`** (folded into `11fd2719823` Baseline tests: Strengthen closed...). Replaces a hand-rolled `err_msg` lookup, per `writing_tests.md`.

## Challenges with no change

- `test_definitions_the_authoring_model_rejects_fail_to_load` (filter/options/non_bool_multiple): this tests disk loading, which the API can't reach. The API path already validates through `UserToolSource`. `options` is a real bypass attempt (static options instead of the table), so it isn't redundant with `filter`.
- The parametrized `test_job_fails_when_admins_close_the_table_after_it_was_submitted` covers job time after an admin config change. The API test can't reach that point.
- Contract harness (18 cases) and admin API test: these already use the `loaded_tool` harness and populator/mixin helpers. No raw HTTP call is repeated against one URL, so no helper was added.
- E2E: no client change. reference_data renders through the existing plain select, so no Selenium test is needed.
- Out of scope, not touched:
  - Upstream `test_run_with_reference_data` is now a subset of `test_reference_data_contract[api_yaml-*]`. `TOOL_WITH_REFERENCE_DATA` is still used by the other two tests, so dropping it is John's call.
  - Upstream unit tests that use `Bunch`/monkeypatch (the bundle test) predate this branch.

## Red/green

- To check against dev, restored the 9 `lib/galaxy/` files from `origin/dev`, ran the tests, then restored them from HEAD. Tree clean afterwards.
- Non-baseline unit tests: 6 fail on dev, every one at its own `DID NOT RAISE`:
  - `xml[with_options]`
  - `param_models[bare, with_options]`
  - `authoring_model_rejects[filter, options, non_bool_multiple]`
- `xml[bare]` passes on dev, as expected: the upstream guard already caught it.
- Baselines on dev lib: contract harness `-k reference_data` 18 passed; `test_unprivileged_tools -k reference` 2 passed; `-k table_closed` 1 passed.
- At HEAD:
  - unit (`test_reference_data.py`, `test_yaml_parameters.py`, `test_evaluation.py`) 140 passed
  - contract harness 18 passed
  - `test_unprivileged_tools -k "reference or table_closed"` 3 passed
- ruff, black and isort are clean, and pre-commit passed.
