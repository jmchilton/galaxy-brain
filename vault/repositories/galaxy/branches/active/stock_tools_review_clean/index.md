---
upstream_base_branch: release_25.1
related_records:
  - galaxy/branches/tool_security_static_findings
  - galaxy/branches/tool_security_runtime
  - galaxy/branches/tool_patches_static_findings
---
# Stock tools that pass the static security review (upload1 without getVar)

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_25.1...jmchilton:galaxy:stock_tools_review_clean?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/stock_tools_review_clean)

## Status

READY with decisions (`implementation_debrief.md`). Head `1a6d0585a37`, 34 commits on `release_25.1`: the 26 stock-tool commits, then 8 commits that clean up the framework test tools. The 26.1 version is `_alt_release_26_1`, at `cc4079ce8bc`, with the same 8 commits on top. Both are pushed to `jmchilton`.

Merging forward into 26.2 and dev conflicts in `identifier_{single,collection,all_collection_types}.xml`. To resolve it, take the dev-form versions from `22feb23fb4b`, which keep the quoting (`implementation_debrief.md`).

No PR; CI not run.

## Decisions

- Clean branch on `origin/release_25.1` (retargeted from release_26.1 at John's request, 2026-11-27), independent of the four tool-security branches. It changes stock tool XML only, so Galaxy's own tools pass the review the other branches add (John, 2026-11-26).
- `upload1` is reworked so it no longer needs `getVar`, or otherwise reviews clean, without adding findings. The other stock tools follow.
- Stock tools that the security tests use as examples of findings stay as they are.
- The review is measured with the analyser from `tool_security_static_findings`; this branch doesn't carry it.
- upload1 keeps `getVar`; it is exempted in the review on branches 3 and 4 instead (John, 2026-11-26).
- Published as-is, including fixes the private triage judged exploitable (John, 2026-11-26).
- joiner2 and shrimp_wrapper fixed. HiGlass `uploaded_genomes`, the sample_sheet newlines and the analyser false positives are deferred (John, 2026-11-26).
- The reshaped (PR-shaped) history is adopted, and the branch was force-pushed with a lease over `dcd4d5eb9a1` (John, 2026-11-27).
- The `./` and `--` argv changes (Jupyter tools, HiGlass, `git clone --`, the optparse tools) are fine on release_26.1. They change the words passed but not their meaning (John, 2026-11-27).
- The second scope evaluation's two fixes are taken: ML Jupyter's repository mode compares with `pull_repo`, and Extract Genomic DNA reads stderr as bytes (John, 2026-11-27). On 25.1 the stderr fix is a `cherry-pick -x` of upstream #23411 (`bdc35a1f6c2`, `bec0bd9966b`), so the branch merges forward into 26.2 and dev cleanly.
- Framework test tools in test/functional/tools are cleaned up here too (John, 2026-11-27). They are quoted with `shlex.quote` without changing what each tool tests, and they are their own group of commits on top. Deliberate security examples, feature-testing tools, analyser false positives, CWL and YAML tools, and the red cases of branches 1, 3 and 4 are left alone. The `collection_type_source*` path-traversal mediums and the option-injection lows on no-prefix echoes are accepted.
- `identifier_single` is cleaned up here as well. Branch 4's red case moves to a new `identifier_single_unsanitized` tool on branch 4 (`tool_patches_static_findings`), not here.
- On 25.1, the three `collection_type_source*` tools that 25.1 lacks are dropped. The three identifier tools whose dev-only prefix form 25.1 lacks are quoted in their 25.1 form. `config_vars` drops its `$__app__` branch, because no test on 25.1, 26.1 or dev reaches it.
