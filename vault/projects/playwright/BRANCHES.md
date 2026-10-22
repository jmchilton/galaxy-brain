# Branches and PRs

Convenience view. **Source of truth is [`MY_BRANCHES.md`](../../agents/gx_branches/MY_BRANCHES.md).**
The pre-2026-10-20 ledger (every merged migration PR, the parity stack, Test Stories piece
notes) is [archive/BRANCHES.md](archive/BRANCHES.md).

| Branch | State | Notes |
|---|---|---|
| [`galaxy_ui_driver`](../../repositories/galaxy/branches/active/galaxy_ui_driver/index.md) | standing, no PR | gxui tip + Galaxy fixes below it; pulled out per `GALAXY_UI_DRIVER_UPSTREAM.md`. On `release_26.2` (via `workflow_editor_connection_helpers`) for 26.2 QA (tip `d982e460bb0`, 2026-10-21). The final PR targets dev. |
| [`selenium_stories_core`](../../repositories/galaxy/branches/active/selenium_stories_core/index.md) | [#24137](https://github.com/galaxyproject/galaxy/pull/24137) open | Test Stories piece D (`TEST_STORIES_RESCUE.md`). |
| [`move_markdown_conversion_to_util`](../../repositories/galaxy/branches/active/move_markdown_conversion_to_util/index.md) | reference | First commit of `selenium_stories_core`; retire once #24137 merges. |
