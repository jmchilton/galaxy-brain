# faqs/galaxy/workflows_publish.md — 26.2, UI run (main)

GTN `45d4932d33`, `galaxy_ui_driver` `f40c7f6d116`. Replay: `workflows_publish.gxui.sh`.

- No GTN problems: labels match (Make Workflow accessible / publicly available in Published Workflows).
- Galaxy: publishing only tested via API; `workflow_sharing_click_publish` was dead with a stale selector, dropped. Added `test_publish_workflow`; gxui `workflow-publish`.
