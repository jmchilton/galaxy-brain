Run via Claude Opus 5.5 at low effort.

# Normal review 2 - re-scope diff (809d07fc8ad..1a32b46076d)

## Verdict

Ready. No bugs in the re-scope diff. The `value=` fix is right: `TextParameterModel.default_value` is aliased to `value` without `populate_by_name` (`lib/galaxy/tool_util_models/parameters.py:389`), so the old `default_value=` was silently dropped (internal models use the default `extra="ignore"`). The fixture test catches the bug: `configfile_user_defined.json` has `value: "hello!"`, which the factory keeps and the old `to_internal()` turned into `None`. The guard message and the classless-YAML test are fine. `pytest test/unit/tool_util/test_yaml_parameters.py test/unit/app/tools/test_reference_data.py`: 165 passed.

## Bugs (in diff)

None.

## Answers to the brief

- **Other `to_internal()` alias mistakes:** none. Among the parameter models, only `TextParameterModel` has a plain alias. `DataParameterModel` and `DataCollectionParameterModel.extensions` use `validation_alias=AliasChoices("extensions","format")` with `populate_by_name=True`, so `extensions=` works. Every other kwarg `to_internal()` passes matches a field name. (I checked the field and alias tables of all 12 YAML/internal pairs with a script.)
- **Other `to_internal()` callers affected by the text fix:** none in production. `lib/galaxy/tool_util/parameters/factory.py:281` (reference_data only) is the one runtime caller. The rest are tests (`test_yaml_parameters.py`). So the fix changes no runtime path. It makes the authoring-model contract true for text.
- **Fixture-glob robustness:** Failing on a fixture that is not model-valid is the right behavior. `lib/galaxy_test/api/test_user_tool_contract.py:16` uploads these files as real user tools, so they must already be valid. The glob is `*.json` only. The `.yml` twins (`configfile_user_defined.yml`, `gx_select_multiple_one_default_user.yml`) are copies of their `.json`, so nothing is lost, but a future fixture that exists only as `.yml` would be skipped.

## Divergences the fixture test cannot see (latent, not alias bugs)

I swept every YAML type with each field set to a non-default value (factory parse vs `to_internal()`, for raw, full and `exclude_unset` dumps). The only mismatches:

1. **Required text with `value` omitted.** The factory gives `""` (`factory.py:141` `implicit_default = None if optional else ""`). `to_internal()` gives `None`. The full dump agrees only because it writes `value: null` explicitly. If a fixture with a valueless required text is added, the `exclude_unset` case goes red. That failure is wanted, but fixing it would need `model_fields_set`.
2. **`area: true` on text.** The factory never passes `area` (`factory.py:146`, for every source, including XML). `to_internal()` does. This is a factory gap and only affects the `gx_area` JSON-schema extra.
3. **Optional select with a `no_options` validator.** The factory drops it on purpose (`factory.py:258-262`). `to_internal()` keeps it.

None of these affect reference_data, and all predate this branch. Possible follow-up: pass `area=input_source.get_bool("area", False)` in the factory's text branch.

Why this class of bug escaped: internal models ignore unknown kwargs at runtime, and `mypy.ini:3` loads `pydantic.mypy` without a `[pydantic-mypy] init_forbid_extra = True` section, so mypy accepted `default_value=`. Info only. Turning it on Galaxy-wide is a separate change.

## Nits (optional)

- `test_parameter_models_reject_classless_yaml_reference_data` covers only the factory guard. Unlike the XML cases, the `basic.py:1884` guard has no classless twin. Low value either way.
- The `full` and `exclude_unset` ids line up with real storage paths: user tools are stored as `model_dump(by_alias=True)` (`lib/galaxy/managers/tools.py:218`), admin `GalaxyTool` as `exclude_unset=True` (`:156`). A one-line comment saying so would explain why exactly these two dumps are tested.

## Out of scope: `exclude_none` erases explicit `value: null` (real, low severity)

For YAML booleans, explicit `value: null` and an omitted value mean different things. `YamlInputSource.parse_boolean_default` returns `input_dict.get("value", False)` (`lib/galaxy/tool_util/parser/yaml.py:699-701`), and the authoring default is `False` (`yaml_parameters.py:131`). `exclude_none` turns null into omitted, so after a round trip an optional "no default" boolean defaults to `False`. Verified on `gx_user_boolean_optional_null`, `gx_user_repeat` and `gx_user_section`: the model changes after re-validation, and so does the factory output.

- **`lib/galaxy/agents/custom_tool.py:758` `_render_tool_yaml`** (real). This YAML goes to `CustomToolEditor.vue` and gets saved, so a tool the agent writes with `optional: true, value: null` is saved with default `False`. The docstring's claim that it "round-trips to an identical tool" is false. Fix (verified: every fixture round-trips equal with `exclude_defaults` alone, because None-default fields are already dropped by it):
  ```diff
  -        tool_dict = tool.model_dump(by_alias=True, exclude_none=True, exclude_defaults=True)
  +        tool_dict = tool.model_dump(by_alias=True, exclude_defaults=True)
  ```
  The docstring line "``exclude_none`` additionally drops unset optional fields." should also go. Side note: `exclude_defaults` drops validator `type` and empty `parameters: []` in whens. The model re-validates fine, but the factory cannot parse that dict directly (ValidationError / `KeyError: 'parameters'`). That's harmless today because the save path re-validates and stores a full dump.
- **`lib/galaxy/tool_util/lint.py:349`** (minor). Lint checks a different dict from the one that gets stored. Storage is a full dump (`managers/tools.py:218`), while lint gets null booleans as `False` and required text `value: null` as omitted (`""`). Fix: `user_tool_source.model_dump(by_alias=True)`, so lint sees what will be loaded.
- **Related pre-existing mismatch between the two tool kinds:** for the same YAML, a required text with no `value` gets factory default `None` as a user tool (full dump) but `""` as an admin `GalaxyTool` (`exclude_unset`). The runtime `basic.py:476` `input_source.get("value")` is `None` either way, so only the parameter-model layer (request/state models) differs.

No security findings.
