# Debrief

## Research
- Verified on `origin/dev`: `create_unprivileged_tool` commits; `create_tool` commits via base `create(flush=True)` then `load_dynamic_tool`. Embedded tools created in `ToolModule.from_dict`.
- raw.md cited `resolve_tool_uuid`, which only exists on #24475's branch (targets `release_26.1`, still open); proposal describes dev code.
- #24475 body itself says failed imports aren't atomic and dry runs aren't write-free.
- No duplicate issues found.

## Review round (subagent)
- raw.md's repro (unknown `tool_id`) is wrong: missing tools are collected and import succeeds. Replaced with second embedded `GalaxyUserTool` failing lint (400 after step 0 committed).
- Added: nested subworkflow builds commit too (only outermost should); update path / `dry_run` also leaks tools.

## Leftover
- Not reproduced on a running server.
- Admin `GalaxyTool` test needs a concrete failing second step.
- "Created in `ToolModule.from_dict`" goes stale once #24475 merges forward.
