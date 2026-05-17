# Capture Workflow Execution State — Implementation Plan

> **Date:** 2026-05-17
> **Branch:** start from `graph_workflow_extract` (or its successor once [[EXTRACT_TOOL_REQUEST_STATE_PLAN]] merges). The converter is a `convert.py` sibling of `to_workflow_step_state`, which already lives on this branch.
> **Tracking issue:** TBD (create from this doc).
> **Decision context:** [[USING_TOOL_STATE_DESIGN_OPTIONS]] — read that first for *why* this shape. This plan implements the recommendation there: execution-time capture → **STEP_STATE**. **EXEC_STATE** is the documented north star, **out of scope here**. (Labels: **MINT** = workflows mint a `ToolRequest`; **READ_TIME** = synthesize on read, rejected; **STEP_STATE** = capture onto the workflow step ★; **EXEC_STATE** = extract a shared value object.)
> **Related research:**
> - `vault/research/Component - Tool State Specification.md`
> - `vault/research/PR 21932 - History Graph API.md`
> - `vault/projects/history_markdown/EXTRACT_TOOL_REQUEST_STATE_PLAN.md`

---

## Why this exists

History Graph ([[PR 21932 - History Graph API]]) and structured workflow extraction ([[EXTRACT_TOOL_REQUEST_STATE_PLAN]]) both read the validated structured `request_internal` payload off `ToolRequest.request`. **Workflow invocations never create a `ToolRequest`** (`ToolRequest` is minted only at `lib/galaxy/webapps/galaxy/services/jobs.py:265`, the async tool-request API path). So both consumers dead-end or fall back to lossy legacy state for anything produced by a workflow.

This plan gives a workflow tool-step execution the same structured, validated state a direct tool request has — captured **at execution time**, where the resolved state is faithful — without minting a `ToolRequest` for it.

## Settled decisions (see [[USING_TOOL_STATE_DESIGN_OPTIONS]] for rationale)

- **Capture at execution time, not reconstruct at read time** (i.e. not **READ_TIME**). Read-time reconstruction inherits the post-hoc lossiness the whole initiative exists to kill.
- **STEP_STATE storage shape.** The request-level payload lands on a new nullable column on `workflow_invocation_step`. No `ToolRequest` minted for workflows (not **MINT**). No new model, no `Job` FK change, no production data migration. **EXEC_STATE** (extract a shared `ToolExecutionState` value object, repoint `Job`) is the north star, deferred, kept reachable by the resolver seam.
- **Validity is an enum, not a bool.** Workflows legitimately execute invalid effective state; a bool cannot distinguish "not yet validated" from "validated, failed, ran anyway."
- **Converter location:** `lib/galaxy/tool_util/parameters/convert.py`, the literal inverse/sibling of `to_workflow_step_state`. Goal: keep it inside `tool_util`. If it provably needs something outside `tool_util`, relocate the function rather than reaching out of the package — flag it, don't reach.
- **One converter implementation.** It is the inverse of `to_workflow_step_state`. Do not write a second walk; reuse the `visit_input_values` visitor and the shared ref-walk in `lib/galaxy/tool_util/parameters/request.py`.

## The half that already exists (do not rebuild)

`Job.tool_state` (JSONB) already exists (`lib/galaxy/model/__init__.py:1641`, migration `566b691307a5`). The async tool-request path **already persists** validated per-job `job_internal` there at `lib/galaxy/tools/execute.py:258-260`:

```python
if execution_slice.validated_param_combination:
    tool_state = execution_slice.validated_param_combination.input_state
    job.tool_state = tool_state
```

It never fires for workflow jobs only because `ToolModule.execute` builds `MappingParameters` with 2 of its 4 fields (`lib/galaxy/workflow/modules.py:2877`): `MappingParameters(tool_state.inputs, param_combinations)` → `validated_param_template=None`, `validated_param_combinations=None` (`execute.py:81-90`). The persistence column and machinery are built; they are simply not fed on the workflow path.

## Architecture / seam

```
ToolModule.execute  (workflow/modules.py ~2877)
   has: resolved param_combinations + collection_info + tool + step
        │
        ▼
 ┌──────────────────────────────────────────────┐  PHASE 1 — atomic core
 │ CONVERTER  (tool_util/parameters/convert.py)  │  decision-independent
 │ resolved workflow exec state → request_       │  (MINT/STEP_STATE/EXEC_
 │ internal  (incl. Batch / linked encoding)     │  STATE all need it); no
 │                                               │  schema; lands first
 └──────────────────────────────────────────────┘
        │
        ▼
 ┌──────────────────────────────────────────────┐
 │ VALIDATE request_internal → request_state      │  enum: not_validated /
 │ enum;  derive per-job job_internal →           │  validated /
 │ populate MappingParameters.validated_*         │  validation_failed
 └──────────────────────────────────────────────┘
        │ existing execute.py:258-260 now fires for workflow jobs
        │ → Job.tool_state gets validated job_internal (per-job leg, free)
        │ INSTRUMENT: log + statsd counter of request_state outcomes
   ═════╪═══════════════════════════════════════════  ◄ PHASE 1 HARD STOP
        ▼
 ┌──────────────────────────────────────────────┐  PHASE 2 — STEP_STATE
 │ persist request_internal on                   │  begins the where-axis
 │ workflow_invocation_step.request               │  decision; STEP_STATE
 │ + workflow_invocation_step.request_state       │  chosen
 └──────────────────────────────────────────────┘
        │
        ▼
 ┌──────────────────────────────────────────────┐
 │ RESOLVER  (manager/helper):                    │  the stable seam.
 │ (Job | ICJ | WIS) → (request_internal,         │  EXEC_STATE later swaps
 │  request_state)  — sourced from ToolRequest    │  backing without touching
 │  OR workflow_invocation_step                   │  consumers.
 └──────────────────────────────────────────────┘
        │
        ├── History Graph (_hda/_hdca_producers, _fetch_payloads)
        └── Extraction    (step_inputs_by_id structured branch)
```

**Phase 1 is the uncontroversial atomic core**: it produces + validates + instruments the payload and stops *before* anything a consumer can see. It is identical across **MINT / STEP_STATE / EXEC_STATE** and lands ahead of the where-axis decision. Phase 2 commits the **STEP_STATE** shape.

## The headline risk (retire it in Phase 1, before anything else)

**Is the `Batch` / `linked` synthesis total?** The workflow path encodes map-over as `collection_info` (`MatchingCollections`) + per-iteration `param_combinations`. `ToolRequest.request` encodes it as `{"__class__": "Batch", "values": [...], "linked": bool}`. The converter must reconstruct the `Batch` form and derive `linked` from MATCHED vs MULTIPLIED semantics (`lib/galaxy/tools/parameters/meta.py:348-372`).

Unverified totality cases — these are the gate:
- nested `list:paired` map-over
- multi-input matched `Batch` (≥2 batched inputs, all `linked:true`) — converter must emit N connected inputs and the ref-walk must yield one association per batched input (carried open question from [[EXTRACT_TOOL_REQUEST_STATE_PLAN]]).
- `linked:false` (cross-product / MULTIPLIED): **hard-fail** with a specific error here, exactly as the extraction plan does. Not modeled at this layer; deferred to [[GRAPH_WORKFLOW_EXTRACTION_PLAN]].

If any of these cannot be synthesized faithfully, Phase 1 is not done. This is answerable purely at the unit level via the parameter-spec harness — no history fixtures, no schema. Do it first.

## Phase 1 — atomic core (decision-independent, lands first)

### 1.1 Converter — `lib/galaxy/tool_util/parameters/convert.py` / `__init__.py`
- [ ] Add the inverse of `to_workflow_step_state`: resolved workflow execution state (`param_combinations` + `collection_info` + parameter bundle) → `request_internal` payload.
- [ ] Data/collection leaves → `{src, id}` (int ids — this is `request_internal`, not `request`). Map-over → `{"__class__": "Batch", "values": [...], "linked": bool}` with `linked` derived from `collection_info` MATCHED/MULTIPLIED.
- [ ] `linked:false` → raise the typed cross-product error (mirror extraction plan).
- [ ] Reuse `visit_input_values` and `lib/galaxy/tool_util/parameters/request.py` ref-walk. No second traversal.
- [ ] Export from `__init__.py`.
- [ ] If a dependency outside `tool_util` is unavoidable, stop and flag (move the function, do not import outward).

### 1.2 Validate + derive per-job state
- [ ] Validate the converter's `request_internal` against the meta-model (reuse `RequestInternalDereferencedToolState` / `expand_meta_parameters_async`-style expansion; template: `lib/galaxy/tools/__init__.py:2348-2382` `handle_input_async`).
- [ ] Map outcome to the `request_state` enum: `not_validated` (converter not run / pre-feature), `validated` (meta-model accepted), `validation_failed` (rejected — workflow still ran; record, never block execution).
- [ ] Feed `MappingParameters.validated_param_template` + `validated_param_combinations` on the workflow construction at `lib/galaxy/workflow/modules.py:2877` so the **existing** `execute.py:258-260` persists validated `job_internal` into `Job.tool_state` for workflow jobs (per-job leg — no new code in execute.py).

### 1.3 Instrumentation (earns the core its keep pre-decision)
- [ ] At the execute-time call site, emit a structured log + statsd counter keyed by `request_state` outcome, tool id, and whether map-over (mirror the legacy-fallback telemetry pattern in [[EXTRACT_TOOL_REQUEST_STATE_PLAN]]).
- [ ] **Hard stop.** Do not persist `request_internal` anywhere consumer-visible in Phase 1. Do not touch `history_graph.py` or `extract.py`. Do not add a column.

### 1.4 Tests (red-to-green, unit only, no history fixtures)
- [ ] `test/unit/tool_util/test_parameter_convert.py`: converter cases — plain data refs, single collection, matched `Batch`, nested `list:paired`, multi-input matched `Batch`, `linked:false` hard-fail.
- [ ] `parameter_specification.yml`: add `request_internal_*` rows for the representative tools the converter must round-trip (the inverse direction of the existing `to_workflow_step_state` coverage).
- [ ] Verify the per-job leg: a workflow tool-step execution yields `Job.tool_state` populated with validated `job_internal` (extend an existing workflow execution unit test rather than new fixtures).

## Phase 2 — STEP_STATE (commits the chosen shape)

### 2.1 Schema — `lib/galaxy/model/__init__.py` + one alembic migration
- [ ] Add to `WorkflowInvocationStep` (`model/__init__.py:10466`): `request: Mapped[Optional[dict]]` (JSON, `request_internal` shape, mirrors `ToolRequest.request`) and `request_state: Mapped[Optional[str]]` (TrimmedString, the validity enum).
- [ ] **Naming note for reviewers:** `WorkflowInvocationStep.state` is invocation-step *lifecycle* (`InvocationStepState`); the new `request_state` is *validity of the captured request* (distinct concept, deliberately `request_`-prefixed). State this in the migration docstring and the model comment.
- [ ] Migration: single additive nullable column pair on `workflow_invocation_step`. No backfill (consistent with the "new executions only, read-time fallback for old" boundary set by [[EXTRACT_TOOL_REQUEST_STATE_PLAN]] and [[PR 21932 - History Graph API]]). Pattern reference: `566b691307a5` (additive JSON column on an existing model). This additivity is exactly what keeps **EXEC_STATE** reachable later without re-touching consumers.

### 2.2 Persist at execute time
- [ ] At the workflow execute-time call site, write the Phase-1 `request_internal` + `request_state` onto the `WorkflowInvocationStep` for the step. One row per step execution; preserve the 1:1 step↔payload property (do not write per-map-over-iteration — the payload is the whole map-over, the `Batch` form).

### 2.3 Resolver — the stable seam
- [ ] Add a single helper/manager method: given a `Job` / `ImplicitCollectionJobs` / `WorkflowInvocationStep`, return `(request_internal, request_state)` — sourced from `Job.tool_request.request` (command path) or `WorkflowInvocationStep.request` (workflow path). This is the seam **EXEC_STATE** later re-backs without touching callers.
- [ ] Mirror the existing ambiguity rule, do not invent one: >1 distinct producing request → no payload + the same debug/skip the History Graph already does for >1 `tool_request_id` (`history_graph.py:301-367`).

### 2.4 Repoint the two consumers through the resolver (~4 files total surface)
- [ ] `lib/galaxy/managers/history_graph.py`: `_hda_producers` / `_hdca_producers` (`:301-367`) and `_fetch_payloads` (`:371-389`) currently key on `Job.tool_request_id` and `select(ToolRequest.request)`. Route through the resolver so a workflow-produced item resolves its payload from the `WorkflowInvocationStep`. **Do not** change the public wire shape (`GraphNode.type` literal `"tool_request"`, node-id prefix `r`, `seed`/`seed_scope` regex `^[dcr]`) — **STEP_STATE** is internal-only; renaming the node concept is an **EXEC_STATE** concern.
- [ ] `lib/galaxy/workflow/extract.py`: `step_inputs_by_id` structured branch reads through the resolver instead of assuming a `ToolRequest`. The legacy fallback stays exactly as the extraction plan quarantines it.

### 2.5 Tests
- [ ] Extend `lib/galaxy_test/api/test_workflow_extraction.py`: a workflow-produced ICJ extracts via the structured path (no `ToolRequest` involved) — fidelity parity with the ToolRequest-backed cases already in the extraction plan's matrix.
- [ ] `test/unit/app/managers/test_HistoryGraphBuilder.py`: a workflow-produced item gets a producer edge + input edges from the `WorkflowInvocationStep` payload (parity with the existing `ToolRequest`-backed builder cases).
- [ ] Run after each commit: `tox -e unit -- test/unit/tool_util/test_parameter_convert.py`; `./run_tests.sh -api lib/galaxy_test/api/test_workflow_extraction.py`; `tox -e unit -- test/unit/app/managers/test_HistoryGraphBuilder.py`. (Per project convention: one suite at a time; sandbox escalation needed for the API suite's localhost bind.)

## Files to touch (checklist)

| File | Phase | Scope |
|---|---|---|
| `lib/galaxy/tool_util/parameters/convert.py` / `__init__.py` | 1 | the converter (inverse of `to_workflow_step_state`) |
| `lib/galaxy/tool_util/parameters/request.py` | 1 | reuse shared ref-walk; extend only if necessary |
| `lib/galaxy/workflow/modules.py` (`~2877`, `~2888`) | 1 | feed validated `MappingParameters` fields; instrument |
| `test/unit/tool_util/test_parameter_convert.py`, `parameter_specification.yml` | 1 | converter red-to-green |
| `lib/galaxy/model/__init__.py` (`WorkflowInvocationStep` `:10466`) + alembic | 2 | `request` + `request_state` columns |
| resolver helper (manager) | 2 | the stable seam |
| `lib/galaxy/managers/history_graph.py` (`:301-389`) | 2 | resolve via seam; wire shape unchanged |
| `lib/galaxy/workflow/extract.py` (`step_inputs_by_id`) | 2 | resolve via seam |
| `lib/galaxy_test/api/test_workflow_extraction.py`, `test/unit/app/managers/test_HistoryGraphBuilder.py` | 2 | workflow-produced parity |

## Out of scope (do not pull in)

- **EXEC_STATE**: extracting a shared `ToolExecutionState` model, `Job.execution_state_id`, migrating `tool_request.request`, moving `ToolRequestImplicitCollectionAssociation`, renaming the History Graph node concept. North star — [[USING_TOOL_STATE_DESIGN_OPTIONS]].
- Backfilling old invocations / old jobs. New executions only; read-time legacy fallback owned by [[EXTRACT_TOOL_REQUEST_STATE_PLAN]].
- `linked:false` cross-product modeling — hard-fail here; modeled in [[GRAPH_WORKFLOW_EXTRACTION_PLAN]].
- Any graph/notebook UI — [[GRAPH_WORKFLOW_EXTRACTION_PLAN]].
- **MINT** (minting `ToolRequest` for workflows) and **READ_TIME** (read-time synthesis). Both rejected in favor of **STEP_STATE** — see design-options doc.

## Unresolved questions

- Batch/`linked` totality (nested `list:paired`, multi-input matched) — the gate; resolve in Phase 1.1 before anything else.
- `request_state` enum exact members — proposed `not_validated` / `validated` / `validation_failed`; confirm names + whether a 4th "converter_failed" (converter raised, distinct from meta-model rejection) is worth distinguishing for telemetry.
- Resolver home: a new manager, or extend an existing one (e.g. alongside `history_graph` / extraction service)? It must be importable by both `managers/history_graph.py` and `workflow/extract.py` without a layering inversion.
- `tool_source` snapshot: `ToolRequest` carries a serialized `ToolSourceModel`; **STEP_STATE**'s WIS columns do not. Confirm provenance consumers need only `tool_id`/version (already on the workflow step) and not the source blob — else Phase 2 grows a third column.
- Does any existing consumer assume `ToolRequest` ⇒ validated? Audit before the resolver returns `validation_failed` payloads to History Graph `_extract_inputs` (open question carried from [[PR 21932 - History Graph API]] §6).
- Phase 1/2 commit boundary vs. issue boundary: one issue with two phases, or two issues (Phase 1 lands ahead of the decision regardless)?
