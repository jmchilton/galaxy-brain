# #730 run-workflow-test / planemo architecture note: no guidance for UDT-embedding workflows or data-table inputs

[Issue](https://github.com/galaxyproject/foundry/issues/730) — labels `priority/mvp`, `agent/implement`, `roadmap/off`. No PR or branch addressed it before this one.

## Status

`wip`: branch `issue-730-udt-run-recipe` ([record](../../../branches/active/issue-730-udt-run-recipe/index.md)).

## Findings

- Foundry-owned docs gap. The planemo crash itself is upstream (planemo#1757, #1758 look like duplicates) and out of scope; so is #582.
- planemo 0.75.47 `load_shed_repos` reads top-level format2 steps only. planemo master (#1742, merged 2026-10-15, unreleased) walks embedded subworkflows via `iter_workflow_steps`.
- Galaxy: `ensure_can_use_unprivileged_tool` requires a `user_tool_execute` role (UI "Custom Tool Execution"); admins are not exempt. `GET /api/tool_data/{table}` is public.
- ParsedTool hides data-table selects (`options: null`). Tool Shed `GET /api/tools/<owner>~<repo>~<tool>/versions/<ver>/tool_source` returns macro-expanded XML with `from_data_table=`; the full-guid id form returns 500.

## Next

Branch polished and in `branches_ready_for_final_review`; waits on John's read. Open: untested `--extra_tools` route for built-in collection tools; #582 close/retitle; egapx nested-UDT import 500 on Galaxy.
