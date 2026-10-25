# faqs/galaxy/workflows_annotate.md — 26.2, UI run (main)

GTN `45d4932d33`, `galaxy_ui_driver` `6b42e205276`. Replay: `workflows_annotate.gxui.sh`.

- `workflows-annotate-attributes`: **Attributes** is in the editor's activity bar (open by default);
  "Annotation" is **Short Description**; tags save immediately (no new version, no Save).
- Galaxy: editor tagging was untested (only the workflow list); added `test_edit_tags` (red: helper
  skipping the tag) and `workflow_editor_add_tags`; gxui `workflow-tag`.
