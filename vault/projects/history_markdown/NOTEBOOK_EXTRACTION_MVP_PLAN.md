# Notebook → List-Extraction MVP — Implementation Plan

> **Date:** 2026-05-23
> **Branch:** off `workflow_state_backfill` (after [[HISTORY_GRAPH_UI_INTEGRATION_PLAN]] and [[WORKFLOW_EXTRACTION_OUTPUT_LABELING_PLAN]] land)
> **Tracking issue:** [#22709](https://github.com/galaxyproject/galaxy/issues/22709) — bullet "Add extraction from notebook API and UI that builds an initial graph…". This plan is the **list-UI MVP** slice (graph-UI variant deferred).
> **Related:**
> - [[WORKFLOW_EXTRACTION_OUTPUT_LABELING_PLAN]] — **DIRECT DEPENDENCY.** Ships the naming-chain helper, `output_labels` payload field, extractor emitting `WorkflowOutput` rows, and `suggested_name` on the summary surface. This plan presumes those primitives exist.
> - [[HISTORY_GRAPH_UI_INTEGRATION_PLAN]] — backend prep shipping the `dataset_element` edge walker and `/api/tool_executions/{id}` surface this plan leans on.
> - [[MAP_OVER_EMPTY_EXTRACTION_TOOL_REQUEST_PLAN]] — `tool_request_ids` selection primitive.
> - [[QUEUED_EXECUTION_EXTRACTION_TOOL_REQUEST_PLAN]] — same primitive, queued executions.
> - [[CAPTURE_WORKFLOW_EXECUTION_STATE_PLAN]] — `tool_execution_state` capture path.
> - [[HISTORY_MARKDOWN_ARCHITECTURE]] — Page model + notebook directive surface.
> - [[GRAPH_WORKFLOW_EXTRACTION_PLAN]] — graph-UI variant the seeding endpoint is forward-compatible with.

---

## At a glance

| | |
|---|---|
| **Problem** | Workflow extraction surface is a flat job list. The narrative structure of an analysis (which outputs matter, what they mean) is not captured. Notebooks already contain that narrative. |
| **Key insight** | A notebook's `history_dataset_display` / `history_dataset_collection_display` directives **are** the workflow-output spec. Walk backward from each through the history graph and you have everything the by-ids extraction endpoint (plus [[WORKFLOW_EXTRACTION_OUTPUT_LABELING_PLAN]]'s `output_labels`) needs. |
| **This plan delivers** | `GET /api/pages/{id}/workflow_extraction_summary` — a notebook-seeded `WorkflowExtractionResult` (same wire shape as the history surface, with per-row `seeded: bool` added). The existing `WorkflowExtractionForm.vue` consumes the seeded summary and pre-checks rows. `suggested_name` is already populated by the upstream plan's helper; this plan just routes the seed. Submit path unchanged. One toolbar action in the notebook editor wires the entry point. |
| **Reusable** | The seeding endpoint is graph-UI-ready (same payload shape both consumers want). The history-graph backward walker is reused, not forked. |
| **This plan does NOT** | Build the graph-mode extraction UI (guerler's territory after rebase). Chase backward across histories (cross-history items become inputs, per #22709 first-pass policy). Touch the legacy HID-based `extract_workflow_from_history` flow when no `pageId` is in scope. Re-introduce any primitives owned by [[WORKFLOW_EXTRACTION_OUTPUT_LABELING_PLAN]]. |
| **Risk** | Low — most of the load-bearing work is in the upstream plan. The new code here is the notebook scan + backward-closure walk + thin form branch. |

---

## Why this exists

#22709's vision is "user writes a notebook documenting their analysis → workflow extraction works from that narrative, not from a flat history list." The graph view + notebook are the new abstractions that make this possible.

The full vision has two UIs: list (this plan) and graph (deferred). The shared piece is the **backend seeding**: given a notebook, produce a structured-summary payload that says "these are the producer steps, these are the boundary inputs." Both UIs consume the same payload; they differ only in how they present it for confirmation.

The "outputs are labeled" half of the value lives in [[WORKFLOW_EXTRACTION_OUTPUT_LABELING_PLAN]] — a deliberately upstream, independently valuable enhancement to the existing extraction flow. This plan rides on top: a notebook is just one *source* of which artifacts deserve to be marked workflow outputs.

Shipping the list-MVP after the upstream output-labeling plan does three things for the presentation timeline: (1) the upstream PR lands as a real, demoable ergonomic win on its own; (2) this MVP gets a clean dependency story rather than a sprawling single PR; (3) the graph UI later reuses both layers byte-identical.

## Settled decisions

- **SUMMARY_NOT_SEED.** Endpoint and module use `workflow_extraction_summary` / `WorkflowExtractionSummary` vocabulary, matching the existing `/api/histories/{history_id}/extraction_summary`. No `seed` framing.
- **STALE_SEED_WARN_AND_SKIP.** Notebook directives pointing at deleted, purged, or no-longer-accessible HDAs/HDCAs are skipped silently in the bucket build, and the skipped reference accumulates a string in the response's `warnings: list[str]` field (mirrors the existing `WorkflowExtractionResult.warnings` channel). Never 500. Never block the rest of the summary.
- **REUSE_SUMMARY_SHAPE.** Response is `WorkflowExtractionResult` (already returned by the history endpoint and already extended with `suggested_name` per [[WORKFLOW_EXTRACTION_OUTPUT_LABELING_PLAN]]), extended further here with one per-row field: `seeded: bool`. Same UI consumer, two callers.
- **CROSS_HISTORY_AS_INPUT.** Backward walk stops at cross-history boundaries. Each cross-history HDA/HDCA becomes a workflow input. Multi-history chase is deferred per #22709's "multiple-history graph view" bullet. Within-history copies traversed transparently (chase through `copied_from_history_dataset_association` is fine if cheap).
- **WALK_VIA_HISTORY_GRAPH.** Backward closure runs through `lib/galaxy/managers/history_graph.py` — reuse, don't fork. Inherits the `dataset_element` edge walker landed in [[HISTORY_GRAPH_UI_INTEGRATION_PLAN]] and the producer-side unification on `ToolExecutionState`.
- **PRODUCER_PREFERENCE.** Order: `tool_request` > ICJ > job > raw HDA (input boundary). Matches the by-ids extractor's existing precedence; surface picks the most-abstract producer that exists.
- **NAMING_DELEGATED.** Suggested names are produced by [[WORKFLOW_EXTRACTION_OUTPUT_LABELING_PLAN]]'s `suggested_output_name` helper; this plan does not re-derive them. The notebook's only naming contribution v1 is acting as the *trigger* — what gets seeded gets named via the upstream chain.
- **LIST_UI_PRESERVED.** When `pageId` query param is absent, `WorkflowExtractionForm.vue` runs the existing flow byte-identical. No regression risk for the established list path.
- **NO_GRAPH_UI.** Out of scope. Don't touch `client/src/components/History/Graph/*`.
- **NO_NOTEBOOK_AGENT_INTEGRATION.** PageAssistantAgent doesn't need new tools for this MVP — extraction is user-triggered, not agent-driven. Defer to follow-up.

## Architecture / seam

```
Notebook (Page with history_id) — content_editor markdown
   └─ history_dataset_display(history_dataset_id=N), history_dataset_collection_display(history_dataset_collection_id=M), …
        │
        ▼
WorkflowExtractionSummaryManager.summary_from_page(trans, page)   ← NEW (managers/workflow_extraction_summary.py)
   1. Scan markdown directives via _remap_galaxy_markdown_calls (markdown_util.py:1403) → set of (HDA|HDCA) ids referenced.
   2. For each id, backward-closure via history_graph.HistoryGraphBuilder.build() (existing).
   3. Bucket reachable producers by preference (tool_request → ICJ → job) → seeded extraction payload bundle.
   4. Build WorkflowExtractionResult by *delegating* to create_workflow_extraction_summary (services/histories.py:824),
      then flagging rows where the producer is in the seeded bucket with seeded=True.
   5. suggested_name on each tool row is already populated by [[WORKFLOW_EXTRACTION_OUTPUT_LABELING_PLAN]] step 4.
        │
        ▼
GET /api/pages/{id}/workflow_extraction_summary  → WorkflowExtractionResult
        │
        ▼
WorkflowExtractionForm.vue (pageId query param branch)
   - Pre-checks seeded rows (using the new seeded flag).
   - suggested_name on tool rows already drives the output-rename pre-fill (from upstream plan).
   - Input rows pre-named via the existing dataset_names path with sensible defaults from the source HDA/HDCA name.
   - Submits via existing extractWorkflowByIds — output_labels plumbing already exists from upstream plan.
        │
        ▼
POST /api/workflows/extract  (existing, extended by upstream plan)
   - WorkflowExtractionByIdsPayload.output_labels honored, WorkflowOutput rows emitted.
```

The seeding endpoint is consumed by list-UI today; graph-UI hydrates from the same payload tomorrow.

## Steps

> **Precondition:** [[WORKFLOW_EXTRACTION_OUTPUT_LABELING_PLAN]] must be merged. This plan presumes `suggested_name` is already on `WorkflowExtractionJob`, `output_labels` is on the payload, the extractor emits `WorkflowOutput` rows, and `suggested_output_name` is callable.

### 1. Notebook scan

- [ ] New `lib/galaxy/managers/workflow_extraction_summary.py` (notebook-driven sibling of `create_workflow_extraction_summary` for histories).
- [ ] `_referenced_ids_from_markdown(content_editor: str) -> list[tuple[ContentKind, int]]` — uses existing `_remap_galaxy_markdown_calls` visitor (`markdown_util.py:1403`) to collect every `history_dataset_id` and `history_dataset_collection_id` arg. Decode if encoded.
- [ ] Unit tests: directives in different containers (`history_dataset_display`, `history_dataset_collection_display`, `history_dataset_as_image`, etc.); encoded vs decoded ids; stale/missing references.

### 2. Backward walk + producer bucketing

- [ ] `_backward_producer_closure(trans, seeds) -> ExtractionBuckets` in same module. Drives `history_graph.HistoryGraphBuilder.build()` with the seeds as roots, walks producer edges back to either a producer node or a cross-history boundary. Returns buckets: `{tool_request_ids, implicit_collection_jobs_ids, job_ids, hda_ids, hdca_ids}` plus a `cross_history_inputs` list (HDA/HDCA ids promoted to inputs).
- [ ] Cross-history detection: producer's `history_id != page.history_id` → stop, promote to input. Within-history copies (via `copied_from_history_dataset_association`) traversed transparently.
- [ ] Unit tests: notebook with mixed direct-job / ICJ / tool-request producers; cross-history copy promoted to input; stale (deleted/purged) reference yields a `warnings` entry (per `STALE_SEED_WARN_AND_SKIP`) and does not appear in any bucket; inaccessible reference (no read perm on the producing history) same treatment; deeply chained producers; element of HDCA referenced (coerce to parent HDCA per upstream plan's edge case table).

### 3. `summary_from_page` + endpoint

- [ ] `summary_from_page(trans, page) -> WorkflowExtractionResult`:
    - Run steps 1+2 → buckets + `warnings` (stale/inaccessible seeds per `STALE_SEED_WARN_AND_SKIP`).
    - Call `create_workflow_extraction_summary(trans, page.history)` to get the baseline `WorkflowExtractionResult` (with `suggested_name` already populated for tool rows per the upstream plan).
    - Walk the rows; mark `seeded=True` where the producer (job/ICJ/tool_request id) is in the seeded buckets. Inputs in `cross_history_inputs` are added as additional rows via the `_synthesize_input_row` helper that the upstream plan extracts from `create_workflow_extraction_summary` (single shared helper for both consumers).
    - Append the stale-seed warnings to the response's `warnings`.
- [ ] Add `seeded: bool = False` to `WorkflowExtractionJob` (`schema/workflows.py:349`). Default `False` → existing history-endpoint callers unaffected.
- [ ] New route in `lib/galaxy/webapps/galaxy/api/pages.py`: `GET /api/pages/{id}/workflow_extraction_summary` → delegates to `pages_service.workflow_extraction_summary(trans, id)`. 400 if `page.history_id is None` (reports can't seed). 400 if directives reference a different history (per Unresolved Q below; lean: hard error v1).
- [ ] Service wiring in `lib/galaxy/webapps/galaxy/services/pages.py`.
- [ ] API test in `lib/galaxy_test/api/test_pages_history_attached.py` (or new `test_notebook_workflow_extraction_summary.py`): create page with directives → assert summary shape + seeded flags + that `suggested_name` is populated (sanity check that upstream plan's helper is wired through).

### 4. Form `pageId` branch

- [ ] `client/src/components/History/WorkflowExtractionForm.vue`: add optional `pageId` query param. When present:
    1. Fetch `/api/pages/{pageId}/workflow_extraction_summary` instead of `extractWorkflowFromHistory`.
    2. Pre-check rows where `seeded === true`.
    3. `outputLabels` pre-fill already comes from `suggested_name` per the upstream plan's wiring; no additional work here.
    4. Pre-populate input `newName` from a sensible default (source HDA/HDCA name, suffixed with source-history annotation when cross-history).
- [ ] Optional toggle (defer if tight): "show only seeded rows" — pure client-side filter, submit path unchanged.
- [ ] `client/src/api/pages.ts`: `fetchWorkflowExtractionSummary(pageId)`.
- [ ] Vitest in `WorkflowExtractionForm.test.ts`: seeded-flow renders pre-checked rows; submit POSTs `output_labels` derived from `suggested_name`; no-pageId path identical to current.

### 5. Notebook entry point

- [ ] In `client/src/components/PageEditor/PageEditorView.vue` (notebook mode only, gated on `store.mode === "history" && historyId`): toolbar action "Extract Workflow" → `router.push(/histories/${historyId}/extract_workflow?from_page=${pageId})`.
- [ ] Vitest in `PageEditorView.test.ts`: button visible in notebook mode, hidden in report mode; click navigates with correct query param.

### 6. Verify

- [ ] `tox -e unit -- test/unit/app/managers/test_workflow_extraction_summary.py`
- [ ] `./run_tests.sh -api lib/galaxy_test/api/test_workflow_extraction.py` (regression — upstream plan's coverage holds)
- [ ] `./run_tests.sh -api lib/galaxy_test/api/test_pages_history_attached.py` (new endpoint)
- [ ] Manual demo: notebook with 2–3 directives (mix of jobs + ICJ + a cross-history copy) → click toolbar → form pre-populated with seeded rows checked and outputs pre-labeled → submit → resulting workflow has the right step shape + named outputs.

## Files to touch

| File | Step | Scope |
|---|---|---|
| `lib/galaxy/managers/workflow_extraction_summary.py` | 1, 2, 3 | new — notebook scan + backward walk + summary build |
| `lib/galaxy/managers/markdown_util.py` | 1 | possible new visitor helper exposing referenced-ids extraction (if a clean entry point doesn't already exist) |
| `lib/galaxy/schema/workflows.py` | 3 | `WorkflowExtractionJob += seeded: bool = False` |
| `lib/galaxy/webapps/galaxy/api/pages.py` | 3 | `GET /api/pages/{id}/workflow_extraction_summary` |
| `lib/galaxy/webapps/galaxy/services/pages.py` | 3 | `workflow_extraction_summary` service method |
| `client/src/api/pages.ts` | 4 | `fetchWorkflowExtractionSummary(pageId)` |
| `client/src/components/History/WorkflowExtractionForm.vue` | 4 | `pageId` branch + seeded pre-fill |
| `client/src/components/History/WorkflowExtraction/types.ts` | 4 | `seeded` type addition |
| `client/src/components/PageEditor/PageEditorView.vue` | 5 | "Extract Workflow" toolbar action (notebook mode only) |
| `client/src/api/schema/schema.ts` | 3 | regenerated |
| `test/unit/app/managers/test_workflow_extraction_summary.py` | 1, 2, 3 | new |
| `lib/galaxy_test/api/test_pages_history_attached.py` (or new) | 3 | endpoint test |
| `client/src/components/History/WorkflowExtractionForm.test.ts` | 4 | seeded flow |
| `client/src/components/PageEditor/PageEditorView.test.ts` | 5 | toolbar button gating |

## What this sets up for the graph-UI follow-up (documented, not in this PR)

- Graph UI hydrates initial node selection + suggested labels from the same `workflow_extraction_summary` endpoint. No new backend.
- `output_labels` in the extraction payload is already what graph UI will POST (lives in upstream plan).
- The "cross-history chase" expansion is a single delta in `_backward_producer_closure`'s stop condition.
- If the agent ever needs to propose an extraction, it gets the summary via the same endpoint — no agent-specific surface.

## Out of scope

- Anything owned by [[WORKFLOW_EXTRACTION_OUTPUT_LABELING_PLAN]] (naming chain helper, payload extension, extractor emitting `WorkflowOutput`, form output-rename UI, validator dedup/sanitization, `suggested_name` on summary). All upstream.
- Graph-mode extraction UI (deferred to #22709's later bullet, guerler's territory).
- Cross-history backward chase (deferred).
- Renaming / annotating workflow inputs/outputs inline in the notebook (deferred).
- Extraction triggered from the PageAssistantAgent (deferred).
- Filtering whole workflow branches via the summary (the "Allow filtering whole workflow branches via the graph view" #22709 follow-up).

## Unresolved questions

- Notebook with directives in a different history than the page's `history_id` — error, ignore, or treat as cross-history input? Lean error in v1; soft.
- Should the form's "only seeded rows" filter ship in v1 or v2? v2 is fine; pre-checked-in-place is enough to demo.
- Performance: notebook with hundreds of directives → bulk-resolve via batched queries vs. per-directive? Bulk if profiling justifies; v1 ships per-directive.
- `cross_history_inputs` representation in the summary response — synthesize fake `WorkflowExtractionJob` rows of `step_type: input_dataset`/`input_collection` via the `_synthesize_input_row` helper (extracted upstream) or a separate sibling field? Lean synthesized rows for UI uniformity.
- Page revision semantics: which revision of the page do we scan — `latest_revision` or `content_editor` of the current in-flight edit? Lean `latest_revision` (saved state); user must save before extracting.
