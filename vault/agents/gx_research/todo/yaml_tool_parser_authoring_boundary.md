# Component - YAML Tool Parser and Authoring Model Boundary

Write `vault/research/Component - YAML Tool Parser and Authoring Model Boundary.md` for `release_26.1`/`dev`. Cover every place a `class: GalaxyTool`/`GalaxyUserTool` dict becomes a `galaxy.tool_util.parser.yaml.YamlToolSource` (disk via `parser/factory.py` `get_tool_source`/raw-source factory, `from_path` in `api/dynamic_tools.py`, `managers/tools.py` `tool_payload_to_tool`, `tools/__init__.py` stored-row loading, `tool_util/lint.py`), which `model_dump` policy feeds each, and what validates where (`tool_util_models` `YamlToolSource`/`UserToolSource`, `lift_user_tool_source` for stored user rows, the parser trust gate `USER_TOOL_ROOT_KEYS`/`UntrustedToolSourceError`/`TRUSTED_ONLY_INPUT_KEYS`). Cover the canonical (`is_yaml_origin`, `CanonicalYamlPageSource`) vs legacy YAML dialect, the incoming vs internal output models (`IncomingToolOutput*` vs `ToolOutput*`, `extra` policy), and the in-tree legacy YAML fixtures (`simple_constructs.yml` etc.) and their consumers. Update `Component - User-Defined Tool Source Validation` cross-links rather than duplicating it; leave out parameter-model internals and runtime state (`Component - YAML Tool Runtime`).

## Why

Galaxy#23888 slices (boolean defaults, parser-side model validation, dataset-output strictness) each need the construction-site and validation-boundary map; `Component - User-Defined Tool Source Validation` covers the authoring models but not `lift_user_tool_source`, the parser trust gate, or where the parser is built, so each branch re-greps.

## Requested by

- vault/repositories/galaxy/branches/active/yaml_tool_model_validation_26.1/brain_research.md: needs the construction-site map and stored-row (GalaxyTool, no lift) policy to validate in `YamlToolSource.__init__`.
