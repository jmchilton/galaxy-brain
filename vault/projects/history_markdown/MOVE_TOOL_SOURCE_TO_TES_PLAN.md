# Move `tool_source_id` from `ToolRequest` to `ToolExecutionState`

## Goal

Make `ToolSource` an attribute of the execution event, not the request. After: every TES carries identity; workflow-step TES rows mint a `ToolSource` too; `ToolRequest` becomes a thin lifecycle wrapper. Single uniform invariant: a TES knows what tool produced it.

## Scope

This branch is unreleased — the three existing migrations have not shipped. Add a fourth migration on top of them rather than folding into `28885b317f78`.

## Schema

- Add `tool_execution_state.tool_source_id` — nullable INTEGER FK to `tool_source.id`, indexed.
- Drop `tool_request.tool_source_id` — FK + index + column.
- ORM:
  - Add `ToolExecutionState.tool_source_id` / `tool_source` relationship.
  - Remove `ToolRequest.tool_source_id` / `tool_source` relationship.

**Nullability** — column NOT NULL. Every TES row has a tool_source: TR-linked rows are backfilled from the TR; workflow-step rows are minted with a `get_or_create_tool_source(tool)` call. The only edge case is dev-only workflow-step TES rows from earlier on this unreleased branch — those are deleted in the migration (with the WIS link cleared first).

## Migration

`395148707459_move_tool_source_to_tool_execution_state.py`, `down_revision = "29fe58dda936"`.

**Upgrade:**
1. Add `tool_execution_state.tool_source_id` (nullable), index, FK.
2. Backfill: for every TR with a TES link, copy `tool_request.tool_source_id` to `tool_execution_state.tool_source_id`. The prior backfill makes TR/TES 1:1 by id, so the join is direct.
3. Clear `workflow_invocation_step.tool_execution_state_id` for any WIS pointing at a still-NULL TES row, then `DELETE FROM tool_execution_state WHERE tool_source_id IS NULL`.
4. `ALTER COLUMN tool_source_id SET NOT NULL`.
5. Drop FK, index, column on `tool_request.tool_source_id`.

**Downgrade:** reverse. Re-add `tool_request.tool_source_id` (nullable), backfill from `tool_execution_state.tool_source_id` via the TR→TES link, drop the new column.

## Writers

| Site | Change |
|---|---|
| `services/jobs.py::create` | `tool_execution_state.tool_source = tool_source_model` instead of `tool_request.tool_source = ...`. Order: mint ToolSource → mint TES with `tool_source` attached → link TR to TES. |
| `workflow/modules.py::_capture_workflow_tool_request_state` caller | After building the TES at modules.py:3070, call `get_or_create_tool_source(trans.sa_session, tool)` and attach. Capture-failure path still attaches (we always know the tool). |

`get_or_create_tool_source` already has `IntegrityError` rollback for concurrent writers — safe to call from workflow scheduling.

## Readers

| Site | Change |
|---|---|
| `services/base.py:240,252` | `tool_request.tool_execution_state.tool_source` (with TES guard already present in `_tool_request_payload_or_empty`). |
| `managers/jobs.py:2240-2241` | `tool_request.tool_execution_state.tool_source.dynamic_tool`. |
| `celery/tasks.py:535` | `tool_request.tool_execution_state.tool_source`. |
| `workflow/extract.py:631` | `tool_source=tool_request.tool_execution_state.tool_source`. |
| `managers/history_graph.py:415` | SQL join changes: `ToolSource → ToolExecutionState → ToolRequest`. Add `ToolExecutionState` to the join chain. |

## Tests

- `test/unit/app/managers/test_HistoryGraphBuilder.py:97,1487` fixtures: drop `tr.tool_source_id = ts.id`; instead `tes.tool_source = ts` before `tr.tool_execution_state = tes`.
- New unit test: assert `_capture_workflow_tool_request_state`-driven TES carries a ToolSource (workflow tool step minting path).
- New migration test (parity with the three existing migrations): upgrade-then-downgrade leaves equivalent state; backfill copies tool_source_id correctly.

## Validation

1. `pytest test/unit/app/managers/test_HistoryGraphBuilder.py` (HG fixtures touched).
2. `pytest test/unit/workflows/test_extract_tool_request_state.py` (resolver/extract).
3. `pytest test/unit/webapps/test_tool_request_payload_tolerance.py` (tolerance reader).
4. `pytest test/unit/data/model/migrations/` — relevant migration test if one exists.
5. Migration round-trip (upgrade/downgrade) via `manage_db.sh`.

## Visual update

After this lands, update `MODELS_VISUAL_TOUR.md` §1 AFTER diagram: ToolSource edge moves from `TOOL_REQUEST` to `TOOL_EXECUTION_STATE`; ToolRequest loses `tool_source_id`. Section 4a / 4b / 5 narratives become "TES → tool_source" uniformly.

## Out of scope

- Cache-home consolidation between `tool_for_execution` and `cached_create_tool_from_representation` (separate follow-up).
- Backfilling workflow-step TES rows from before this migration with a synthesized ToolSource — unsafe.

## Decisions made during implementation

- **NOT NULL** on `tool_execution_state.tool_source_id`. Orphan workflow-step TES rows from earlier on this unreleased branch get deleted in the migration (with WIS link cleared first).
- **No `tool_source` property on `ToolRequest`**. Explicit `tool_request.tool_execution_state.tool_source` walks at the ~5 read sites make the new ownership obvious. ToolRequest becomes thin.
- **`_parsed_tool_source_for_tes` removed** in favor of direct `_parsed_tool_source_from_row(tes.tool_source)`. Its toolbox fallback existed only for the legacy WIS-without-tool_source case that NOT NULL now precludes. `tool_execution_to_model` lost its `toolbox` parameter as a result.

## Unresolved questions

1. Follow-up: should `tool_for_execution` grow a `tool_execution_state=...` convenience entry point (deriving `tool_source` / `dynamic_tool` internally)? Sketched separately; agreed as a separate PR on top.
2. Follow-up: should `ResolvedStructuredRequest` carry the TES row itself (not just `source_id`)? Enables `tool_for_execution(tool_execution_state=resolved.tes, ...)` at HG + extract call sites.
