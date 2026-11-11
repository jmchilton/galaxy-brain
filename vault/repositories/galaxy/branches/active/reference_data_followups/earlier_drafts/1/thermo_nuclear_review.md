Run via Claude Opus 5.5 at low (reasoning_effort=15) effort.

# Thermo-nuclear code quality review: reference_data_followups

Reviewed `063446e7d2b` (7 commits, ~80 non-test lines). Verdict: approve after one structural fix, which I made. `CanonicalYamlInputSource` had a nullable reference_data mode, and it is now a dedicated `CanonicalYamlReferenceDataInputSource` subclass chosen by a single dispatch helper. The fix is folded into "Load reference_data inputs through their authoring model" (now `d3e7d7fdd44`), whose message is reworded to cover it. The new head is `218cf520ef0`, and the four Baseline commits are still first. There are no other blockers. No security findings.

Not acted on:
- **Factory split.** reference_data loads through `to_internal()`, while every other YAML type is still built from the raw dict. Moving all canonical types onto their authoring models is #23888 scope and would make on-disk validation strict for every type. Suggested follow-up: put the other types behind `_canonical_input_source`.
- **Duplicated "only supported in YAML tools" guard.** The factory raises `ParameterDefinitionError` and `basic.py` raises `ParameterValueError`. They sit in different layers and tests pin both types. `Tool.parse_inputs` swallows the factory error, so the `basic.py` guard is the one users actually hit.
- **`reference_data_runtime_json` takes a positional `multiple` and is typed `Any -> Any`.** Normal review 1 already declined this. It mirrors the inline data-param branch right above it in `runtimeify`. The alternative, a list-aware adapter, would change the `ReferenceDataToRuntimeJson` contract. Dropping `multiple` would also silently accept a list for a single-valued param.
- **`ReferenceDataToolParameter` holds the table name twice** (`table_name` and `options.tool_data_table_name`). It also copies `trusted` from the input source, while job time reads `tool.tool_source.trusted`. `table_name` predates the branch and the legacy evaluation path uses it. `trusted` replaces `requires_user_accessible_table` 1:1.
- **Parity test picks its model class with `if tool_class == ... else`.** Parametrizing on `(class_name, model_class)` pairs would remove it. Cosmetic, in a Baseline commit.

<details><summary>Full review</summary>

## 1. Structural: a feature mode inside a generic input source (acted on)

At `063446e7d2b`, `CanonicalYamlInputSource.__init__` sniffed `input_dict.get("type") == "reference_data"` to:

- store a nullable `_reference_data`;
- rewrite `input_dict` to the model's dump;
- make `parse_reference_data()` return the nullable value;
- have `parse_dynamic_options()` re-branch with `is None`.

Every canonical parameter (text, data, repeat and so on) carried a reference_data-only `None` attribute. The class that defines general GalaxyTool parameter semantics (optional, boolean defaults, nesting) also owned one type's validation. Two identical `CanonicalYamlInputSource(input_dict, trusted=...)` constructions lived in `CanonicalYamlPageSource._input_source` and `CanonicalYamlInputSource._input_source`.

The fix reframes the state model so the conditionals go away:

- `CanonicalYamlReferenceDataInputSource(CanonicalYamlInputSource)` always validates, holds a non-optional model and passes the coerced dump to `super().__init__`. It owns `parse_reference_data() -> YamlReferenceDataParameter` and `parse_dynamic_options() -> YamlReferenceDataOptions`.
- The base `CanonicalYamlInputSource` loses its `__init__`, its Optional state and its `parse_dynamic_options` override. It falls back to `InputSource`'s `None`, because `YamlInputSource` doesn't override it.
- `_canonical_input_source(input_dict, trusted)` is the one place that picks the class. Both `_input_source` methods call it.

What stays the same:

- reference_data inputs validate once at construction.
- Raw-dict readers (`SelectToolParameter`) see coerced flags.
- Non-canonical `YamlInputSource` (workflow forms) and XML sources still return `None` from `parse_reference_data()`.

The dispatch helper is also the reusable seam for #23888. Any other YAML type that moves onto its authoring model gets its own input source there instead of another `if` in a shared constructor.

## 2. Missed simplification: factory loads one type through the authoring model (suggestion)

`_from_input_source_galaxy` now returns `parse_reference_data().to_internal()` for reference_data and builds every other type by hand from the raw dict. The `yaml_parameters.py` module docstring records this. It is a temporary-looking split that will become permanent unless #23888 moves the remaining types. With the seam from finding 1, that follow-up is mechanical:

1. Add an input source per type, or a generic one keyed on the `YamlParameterT` discriminator.
2. Have the factory call `to_internal()` for any canonical source.

It is out of scope here, because it makes disk-loaded tools strictly validated for every type.

## 3. Boundary: duplicated YAML-only guard (no action)

`factory.py` and `basic.py` both check `if (rd := input_source.parse_reference_data()) is None: raise ...("reference_data is only supported in YAML tools")`. The duplication is justified:

- They are two layers. tool_util's model factory serves planemo and lint; the app's `ToolParameter` serves loaded tools.
- `parser/interface.py` can't raise `ParameterDefinitionError` without importing `tool_util.parameters`.
- Tests pin each layer's exception.

## 4. Type contract: `reference_data_runtime_json` (no action)

`(adapt, table_name, multiple, value: Any) -> Any`. It deduplicates the dump policy (`model_dump(by_alias=True)`) across `runtimeify` and the legacy `to_cwl` visitor, so it earns its keep.

I considered a "code judo" alternative: make `setup_for_reference_data` return a list-aware, already-dumped adapter, so both callers become `adapt(table, value)`. I rejected it:

- It changes the typed `ReferenceDataToRuntimeJson` contract that `runtimeify` exposes.
- Dropping the `multiple` guard would map a stray list for a single-valued param instead of failing at the table lookup.

The `multiple and isinstance(value, list)` shape matches the data branch right above it.

## 5. `ToolDataTable.readable_by(*, trusted)` (no action)

A one-line predicate, but it is the canonical home: the table owns `user_accessible`. It names the single access rule used at form time (`get_options`) and job time (`adapt_reference_data`). It isn't an identity wrapper. Both enforcement points route through it, which is consistent.

## 6. Duplicate state on `ReferenceDataToolParameter` (no action)

- `table_name` repeats `options.tool_data_table_name`. It predates this branch and the legacy evaluation visitor reads it.
- `trusted` is copied from the input source, while job time uses `tool.tool_source.trusted`. Both come from the same root, and `tool` is Optional in the constructor.

Minor.

## 7. File size

No file crosses 1k lines because of this branch:

| File | dev | branch |
| --- | --- | --- |
| `parser/interface.py` | 983 | 988 |
| `parameters/convert.py` | 882 | 889 |
| `parser/yaml.py` | 727 | 744 |

`data/__init__.py`, `evaluation.py` and `basic.py` were already over 1k on dev, with deltas of +4, +1 and -1.

`interface.py` is 12 lines from the threshold. The next addition there should consider splitting `InputSource` out.

## 8. Tests (no action)

- The parity test's `model_class = UserToolSource if tool_class == "GalaxyUserTool" else YamlToolSource` could be a parametrized pair. Cosmetic.
- No OR-checks or weak assertions found. The contract harness, the closed-table API test and the reject-on-load unit tests pin behavior at the right layers.

## Verification after fix

- Unit: `test_reference_data.py`, `test_yaml_parameters.py`, `test_evaluation.py`, `test_parsing.py`: 234 passed (same as before the fix).
- Unit: `test_parameter_specification.py` and `test_parameter_test_cases.py`: 38 passed.
- Unit at the intermediate commit `d3e7d7fdd44`: `test_reference_data` + `test_yaml_parameters` 124 passed.
- API, run one at a time:
  - `test_user_tool_contract.py -k reference`: 18 passed.
  - `test_unprivileged_tools.py -k "reference or table_closed or admin_yaml_tool"`: 3 passed.
- ruff, black, isort and pre-commit are clean. mypy reports no errors on new lines; the remaining `yaml.py` errors are on untyped defs that already exist.

</details>
