# Performance challenge debrief — #25042

Profile: gx_performance_challenger · model Claude Opus 5.5 · medium · reviewed commit `c29193e2b0fa39e9d76a09c88c8ea93a88615e11`

Basis: code reading only; no Galaxy server or query-count measurement was run. Points below are reasoned, not data-backed.

## Paths touched

1. `_workflow_to_dict_editor` (GET `?style=editor`, once per editor open, recursed for subworkflows).
   - New: `_add_step_in(step, ...)` iterates `step.inputs`; for tool steps, `show_step_input_defaults` builds `defaults` from `step.inputs` and `connected_input_names` from `step.input_connections`.
   - Existing code in the same loop already reads `step.input_connections` unconditionally (it is a property over `step.inputs` → `step_input.connections`). Relationships load once per step into the identity map, so the new reads add no SQL round trips; they move the lazy load a few lines earlier.
   - CPU: `step_input_form_defaults` returns early when a step has no defaults, so the common case is a dict comprehension over a loaded list. With defaults, it is one `visit_input_values` walk of the tool's input tree plus `to_python` per matching default. Data parameters are skipped before `to_python`; `SelectToolParameter.to_python` can hit the DB only for `{src,id}` dict values, which are not realistic step-input defaults for selects. Bounded by steps × tool params, same order as `get_config_form`, which already runs per step.
   - Response size: adds an `in` block only to steps with defaults; File defaults are small dicts. Negligible.
2. `__module_from_dict` (PUT from editor with `from_tool_form`).
   - New work only for tool steps that carry `in`: one more `visit_input_values` walk + `to_python`. No DB access, no extra flush/commit.
3. `_workflow_to_dict_export`: pure refactor into `_add_step_in`; unchanged behaviour and cost.
4. Client: one optional `in` field on `NewStep`; no new requests or polling.

## Patterns checked

Unbounded queries, per-row round trips, flush/commit hygiene, chunking, fan-out joins, CTEs, async-blocking — none apply. No new queries, endpoints or loops over histories/jobs.

## Measurement plan (optional, if anyone wants data)

- Upload a workflow with ~200 tool steps, half with `in` defaults; wrap `GET /api/workflows/{id}/download?style=editor` and the editor PUT with SQLAlchemy `before_cursor_execute` counting, compare `origin/release_25.1` vs PR head. Expected: identical query counts, small CPU delta.

## Recommendations

None. No P-labeled findings.
