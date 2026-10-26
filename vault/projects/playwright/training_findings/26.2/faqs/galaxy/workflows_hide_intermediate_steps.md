# faqs/galaxy/workflows_hide_intermediate_steps.md — 26.2, UI run (main)

GTN `45d4932d33`, `galaxy_ui_driver` `f40c7f6d116`. Replay: `workflows_hide_intermediate_steps.gxui.sh`.

- No GTN problems: the eye on the node output still toggles hiding; screenshot current (alt text says "Asterisk", marginal).
- Galaxy: eye toggle had no E2E; added `test_hide_output` (red: helper not clicking) and `workflow_editor_set_output_hidden`; gxui `workflow-output --hide/--show`.
