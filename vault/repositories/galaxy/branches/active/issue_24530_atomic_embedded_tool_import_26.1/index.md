---
upstream_base_branch: release_26.1
parent_branch: workflow_import_embedded_tools
---
# Roll back embedded tools when a workflow import fails

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.1...jmchilton:galaxy:issue_24530_atomic_embedded_tool_import_26.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24530_atomic_embedded_tool_import_26.1)

## Status

Implementation in progress for [#24530](https://github.com/galaxyproject/galaxy/issues/24530).

## Decisions

- Stacked on [#24475](https://github.com/galaxyproject/galaxy/pull/24475) (`release_26.1`, approved): it moves embedded-tool creation into `ToolModule.resolve_tool_uuid`, the code this fix changes. Retarget with the parent if it lands elsewhere.
