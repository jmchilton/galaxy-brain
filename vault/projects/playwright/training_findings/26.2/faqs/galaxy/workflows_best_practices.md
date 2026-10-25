# faqs/galaxy/workflows_best_practices.md — 26.2, UI run (main)

GTN `45d4932d33`, `galaxy_ui_driver` `8d743c0a96d`. Replay: `workflows_best_practices.gxui.sh`.

- `workflows-best-practices-activity`: no Workflow Options dropdown; **Best Practices** is an activity
  bar item (warning badge) opening "Best Practices Review". Both screenshots stale (see screenshots yaml).
- Galaxy: covered by `test_best_practices_*`; added `workflow_editor_best_practices` (returns each
  check's status; three tests use it) and gxui `workflow-best-practices`.
