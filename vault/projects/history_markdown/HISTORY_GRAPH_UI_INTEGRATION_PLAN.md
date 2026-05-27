# History Graph UI Integration — Backend Prep Plan

> **Date:** 2026-05-22
> **Branch:** `workflow_state_backfill`
> **Predecessors (carried, untouched):** [[CAPTURE_WORKFLOW_EXECUTION_STATE_PLAN]] (Phase 1: converter + capture-time machinery) and [[FINISH_EXEC_STATE_PLAN]] (`tool_execution_state` schema + resolver + unified producer pass).
> **Downstream consumer:** PR #22752 — History Graph UI by @guerler. He rebases on top after this lands; he drops his backend commits.
> **Tracking comment:** posted to galaxyproject/galaxy#22710 on 2026-05-22.

---

## Why this exists

Two parallel branches converge above the persistence boundary (same `convert.py`, same `request.py`, same `_capture_workflow_tool_request_state`) but diverge at *where the payload lands*: `workflow_state_backfill` puts it on a `tool_execution_state` row reached via three FKs (the EXEC_STATE shape); #22752 mints `ToolRequest(state IS NULL)` rows for workflow steps and reuses `Job.tool_request_id` (MINT). EXEC_STATE wins for the lower levels; mvdbeek + @jmchilton aligned in the issue thread.

Most of #22752's backend goes away on rebase. Three pieces of it don't — they're orthogonal to MINT-vs-EXEC_STATE and solid on their own merits. They land on `workflow_state_backfill` here, **before** the PR opens, so reviewers see one coherent backend layer with the integration pieces already in place. The History Graph UI then rebases with one endpoint swap + a TS-guided rename.

## Settled decisions

- **Integration in this branch, not a follow-up sequence.** The three #22752 cherry-picks plus the new endpoint plus the wire rename land on `workflow_state_backfill` directly, ahead of the PR. Single coherent backend layer for review.
- **Endpoint shape:** new `GET /api/tool_executions/{id}` sibling to `/api/tool_requests/{id}`, same response shape as `tool_request_to_model`. Source-neutral over `ToolExecutionState`. Backed by the existing resolver.
- **Wire rename:** `GraphNode.src` literal `"tool_request"` → `"tool_execution"` ships in the same commit as the endpoint. They describe the same concept change; stranding the cosmetic mismatch is uglier than the rename itself. `GraphNode.src` is an openapi Literal — TS compiler points at every UI site after schema regen.
- **`/api/tool_requests/*` stays.** It's still the right shape for the async-submission lifecycle (NEW / SUBMITTED / FAILED / state polling). The new endpoint is read-only for the captured payload; it does not replace the lifecycle endpoints.
- **ToolSource UQ ships with the cherry-pick batch.** Real bug fix — existing async-API mint inserts a fresh `ToolSource` row per request with `hash="TODO"` literally hardcoded. UQ + `get_or_create_tool_source` fills the TODO and dedupes silently. Independent of EXEC_STATE; worth on its own.

## Steps

### 1. Cherry-pick `dataset_element` edges + `SYNTHETIC_TOOL_IDS`

- [ ] `lib/galaxy/managers/history_graph.py`: add `SYNTHETIC_TOOL_IDS: tuple[str, ...] = ("__DATA_FETCH__",)`; replace the two `Job.tool_id != "__DATA_FETCH__"` filters with `Job.tool_id.notin_(SYNTHETIC_TOOL_IDS)`. Generalizes the existing exclusion.
- [ ] `lib/galaxy/managers/history_graph.py`: add `_collection_element_edges(hdca_ids)` walker (lifted verbatim from #22752 `52d7f72af7`). Returns `set[tuple[hda_id, hdca_id]]` for visible leaf HDAs under each top-level HDCA. Suppresses hidden elements (mirrors `_remove_hidden_elements`).
- [ ] `lib/galaxy/managers/history_graph.py`: in `build()` after step 3, emit a `dataset_element` edge per `(hda_id, hdca_id)` and add to closure if missing.
- [ ] `lib/galaxy/managers/history_graph.py`: extend `EDGE_TYPE_RANK` with `"dataset_element": 4`.
- [ ] `lib/galaxy/schema/history_graph.py`: extend `GraphEdge.type` Literal with `"dataset_element"`.
- [ ] `test/unit/app/managers/test_HistoryGraphBuilder.py`: add cases — visible HDA in HDCA → edge present; hidden HDA in HDCA → edge absent; nested child collection → leaf HDA wires to top-level HDCA.
- [ ] Regenerate openapi schema (`make client-format` or whatever invokes the schema regen).

### 2. `ToolSource` lookup-or-create + UQ

- [ ] New migration `<rev>_add_tool_source_hash_source_class_uq.py` after `28885b317f78`:
    - **Dedupe step first.** Existing dev DBs have many `ToolSource` rows with `hash="TODO"`. Collapse duplicate `(hash, source_class)` pairs to the oldest id; repoint `tool_request.tool_source_id` references; delete the losers. SQL'd via `op.execute(...)` blocks (PG + SQLite shapes).
    - Then `op.create_unique_constraint("uq_tool_source_hash_source_class", "tool_source", ["hash", "source_class"])`.
    - Downgrade drops the UQ; does not un-dedupe.
- [ ] `lib/galaxy/model/__init__.py`: add `__table_args__ = (UniqueConstraint("hash", "source_class"),)` to `ToolSource`.
- [ ] New `lib/galaxy/managers/tool_source.py` with `get_or_create_tool_source(session, tool) -> ToolSource`. Lifted verbatim from #22752 (`managers/tool_source.py`): sha256 the source string, lookup by `(hash, source_class)`, race-safe via `IntegrityError` retry.
- [ ] `lib/galaxy/webapps/galaxy/services/jobs.py:268-286`: drop the inline `ToolSource(...)` construction + the literal `hash="TODO"`; call `get_or_create_tool_source(sa_session, tool)`. Drops one `sa_session.add(tool_source_model)`.
- [ ] Test: a new `test/unit/app/managers/test_tool_source.py` — lookup-or-create returns same row across two calls; `IntegrityError` retry path returns the winning row.
- [ ] Integration verification on a dev DB with pre-existing `hash="TODO"` rows: migration runs clean, ToolRequest FKs intact.

### 3. New endpoint `GET /api/tool_executions/{id}` + wire rename

- [ ] **Backend route** in `lib/galaxy/webapps/galaxy/api/tools.py` (or a new `tool_executions.py` router if the existing module is too crowded). Path `/api/tool_executions/{id}`. Returns the same `ToolRequestModel` shape `tool_request_to_model` returns today, sourced from a `ToolExecutionState` row.
- [ ] **Service method** in `lib/galaxy/webapps/galaxy/services/base.py` or a sibling — `tool_execution_to_model(tes, security)` analog of `tool_request_to_model`. Reuses `_encode_tool_request` payload-walk logic (rename to `_encode_request_payload` or similar; share between both endpoint sides).
- [ ] **Schema model** in `lib/galaxy/schema/schema.py`: `ToolExecutionModel` (id, create_time, update_time, request, state). Probably a subset of the existing tool-request model minus the async lifecycle fields.
- [ ] **Wire rename** in the same commit:
    - `lib/galaxy/schema/history_graph.py`: `GraphNode.src` Literal `"tool_request"` → `"tool_execution"`.
    - `lib/galaxy/managers/history_graph.py`: `NODE_SRC["tool_request"]` → `"tool_execution"`; `TYPE_RANK` key rename; `_producer_ref` literal; `_producer_nodes` literal; the `n.src == "tool_request"` filter in `_producer_nodes`.
    - `test/unit/app/managers/test_HistoryGraphBuilder.py`: every assertion of `src=="tool_request"` → `"tool_execution"`. Mechanical.
    - Regenerate openapi schema → `client/src/api/schema/schema.ts` gets the literal flip. TS compiler now flags every UI site for guerler's rebase pass (not this branch's concern).
- [ ] **Integration test** `test/integration/test_workflow_invocation.py` (or a new `test_tool_executions.py`): hit `/api/tool_executions/{tes_id}` for both a workflow-step-captured TES and an async-API-minted TES; assert payload shape + state.

### 4. Verify cleanly + open PR

- [ ] `tox -e unit -- test/unit/app/managers/test_HistoryGraphBuilder.py test/unit/app/managers/test_tool_source.py`
- [ ] `./run_tests.sh -integration test/integration/test_workflow_invocation.py`
- [ ] `./run_tests.sh -api lib/galaxy_test/api/test_workflow_extraction.py` (regression — extraction still resolves via the seam unchanged)
- [ ] Manual GUI smoke check: history graph endpoint returns wire-renamed `src`; producer node renders.
- [ ] Open PR. Description summarizes: capture workflow tool-step request state in `tool_execution_state`, unify the History Graph resolver, prep wire vocabulary + endpoint for the History Graph UI in #22752.

## Files to touch

| File | Step | Scope |
|---|---|---|
| `lib/galaxy/managers/history_graph.py` | 1, 3 | `dataset_element` walker + edge; wire-rename `src` literal |
| `lib/galaxy/schema/history_graph.py` | 1, 3 | `GraphEdge.type` += `"dataset_element"`; `GraphNode.src` literal flip |
| `lib/galaxy/model/__init__.py` (`ToolSource`) | 2 | `__table_args__ = (UniqueConstraint(...),)` |
| `lib/galaxy/model/migrations/alembic/versions_gxy/<rev>_add_tool_source_hash_source_class_uq.py` | 2 | dedupe + UQ |
| `lib/galaxy/managers/tool_source.py` | 2 | new — `get_or_create_tool_source` |
| `lib/galaxy/webapps/galaxy/services/jobs.py` (~268) | 2 | call helper, drop `hash="TODO"` |
| `lib/galaxy/webapps/galaxy/services/base.py` | 3 | rename `_encode_tool_request` → `_encode_request_payload`; add `tool_execution_to_model` |
| `lib/galaxy/webapps/galaxy/api/tools.py` (or new module) | 3 | route `/api/tool_executions/{id}` |
| `lib/galaxy/schema/schema.py` | 3 | `ToolExecutionModel` |
| `test/unit/app/managers/test_HistoryGraphBuilder.py` | 1, 3 | edge cases; `tool_request` → `tool_execution` |
| `test/unit/app/managers/test_tool_source.py` | 2 | new — helper happy path + race |
| `test/integration/test_workflow_invocation.py` (or new file) | 3 | endpoint integration |
| `client/src/api/schema/schema.ts` | 3 | regenerated |

## What guerler picks up on rebase (documented for handoff, not in this PR)

- `client/src/components/History/Graph/HistoryGraphNodeDetails.vue:50` → swap `/api/tool_requests/{id}` for `/api/tool_executions/{id}`.
- Rename pass driven by TS compiler errors after schema regen: every `"tool_request"` literal under `client/src/components/History/Graph/` → `"tool_execution"` (~10 sites in 4 files).
- CSS class `node-tool-request` → `node-tool-execution` (1 selector in `HistoryGraphOverview.vue`).
- File `HistoryGraphToolRequests.vue` → `HistoryGraphToolExecutions.vue` + ident rename `toolRequestNodes` / `isToolRequest`.
- Drop his backend commits (`340a70f23e`, `771bf5cc73`, `0cba6fa7b1`, `a1ea6c4d8c`, `52d7f72af7`) on rebase. Convert.py / request.py / capture-time bits in workflow_state_backfill supersede them.

## Out of scope

- Dropping `ToolRequest.request` column + the dual-write — follow-up PR per [[FINISH_EXEC_STATE_PLAN]].
- Repointing `ToolRequestImplicitCollectionAssociation` onto `ToolExecutionState` — follow-up.
- Backfilling historical workflow invocations — never; documented in [[FINISH_EXEC_STATE_PLAN]].
- `ToolRequestImplicitCollectionAssociation` schema work, `tool_source` snapshot column on TES, etc. — all deferred per [[CAPTURE_WORKFLOW_EXECUTION_STATE_PLAN]] resolutions.

## Unresolved questions

- Response shape `ToolExecutionModel` vs reuse `ToolRequestModel` minus async fields. Concrete diff is `state_message` + the lifecycle `state` enum (`NEW/SUBMITTED/FAILED`). Either works; pick before route lands.
- `ToolSource` dedupe migration — risk on production-sized DBs? Worth a quick row-count sanity check (`SELECT count(*), hash, source_class FROM tool_source GROUP BY hash, source_class HAVING count(*) > 1`) before running.
- Wire rename: ship in same commit as endpoint, or separate? Recommend same (atomic semantic shift); flag if reviewers prefer split.
- Endpoint module home: `api/tools.py` (crowded) vs new `api/tool_executions.py`. Lean new module.
- Should `/api/tool_executions/{id}` accept a `ToolRequest` id transitionally (for historical rows where TES FK is NULL)? Or hard 404 and force the UI to fall back to `/api/tool_requests/{id}` for historical nodes via cipher-kind discrimination? Probably hard 404 — cleaner, and the resolver already returns the legacy payload via the dual-write `ToolRequest.request` path for any `ToolExecutionState`-backed read.
