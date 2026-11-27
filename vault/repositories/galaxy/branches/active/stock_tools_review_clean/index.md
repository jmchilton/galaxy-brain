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

Implemented, re-scoped, re-hardened and revised; READY with decisions (`implementation_debrief.md`). Head `6cfe8e271c1`: the reshaped history plus the ML Jupyter `pull_repo` and Extract Genomic DNA `b""` fixes.

No PR; CI not run.

## Decisions

- Clean branch on `origin/release_26.1`, independent of the four tool-security branches. It changes stock tool XML only, so Galaxy's own tools pass the review the other branches add (John, 2026-11-26).
- `upload1` is reworked so it no longer needs `getVar`, or otherwise reviews clean, without adding findings. The other stock tools follow.
- Stock tools that the security tests use as examples of findings stay as they are.
- The review is measured with the analyser from `tool_security_static_findings`; this branch doesn't carry it.
- upload1 keeps `getVar`; it is exempted in the review on branches 3 and 4 instead (John, 2026-11-26).
- Published as-is, including fixes the private triage judged exploitable (John, 2026-11-26).
- joiner2 and shrimp_wrapper fixed. HiGlass `uploaded_genomes`, the sample_sheet newlines and the analyser false positives are deferred (John, 2026-11-26).
- The reshaped (PR-shaped) history is adopted, and the branch was force-pushed with a lease over `dcd4d5eb9a1` (John, 2026-11-27).
- The second scope evaluation's two fixes are taken: ML Jupyter's repository mode compares with `pull_repo`, and Extract Genomic DNA reads stderr as bytes (John, 2026-11-27).
