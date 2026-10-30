# Component - YAML Tool Parser and Authoring Model Boundary

Write `vault/research/Component - YAML Tool Parser and Authoring Model Boundary.md` for `release_26.1`/`dev`. Cover every place a `class: GalaxyTool`/`GalaxyUserTool` dict becomes a `galaxy.tool_util.parser.yaml.YamlToolSource` (disk via `parser/factory.py` `get_tool_source`/raw-source factory, `from_path` in `api/dynamic_tools.py`, `managers/tools.py` `tool_payload_to_tool`, `tools/__init__.py` stored-row loading, `tool_util/lint.py`), which `model_dump` policy feeds each, and what validates where (`tool_util_models` `YamlToolSource`/`UserToolSource`, `lift_user_tool_source` for stored user rows, the parser trust gate `USER_TOOL_ROOT_KEYS`/`UntrustedToolSourceError`/`TRUSTED_ONLY_INPUT_KEYS`). Cover the canonical (`is_yaml_origin`, `CanonicalYamlPageSource`) vs legacy YAML dialect, the incoming vs internal output models (`IncomingToolOutput*` vs `ToolOutput*`, `extra` policy), and the in-tree legacy YAML fixtures (`simple_constructs.yml` etc.) and their consumers. Update `Component - User-Defined Tool Source Validation` cross-links rather than duplicating it; leave out parameter-model internals and runtime state (`Component - YAML Tool Runtime`).

## Why

Galaxy#23888 slices (boolean defaults, parser-side model validation, dataset-output strictness) each need the construction-site and validation-boundary map; `Component - User-Defined Tool Source Validation` covers the authoring models but not `lift_user_tool_source`, the parser trust gate, or where the parser is built, so each branch re-greps.

## Requested by

- vault/repositories/galaxy/branches/active/yaml_tool_model_validation_26.1/brain_research.md: needs the construction-site map and stored-row (GalaxyTool, no lift) policy to validate in `YamlToolSource.__init__`.

## Debrief

- Created `vault/research/Component - YAML Tool Parser and Authoring Model Boundary.md`, verified at Galaxy `origin/dev` `65e6daff`. Checked the `release_26.1` differences: the models live in `tool_util_models/__init__.py` there, and a few parser additions are dev-only.
- Updated `Component - User-Defined Tool Source Validation` with a scope pointer to the new note and a note that its model line numbers predate the `_models.py` move. No content was duplicated. Backlinks were added to User-Defined Tools, YAML Tool Runtime, Dynamic Tool Manager and Toolbox Lifecycle, Tool Linters, Tool Citations and External Metadata Fetch, and Workflow Import.
- Correction to the request: `from_path` isn't in `api/dynamic_tools.py`. That file's parser construction is the `runtime_model` endpoint. `from_path` is in `DynamicToolManager.create_tool` via `artifact_class`, and its parser is built later from the stored row in `dynamic_tool_to_tool`. The note has the full construction-site table, including the raw-source factory consumers.
- Stored-row policy for the branch: `GalaxyUserTool` rows go through `lift_user_tool_source` and then a full `model_dump(by_alias=True)`. `GalaxyTool` rows, including `from_path`, reach the parser unvalidated. The admin representation path stores `exclude_unset`, the user path stores a full dump, and lint uses `exclude_none`.
- New research_issues: `yaml-parser-dict-form-inputs-unsupported.md` and `collection-creates-pair-y-static-elements.md`. The scalar-output and dataset-output `extra` mismatches are already tracked under `vault/repositories/galaxy/issues/wip/23888/`, so they are only summarized in the note.
- Out of scope, as requested: parameter-model internals, runtime defaults and state (`Tool.yaml_origin` consumers in `convert.py`), and the narrow `yaml_parameters.py` field inventory, which stays in the Source Validation note.
