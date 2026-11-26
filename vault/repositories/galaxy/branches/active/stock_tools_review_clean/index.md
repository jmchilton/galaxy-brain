---
upstream_base_branch: release_26.1
related_records:
  - galaxy/branches/tool_security_static_findings
  - galaxy/branches/tool_security_runtime
  - galaxy/branches/tool_patches_static_findings
---
# Stock tools that pass the static security review (upload1 without getVar)

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.1...jmchilton:galaxy:stock_tools_review_clean?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/stock_tools_review_clean)

## Status

Implementation started 2026-11-26.

## Decisions

- Clean branch on `origin/release_26.1`, independent of the four tool-security branches. It changes stock tool XML only, so Galaxy's own tools pass the review the other branches add (John, 2026-11-26).
- `upload1` is reworked so it no longer needs `getVar`, or otherwise reviews clean, without adding findings. The other stock tools follow.
- Stock tools that the security tests use as examples of findings stay as they are.
- The review is measured with the analyser from `tool_security_static_findings`; this branch doesn't carry it.
