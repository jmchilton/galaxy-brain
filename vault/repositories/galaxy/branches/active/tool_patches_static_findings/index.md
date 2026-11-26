---
upstream_base_branch: dev
parent_branch: tool_security_static_findings
related_records: galaxy/branches/tool_patches
---
# Static security review before and after tool patches

- [Open PR](https://github.com/jmchilton/galaxy/compare/tool_security_static_findings...tool_patches_static_findings?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tool_patches_static_findings)

## Status

Implemented, re-scoped and re-hardened; READY, landing after both parents (head `9fc1faf4440`).

## Decisions

- `tool_patches`' commits rebased onto `tool_security_static_findings`, plus a thin offline integration: `galaxy.tool_util.security.patch_review.review_patches` and `python -m galaxy.tool_util.security --tool-patch-path` report patch states and findings cleared or introduced by a patch. No runtime enforcement (John, 2026-11-25).
- Re-sync with `tool_patches` by rebasing its commits again whenever that branch changes.
