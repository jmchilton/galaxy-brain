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

Re-scoped into branch 4 (refuse jobs of tools with static findings left after patching) and re-hardened; BLOCKED on a scope decision (third evaluation suggests a capability-findings switch), head `4f54ef8c934`, rebased onto branch 1's `0ad21214cce` (2026-11-27, after branch 1's re-sync to spec `6eb4ad6ae71`; applied cleanly). After the rebase: related unit suites 1474 passed, 2 xpassed (1256 before; the difference is branch 1's new security tests), and `test_tool_static_findings_refusal.py` alone 8 of 8.

## Decisions

- Four branches (John, 2026-11-26): `tool_security_static_findings` (static review), `tool_patches` (patch engine), `tool_security_runtime` (static plus runtime enforcement) and this one (static review, patches, and refusing tools that still have static findings after patching). This supersedes "no runtime enforcement" (2026-11-25). The report-only version is the alt `tool_patches_static_findings_alt_report_only` (`alts/report_only.md`).
- `tool_patches`' commits rebased onto `tool_security_static_findings`, plus `galaxy.tool_util.security.patch_review.review_patches` and `python -m galaxy.tool_util.security --tool-patch-path`, which report patch states and findings cleared or introduced by a patch.
- Refusals reuse the exception and message shape of `tool_security_review_spec` at `d5f7cb05e91`, so branches 3 and 4 refuse the same way.
- Re-sync with `tool_patches` by rebasing its commits again whenever that branch changes. Whoever changes `tool_patches` re-picks it here. `12af42b3aab` carries the three collection_fix commits.
- Exempt Galaxy's own `upload1` when no tool patch applies (John, 2026-11-26). The helper is shared byte-for-byte with branch 3.
- The writer is gx_workhorse-3 on chickenstraws (agreed with t7t, 2026-11-26). Coordinate before moving the branch.
