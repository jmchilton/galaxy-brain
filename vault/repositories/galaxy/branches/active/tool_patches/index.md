---
upstream_base_branch: dev
---
# Tool patch database: declarative patches applied at tool load

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:tool_patches?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tool_patches)

## Status

Implementation started 2026-11-25.

## Decisions

- Patches keyed by tool guid (or `_local/<id>`) and version, applied to the macro-expanded tree right after expansion, before storage: populator `process_tool` and eager `get_expanded_tool_source` call the same pure `galaxy.tool_util.patches` engine (John, 2026-11-25).
- Site policy `tool_patch_reproducibility` defaults to `all_inputs`, `tool_patch_requirement_changes` to false, `tool_patch_paths` to `[]` (John, 2026-11-25).
- Per-changeset override files are looked up by the changeset checked out on disk (`.hg/dirstate`), never `installed_changeset_revision` (John, 2026-11-25).
- Out of scope: admin endpoint, tool-form badge, `Job` column, live reload, authoring CLI, shipped patches.
- Fixtures are synthetic test tools only (`identifier_single`).
