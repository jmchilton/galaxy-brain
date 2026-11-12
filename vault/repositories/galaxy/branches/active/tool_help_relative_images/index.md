---
upstream_base_branch: dev
---
# tool_help_relative_images

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:tool_help_relative_images?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tool_help_relative_images)

## Status

Implementing. Worktree: `~/projects/worktrees/galaxy/branch/tool_help_relative_images`.

No PR yet. CI not yet seen.

Tool help images shipped in the tool's directory (e.g. `static/images/foo.png`) work for Markdown help and for non-shed tools, via a tool-dir static endpoint modelled on `/api/tools/{tool_id}/icon`. Context: Markdown help (#18722) never rewrote image paths; RST rewriting is shed-only. Motivated by galaxy-iuc/standards#95.

## Decisions

- Base `dev`: new API route + help syntax.
- Plain relative image paths (render on GitHub/editors too), not a `gxtool://` scheme.
- Endpoint takes tool id/version/path as query params; shed GUIDs contain slashes so `{tool_id:path}/.../{file:path}` is ambiguous.
