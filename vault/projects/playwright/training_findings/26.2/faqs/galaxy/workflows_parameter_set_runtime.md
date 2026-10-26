# faqs/galaxy/workflows_parameter_set_runtime.md — 26.2, UI run (main)

GTN `45d4932d33`, `galaxy_ui_driver` `f40c7f6d116`. Replay: `workflows_parameter_set_runtime.gxui.sh`.

- No GTN problems: the caret toggle by the parameter name still sets it at runtime (RuntimeValue).
- Galaxy: toggle only checked for visibility in `test_non_data_connections`; added `test_set_parameter_at_runtime` (red: no click) + `workflow_editor_set_runtime_value`; gxui `workflow-param-runtime`.
