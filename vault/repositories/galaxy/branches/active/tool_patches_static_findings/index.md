---
upstream_base_branch: dev
parent_branch: tool_security_static_findings
child_branches: tool_security_tooling
related_records:
  - galaxy/branches/tool_patches
  - galaxy/branches/stock_tools_review_clean
---
# Static security review and tool patches; refuse tools with remaining findings

- [Open PR](https://github.com/jmchilton/galaxy/compare/tool_security_static_findings...tool_patches_static_findings?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tool_patches_static_findings)

## Status

BLOCKED on the scope decision (the capability-findings switch), unchanged. The 2026-11-28 revision is done: interactive and CWL tools are excluded, and the red case is moved. Head `152b652559c`, pushed (was `73910eec35c`).
- It is built on shared commit S'' `5a893ddceb2` ("Share the tool security refusal"; it was `e04753dca51`), which sits on branch 1 `590a784bd04`. `tool_security_runtime` carries S'' unchanged, so S'' is the merge base of the two branches.
- **Exclusion rule.** `galaxy.tools.security_refusal.review_exclusion(path, built_tool_type(tool_source), patched=...)` leaves out:
  - Galaxy's own tools, unless patched: upload1, set metadata, data fetch, history import/export;
  - interactive tools: the class Galaxy builds is `InteractiveTool`, usually from `tool_type="interactive"` in any format;
  - CWL tools.

  A `<type>` element that overrides `tool_type` decides. Findings are still reported by the analyser and CLI.
- **Red case.** The refusal and tool patch tests now use `identifier_single_unsanitized` (unsafe on purpose), not `identifier_single`.

Tests on the final head (2026-11-28):
- related unit suites: 1836 passed, 2 xpassed;
- `test_tool_static_findings_refusal.py`: 8 of 8;
- `test_tool_patches.py`: 12 of 12;
- both upload and library API tests pass;
- `merge-tree` with branch 3 conflicts only in the admin doc.

See `implementation_debrief.md`.

## Decisions

- Four branches (John, 2026-11-26): `tool_security_static_findings` (static review), `tool_patches` (patch engine), `tool_security_runtime` (static plus runtime enforcement) and this one (static review, patches, and refusing tools that still have static findings after patching). This supersedes "no runtime enforcement" (2026-11-25). The report-only version is the alt `tool_patches_static_findings_alt_report_only` (`alts/report_only.md`).
- `tool_patches`' commits rebased onto `tool_security_static_findings`, plus `galaxy.tool_util.security.patch_review.review_patches` and `python -m galaxy.tool_util.security --tool-patch-path`, which report patch states and findings cleared or introduced by a patch.
- Refusals reuse the exception and message shape of `tool_security_review_spec` at `d5f7cb05e91`, so branches 3 and 4 refuse the same way.
- Re-sync with `tool_patches` by rebasing its commits again whenever that branch changes. Whoever changes `tool_patches` re-picks it here. `12af42b3aab` carries the three collection_fix commits.
- Exempt Galaxy's own `upload1` when no tool patch applies (John, 2026-11-26). The helper is shared byte-for-byte with branch 3.
- Shared plumbing with branch 3 (John, 2026-11-27): one identical base commit both children carry on top of branch 1 (`ToolInputRejected`, upload1 helpers, one "Galaxy's own tool" check, one runner catch with Pulsar failing refused jobs directly). This branch's `security_review.py` becomes `static_findings.py`, and its `codes.py` shrinks to one `static-findings` code.
- Galaxy's own tools, exempt from refusal (John, 2026-11-27): only upload1 (unless patched), set metadata, data fetch, and history import/export. This replaces the `lib/galaxy` directory rule, which exempted every stock tool in an installed package plus the converters and spec tools. Everything else Galaxy ships is reviewed; tools that then get findings are fixed (`stock_tools_review_clean`) or their false positives are removed from the analyser, rather than exempted.
- Interactive tools (`tool_type="interactive"`, any source) are excluded from static findings refusals in both branches, and the admin docs and config descriptions say so plainly (John, 2026-11-27). This settles the 19 refused Galaxy interactive tools (API key and `chown`/`sudo` capability findings) without an analyser downgrade; their findings are still reported. Done 2026-11-28 (`0b5c6d63623`): the rule is `review_exclusion` on `built_tool_type()` in S''.
- CWL tools are excluded the same way in both branches, and documented alongside interactive tools (John, 2026-11-27); this branch had read `$__cwl_command` as an unquoted command and refused all 10 functional-test CWL tools. Done 2026-11-28 (`0b5c6d63623`); Galaxy does not run CWL tools yet, so this only stops the load-time refusal.
- The red case for refusals moves off `identifier_single` to a dedicated unsafe test tool, `identifier_single_unsanitized`, so `identifier_single` itself can be cleaned up with the other framework test tools (John, 2026-11-27). Done 2026-11-28 (`9523131bb5b`); `tool_patches` (branch 2) still uses `identifier_single`, so re-picks touching those fixtures will conflict.
- The judge test scaffolding (`_RecordingJudge`, the `--judge` CLI tests, the `replace(before)` copy in `patch_review.py`) goes with branch 1's judge removal (John, 2026-11-27).
- Shared base commit S'' is `5a893ddceb2` (2026-11-28; it was `e04753dca51`, before that `5659a4db4a4`); it adds `review_exclusion`, `built_tool_type` and `galaxy.tools.tool_class_for_source`. Rebase S first when branch 1 moves, then `git rebase --onto <new S> <old S>` both children. `galaxy.tools.security_review` here is now `galaxy.tools.static_findings`, and `codes.py` is gone (one `STATIC_FINDINGS` constant in `tool_util/security/refusal.py`).
- The writer is gx_workhorse-3 on chickenstraws (agreed with t7t, 2026-11-26). Coordinate before moving the branch.
