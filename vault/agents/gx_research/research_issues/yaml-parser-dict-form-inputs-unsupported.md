# YAML parser rejects dict-form `inputs:` that the authoring models accept

- Area: lib/galaxy/tool_util/parser/yaml.py
- Found while: [[Component - YAML Tool Parser and Authoring Model Boundary]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

`_DynamicToolSourceBase.normalize_items` (`lib/galaxy/tool_util_models/_models.py:265-270`) accepts dict-of-dicts `inputs` and `outputs` and rewrites them as lists (`normalize_dict`, `:108-113`). The parser handles only half of that:

- `parse_outputs` (`lib/galaxy/tool_util/parser/yaml.py:250-256`) converts a mapping into named output dicts.
- `parse_input_pages` (`:225-229`) passes `root_dict.get("inputs", {})` straight to `YamlPageSource`/`CanonicalYamlPageSource`, and `parse_input_sources` (`:562-563`) iterates it as a list. With a mapping, each "input dict" is a key string, so `parse_input_type` (`self.input_dict["type"]`) fails.

Model-backed paths store the normalized list, so they work. Dict-form inputs break only where no model runs first: disk YAML (`parser/factory.py:96-99`) and admin `from_path` rows (`managers/tools.py:149-152` → `tools/__init__.py:871`). A `class: GalaxyTool` file that passes `DynamicToolSources` validation, which `test_user_tool_source_fixtures.py` applies to disk fixtures, can still fail to load from disk.

## Evidence / repro

Read in code. `grep -rn "normalize_dict\|normalize_items" lib` finds only the model. No in-tree fixture uses dict-form inputs, which is why nothing fails today. Repro: `YamlToolSource({"class": "GalaxyTool", "inputs": {"x": {"type": "integer"}}}).parse_input_pages().page_sources[0].parse_input_sources()[0].parse_input_type()`.

## Suggested fix

Normalize mapping-form `inputs` in `parse_input_pages` the way `parse_outputs` does for outputs. Or, once parse-time model validation lands (`yaml_tool_model_validation_26.1`), build the parser from the normalized dump. Add a disk-fixture or parser unit test with dict-form inputs.
