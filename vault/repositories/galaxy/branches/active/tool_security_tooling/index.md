---
upstream_base_branch: dev
parent_branch: tool_patches_static_findings
related_records:
  - galaxy/branches/tool_patches
  - galaxy/branches/tool_security_static_findings
---
# Tool security tooling: admin UI and API for patches and findings, CLI report, developer tools

- [Open PR](https://github.com/jmchilton/galaxy/compare/tool_patches_static_findings...tool_security_tooling?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tool_security_tooling)

## Status

IN PROGRESS: plan written (`plan.md`); phase 1 (server and UI) next, then phase 2 (CLI and developer tooling).

## Decisions

- One branch on top of branch 4 (`tool_patches_static_findings`), so patches and the refusal can be released without the tooling, while the tooling has both patches and findings in core (John, 2026-11-28).
- Two implementation phases done one after the other: server components and UI first, then the CLI and developer tooling (John, 2026-11-28).
- The plan's open questions are taken at their recommended answers until John says otherwise.
