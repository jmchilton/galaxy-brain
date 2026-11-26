---
upstream_base_branch: dev
parent_branch: tool_security_static_findings
related_records:
  - galaxy/branches/tool_patches
  - galaxy/branches/stock_tools_review_clean
---
# Static security review and tool patches; refuse tools with remaining findings

- [Open PR](https://github.com/jmchilton/galaxy/compare/tool_security_static_findings...tool_patches_static_findings?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tool_patches_static_findings)

## Status

Re-scoped into branch 4 (refuse jobs of tools with static findings left after patching) and re-hardened; BLOCKED on a scope decision (third evaluation suggests a capability-findings switch), head `12af42b3aab` (2026-11-26: re-picked `tool_patches` collection_fix commits e0a94aa8566, f531c63edc2, 8bb1573a319 on top of `cab486f13a1`; 820 patch+security unit tests pass).

## Decisions

- Four branches (John, 2026-11-26): `tool_security_static_findings` (static review), `tool_patches` (patch engine), `tool_security_runtime` (static plus runtime enforcement) and this one (static review, patches, and refusing tools that still have static findings after patching). This supersedes "no runtime enforcement" (2026-11-25). The report-only version is the alt `tool_patches_static_findings_alt_report_only` (`alts/report_only.md`).
- `tool_patches`' commits rebased onto `tool_security_static_findings`, plus `galaxy.tool_util.security.patch_review.review_patches` and `python -m galaxy.tool_util.security --tool-patch-path`, which report patch states and findings cleared or introduced by a patch.
- Refusals reuse the exception and message shape of `tool_security_review_spec` at `d5f7cb05e91`, so branches 3 and 4 refuse the same way.
- Re-sync with `tool_patches` by rebasing its commits again whenever that branch changes.
