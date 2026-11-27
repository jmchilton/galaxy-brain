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

Implemented, re-scoped and re-hardened; revised for `collection_fix` patch files (2026-11-26), then on 2026-11-27 for `coverage/` no longer read (`a10f45acba4`), verbatim key segments (`469cb604a52`) and the `python2to3` kind (`d16178fc120`, `4993f7d8d92`); READY for polish and CI (head `4993f7d8d92`, pushed). 567 tool patch unit tests pass; the index schema hash is re-pinned twice, which invalidates deployed index bundles. Reviews: `subagents/review_python2to3.md`, `subagents/review_drop_verified.md`.

`tool_patches_static_findings` carries this branch's commits, including `e0a94aa8566`, `f531c63edc2` and `8bb1573a319` (re-picked there as `95e9796a7c3`, `a2ed7462327` and `dc28179fd66`; checked 2026-11-27). If this branch changes again, re-pick onto branch 4's head. The four 2026-11-27 commits are not yet re-picked there.

## Decisions

- Patches keyed by tool guid (or `_local/<id>`) and version, applied to the macro-expanded tree right after expansion, before storage: populator `process_tool` and eager `get_expanded_tool_source` call the same pure `galaxy.tool_util.patches` engine (John, 2026-11-25).
- Site policy `tool_patch_reproducibility` defaults to `ordinary_inputs`, `tool_patch_requirement_changes` to false, `tool_patch_paths` to `[]` (John, 2026-11-25).
- Per-changeset override files are looked up by the changeset checked out on disk (`.hg/dirstate`), never `installed_changeset_revision` (John, 2026-11-25).
- Out of scope: admin endpoint, tool-form badge, `Job` column, live reload, authoring CLI, shipped patches.
- Fixtures are synthetic test tools only (`identifier_single`).
- `collection_fix: true` files load with security ops and no upstream entry, mirroring the collection checker; the flag isn't reported on patch state (file-level vs per-kind state) (2026-11-26).
- Tool ids and key segments are read verbatim, with no path encoding: the encoding refused 95 collection files of 18 tools with uppercase ids (John, 2026-11-27).
- New patch kind `python2to3`: generated text ops that convert a template that only compiles through Galaxy's Python 2 path, proven by the collection's deep lint to compile to the same module. Always `identical`, applied before security and compat ops, never demoted by site caps, and a mismatch raises no advisory (John, with Marius's permission, 2026-11-27).
- Galaxy reads only `collection.yml`, `codes.yml` and `patches/` from a collection. `coverage/` is the collection's own provenance: Galaxy no longer reads it, it leaves the digests, and `PatchState.verified` is gone. `verified` was never true for real content, because Galaxy hashed `to_string()` while coverage stores a c14n hash (John, 2026-11-27).
