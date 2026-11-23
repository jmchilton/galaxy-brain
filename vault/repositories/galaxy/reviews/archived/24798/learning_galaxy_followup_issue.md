# galaxy-brain research follow-up from galaxyproject/galaxy#24798

Found while reading #24798 ("Add reference_data input for YAML tools", reviewed at `5abbfd9d5a6`) against `origin/dev`.

## Stale now (before merge)

`vault/research/Component - YAML Tool Runtime.md` describes an older `runtimeify`:

1. The `build_param_dict` snippet calls `setup_for_runtimeify(self.app, compute_environment, input_datasets)` and unpacks two values. On `dev` it also takes input collections, `shell_quotable` and `element_identifiers`, and returns `(hda_references, adapt_datasets, adapt_collections)` (`lib/galaxy/tools/evaluation.py`, `UserToolEvaluator.build_param_dict`).
2. The `runtimeify` signature shows only `adapt_dataset`. On `dev` it takes `adapt_collection` and `yaml_origin` too, and asserts YAML v1 parameters when `yaml_origin` is set (`lib/galaxy/tool_util/parameters/convert.py`).
3. "Not Yet Implemented: `DataCollectionParameterModel` runtime adaptation raises `NotImplementedError`" no longer holds. Collection adaptation is implemented via `adapt_collection` (#21828, which `PR 21828 - YAML Tool Hardening and Tool State.md` already records).

## Post-merge updates (if #24798 merges)

- `Component - YAML Tool Runtime.md`: add `adapt_reference_data` / `setup_for_reference_data` (`tools/runtime.py`), the `ReferenceData` runtime shape (`class`, `path`, `basename`, `source`, `metadata`), and the matching resolver in the legacy `to_cwl` branch.
- `Component - User-Defined Tools.md`: under "Boundaries that matter", UDTs can now read reference data through `reference_data` inputs on admin-opened tables. Resolve the open question "Reference data / metadata files in UDTs" for reference data (explicit input type, #22700 option B). Metadata files stay open.
- `Component - YAML Tool Parser and Authoring Model Boundary.md`: `_trusted` became the public `ToolSource.trusted` property, and `InputSource.trusted` defaults to `True`. Trust is now consumed outside the parser (`ReferenceDataToolParameter`, `UserToolEvaluator`). Add `YamlReferenceDataOptions` as a parser-synthesized XML `<options>` bridge, and note that `to_internal()` and the factory build the `reference_data` select model independently.
- `Component - Tool Data Tables.md`: document the `user_accessible` table attribute (default false, OR-merged across sources, stripped from Tool Shed-supplied configs before persisting), and `DataMetaFilter` deferring named-column resolution for tables not configured on the instance.
- `Component - Tool State Specification.md`: the `runtimeify` row now also converts `reference_data` select values to `ReferenceDataInternalJson`. `SelectParameterModel.reference_data` changes only the `job_runtime` representation.
- `Component - User-Defined Tool Source Validation.md`: add `YamlReferenceDataParameter` (and `YamlReferenceDataFilter`) to the list of narrow YAML-facing input models.
