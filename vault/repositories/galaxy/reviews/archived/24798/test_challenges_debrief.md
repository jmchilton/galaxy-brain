# Test challenges debrief — #24798 (reference_data for YAML tools)

Profile `gx_test_challenger`, Claude Opus 5.5, medium effort. Reviewed commit `5abbfd9d5a6`. Read in the context of #23888 (model/parser dialect split).

## What I checked and ran

- Ran the PR's reference_data unit tests with a borrowed venv (`PYTHONPATH=lib`): `test_reference_data.py` + `test_yaml_parameters.py -k reference` — 29 passed.
- Cross-boundary probe (scratch, not committed): validate a `reference_data` input (`multiple: true`, `filter`) with `UserToolSource` and `YamlToolSource`, dump with all three policies (`by_alias=True` full / `exclude_unset=True` / `exclude_none=True`), parse with `galaxy.tool_util.parser.yaml.YamlToolSource`, build parameter models. All six combos give `select`, `multiple=True`, `optional=False`, `reference_data.table` set, the `data_meta` filter element, and `trusted` False for user / True for admin. **The boundary holds today. No test proves it**, so a later model field (e.g. a default on `filter` or `optional`) could drift with nothing going red. That is the #23888 point.
- Job-time closed-table probe: ran the PR's "closed after submit" scenario with `validated_state` both False and True. Both fail in `from_json` with `ParameterValueError: Parameter 'reference': requires a value, but no legal values defined`. The trust check added in `setup_for_reference_data` (`runtime.py`, "not available to user-defined tools") is never reached through the evaluator. Only the direct-callback unit test reaches it.

## Coverage map vs. #23888 load paths

| Path | single | multiple | optional | filter | denied |
|---|---|---|---|---|---|
| disk `GalaxyUserTool` (framework test, `gx_reference_data*_user.yml`) | ✅ | ✅ | ❌ | ❌ | n/a |
| user API creation (full dump) → persisted reload → legacy run | ✅ `test_run_with_reference_data` | ❌ | ❌ | ❌ | ⚠️ 400 status only |
| user API → tool request API (`validated_state` → `runtimeify`) | ❌ | ❌ | ❌ | ❌ | ❌ |
| admin `GalaxyTool` API (`exclude_unset`) | ❌ | ❌ | ❌ | ❌ | n/a (should *read* closed tables) |
| model → dump → parser → parameter models (unit) | ❌ (only `to_internal()`) | ❌ | ❌ | ❌ | — |
| unit evaluator (raw dict, `get_tool_source`) | ✅ | ✅ | ✅ | ✅ (form) | ✅ (form layer) |

Every unit test in `test_reference_data.py` builds its tool from a raw dict through `get_tool_source`. That is the disk path: no model validation, no dump. Rich behaviour is covered only on the one path that production user tools never take.

## Per-test challenges

### test/unit/tool_util/test_yaml_parameters.py
- `test_reference_data_maps_to_a_select_carrying_its_table`: tests `to_internal()`, which #23888 says isn't load-bearing. It passes a `filter`, but nothing asserts on it, and `to_internal()` drops `filter` (`ReferenceDataConfig` has only `table`). **Rewrite** as a boundary test: validate → dump under each policy → `YamlToolSource` parser → `input_models_for_tool_source`. Assert it equals `to_internal()` and that the parsed input source's dynamic options carry the filter. My scratch probe is the skeleton.
- `test_reference_data_rejects_invalid_definitions`: keep. Model validation gates the API.
- Adding `reference_data` to the one-example-per-type list: keep.

### test/unit/app/tools/test_reference_data.py
- `test_renders_as_a_select_offering_the_table_entries`: the `/refs not in` no-path-leak check matters. **Move it to API**: `build_unprivileged_tool` on the real user path, assert options are the `.loc` values and no `_path` column value appears. Then drop the unit test.
- `test_user_tool_is_offered_nothing_from_a_table_admins_have_not_opened`, `test_user_tool_cannot_submit_a_value_from_a_closed_table`: subsumed by the API denied test once it is strengthened (assert the form offers no options and the 400 names `reference`). Drop after that.
- `test_admin_installed_tool_can_read_any_table`: **rewrite at API** with admin `create_tool` of a `GalaxyTool` on `testalpha` (closed). Run it and assert the output. That covers the `exclude_unset` dump policy and `trusted=True` end to end.
- `test_history_bundles_are_not_offered_as_table_entries`: monkeypatches `get_user_options` with a hand-built row. Acceptable as a unit test, because data-bundle setup at API level is heavy. Keep, low priority.
- `test_xml_tools_cannot_declare_reference_data`: keep (load-time rejection, cheap).
- `test_filter_offers_only_entries_matching_the_selected_dataset`, `test_table_this_instance_does_not_have_offers_nothing`, `test_filter_on_a_missing_column_is_rejected_when_loading`: the filter is user-facing form behaviour, and no API test covers it. **Add an API test**: upload a dataset with dbkey `mm10`, `build_unprivileged_tool` with `reads` set, assert only `mm10_value` is offered, and submitting `hg19_value` with the mm10 dataset is rejected. Keep the missing-column/not-installed unit tests (cheap load-time edges).
- `test_job_receives_the_entries` (single/multiple × job_parameters/validated_state): good evaluator coverage. Keep.
- `test_optional_input_with_nothing_selected_stays_empty`: keep. Optional has no fixture/API coverage anywhere else.
- `test_path_is_rewritten_for_the_job`, `test_entry_of_a_table_without_paths_has_only_metadata`: keep (hard to reach from API).
- `test_job_fails_when_admins_close_the_table_after_it_was_submitted`: passes on `from_json`, not on the new runtime trust check. Its name suggests the runtime check is what is tested. Keep it, parametrize over `validated_state` (both raise, verified), and keep the name honest.
- `test_resolving_a_path_enforces_the_allowlist_and_the_entry`: calls the callback directly. The `not available to user-defined tools` and `not configured` cases are unreachable through the evaluator today, so this tests implementation only. Either accept it as explicit defense-in-depth (say so in the PR) or drop those two cases. `no entry with value` is likewise pre-empted by `from_json`.

### test/unit/app/tools/test_runtime.py
- The `Bunch` grows `tool_source=Bunch(trusted=False)` and `has_data_table=False` only because `UserToolEvaluator` now calls `setup_for_reference_data(..., self.tool.tool_source.trusted)` eagerly for every user tool. Making the callback lazy (or built only when the tool has a `reference_data` input) would leave this unrelated test untouched. Minor design nit.

### test/unit/tool_util/data/test_tool_data.py
- The three new tests (default closed, merge either order + reload, Tool Shed can't open) are real behaviour tests on the trust boundary. Keep.

### test/unit/tool_util/parameter_specification.yml
- Loads fixtures via the disk parser + factory, which is the load-bearing path for disk tools. Good.
- `gx_reference_data_multiple_user.job_runtime_valid` accepts `reference: null` for a non-optional multiple (from `optional_if_needed(..., self.optional or self.multiple)`). Confirm that is intentional and matches the `gx_select` multiple convention; otherwise move it to invalid.

### test/unit/app/tools/test_data_table_select_options.py
- New not-installed-table filter test: keep.

### lib/galaxy_test/api/test_unprivileged_tools.py
- `TOOL_WITH_REFERENCE_DATA` nearly duplicates `gx_reference_data_user.yml`. Load the fixture (`yaml.safe_load` → `UserToolSource`) instead. Parametrize over both fixtures so `multiple` runs through user creation (full dump) and persisted reload, not only from disk. This is the #23888 parity ask, and it reuses existing assets.
- `test_reference_data_needs_a_table_admins_opened_to_user_tools`: asserts only `400`. Strengthen it to assert the error names `reference`. Also assert that `build_unprivileged_tool` for that tool offers no options, which lets the two closed-table unit tests go.
- Missing: a tool request API run (`tool_request_raw`, as the mapped-over tests in this file already do). That path validates the request against `SelectParameterModel.reference_data` and runs `runtimeify` → `adapt_reference_data` in `convert.py`. Today only the unit evaluator with a hand-set `job.tool_state` covers it.

## E2E
None needed. The form renders `reference_data` as a plain `select`, which existing select E2E tests cover. The filter's dynamic refresh is a form-build concern an API `build` test can assert.

## Test plan (recommendations, not applied)
1. Unit boundary test in `test_yaml_parameters.py` replacing the `to_internal()` test: 2 classes × 3 dump policies × {single, multiple+filter, optional}.
2. API: parametrize the run test over both fixtures loaded through `UserToolSource`. Add `optional: true` with nothing selected.
3. API: the same tool through `tool_request_raw` → output content.
4. API: admin `GalaxyTool` on a closed table runs and outputs the path.
5. API: filter via build + submit mismatch.
6. API: strengthen the denied test. Drop the two now-redundant unit closed-table tests and move the path-leak check to the API build.
