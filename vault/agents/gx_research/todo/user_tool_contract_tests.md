# Component - User Tool Contract Tests

The #23888 parity harness `lib/galaxy_test/api/test_user_tool_contract.py` and its helpers: the `loaded_tool` fixture, `_load_paths` / `_parameter_load_paths` (toolbox disk YAML, API user tool from YAML, API user tool from JSON), the `DescribeToolInputs` / `tool_input_format` matrix (legacy, 21.01, request), `DescribeUserTool`, `lib/galaxy_test/base/data/user_tools/*_user.json` twins, and `test/unit/tool_util/test_user_tool_source_fixtures.py`. Cover how to add a fixture to the harness, which dump policies each load path exercises, and which parameter types are covered or missing. Leave out the authoring models themselves (`Component - User-Defined Tool Source Validation`).

## Why

Adding new parameter types (reference_data) to the harness needs knowledge that only lives in the merged `yaml_boolean_defaults` debriefs. No note describes the harness or how to extend it.

## Requested by

- vault/repositories/galaxy/branches/active/reference_data_followups/brain_research.md: needed to run reference_data fixtures through the harness (all load paths and input formats).
