# Graph-Driven / Notebook-Driven Workflow Extraction — Plan (Blocked)

> **Date:** 2026-05-16
> **Status:** BLOCKED — do not start.
> **Blocked on:** [[EXTRACT_TOOL_REQUEST_STATE_PLAN]] (the gate). Resume only after extraction and the History Graph share the structured `ToolRequest.request` model.
> **Predecessor chain:** [[ICJ_NATIVE_PLAN]] → [[EXTRACT_ICJ_PLAN]] → [[EXTRACT_TOOL_REQUEST_STATE_PLAN]] → this.
> **Tracking issue:** TBD
> **Related research:**
> - `vault/research/PR 21932 - History Graph API.md`
> - `vault/research/PR 21935 - Workflow Extraction Vue Conversion.md`
> - `vault/projects/history_markdown/HISTORY_MARKDOWN_ARCHITECTURE.md`

---

## Why this exists

The North Star: a Galaxy Notebook narrates an analysis (what inputs to pick, what the outputs mean) and the **provenance graph walked backward** from the referenced content is what gets exported as a workflow. The notebook replaces the legacy extraction *form-as-a-page*; the graph (read-only, selectable) is the extraction surface.

Two framings settled during ideation and carried forward as constraints:

- **Read-only + selectable, not editable.** A genuinely editable history graph is a second Workflow Editor (node add/remove, connection editing, persistence, undo) — rejected as a maintenance trap. First pass = the existing `Graph/*` primitives made multi-select + backward-closure-highlight aware. Editing stays in the existing Workflow Editor.
- **Notebook = narrative wrapper around an explicit selection, not parsed prose.** Free text cannot define a workflow; the backing selection (graph selection / the existing Vue form) is the precision layer. The notebook documents it.

Why blocked: every variant needs extraction and the graph to speak one identity space. Until [[EXTRACT_TOOL_REQUEST_STATE_PLAN]] lands they do not (graph is `ToolRequest`-native; extraction was `JobParameter`-native). After it lands, the graph's `{src,id}` walk and the extractor's are literally the same code — selection→payload becomes a thin translator instead of a bridge across diverging engines.

## Resume prompt (for the implementing agent)

> Once [[EXTRACT_TOOL_REQUEST_STATE_PLAN]] is merged (extraction reads structured `ToolRequest.request`; History Graph and extraction share the ref-walk), proceed roughly in this order, each independently shippable:
> 1. **Selection-aware `Graph/*` primitives** — multi-select state + `@select` emit + backward-closure highlight on the existing read-only `GraphView`/`GraphNode` (PR 21932). No editing. ~80/20 of "editable".
> 2. **`GraphSelection → WorkflowExtractionByIdsPayload` translator** — pure function: selected graph node ids + the (now trivial) `tool_request → ICJ/jobs` model helper → a valid #22706 payload. Roundtrip-testable against existing extraction tests.
> 3. **Notebook `propose_workflow` agent tool** — one new history-agent tool (pattern: the existing 5 tools incl. `resolve_hid`) mapping notebook-referenced HIDs → translator → extract-by-ids.
> 4. **Extraction lineage stamp** — analog to `Page.source_invocation_id`: record which history subgraph/seed an extracted workflow came from, so notebook ↔ workflow round-trips.
> 5. **`linked:false` cross-product map-over** — the deferred follow-up from the gate plan: model cross-product extraction (currently hard-failed). Likely needs workflow-step connection semantics for MULTIPLIED inputs.

## Carried-forward open questions

- Export mechanism of record once unblocked: graph backward-walk vs extract-by-ids as the literal call path (post-gate they share the model, but which one the UI invokes is still a choice).
- Notebook selection model: how a notebook durably references "the selection" (embedded ids? a saved selection object? the `source_invocation_id`-style stamp?).
- `tool_request` coverage on real/old histories — the graph dead-ends on legacy (no-tool_request) jobs; the gate plan's fallback covers *extraction* but the *graph* still shows no producer edge. Decide UX for legacy-history graphs (degrade to form? show disconnected + explain?).
- Provenance-engine consolidation: after the gate, is `HistoryGraphBuilder` refactored to *be* the extraction front-end, or do they stay siblings sharing only the ref-walk?
- Cross-product (`linked:false`) workflow representation — does the Galaxy workflow model express MULTIPLIED map-over the way a converter would need to emit it?

## Out of scope until unblocked

Everything. This file exists to carry the vision and the resume prompt across the gate, not to be worked before it.
