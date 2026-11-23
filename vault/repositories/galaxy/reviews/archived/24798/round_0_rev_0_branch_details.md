# Round 0 rev 0 review branch — #24798

Branch `pr_24798_round_0_rev_0`, from the reviewed commit `5abbfd9d5a6`.

The branch puts the two new `reference_data` fixtures into the existing #23888 user tool contract harness, so disk, API YAML and API JSON loads each run in the legacy, 21.01 and request formats. It tightens the closed-table tests and adds an API test for an admin `GalaxyTool`. On the code side, `reference_data` inputs now load through their authoring model: `InputSource.parse_reference_data()` returns the validated `YamlReferenceDataParameter`, and the parser, the parameter model factory and `ReferenceDataToolParameter` all read from it. That closes the XML `<options>` bypass and gives disk tools the same filter validation errors as the API. The tool models reject a `filter.from_input` that doesn't name an earlier data input. Finally, the list/single runtime dumping and the table access rule each live in one shared helper.

- `1a3a4fa008d` Run reference_data fixtures through the user tool contract harness — JSON twins plus `test_reference_data_contract` / `test_reference_data_multiple_contract` across 3 load paths × 3 input formats. (P2 1)
- `d43712deffb` Strengthen closed reference_data table tests — the API test asserts the build offers no options and the 400 names the parameter; the closed-after-submit unit test covers both `validated_state` modes. (P2 2)
- `06b064707c5` Reject reference_data unless the input source is a YAML tool's — adds `InputSource.parse_reference_data()`; `basic.py` and the factory guard on it. (P3 1)
- `f94823a0341` Load reference_data inputs through their authoring model — `parse_dynamic_options`, the factory (`to_internal()`) and `ReferenceDataToolParameter` read the validated model; adds a parity test over tool class × dump policy. (P2 3)
- `0b91a100d83` Validate reference_data filter.from_input names an earlier data input — a tool-level model validator that follows the loader's scoping. (P3 2)
- `7109a9aa0f0` Share reference_data runtime dumping and table access rule — `reference_data_runtime_json()` in `convert.py` and `ToolDataTable.readable_by()`. (P3 3)
- `8844f80ad6f` Test an admin GalaxyTool reads a table closed to user tools via the API. (P3 4)
