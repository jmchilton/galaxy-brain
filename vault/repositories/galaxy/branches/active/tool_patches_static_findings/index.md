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

BLOCKED on the scope decision (the capability-findings switch), unchanged. Shared plumbing revision done (2026-11-27). Head `dacf77a87c6`, which was `4f54ef8c934`. It is built on shared commit S `5659a4db4a4` ("Share the tool security refusal"), which sits on branch 1 `53559de55d0`. `tool_security_runtime` carries S unchanged, so S is the merge base of the two branches. Exempt set: only upload1 (unless a tool patch applies), set metadata, data fetch and history import/export. Everything else Galaxy ships is reviewed. Tests on the final head:
- related unit suites: 1582 passed, 2 xpassed;
- `test_tool_static_findings_refusal.py`: 8 of 8;
- `test_tool_patches.py`: 12 of 12;
- both upload and library API tests pass.

See `implementation_debrief.md`.

## Decisions

- Four branches (John, 2026-11-26): `tool_security_static_findings` (static review), `tool_patches` (patch engine), `tool_security_runtime` (static plus runtime enforcement) and this one (static review, patches, and refusing tools that still have static findings after patching). This supersedes "no runtime enforcement" (2026-11-25). The report-only version is the alt `tool_patches_static_findings_alt_report_only` (`alts/report_only.md`).
- `tool_patches`' commits rebased onto `tool_security_static_findings`, plus `galaxy.tool_util.security.patch_review.review_patches` and `python -m galaxy.tool_util.security --tool-patch-path`, which report patch states and findings cleared or introduced by a patch.
- Refusals reuse the exception and message shape of `tool_security_review_spec` at `d5f7cb05e91`, so branches 3 and 4 refuse the same way.
- Re-sync with `tool_patches` by rebasing its commits again whenever that branch changes. Whoever changes `tool_patches` re-picks it here. `12af42b3aab` carries the three collection_fix commits.
- Exempt Galaxy's own `upload1` when no tool patch applies (John, 2026-11-26). The helper is shared byte-for-byte with branch 3.
- Shared plumbing with branch 3 (John, 2026-11-27): one identical base commit both children carry on top of branch 1 (`ToolInputRejected`, upload1 helpers, one "Galaxy's own tool" check, one runner catch with Pulsar failing refused jobs directly). This branch's `security_review.py` becomes `static_findings.py`, and its `codes.py` shrinks to one `static-findings` code.
- Galaxy's own tools, exempt from refusal (John, 2026-11-27): only upload1 (unless patched), set metadata, data fetch, and history import/export. This replaces the `lib/galaxy` directory rule, which exempted every stock tool in an installed package plus the converters and spec tools. Everything else Galaxy ships is reviewed; tools that then get findings are fixed (`stock_tools_review_clean`) or their false positives are removed from the analyser, rather than exempted.
- Interactive tools (`tool_type="interactive"`, any source) are excluded from static findings refusals in both branches, and the admin docs and config descriptions say so plainly (John, 2026-11-27). This settles the 19 refused Galaxy interactive tools (API key and `chown`/`sudo` capability findings) without an analyser downgrade; their findings are still reported. To do after t26's re-sync hands the branches back.
- The judge test scaffolding (`_RecordingJudge`, the `--judge` CLI tests, the `replace(before)` copy in `patch_review.py`) goes with branch 1's judge removal (John, 2026-11-27).
- Shared base commit S is `5659a4db4a4` (2026-11-27). Rebase S first when branch 1 moves, then `git rebase --onto <new S> <old S>` both children. `galaxy.tools.security_review` here is now `galaxy.tools.static_findings`, and `codes.py` is gone (one `STATIC_FINDINGS` constant in `tool_util/security/refusal.py`).
- The writer is gx_workhorse-3 on chickenstraws (agreed with t7t, 2026-11-26). Coordinate before moving the branch.
