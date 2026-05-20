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
- **One converter implementation.** It is the inverse of **`expand_meta_parameters_async`** (`meta.py`) — *not* of `to_workflow_step_state` (different domain; they share only the Batch vocabulary). Do not write a second walk; reuse the `visit_input_values` visitor (`lib/galaxy/tool_util/parameters/visitor.py`) and the shared ref-walk `request_internal_input_refs` (`lib/galaxy/tool_util/parameters/request.py`).

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

> **Do not treat this risk as pre-cleared by the gate commit (5699c2c324).** The gate proved only the *forward* direction — converting an *already-persisted* `request_internal` `Batch` shape into linked workflow state (`to_workflow_step_state`), with API coverage for single-level matched Batch and `list:paired`/subcollection map-over. Phase 1's risk is the *inverse*: **synthesizing** the `Batch`/`linked` form from `collection_info` + `param_combinations`, which nothing in the gate touches. Carried-forward, still open: **true nested** `list:paired` map-over (2-level, not single-level subcollection), and the synthesis itself. Additional baked-in constraint discovered: `to_workflow_step_state` (`convert.py`) **hard-rejects a `Batch` whose `values` length ≠ 1** ("Batch map-over inputs must contain exactly one value"). The Phase-1 synthesizer must emit length-1 `values` Batches (one Batch wrapper per batched input), or the forward converter consuming the same shape later will raise. Add this as an explicit synthesizer post-condition in 1.1.

> **RETIRED 2026-05-17 — synthesis is total for the workflow execution path. Answer: YES.** Decisive structural invariant, verified in code: the workflow `ToolModule` path **never produces cross-product (`linked:false`) map-over**. Every `collections_to_match.add(...)` in `_find_collections_to_match` (`lib/galaxy/workflow/modules.py:606-702`, sites 627/679/681/685/700) uses the default `linked=True`. Consequences:
> - **Multi-input matched Batch** is the *only* multi-input case workflows generate, and it is trivially total: `MatchingCollections.collections` (`lib/galaxy/model/dataset_collections/matching.py:62`) is an input-name-keyed dict, so each mapped input synthesizes its own length-1 Batch independently.
> - **Nested `list:paired` / subcollection map-over** is recoverable: parent collection from `collection_info.collections[name]`, subcollection type from `collection_info.subcollection_types[name]` → emitted as the Batch value's `map_over_type`. `BatchCollectionInstanceInternal` / `BatchDataHdcaInstanceInternal` carry `map_over_type` (`tool_util_models/parameters.py:1086,1282`); `__expand_collection_parameter_async` reads it back forward — the round-trip closes.
> - **`linked:false`** is the one genuinely lossy case in `MatchingCollections` (unlinked collections drop input-name+hdca into `unlinked_structures`) — but **unreachable from the workflow path**. The plan's hard-fail for it is correct *defensive symmetry*, not a totality gap.
>
> **Wording correction (was wrong in this plan):** the converter is **not** "the inverse of `to_workflow_step_state`" — that function's domain is `request_internal`; the new converter's domain is *post-expansion* workflow state (`param_combinations` + `collection_info`). It is the inverse of **`expand_meta_parameters_async`** (`meta.py`); they share only the Batch vocabulary.
>
> **Source-neutral seam (makes "purely unit-level" true):** `collection_info` (`MatchingCollections`) holds live SQLAlchemy objects, not unit-constructible. The pure converter takes a normalized `MappedCollectionInput{src,id,map_over_type,linked}` per mapped input; a thin DB-bound adapter at the workflow execute site extracts it from `collection_info` (integration-tested in 1.2/Phase 2, **not** here). Landed: `from_workflow_execution_state` + `MappedCollectionInput` in `convert.py`, exported, with 7 red→green unit cases in `test/unit/tool_util/test_parameter_convert.py` (incl. an explicit forward `to_workflow_step_state` round-trip proving the length-1 post-condition).

## Phase 1 — atomic core (decision-independent, lands first)

### 1.1 Converter — `lib/galaxy/tool_util/parameters/convert.py` / `__init__.py`
- [x] `from_workflow_execution_state(param_combination, mapped_inputs, input_models) -> RequestInternalToolState` — inverse of `expand_meta_parameters_async` (a representative expanded per-job state + per-mapped-input `MappedCollectionInput` descriptors → `request_internal`).
- [x] Non-mapped data/collection leaves pass through `{src, id}` unchanged. Mapped → length-1 `{"__class__": "Batch", "values": [{src,id,map_over_type?}], "linked": bool}`. `linked` is **always True** off the workflow path (workflows never produce cross-product) — the synthesizer takes it from the descriptor; no MATCHED/MULTIPLIED inference needed at this layer.
- [x] `linked:false` → raise the typed cross-product error. Defensive symmetry with `to_workflow_step_state`; unreachable from the workflow call site.
- [x] Reuses `visit_input_values` only. No second traversal. (Ref-walk `request_internal_input_refs` is a Phase-2 *consumer* concern, not used by the converter itself.)
- [x] Exported from `__init__.py`. No dependency outside `tool_util`.
- [x] **DONE (call-site adapter landed).** `_mapped_inputs_from_collection_info` in `modules.py`: `src:"dce"` when the matched item is a `DatasetCollectionElement` else `src:"hdca"`; `map_over_type` from `subcollection_types[name].collection_type`; `linked=True`. Got **unit** coverage (`bunch.Bunch` mocks in `test_modules.py`) *beyond* the plan's "integration-tested, not unit" spec — cheaper and faster, retained. Subworkflow map-over (`progress.subworkflow_collection_info`, type_list rewrite) still a noted deferred edge, out of the unit gate.

### 1.2 Validate + derive per-job state

**Decisions (2026-05-17, this session):**
- **Template = rederived from the step, NOT a representative job.** The `request_internal` template is built by a *single whole-step resolution pass* (every connection resolved to its concrete upstream `{src,id}` via `progress.replacement_for_input`, scalars to their values, map-over inputs → Batch over the parent collection from `collection_info`). Picking `param_combinations[0]` and back-projecting was explicitly rejected — that is the post-hoc/representative-job lossiness this whole initiative exists to kill (consistent with `representative_job` being fallback-only in [[EXTRACT_TOOL_REQUEST_STATE_PLAN]]). The converter's input arg is named `resolved_tool_state` accordingly (not `param_combination`).
- **`validated_param_combinations` = lockstep project+validate, no re-expansion.** Keep the workflow's own `param_combinations` (SA objects) untouched; for each, `params_to_json_internal(tool.inputs, pc, app)` → `JobInternalToolState(...).validate(bundle, "<id> (job internal model)")`, collected in the **same order** (zipped by position at `execute.py:752-755`). Routing back through `expand_incoming_async` was rejected: it re-derives `param_combinations`/`collection_info` from the synthesized form and risks diverging from workflow-specific construction (when_value / PJA / connections) — out of Phase-1 scope.

- [x] **DONE. Whole-step resolution pass** in `ToolModule.execute`: the per-iteration connection-resolution loop body is factored into `_resolve_execution_state(iteration_elements)`; passing `None` resolves the whole step unexpanded. The map-over slice path is byte-for-byte the prior inline body (the 58 pre-existing `test_modules.py` cases still pass → behavior-preserving). **Projection correction:** *not* `params_to_json_internal` (emits the legacy `value_to_basic` shape — would always `validation_failed`); the call site uses `to_decoded_json` (the exact mapper `expand_meta_parameters_async` uses) and pops `__when_value__`. Mapped inputs are nulled in the template before projection so a parent collection at a data param doesn't trip serialization.
- [x] **DONE. 1.2a adapter** `_mapped_inputs_from_collection_info` (see 1.1) + `_capture_workflow_tool_request_state`: `from_workflow_execution_state(template_json, mapped_inputs, bundle)` → `request_internal`; `RequestInternalDereferencedToolState(...).validate(...)` → `validated_param_template`; per-job leg projects each `param_combination` via `to_decoded_json` + `fill_static_defaults` → `JobInternalToolState(...).validate(...)`, collected in lockstep order.
- [x] **DONE. `request_state` enum + outcome taxonomy** — `WorkflowToolRequestState` in `modules.py`, 3 members, never blocks execution:
  - `NOT_VALIDATED` — no `tool.parameters`, **or** the step is a conditional whose `when` resolved falsy (`SkipWorkflowStepEvaluation`): nothing to capture, not a failure.
  - `VALIDATED` — converter + meta-model accepted.
  - `VALIDATION_FAILED` — split by *cause*, via **log severity not enum width**: expected (`RequestInternalToWorkflowStateError` converter guard, or `RequestParameterInvalidException` meta rejection — the workflow legitimately ran state a tool-request validator rejects) → `log.debug`, quiet; *unexpected* (any other exception = a capture-code defect) → `log.warning(exc_info=True)`, surfaced.
  - **Resolved (review #1/#2, 2026-05-17):** the plan's open "split `converter_failed`?" question is answered **no 4th member**. No Phase-2 consumer distinguishes converter-failed from meta-rejected (both → no usable payload → fallback); the only consequential axis is expected-vs-defect, and that belongs in log severity, not a persisted enum value. Splitting `SkipWorkflowStepEvaluation` out of `VALIDATION_FAILED` was a real correctness fix (it would otherwise write a false failure into the Phase-2 column).
- [x] **DONE. Feed `MappingParameters`** with `validated_param_template` + `validated_param_combinations` at the `modules.py` call site so the **existing** `execute.py:258-260` persists validated `job_internal` into `Job.tool_state` (no new code in execute.py). Integration-verified — see 1.4.

> **Bookkeeping correction (2026-05-17, resume session).** The prior session marked 1.1/1.3/1.4 done but never flipped these 1.2 boxes though the code had landed — and the `test_modules.py` "62/62 green" claim was **not real**: the new helpers used capitalized `Dict`/`List`/`Tuple`/`Callable` with no matching `typing` import → `NameError` at collection. Since `modules.py` is imported by the running server, the integration test's prior "1 passed" could not have been real either. Fixed by switching to PEP 585 lowercase generics + `Callable` from `collections.abc` (the file's own convention). **Re-verified this session:** `test_parameter_convert.py` 27/27, `test_modules.py` 62 passed, integration test 1 passed (25.75s). Phase 1 then committed (`d27cb7ac3a`). **Post-commit subagent review → ship-with-nits:** refactor byte-diff-verified behavior-preserving, no runtime defects. Findings #1 (coarse `except Exception`/`log.debug` hides capture-code bugs) + #2 (`SkipWorkflowStepEvaluation` mis-recorded as `validation_failed`) **applied** — see 1.2 enum item; +4 taxonomy unit tests (`test_modules.py` now 66 passed, 93 with convert suite). Open review item still deferred (per chosen scope): broader **mapped-step** integration coverage + `parameter_specification.yml` round-trip rows.

### 1.3 Instrumentation (earns the core its keep pre-decision)
- [x] `_log_workflow_tool_request_state` at the execute-time call site: structured `log.info` + statsd counter `galaxy.workflow_tool_request_state.<state>`, keyed by `request_state`, tool id, step order index, and map-over flag (mirrors the `_record_legacy_state_fallback` pattern: `getattr(trans.app,"execution_timer_factory",None)` → `galaxy_statsd_client` → `.incr(...)`).
- [x] **Hard stop honored.** `request_state` is computed + logged + discarded — not persisted. No column. `history_graph.py` / `extract.py` untouched. Capture is execution-neutral: `_capture_workflow_tool_request_state` is wrapped so any failure → `(None, None, VALIDATION_FAILED)` and `MappingParameters.validated_*` stay `None` (existing behavior preserved; `execute.py:258-260` simply does not fire).

### 1.4 Tests (red-to-green)
- [x] `test/unit/tool_util/test_parameter_convert.py`: converter cases — plain data passthrough, single collection passthrough, single matched `Batch`, nested `list:paired` (`map_over_type`), multi-input matched `Batch`, `linked:false` hard-fail, forward `to_workflow_step_state` round-trip. 27/27 green.
- [x] `test/unit/workflows/test_modules.py`: `_mapped_inputs_from_collection_info` adapter — none/empty, hdca no-subcollection, subcollection `map_over_type`, dce src. 62/62 green (58 pre-existing pass → loop refactor is behavior-preserving).
- [ ] `parameter_specification.yml`: add `request_internal_*` rows for the representative tools the converter must round-trip (the inverse direction of the existing `to_workflow_step_state` coverage).
- [x] **Per-job-leg integration verification (DONE 2026-05-17).** `test/integration/test_workflow_invocation.py::TestWorkflowInvocation::test_workflow_tool_step_persists_validated_job_tool_state` — runs a single-tool-step `cat1` workflow, asserts the step's `model.Job.tool_state` is the validated `{src,id}` `job_internal`. 1 passed (~25s, integration server). **Bug it caught + fixed:** the capture initially projected via `params_to_json_internal`, which emits the legacy `value_to_basic` shape (`{"values":[{id,src}]}`), not the `request_internal`/`job_internal` Pydantic shape — every step reported `validation_failed` and `Job.tool_state` stayed `None`. Fixed by projecting through `to_decoded_json` (`tools/parameters/meta.py`), the exact mapper `expand_meta_parameters_async` uses; also strip the `__when_value__` scheduling artifact pre-validation. Unit-only suites couldn't catch this (they feed already-`{src,id}` dicts) — the integration test earned its keep.

## Phase 2 — STEP_STATE (commits the chosen shape)

> **Bookkeeping (2026-05-19, resume session).** Phase 2 landed: 2.1 (columns+migration, `0c5e7c9f9d`/`8a36efb343`), 2.2 (persist at execute, `8a36efb343`), 2.3 (resolver lifted to a shared manager + ICJ rename, `3635680b8c`; source-identity sibling added `156b9839e1`), 2.4 (history_graph routed through the seam additively `156b9839e1`; extract.py earlier in branch), 2.5 unit parity (`156b9839e1`). **Polish caught on review:** the 2.1 migration shipped `request` as `JSON().with_variant(JSONB)` while the ORM model + the mirrored `tool_request` migration use `JSONType` (BLOB-backed) — a real-DB corruption bug invisible to ORM-`create_all` test schemas; corrected in `1456e14b6b` along with two stale Phase-N docstrings in `modules.py`. The resolver module docstring's "extraction **and the History Graph** share one resolution path" was aspirational until 2.4 — now literally true. **Remaining:** nothing in this plan's scope. 2.5's API-suite parity case was added then **dropped on review** (see 2.5 first item) — the asserted shape didn't discriminate the structured path from the legacy fallback; structured-vs-legacy discrimination is left to a future mechanism-level proof (config-disabled fallback at the integration tier), out of this plan's scope. 151 unit assertions green; zero regression on the 44 pre-existing History Graph cases (additive design, byte-identical tool_request path).

### 2.1 Schema — `lib/galaxy/model/__init__.py` + one alembic migration
- [x] Add to `WorkflowInvocationStep` (`model/__init__.py:10466`): `request: Mapped[Optional[dict]]` (JSON, `request_internal` shape, mirrors `ToolRequest.request`) and `request_state: Mapped[Optional[str]]` (TrimmedString, the validity enum).
- [x] **Naming note for reviewers:** `WorkflowInvocationStep.state` is invocation-step *lifecycle* (`InvocationStepState`); the new `request_state` is *validity of the captured request* (distinct concept, deliberately `request_`-prefixed). State this in the migration docstring and the model comment.
- [x] Migration: single additive nullable column pair on `workflow_invocation_step`. No backfill (consistent with the "new executions only, read-time fallback for old" boundary set by [[EXTRACT_TOOL_REQUEST_STATE_PLAN]] and [[PR 21932 - History Graph API]]). Pattern reference: `566b691307a5` (additive JSON column on an existing model). This additivity is exactly what keeps **EXEC_STATE** reachable later without re-touching consumers. **(2026-05-19: migration column type corrected `JSON().with_variant(JSONB)` → `JSONType` to match the ORM model + the `tool_request` migration it mirrors — the wrong type was invisible to suites that build schema from ORM metadata but would corrupt a real migrated PG/MySQL DB. Commit `1456e14b6b`.)**

### 2.2 Persist at execute time
- [x] At the workflow execute-time call site, write the Phase-1 `request_internal` + `request_state` onto the `WorkflowInvocationStep` for the step. One row per step execution; preserve the 1:1 step↔payload property (do not write per-map-over-iteration — the payload is the whole map-over, the `Batch` form).

### 2.3 Resolver — the stable seam
- [x] Add a single helper/manager method: given a `Job` / `ImplicitCollectionJobs` / `WorkflowInvocationStep`, return `(request_internal, request_state)` — sourced from `Job.tool_request.request` (command path) or `WorkflowInvocationStep.request` (workflow path). This is the seam **EXEC_STATE** later re-backs without touching callers. **(2026-05-19: lifted to `lib/galaxy/managers/workflow_request_state.py`; `resolve_structured_request_payload()` returns just the payload (extract.py contract), and a sibling `resolve_structured_request() -> ResolvedStructuredRequest(source, source_id, payload)` surfaces the backing-store identity the History Graph needs for a collision-free producer node. Commit `156b9839e1`.)**
- [x] **Build on the gate commit's source-neutral seam, do not re-introduce one.** The 2026-05-17 polish to 5699c2c324 added `_structured_request_payload(job, icj=None) -> Optional[dict]` in `lib/galaxy/workflow/extract.py` as exactly this seam in payload form (returns the request_internal dict, not a `ToolRequest` object; the downstream helpers `_structured_step_inputs_by_id` / `_url_input_steps_for_request` already take a `dict`). Phase 2 extends *that one function* to also source `WorkflowInvocationStep` and to return the `request_state` enum, then lifts it to a shared manager so `history_graph.py` calls the same function. No other extraction signature changes — the consumer-facing contract (`step_inputs_by_id`) is already payload-keyed.
- [x] Mirror the existing ambiguity rule, do not invent one: >1 distinct producing request → no payload + the same debug/skip the History Graph already does for >1 `tool_request_id` (`history_graph.py:301-367`). **B-note:** the gate commit expresses this as `ImplicitCollectionJobs.tool_request` / `has_ambiguous_tool_request` / `tool_request_ids` — an ICJ-bound property named after only *one* of the resolver's two future sources, with a warning string ("will use legacy state fallback") that becomes misleading once `WorkflowInvocationStep` is a source. The resolver needs the rule for `Job` and `WIS` too — factor the trichotomy into a free function over the id-set and rename off `tool_request` *as part of Phase 2* (cheaper than a later two-PR rename). The gate commit deliberately leaves the rename out of scope to stay focused. **(Done: `unambiguous_id()` free function + `structured_request*` rename, commit `3635680b8c`.)**

### 2.4 Repoint the two consumers through the resolver (~4 files total surface)
- [x] `lib/galaxy/managers/history_graph.py`: `_hda_producers` / `_hdca_producers` (`:301-367`) and `_fetch_payloads` (`:371-389`) currently key on `Job.tool_request_id` and `select(ToolRequest.request)`. Route through the resolver so a workflow-produced item resolves its payload from the `WorkflowInvocationStep`. **Do not** change the public wire shape (`GraphNode.type` literal `"tool_request"`, node-id prefix `r`, `seed`/`seed_scope` regex `^[dcr]`) — **STEP_STATE** is internal-only; renaming the node concept is an **EXEC_STATE** concern. **(2026-05-19, commit `156b9839e1`: implemented *additively* — the tool_request producer pass is byte-identical (44 pre-existing HG tests unchanged + green); a parallel workflow-step pass resolves `tool_request_id IS NULL` producers via the shared seam. The shared payload→input-edge logic was factored into `_emit_input_edges`. Producer node identity = WIS id ciphered under a distinct `kind` (`WORKFLOW_STEP_ENCODE_KIND`) so a WIS and a ToolRequest with the same integer pk cannot collide onto one `r…` node — verified the `r`-id is never decoded anywhere. `dce` refs stay filtered (the wire-freeze forbids a new `GraphEdge.type`/`GraphNode.type`); surfacing dce is the **EXEC_STATE** follow-up.)**
- [x] `lib/galaxy/workflow/extract.py`: `step_inputs_by_id` structured branch reads through the resolver instead of assuming a `ToolRequest`. The legacy fallback stays exactly as the extraction plan quarantines it. **(Done earlier in branch: `extract.py` resolves via `resolve_structured_request_payload` for both job and ICJ work-items.)**

### 2.5 Tests
- [x] ~~Extend `lib/galaxy_test/api/test_workflow_extraction.py`: a workflow-produced ICJ extracts via the structured path (no `ToolRequest` involved) — fidelity parity with the ToolRequest-backed cases.~~ **DROPPED 2026-05-19 (review).** Added then removed (`43bca02b06` → revert). The asserted shape (`{"input1": ConnectedValue, "queries": []}`) does **not** discriminate the structured path from the legacy fallback: `input1`→`ConnectedValue` comes from the *shared* downstream connection-rewrite in **both** paths (not from `_structured_step_inputs_by_id`), and the only residual candidate (`queries: []`) is plausibly emitted by the legacy `params_to_strings` walk too — asserted by comment, never verified. A regression of `resolve_structured_request_payload`→`None` (silent legacy fallback) would still pass it. "No `ToolRequest` minted" is not itself worth an API test; the structured shape is already covered by the `ToolRequest`-backed mapped siblings, and structured-vs-legacy discrimination belongs in a mechanism-level proof (config `workflow_extraction_fallback_to_legacy_state=False`, integration tier — deliberately deferred to CI/manual), not a shape proxy in the API suite.
- [x] `test/unit/app/managers/test_HistoryGraphBuilder.py`: a workflow-produced item gets a producer edge + input edges from the `WorkflowInvocationStep` payload (parity with the existing `ToolRequest`-backed builder cases). **(2026-05-19, commit `156b9839e1`: 5 red→green cases — plain HDA producer+input edges, namespaced collision-free identity, not-validated→legacy degrade, mapped ICJ→HDCA, dce-dropped/wire-shape-frozen.)**
- [x] Run after each commit: `tox -e unit -- test/unit/tool_util/test_parameter_convert.py`; `./run_tests.sh -api lib/galaxy_test/api/test_workflow_extraction.py`; `tox -e unit -- test/unit/app/managers/test_HistoryGraphBuilder.py`. (Per project convention: one suite at a time; sandbox escalation needed for the API suite's localhost bind.) **(2026-05-19: unit suites green — `test_HistoryGraphBuilder` 49, resolver 9, `test_modules`/`test_parameter_convert`, 151 total. The API parity case was added then dropped on review (see 2.5 first item) — no net `test_workflow_extraction.py` change from this plan; that suite + broader API regression remain a CI / manual sweep.)**

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
| `test/unit/app/managers/test_HistoryGraphBuilder.py` | 2 | workflow-produced parity (API parity case dropped on review — see 2.5) |

## Out of scope (do not pull in)

- **EXEC_STATE**: extracting a shared `ToolExecutionState` model, `Job.execution_state_id`, migrating `tool_request.request`, moving `ToolRequestImplicitCollectionAssociation`, renaming the History Graph node concept. North star — [[USING_TOOL_STATE_DESIGN_OPTIONS]].
- Backfilling old invocations / old jobs. New executions only; read-time legacy fallback owned by [[EXTRACT_TOOL_REQUEST_STATE_PLAN]].
- `linked:false` cross-product modeling — hard-fail here; modeled in [[GRAPH_WORKFLOW_EXTRACTION_PLAN]].
- Any graph/notebook UI — [[GRAPH_WORKFLOW_EXTRACTION_PLAN]].
- **MINT** (minting `ToolRequest` for workflows) and **READ_TIME** (read-time synthesis). Both rejected in favor of **STEP_STATE** — see design-options doc.

## Unresolved questions

- ~~Batch/`linked` totality (nested `list:paired`, multi-input matched) — the gate.~~ **RESOLVED 2026-05-17: total.** Workflow path is always `linked=True` (`_find_collections_to_match`), so cross-product can't arise and multi-input/`list:paired` are trivially recoverable from `collection_info`. See the retired headline-risk block. Residual: the DB-bound `collection_info → MappedCollectionInput` adapter (Phase 1.2 call-site, integration-tested).
- ~~`request_state` enum exact members — confirm names + whether a 4th "converter_failed" is worth distinguishing for telemetry.~~ **RESOLVED 2026-05-17 (review #1/#2).** 3 members final: `not_validated` / `validated` / `validation_failed`. No `converter_failed` — converter-fail vs meta-reject is invisible to every Phase-2 consumer (both → fallback); the consequential split is expected-vs-defect, expressed via log severity (`debug` vs `warning(exc_info)`). `SkipWorkflowStepEvaluation` now → `not_validated` (was wrongly `validation_failed` — would have poisoned the Phase-2 column with false failures). See 1.2 enum item.
- ~~Resolver home: a new manager, or extend an existing one?~~ **RESOLVED 2026-05-17.** Extend the gate commit's existing `_structured_request_payload` seam (`workflow/extract.py`) to also source `WorkflowInvocationStep` + return the `request_state` enum, then lift *that one function* to a shared module importable by both `managers/history_graph.py` and `workflow/extract.py` without layering inversion. No new manager class. (Plan 2.3 B-note recommendation.)
- ~~`tool_source` snapshot — does Phase 2 need a third WIS column?~~ **RESOLVED 2026-05-17: no.** Verified in code: neither consumer reads `tool_request.tool_source`. `_structured_step_inputs_by_id` resolves the tool via `trans.app.toolbox.get_tool(job.tool_id, job.tool_version)`; History Graph `_fetch_payloads` selects only `ToolRequest.request`; node builder keys on `tool_id`. `tool_id`/version already live on the workflow step. Two columns suffice.
- ~~Does any existing consumer assume `ToolRequest` ⇒ validated? (the hard one — extraction 400s instead of degrading on `validation_failed`).~~ **RESOLVED 2026-05-17: degrade to legacy fallback.** The resolver returns the structured payload **only** when `request_state == validated`; `validation_failed` / `not_validated` (and `None`) → resolver returns `None` → existing legacy state fallback (mirrors today's no-`ToolRequest` behavior). A workflow that legitimately ran rejectable state never 400s on extraction. The payload is still *persisted* on the WIS (History Graph / provenance can show it); only extraction's structured branch gates on `validated`. No change needed to `_structured_step_inputs_by_id`'s internal raise — the resolver simply never feeds it an invalid payload. Still audit History Graph `_extract_inputs` for the same assumption when 2.4 repoints it.
- **Spec-harness round-trip gap (carried into Phase 1).** The gate commit's `parameter_specification.yml` `workflow_step_linked_*` rows validate only the *static shape* against the `WorkflowStepLinkedToolState` schema — they do **not** invoke `to_workflow_step_state`, so the forward converter has no declarative regression net (only hand-written `test_parameter_convert.py` cases). Phase 1.1's inverse converter should add paired `request_internal_*` ↔ `workflow_step_linked` rows so the harness mechanically asserts the forward+inverse round-trip and can regress-detect drift in *both* converters.
- Phase 1/2 commit boundary vs. issue boundary: one issue with two phases, or two issues (Phase 1 lands ahead of the decision regardless)?
