---
type: project
title: "Tool Shed Maintenance"
tags:
  - project
  - galaxy/tools
status: draft
created: 2026-09-10
revised: 2026-09-10
revision: 1
ai_generated: false
summary: "Ongoing Tool Shed maintenance, API modernization, dead-code cleanup, and feature work."
---

# Tool Shed Maintenance

Ongoing Tool Shed maintenance project.

## Documents

- **`TOOLSHED_CLEANUP_PLAN.md`** — state of the legacy-cleanup effort that stalled after
  PR #22078: why all seven old `toolshed_2_cleanup_*` branches are dead, a dead-code audit
  of the layer beneath the API/webapp code, sequenced next steps, and a progress log for
  the `toolshed_2_cleanup_dead_code` branch.
- **`toolshed_deadcode_audit.py`** — the AST reachability script behind that audit. Run it
  against a Galaxy checkout (`python3 toolshed_deadcode_audit.py <path-to-galaxy>`) to
  regenerate the dead-symbol numbers.

## Backlog

- Restore a groups API
- Reset password functionality.
- Continued cleanup.
- Batch issue.
- Tool Shed Agentic Reviews
