# Component - Reference Data Parameter

The YAML-only `reference_data` tool input (galaxy#24798, `ReferenceDataParameterModel`) end to end: authoring model (`YamlReferenceDataParameter`, `to_internal()` in `tool_util_models/yaml_parameters.py`), the loader layers (`CanonicalYamlInputSource.parse_dynamic_options`, `parameters/factory.py`, `ReferenceDataToolParameter` in `tools/parameters/basic.py`), `DataMetaFilter` use for `filter`, runtime shapes (`ReferenceDataInternalJson`, `runtimeify` in `tool_util/parameters/convert.py`, the legacy `resolve_reference_data` visitor in `tools/evaluation.py`, `setup_for_reference_data` in `tools/runtime.py`), and the `user_accessible` table flag on `ToolDataTable` (OR-merge on same-named tables, stripping from Tool Shed configs, form-time vs job-time checks, `trusted` = not `GalaxyUserTool`). Include the test map (unit `test_reference_data.py`, `test_unprivileged_tools.py`, the user tool contract harness) and how XML tools are refused. Leave out general data table loading (`Component - Tool Data Tables`) and the rest of the select parameter family.

## Why

Follow-up work on #24798 (closing the XML `<options>` bypass, sharing list/single dumping and the table access rule) had to be reconstructed from a review record and code reading. `Component - Tool Data Tables` doesn't mention `user_accessible`, and `Component - YAML Tool Runtime` / `Component - Tool State Dynamic Models` don't mention reference_data.

## Requested by

- vault/repositories/galaxy/branches/active/reference_data_followups/brain_research.md: needed a single map of the reference_data layers and the table access rule.
