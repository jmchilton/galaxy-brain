# Graph-Driven / Notebook-Driven Workflow Extraction — Plan (Blocked)

> **Date:** 2026-05-16 (corrected 2026-05-17 — see "Correction" below)
> **Status:** BLOCKED — do not start.
> **Blocked on:** [[EXTRACT_TOOL_REQUEST_STATE_PLAN]] (the gate). Implemented on `graph_workflow_extract` (commit 5699c2c324) but **not yet merged to `dev`** — still blocked until it lands. Resume only after extraction and the History Graph share the structured `ToolRequest.request` model.
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

## Correction (2026-05-17 — post-gate-implementation review)

The gate commit (5699c2c324) is implemented; reviewing it against this plan surfaced three places this plan over-claimed:

- **"Literally the same code" is true only for the *walk*, not for *resolved identity*.** Graph and extraction share `request_internal_input_refs`, but immediately diverge after it: graph passes `allowed_srcs={"hda","hdca"}` (drops `dce`) then runs hidden-HDA→parent-HDCA normalization (`_normalize_refs`); extraction passes no filter (keeps `dce`) then resolves to the *individual* HDA via `copied_from` (`_association_for_request_ref`). For the same `{src:dce,id:N}` leaf the graph node identity (`("collection", hdca_id)`) and extraction's association key (`("dataset", hda_id)`) are **different tuples**. Step 2's translator must reconcile graph-node identity with extraction's association keys — it cannot assume they coincide.
- **Step 2 is not "trivial given the model helper"** — see the revised resume-prompt step 2. The gate added the forward direction; the translator owns the reverse mapping.
- **`{src:url}` inputs are a known wiring gap.** The gate creates annotated `data_input` steps for URL leaves but does **not** register them in `id_to_output_pair`, so a URL input consumed by a *later* selected step will not wire. Acceptable for single-tool extraction; the graph/notebook UI must treat URL inputs as terminal sources or extend the wiring.

None of these block resuming after the gate merges; they correct this plan's estimates of how thin steps 1–2 are.

## Resume prompt (for the implementing agent)

> Once [[EXTRACT_TOOL_REQUEST_STATE_PLAN]] is merged (extraction reads structured `ToolRequest.request`; History Graph and extraction share the ref-walk), proceed roughly in this order, each independently shippable:
> 1. **Selection-aware `Graph/*` primitives** — multi-select state + `@select` emit + backward-closure highlight on the existing read-only `GraphView`/`GraphNode` (PR 21932). No editing. ~80/20 of "editable".
> 2. **`GraphSelection → WorkflowExtractionByIdsPayload` translator** — pure function: selected graph node ids → a valid #22706 payload. **Not as trivial as originally framed** (see Correction): the gate commit added the *forward* `ImplicitCollectionJobs.tool_request` helper, but the graph speaks `tool_request_id` (node type `"tool_request"`) and `WorkflowExtractionByIdsPayload` has **no `tool_request_ids` field** (only `job_ids` / `implicit_collection_jobs_ids`). The translator still owns building the *reverse* `tool_request_id → (ICJ id | job id)` mapping (raw materials: `ToolRequest.jobs`, `ToolRequest.implicit_collections`, `Job.implicit_collection_jobs_association`). Roundtrip-testable against existing extraction tests.
> 3. **Notebook `propose_workflow` agent tool** — one new history-agent tool (pattern: the existing 5 tools incl. `resolve_hid`) mapping notebook-referenced HIDs → translator → extract-by-ids.
> 4. **Extraction lineage stamp** — analog to `Page.source_invocation_id`: record which history subgraph/seed an extracted workflow came from, so notebook ↔ workflow round-trips.
> 5. **`linked:false` cross-product map-over** — the deferred follow-up from the gate plan: model cross-product extraction (currently hard-failed). Likely needs workflow-step connection semantics for MULTIPLIED inputs.

## Carried-forward open questions

- Export mechanism of record once unblocked: graph backward-walk vs extract-by-ids as the literal call path (post-gate they share the model, but which one the UI invokes is still a choice).
- Notebook selection model: how a notebook durably references "the selection" (embedded ids? a saved selection object? the `source_invocation_id`-style stamp?).
- `tool_request` coverage on real/old histories — the graph dead-ends on legacy (no-tool_request) jobs; the gate plan's fallback covers *extraction* but the *graph* still shows no producer edge. Decide UX for legacy-history graphs (degrade to form? show disconnected + explain?).
- ~~Provenance-engine consolidation: after the gate, is `HistoryGraphBuilder` refactored to *be* the extraction front-end, or do they stay siblings sharing only the ref-walk?~~ **DECIDED by the gate commit: siblings sharing only the ref-walk** (`request_internal_input_refs` in `lib/galaxy/tool_util/parameters/request.py`). Post-walk identity resolution deliberately *diverges* — unifying it later is a non-trivial refactor, not a free consequence of the gate. See Correction.
- Cross-product (`linked:false`) workflow representation — does the Galaxy workflow model express MULTIPLIED map-over the way a converter would need to emit it? (Gate commit makes this *cheaper to attack*: single typed `RequestInternalToWorkflowStateError`, single raise site, single 400 mapping — but says nothing about whether the workflow model can express MULTIPLIED.)

## Out of scope until unblocked

Everything. This file exists to carry the vision and the resume prompt across the gate, not to be worked before it.
