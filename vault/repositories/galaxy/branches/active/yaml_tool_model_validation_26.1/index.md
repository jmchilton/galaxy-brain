---
upstream_base_branch: release_26.1
---
# yaml_tool_model_validation_26.1

- Open PR (not yet)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/yaml_tool_model_validation_26.1)

## Status

Implementation in progress (gx_workhorse, 2026-10-28), next #23888 chunk after merged [#24365](https://github.com/galaxyproject/galaxy/pull/24365).

## Scope (John, 2026-10-28)

`class: GalaxyTool` YAML is a trusted user-defined tool: class-declaring YAML validates against its authoring model when the parser is constructed (disk, `from_path`, stored rows, raw-source factory), so the legacy dialect (Cheetah `command`, `base_command`/`arguments`, `when:`, select `display`, untyped outputs, static collection `elements`, numeric `version`) is rejected. Admin dataset outputs reject unknown keys; scalar outputs leave the authoring model. In-tree fixtures converted. Class-less YAML untouched. Stored `GalaxyTool` rows that fail the model fail loud (no lift).
