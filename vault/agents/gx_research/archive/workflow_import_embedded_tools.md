# Component - Workflow Import

Update `vault/research/Component - Workflow Import.md` for embedded dynamic tool import on `release_26.1`. Cover how format2 and native workflow descriptions carry `tool_representation`, how `GalaxyUserTool` and admin `GalaxyTool` resolve or create dynamic tools and tool UUIDs, the permission and ownership checks, and when tool creation commits relative to subworkflow preloading, step construction, workflow outputs, PJAs, and final workflow attachment. Include recursive embedded subworkflows and dry-run/refactor behavior. Keep implementation-specific fixes and one-off issue details out of the enduring component note.

## Why

The current ToolModule section describes only admin dynamic tools and omits the embedded `GalaxyUserTool` path. Its import phases do not explain that dynamic tool creation can commit while an incomplete workflow step is in the session, a reusable persistence boundary for future workflow import work.

## Requested by

- vault/repositories/galaxy/branches/active/workflow_import_embedded_tools/index.md: Needed current embedded tool resolution and session ordering for issue #24471.
- vault/repositories/galaxy/branches/active/issue_24530_atomic_embedded_tool_import_26.1/index.md: Needs every commit point in create/update import (subworkflow builds with is_subworkflow=True, tag/annotation helpers, dry_run) to make embedded-tool creation atomic (#24530).

## Debrief

- Updated `vault/research/Component - Workflow Import.md` (revision 5), verified at Galaxy `origin/dev` @ `65e6daff`. #24475 had merged to `release_26.1` (2026-10-29) and forward to dev, so nothing was blocked. `resolve_tool_uuid` and the first-pass ordering match on both branches. New sections: "Embedded Tools (`tool_representation`)", covering native and format2 carriage, the resolution table with permission and ownership checks, shared import, and `build_module`; and "Session Ordering and Commit Points", covering the ordered commit-point table with dry-run gating, the first-pass invariant across recursion, and consequences for atomicity, dry runs, and refactor. Phases 3/4, ToolModule resolution, the flow diagram, and helper line numbers were rewritten. Other sections keep their older line numbers, and the note says so.
- Backlinks added in `Component - User-Defined Tools` and `Component - Workflow Refactoring API`. The latter also gained a dry-run caveat.
- Kept out, per the request: #24471 and #24530 fix details. The note only states that import is not atomic and links to the rollback section of the Dynamic Tool Manager note.
- New research issue: `research_issues/workflow-dry-run-build-persists-embedded-tools.md`. Dry-run builds still create embedded tools and preload subworkflows. Refactoring a workflow with an id-less admin dynamic tool creates new public tools on every call, dry run included, and fails for non-admin owners.
- Out of scope: the gxformat2 internals beyond the `run: GalaxyUserTool` → `tool_representation` mapping, and a full refresh of the older line numbers in the controller and TRS sections.
