# Thermo review: #24798 Add reference_data input for YAML tools

- Profile: [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md)
- Model: Claude Opus 5.5, medium effort
- Reviewed commit: `5abbfd9d5a6` (base `origin/dev`)
- Lens: [#23888](https://github.com/galaxyproject/galaxy/issues/23888), where the authoring models and the `YamlToolSource` loader diverge (see `context_issue_23888.md`)

## Verdict

The PR reuses existing machinery well. It doesn't fork a new options system: the YAML input becomes an `<options from_data_table>` element, so XML's `DynamicOptions`/`DataMetaFilter` path does the table lookup and filtering. It also reuses `set_basename_and_derived_properties`, and the `user_accessible` policy sits in the data-table layer, where it belongs. No file crosses the 1k-line mark (`basic.py`, `evaluation.py` and `parameters.py` were already over it, and this PR adds at most about 40 lines to each).

Under #23888, though, this PR follows the pattern the issue complains about. One new parameter type touches **11 production files** and adds **6 per-type branches**: the factory `elif`, the `runtimeify` `elif`, the `pydantic_template` `elif`, the legacy evaluation visitor, the `parameter_types` registry entry and the parser's `parse_dynamic_options` type check. The typed authoring model (`YamlReferenceDataParameter`) is written but not load-bearing: three loader layers read the raw `table`/`filter` dict keys again on their own. The PR adds no seam, so the next YAML-only parameter type will need the same spread. Two findings are worth fixing here (P2 1, P2 2). The model-backed `InputSource` seam belongs to #23888's slice 2, not this PR.

Touch points per layer (production code only):

| Layer | File | What reference_data adds |
|---|---|---|
| authoring model | `tool_util_models/yaml_parameters.py` | `YamlReferenceDataParameter`, `YamlReferenceDataFilter`, `to_internal()` |
| internal / runtime models | `tool_util_models/parameters.py` | `ReferenceDataConfig`, `ReferenceDataInternalJson`, `ReferenceDataSource`, `SelectParameterModel.reference_data`, `pydantic_template` branch |
| parser | `tool_util/parser/yaml.py` | `YamlReferenceDataOptions` (builds an XML element), `parse_dynamic_options` type check |
| parser interface | `tool_util/parser/interface.py` | `ToolSource.trusted`, `InputSource.trusted` |
| parameter factory | `tool_util/parameters/factory.py` | `reference_data` `elif` |
| convert | `tool_util/parameters/convert.py` | `ReferenceDataToRuntimeJson`, `runtimeify` branch, new optional kwarg |
| tool parameter | `tools/parameters/basic.py` | `ReferenceDataToolParameter`, registry entry |
| dynamic options | `tools/parameters/dynamic_options.py` | resolves the `DataMetaFilter` column lazily |
| evaluation | `tools/evaluation.py` | adapter setup, legacy `to_cwl` visitor |
| runtime | `tools/runtime.py` | `setup_for_reference_data` |
| data tables | `tool_util/data/__init__.py` | `user_accessible`, merge, shed strip |

## Findings

### P2 1: Three loader layers read `table`/`filter` from the raw dict, bypassing the typed authoring model

`YamlReferenceDataParameter` declares `table: str`, `filter: YamlReferenceDataFilter | None` and `multiple: bool`, and its `to_internal()` builds the internal `SelectParameterModel`. On the production load path none of that runs. Instead, each layer reads the dict again:

- `CanonicalYamlInputSource.parse_dynamic_options` reads `self.input_dict["table"]` and `.get("filter")`.
- The `factory.py` `reference_data` branch reads `input_source.get("table")` and `get_bool("multiple")`, and builds its own `SelectParameterModel`, a second copy of what `to_internal()` already builds.
- `ReferenceDataToolParameter.__init__` reads `input_source.get("table")` and `input_source.get("filter")`, then indexes `filter_def["on_metadata"]` without types.

The internal model also drops `filter` (`ReferenceDataConfig` holds only `table`), so the filter reaches runtime only through the synthesized XML element. This is #23888's two-dialects problem, created fresh for a new type. Nothing checks that the factory's model equals `to_internal()`, so the two will drift as soon as one side gains a field.

Suggested fix: have `CanonicalYamlInputSource` validate the reference_data dict into `YamlReferenceDataParameter` once, cached, and expose it, for example as `parse_reference_data() -> YamlReferenceDataParameter | None`. `parse_dynamic_options` then builds `YamlReferenceDataOptions(model.table, model.filter)`. The factory branch becomes `return model.to_internal()`. `ReferenceDataToolParameter` reads `model.table` and `model.filter.on_metadata`. Add one parity test asserting the factory output for `gx_reference_data_user.yml` and `gx_reference_data_multiple_user.yml` equals the authoring model's `to_internal()`. That gives #23888 a first model-backed input it can generalize, instead of another case to unwind.

### P2 2: Reference-data value resolution is copied into the deprecated `to_cwl` path

The block that maps a single value or a list through the adapter is duplicated almost verbatim:

```python
if parameter.multiple and isinstance(value, list):
    return [adapt_reference_data(config, v).model_dump(by_alias=True) for v in value]
return adapt_reference_data(config, value).model_dump(by_alias=True)
```

It appears once in `convert.runtimeify` and again in `UserToolEvaluator`'s new `resolve_reference_data` visitor, which also adds a `ReferenceDataToolParameter` import and a `has_data_table` guard to `evaluation.py`. Fold the multiple/list handling into the adapter that `setup_for_reference_data` returns, so it takes `(config, value, multiple)` and returns the dumped JSON or a list of it. Both call sites then make one call.

Also ask whether a brand-new parameter type needs the legacy branch at all. It exists for jobs without `job.tool_state`, and the log calls it deprecated. Every new reference_data job goes through validated state. If the legacy path can raise for reference_data instead, the visitor, the import and the guard all go away.

### P3 1: Reference data is a nullable mode on `SelectParameterModel`

`reference_data: ReferenceDataConfig | None` makes "select backed by a table" a nullable mode, and `runtimeify` and `pydantic_template` branch on `reference_data is not None`. XML `from_data_table` selects describe the same idea, but their internal model carries no table at all (`options=None`). The same concept is now modeled for one source only (sibling-path divergence). Two directions would remove the asymmetry:

- Rename the field to say what it is, for example `data_table: str | None`. The factory can set it for XML `from_data_table` selects too, and keep the runtime-object behavior gated on `yaml_origin`.
- Make reference_data its own `parameter_type`.

The first is cheaper and keeps the workflow editor and request state treating it as a select. Either is better than an optional field that only one dialect sets. Keeping `filter` out of the internal model (P2 1) is part of the same gap.

### P3 2: `ReferenceDataToolParameter` mutates its own type and checks dialect indirectly

- `self.type = "select"` is set after `super().__init__()`, so the object reports a different type than its registry key. Override the dict/serialization instead, or document it as the form contract.
- `input_source.parse_dynamic_options() is None` stands in for "this is YAML", and the method gets called twice (once here, once in `SelectToolParameter.__init__`). After P2 1, `input_source.parse_reference_data() is None` would state the intent directly.

## Follow-up refactor issue

None written. The base is `dev`, so the profile's release-branch collapse rule doesn't apply. The larger seam this PR points to, a model-backed `InputSource` so the factory and `basic.py` can't read a dict differently from `to_internal()`, is already slice 2 of #23888. Recommend the PR body or the review response link to #23888 and list `reference_data` as the first parameter type routed through that seam if P2 1 lands.
