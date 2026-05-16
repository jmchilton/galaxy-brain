---
type: research
subtype: pr
tags:
  - research/pr
  - galaxy/api
  - galaxy/client
  - galaxy/lib
  - galaxy/workflows
  - galaxy/collections
  - galaxy/datasets
  - galaxy/models
github_pr: 21932
github_repo: galaxyproject/galaxy
related_prs:
  - 20935
  - 21842
  - 21828
  - 17413
  - 20390
related_issues:
  - "[[Issue 17506 - Convert Workflow Extraction Interface to Vue]]"
related_notes:
  - "[[Component - Collection Models]]"
  - "[[Component - Collection Tool Execution Semantics]]"
  - "[[Component - Invocation Graph View]]"
  - "[[Component - Workflow Editor Terminals]]"
  - "[[Component - Workflow Extraction]]"
  - "[[Component - Workflow Extraction Models]]"
  - "[[Issue 17506 - Convert Workflow Extraction Interface to Vue]]"
  - "[[PR 17413 - Invocation Graph View]]"
  - "[[PR 18758 - Tool Execution Typing and Decomposition]]"
  - "[[PR 20390 - Workflow Graph Search]]"
  - "[[PR 20935 - Tool Request API]]"
  - "[[PR 21828 - YAML Tool Hardening and Tool State]]"
  - "[[PR 21842 - Tool Execution Migrated to api jobs]]"
status: draft
created: 2026-05-13
revised: 2026-05-13
revision: 1
ai_generated: true
summary: "GET /api/histories/{id}/graph returns bounded provenance DAG over HDAs HDCAs tool_requests"
sources:
  - "https://github.com/galaxyproject/galaxy/pull/21932"
---

# PR #21932: History Graph API - Research Summary

**PR**: galaxyproject/galaxy#21932 (author: guerler, merged 2026-05-02 as `2e70707a`)
**Verified against**: `dev` @ `d3b3ab7288cd272bb1d709f3c63b0f9ea440bc06`
**Scope**: 49 files, ~3900 added. Backend manager + schema + route, full new frontend `Graph/*` and `History/Graph/*` trees, workflow-editor utility refactor.
**xref**: open issue #21659 ("Make progress towards History Graph View"); depends on the tool-request infrastructure from [[PR 20935 - Tool Request API]] / [[PR 21842 - Tool Execution Migrated to api jobs]] / [[PR 21828 - YAML Tool Hardening and Tool State]].

---

## Overview

Adds a bounded provenance DAG over a history. Nodes = `dataset` (HDA), `collection` (HDCA), `tool_request` (`r{encoded_id}`). Edges derived from persisted `JobToOutput[Dataset|DatasetCollection]Association` (producer side) and the persisted `ToolRequest.request` payload (input side). Hidden HDAs that are collection elements are normalized up to parent HDCA so map-over collapses to collection-level edges. Output bounded by `limit + 1` (truncation detection) and optionally focused via `seed` / `seed_scope` with BFS up to `depth`. Pure read endpoint — no caching, no mutation.

The frontend bundles a minimal viewer (`HistoryGraphView.vue`, routed `/histories/:historyId/graph`, surfaced from the History dropdown) plus a factor-out of zoom/minimap/connection-path primitives now shared with the workflow editor.

---

## 1. Backend

### 1.1 `HistoryGraphManager` / `HistoryGraphBuilder`

**Location**: `lib/galaxy/managers/history_graph.py` (603 lines, untouched since merge).

- `MAX_LIMIT = 1000` (line 56); manager `.build()` clamps caller (line 71). API allows `le=2000` — see §5.
- Node ID prefixes (`NODE_TYPE_PREFIX`, line 55): `d` = dataset, `c` = collection, `r` = tool_request.

Build pipeline (`HistoryGraphBuilder.build`, line 135):
1. **Select items** (`_select_items`, line 219): UNION of HDA + HDCA in the history ordered `hid DESC, id DESC`, capped at `limit + 1` (line 250). The +1 row is consumed solely to set `truncated.item_count_capped`.
2. **Drop element HDAs** (`_remove_hidden_elements`, line 267): HDAs that are both hidden AND members of a `DatasetCollectionElement` are filtered out — they will be represented by their parent HDCA via `_normalize_refs`.
3. **Producers** (`_hda_producers` line 301 / `_hdca_producers` line 335): join HDA/HDCA to `JobToOutput[Dataset|DatasetCollection]Association` -> `Job` -> `ToolRequest`. Excludes `Job.tool_id == "__DATA_FETCH__"`. Items with multiple distinct `tool_request_id` values are kept as nodes but the producer edge is skipped (logged `log.debug`).
4. **Inputs from payloads** (`_fetch_payloads` line 371, `_extract_inputs` line 390): bulk-fetch `ToolRequest.request` JSON for the discovered tool_requests and walk each payload once with `boltons.iterutils.remap`. Visitor peeks the sibling `src` for `id` leaves and matches against `DataItemSourceType.hda` / `hdca`.
5. **Normalize hidden-element refs** (`_normalize_refs`, line 426): one query replaces any HDA ref that's actually a collection element with its parent HDCA id; cuts element-level fan-out.
6. **Closure** (`_filter_deleted_ids`, line 282): re-applies deleted filter so closure-pulled items respect `include_deleted`. The closure rule — every retained tool_request must have all top-level inputs/outputs in the graph — is the structural invariant tested by `test_closure_invariant_no_partial_executions`.
7. **Tool name lookup** (`_resolve_tool_names`, line 534): toolbox lookup per distinct `tool_id`; swallows `MessageException` so nodes for uninstalled tools just show `tool_id`.
8. **Seed/depth filter** (`_seed_filter`, line 553): in-memory BFS from `seed` bounded by `self.depth`, `direction in {forward, backward, both}`. No additional DB round-trips.
9. **Sort** (`_sort`, line 586): deterministic via `_sort_keys` populated during `_encode`.

### 1.2 Schema

**Location**: `lib/galaxy/schema/history_graph.py` (38 lines, untouched since merge).

```
GraphNode  (line 9):  id, type: Literal["dataset","collection","tool_request"],
                      optional name, hid, state, extension, collection_type,
                      deleted, visible, tool_id, tool_name
GraphEdge  (line 23): source, target,
                      type: Literal["dataset_input","dataset_output",
                                    "collection_input","collection_output"]
TruncationInfo (29):  item_count_capped: bool,
                      scope_type: Literal["recent","seed_centered"],
                      seed_in_scope: Optional[bool]
HistoryGraphResponse (35): nodes, edges, truncated
```

No `partial` / `isolated` / `complete` field is encoded — the PR body's terminology describes builder behavior, not the wire shape (see §5).

### 1.3 Route

**Location**: `lib/galaxy/webapps/galaxy/api/histories.py:361-409` — `GET /api/histories/{history_id}/graph`. Wired to a client route at `buildapp.py:279` (`/histories/{history_id}/graph`).

Query params:
- `limit: int` default 500, `ge=1, le=2000` (line 368)
- `include_deleted: bool` default False (line 374)
- `seed: Optional[str]` regex `^[dcr].+$` (line 378)
- `direction: Literal["backward","forward","both"]` default `"both"` (line 383)
- `depth: int` default 20, `ge=1, le=20` (line 387)
- `seed_scope: Optional[str]` regex `^[dc].+$` (line 393) — tool_request id prefix NOT permitted as a scope center

### 1.4 Service layer

**Location**: `lib/galaxy/webapps/galaxy/services/histories.py`.

- Constructor adds `history_graph_manager: HistoryGraphManager` (line 134, 146).
- `graph()` (line 389): asserts accessibility via `manager.get_accessible()`; resolves `seed_scope` -> `seed_scope_hid` (line 413) by decoding the encoded id, picking the model class from the prefix (`d` = HDA, otherwise HDCA), and looking up the hid in the history. `ObjectNotFound` on miss.

---

## 2. Frontend

### 2.1 Generic graph primitives (new) — `client/src/components/Graph/`

Factored out so both the workflow editor and the history viewer share the same layer:

- `GraphView.vue` (181 lines) — composes nodes/edges, hosts zoom + minimap.
- `GraphNode.vue` (114 lines) — visual node renderer (header, ports, badge).
- `GraphEdges.vue` (89 lines) — edge bundle renderer; orthogonal or curved.
- `ZoomControl.vue` (73 lines) — zoom buttons. `Workflow/Editor/ZoomControl.vue` is now a one-line re-export shim.
- `types.ts` — `GraphNode`, `GraphEdge`, `GraphNodePort`, `EdgeStyle = "orthogonal" | "curved"`, `GraphLayout`.

### 2.2 History viewer (new) — `client/src/components/History/Graph/`

- `HistoryGraphView.vue` (141 lines) — props `historyId: string`, `seedNodeId?: string`. **Hardcodes `limit = 500`**. No UI control for `seed_scope`, `include_deleted`, `depth`, `direction`.
- `historyGraphMapper.ts` — maps API `GraphNode` -> visual node with icon (faFile / faLayerGroup / faWrench), label `hid: name | extension | toolName`, badge (`extension` / `collection_type`). Uses auto-generated `components["schemas"]["HistoryGraphResponse"]`.
- `useHistoryGraphData.ts` — `useHistoryGraphData(historyId, limit, seed?)` Ref-driven fetch via `GalaxyApi().GET("/api/histories/{history_id}/graph", ...)`.
- `useHistoryGraphLayout.ts` — ELK.js layered layout; `orthogonal` uses ELK-routed sections, `curved` uses `computeControlPoints` from `@/utils/connectionPath`.
- `HistoryGraphMinimap.vue` (233 lines) — consumes `useMinimapInteraction` composable.
- `HistoryGraphDetails.vue` (96 lines) — selected-node side panel.

### 2.3 Router + menu wiring

- `client/src/entry/analysis/router.js:46, 431-437` — imports `HistoryGraphView`; route `histories/:historyId/graph` with `props: (route) => ({ historyId, seedNodeId: route.query.seed || undefined })`.
- `client/src/components/History/HistoryOptions.vue:235` — new `BDropdownItem` "Show History Graph" using `faBezierCurve`, link `/histories/${history.id}/graph`. Test in `HistoryOptions.test.ts` updated.

### 2.4 Workflow-editor utility refactor (pure relocations / shims)

All callers were updated; no in-tree imports of the old paths remain.

| PR-era path | Current path |
|---|---|
| `client/src/components/Workflow/Editor/modules/geometry.ts` | `client/src/utils/geometry.ts` (rename) |
| `client/src/components/Workflow/Editor/composables/d3Zoom.ts` | `client/src/composables/d3Zoom.ts` (moved) |
| `client/src/components/Workflow/Editor/composables/viewportBoundingBox.ts` | `client/src/composables/viewportBoundingBox.ts` (moved) |
| `client/src/components/Workflow/Editor/modules/zoomLevels.ts` | re-export shim -> `client/src/utils/zoomLevels.ts` |
| `client/src/components/Workflow/Editor/ZoomControl.vue` | re-export shim -> `client/src/components/Graph/ZoomControl.vue` |

New shared modules:

- `client/src/utils/connectionPath.ts` (127 lines) — `curveBasisPath`, `orthogonalPath`, `computeControlPoints`. Consumed by both `Workflow/Editor/SVGConnection.vue` and `History/Graph/useHistoryGraphLayout.ts`.
- `client/src/composables/useMinimapInteraction.ts` (144 lines) — extracted from the old `WorkflowMinimap.vue` (which loses 91 lines). Now consumed by both `WorkflowMinimap.vue` and `HistoryGraphMinimap.vue`.

---

## 3. Tests

### `test/unit/app/managers/test_HistoryGraphBuilder.py` (1509 lines, new)

Two suites. Builds histories via direct ORM helpers (`_create_hda`, `_create_tool_request`, `_create_job`, `_link_job_input_hda`, `_link_job_output_hda`, `_link_job_input_hdca`, `_link_job_output_hdca`, `_link_implicit_collection`, `_append_payload_input`).

`TestHistoryGraphBuilder` (line 31) — full behavioral matrix:

- **Construction**: standalone datasets, full chain, disconnected components, single-collection node, zip/unzip, single-element collection, multiple copies same dataset.
- **Map-over collapse**: `test_map_over_input_edges`, `test_map_over_output_edges`, `test_large_collection_no_explosion`.
- **Hidden filtering**: `test_hidden_non_element_hda_included` (visible-hidden but unbound HDAs kept); `test_closure_resolves_hidden_element_input_to_parent_collection`.
- **Closure / "partial / isolated"**: `test_closure_completes_tool_requests_at_seed_boundary`, `test_closure_invariant_no_partial_executions`. Docstring on the latter locks the rule as of 2026-04-09.
- **Ambiguous producers**: `test_n2_jodca_only_hdca_has_producer_edge` (single-source kept), `test_n2_ambiguous_hdca_producer_has_node_but_no_edge` (multi-source -> node yes, edge no).
- **Traversal**: `test_seed_subgraph_filter`, `test_seed_not_in_graph`, `test_seed_in_scope_true`, `test_seed_scope_centers_on_item`, `test_seed_filter_issues_no_extra_queries`.
- **Truncation / windowing**: `test_node_limit`, `test_stability_new_items_shift_recent_window`, `test_recent_overview_shift_after_append`, `test_large_standalone_history`.
- **Deletion**: `test_deleted_input_not_in_graph`, `test_deleted_items_with_include_deleted`.
- **Misc**: `test_data_fetch_excluded`, `test_edge_deduplication`, `test_dataset_node_fields`, `test_edge_types_semantic`, `test_no_self_loops`, `test_deterministic_ordering`, `test_jtoda_only_output_caught`, `test_expanding_limit_generally_additive`.

`TestHistoryGraphBuilderBoundedness` (line 1165) — env-tunable scale tests: large standalone (`GRAPH_SCALE_HISTORY_SIZE=250`), deep linear chain (60), collection-heavy map-over (5x20), seed_scope on older item, recent-overview shift after append, large hidden-element suppression.

### `lib/galaxy_test/api/test_histories.py:1253-1338` — `TestHistoryGraphApi`

Endpoint-level: response shape, standalone-dataset nodes, limit/truncation, seed_scope window, invalid params (wrong-prefix `seed_scope`, empty `seed_scope`, wrong-prefix `seed`, `limit=5000`, `depth=21`), cross-history `seed_scope` -> 404, other-user history -> 403, nonexistent history -> 400. Builder logic intentionally not duplicated here.

### `lib/galaxy_test/base/populators.py:1865-1871`

Adds `get_history_graph(history_id, **params)` and `get_history_graph_raw(...)` thin wrappers over `_get("histories/{history_id}/graph", data=params or None)`.

---

## 4. Changes since merge

`git log 2e70707a..d3b3ab72` over every touched file:

- Backend: only `lib/galaxy/webapps/galaxy/api/histories.py` was modified — by an unrelated authz fix (`152f0eb`, `5080ecd` — "Honor group-derived roles in unprivileged tool access check"). The graph endpoint, service, manager, schema, builder tests, API tests, and populator helpers are byte-identical to merge.
- Frontend: only `client/src/api/schema/schema.ts` was touched — by routine schema regenerations (`85cacc6`, `8a5dbef`, `b4a0f97`). All Vue components, composables, and shared utilities introduced by this PR are byte-identical.

No file the PR touched has been moved, renamed, or deleted post-merge.

---

## 5. Cross-checks and discrepancies

Three mismatches surfaced; all are real (read from code at the pinned SHA), not transcription errors:

1. **`limit` ceiling disagreement.** API exposes `le=2000` (`api/histories.py:368`). Manager defines `MAX_LIMIT = 1000` (`history_graph.py:56`) and silently clamps callers. A caller passing `limit=1500` will get an API-level OK but only 1000 nodes back, without an obvious signal beyond `item_count_capped`.
2. **`depth` default disagreement.** Manager `HistoryGraphBuilder.__init__` / `HistoryGraphManager.build` default `depth=5` (lines 71, 118). Service and API default `depth=20` (`services/histories.py:397`, `api/histories.py:387`). The unit test class always passes `depth=20` explicitly, so this only matters for direct manager usage outside the API.
3. **PR-body terminology not in schema.** The PR describes tool_request classification as "complete, partial, or isolated", but `GraphNode` has no such field. The behavior maps to (a) ambiguous-producer skip — node kept, producer edge omitted — and (b) the closure rule that pulls boundary items in so every retained tool_request is structurally complete. Anyone reading the response shape expecting a `classification` field will be surprised.

All PR-body specific claims otherwise verified:

- "directed graph over top-level history items" — confirmed at `_select_items` (line 219) + `_normalize_refs` (line 426).
- "limited selection by hid" — confirmed (`hid DESC, id DESC`, capped at `limit+1`).
- "subgraph extraction based on direction and depth" — params real, BFS in `_seed_filter` real.
- "minimal graph view component" — confirmed (`HistoryGraphView.vue` routed at `/histories/:historyId/graph`).
- `__DATA_FETCH__` excluded from producers — confirmed at lines 319 + 353.
- Edge types `dataset_input` / `dataset_output` / `collection_input` / `collection_output` — confirmed in schema and emitted from builder (lines 166-177).
- Truncation `scope_type` is `"recent"` or `"seed_centered"` — `seed_centered` is set when `seed_scope_hid is not None` (line 138).
- Workflow-editor refactor: `grep -rn "@/components/Workflow/Editor/modules/geometry|.../composables/d3Zoom|.../composables/viewportBoundingBox|.../composables/workflowBoundingBox"` over `client/src/` returns no matches at the pinned SHA — all callers updated.

---

## 6. Unresolved questions

- mismatch — api `limit le=2000` vs manager `MAX_LIMIT=1000` intentional? Should api drop to 1000 or manager raise to 2000?
- mismatch — manager `depth=5` vs api `depth=20` defaults; which is canonical?
- viewer hardcodes `limit=500`, no UI for seed/seed_scope/include_deleted/depth/direction — followup PRs expected? Or is the v1 viewer "demo only"?
- `_extract_inputs` (line 405) trusts upstream payload validation for shape — is the `request` payload Pydantic-validated for every tool_request inserter path?
- ambiguous-producer drop is `log.debug` only — should this be observable to users (e.g., a `notes` field on the node)?
- workflow extraction ([[Component - Workflow Extraction]]) and this builder solve overlapping problems with different code paths — consolidation planned?
- `_resolve_tool_names` swallows `MessageException` silently — uninstalled-tool tool_request nodes show only `tool_id`; UI handling unclear.
- `truncated.seed_in_scope` set only when `seed` is passed; no symmetric flag for when a `seed_scope`'d item gets dropped from its own window.
- `__DATA_FETCH__` excluded as producer, but its outputs (uploads) still appear as dataset nodes with no producer edge — intentional "raw upload" presentation?
- only HDA / HDCA / tool_request modeled — LDDA, library datasets, visualizations explicitly out of scope?
