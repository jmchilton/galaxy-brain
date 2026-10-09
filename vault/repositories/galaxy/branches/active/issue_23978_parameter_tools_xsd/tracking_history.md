# Tracking history

Imported from the branch agent on 2026-10-09; this preserves the recorded decisions and evidence. CI has not been refreshed by this migration.

- Branch `issue_23978_parameter_tools_xsd` (`2bd2d9cf1b4`, stacked on `issue_18642_framework_tool_coverage` at `f66d1f0f97d`) — Description: Makes all `parameters/` framework test tools XSD-valid (`ext=` → dropped/`format=`, section/repeat titles, `rules` in XSD enum) and validates them in `.ci/validate_test_tools.sh` (also fixes its XSD lint path); 5 tools now really restrict input formats; fixes #23978; blockers: parent PR opens first; fork CI on `2bd2d9cf1b4` (CircleCI `validate_test_tools` is the key job); recovered 2026-10-08 (Codex clean, scope unchanged); [implementation debrief](implementation_debrief.md). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_23978_parameter_tools_xsd?expand=1).
