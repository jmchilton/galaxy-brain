---
upstream_base_branch: dev
child_branches: tool_patches_static_findings
related_records: galaxy/branches/tool_patches
---
# Static tool security findings (analyser, spec, codes, CLI) without runtime enforcement

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:tool_security_static_findings?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tool_security_static_findings)

## Status

Implemented, re-scoped and re-hardened; BLOCKED on a PR-shape decision (history squash vs reword), head `d4ae281e442`.

## Decisions

- Source: `jmchilton/tool_security_review_spec` at `d5f7cb05e91`, which stacks on mvdbeek's `tool-security-review-on-load`. Port only the static piece; no findings at job preparation, no `ToolEvaluator.build()` enforcement, no job refusals, no runtime config (John, 2026-11-25).
- Method: `cherry-pick -x` the static and mixed commits onto `origin/dev`, keeping authorship; drop runtime hunks; skip runtime-only commits; one framing cleanup commit (approved 2026-11-25).
