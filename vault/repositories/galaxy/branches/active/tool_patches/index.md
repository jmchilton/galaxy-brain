---
upstream_base_branch: dev
related_records:
  - galaxy/branches/tool_security_static_findings
  - galaxy/branches/tool_patches_static_findings
---
# Tool patch database: declarative patches applied at tool load

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:tool_patches?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tool_patches)

## Status

Implemented, re-scoped and re-hardened; revised for `collection_fix` patch files (2026-11-26); READY for polish and CI (head `8bb1573a319`).

`tool_patches_static_findings` carries this branch's commits and needs `e0a94aa8566`, `f531c63edc2` and `8bb1573a319` re-picked (or a rebase onto the new head); not yet done.

## Decisions

- Patches keyed by tool guid (or `_local/<id>`) and version, applied to the macro-expanded tree right after expansion, before storage: populator `process_tool` and eager `get_expanded_tool_source` call the same pure `galaxy.tool_util.patches` engine (John, 2026-11-25).
- Site policy `tool_patch_reproducibility` defaults to `ordinary_inputs`, `tool_patch_requirement_changes` to false, `tool_patch_paths` to `[]` (John, 2026-11-25).
- Per-changeset override files are looked up by the changeset checked out on disk (`.hg/dirstate`), never `installed_changeset_revision` (John, 2026-11-25).
- Out of scope: admin endpoint, tool-form badge, `Job` column, live reload, authoring CLI, shipped patches.
- Fixtures are synthetic test tools only (`identifier_single`).
- `collection_fix: true` files load with security ops and no upstream entry, mirroring the collection checker; the flag isn't reported on patch state (file-level vs per-kind state) (2026-11-26).
