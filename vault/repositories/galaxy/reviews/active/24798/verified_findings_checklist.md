- [x] P2 1: reference_data skips the #23888 user tool contract harness — new fixtures not in `test_user_tool_contract.py`; `multiple` + request-format `runtimeify` never run end to end. Fixed `1a3a4fa008d`.
- [x] P2 2: Closed-table tests check less than their names claim — any 400 passes; now asserts which check fires. Fixed `d43712deffb`.
- [x] P2 3: reference_data read from raw dict three more times instead of its authoring model — factory duplicates `to_internal()`, bad filter shapes accepted / KeyError on disk; adds tool class × dump policy parity test. Fixed `f94823a0341`.
- [x] P3 1: XML guard bypassable; factory accepts XML reference_data — adds `InputSource.parse_reference_data()`. Fixed `06b064707c5`.
- [x] P3 2: `filter.from_input` not validated by tool models — model now requires an earlier data input. Fixed `0b91a100d83`.
- [x] P3 3: Runtime list/single dumping + table access rule each written twice — `reference_data_runtime_json()`, `ToolDataTable.readable_by()`. Fixed `7109a9aa0f0`.
- [x] P3 4: Admin `GalaxyTool` API path and `filter` lack API coverage — admin test added `8844f80ad6f`; filter API test not written.
- [x] P3 5: reference_data is a nullable mode on `SelectParameterModel` — one-way-door design question for author; not fixed.

Other Actions:
