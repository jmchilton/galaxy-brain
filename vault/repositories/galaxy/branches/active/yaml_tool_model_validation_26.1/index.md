---
upstream_base_branch: release_26.1
---
# yaml_tool_model_validation_26.1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.1...jmchilton:galaxy:yaml_tool_model_validation_26.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/yaml_tool_model_validation_26.1)

## Status

`BLOCKED` on a scope decision for John: head `6c43b516f4d`, re-scoped once and re-hardened. The second scope evaluation says to resolve user-tool citations by uuid (Scope 2), or else stop loading `GalaxyUserTool` citations (Scope 3). See [implementation_debrief.md](implementation_debrief.md).

No PR.

No CI run yet.

## Scope (John, 2026-10-28)

`class: GalaxyTool` YAML is a trusted user-defined tool:
- Class-declaring YAML validates against its authoring model when the parser is constructed: disk, `from_path`, stored rows and the raw-source factory. So the legacy dialect is rejected: Cheetah `command`, `base_command`/`arguments`, `when:`, select `display`, untyped outputs, static collection `elements` and numeric `version`.
- Admin dataset outputs reject unknown keys. Scalar outputs leave the authoring model.
- In-tree fixtures are converted.
- Class-less YAML is untouched.
- Stored `GalaxyTool` rows that fail the model fail loud (no lift).

Re-scope (first scope evaluation, Scope 2): close the remaining fields the model accepts but the loader drops. The container requirement leaves the model, citations load, and collection `hidden` takes effect. The original scope is kept as `yaml_tool_model_validation_26.1_alt_original_scope` ([alt](alts/original_scope.md)).

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Re-scope](implementation_rescope_debrief.md)
