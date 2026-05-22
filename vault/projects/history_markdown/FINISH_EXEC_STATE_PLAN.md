# Finish EXEC_STATE — Implementation Plan

> **Date:** 2026-05-22
> **Branch:** `workflow_state_backfill` (misnomer; ignore the name — no historical backfill, **EXEC_STATE** schema landing).
> **Replaces:** the **STEP_STATE** commit `8e2e9d0197 "Capture workflow tool-step request state"` at the tip. STEP_STATE was a documented stepping stone in [[USING_TOOL_STATE_DESIGN_OPTIONS]]; it will never merge. After this plan lands, rebase so the branch reads as **EXTRACT_TOOL_REQUEST_STATE** ([[EXTRACT_TOOL_REQUEST_STATE_PLAN]]) → **EXEC_STATE** with no STEP_STATE detour.
> **Decision context:** [[USING_TOOL_STATE_DESIGN_OPTIONS]] — **EXEC_STATE** is the north star described there.
> **Predecessor (kept):** [[CAPTURE_WORKFLOW_EXECUTION_STATE_PLAN]] — Phase 1 (the converter, the per-job validation pass, the execute-time instrumentation) is reused verbatim. Phase 2 (the WIS columns + STEP_STATE resolver shape) is what this plan replaces.

---

## Why this exists

[[USING_TOOL_STATE_DESIGN_OPTIONS]] picked **STEP_STATE** as a reversible cheap prefix on the way to **EXEC_STATE**, deferring **EXEC_STATE** because its benefit (uniform `Job → ExecutionState` walk) was gated behind a production data migration of `tool_request.request`. With no historical-data concern on this branch, that gating disappears: we can stand up the **EXEC_STATE** schema directly, write to it for new executions, and accept that historical rows degrade exactly as they do under **STEP_STATE** (resolver returns None → legacy state fallback).

## Settled decisions

- **New value-object table.** `tool_execution_state(id, create_time, update_time, request, state)`. `state` is the capture-validity enum (`not_validated` / `validated` / `validation_failed`) — same enum **STEP_STATE** carried on `WorkflowInvocationStep.request_state`.
- **Three FKs at it.** `ToolRequest.tool_execution_state_id`, `Job.tool_execution_state_id`, `WorkflowInvocationStep.tool_execution_state_id`. All nullable, indexed, `ondelete` is whatever the helper defaults to (consistent with the rest of the schema).
- **Uniform walk for new executions.** New executions of either path (tool-request or workflow tool step) mint one `ToolExecutionState` row and point every applicable FK at it. The resolver walks `Job.tool_execution_state` first; historical rows have NULL and fall back.
- **`ToolRequest.request` stays in place this branch.** Transitional dual source for historical tool-request rows. New tool-request executions write to *both* `ToolExecutionState.request` and `ToolRequest.request` while consumers transition. Dropping the column is a follow-up. (See **Out of scope**.)
- **History Graph public wire shape unchanged this branch.** The node-concept rename off `"tool_request"` / `r`-prefix that [[USING_TOOL_STATE_DESIGN_OPTIONS]] flags as the **EXEC_STATE** public ripple is a separate follow-up; consumers internally route through the resolver as **STEP_STATE** already does. Wire-shape change is one PR's worth of risk on its own.
- **No historical backfill.** Repeat: branch is misnamed. New executions only. Historical `Job.tool_execution_state_id` stays NULL; resolver degrades to `Job.tool_request.request` for historical tool-request rows and to legacy state for historical workflow rows. Identical to **STEP_STATE** today.

## What from the **STEP_STATE** commit survives, verbatim

Phase 1 of [[CAPTURE_WORKFLOW_EXECUTION_STATE_PLAN]] is decision-independent and untouched:
- `from_workflow_execution_state` + `MappedCollectionInput` in `lib/galaxy/tool_util/parameters/convert.py`.
- Whole-step resolution pass + per-job validation in `ToolModule.execute` (`_resolve_execution_state`, `_capture_workflow_tool_request_state`, `_mapped_inputs_from_collection_info`).
- `WorkflowToolRequestState` enum and `_log_workflow_tool_request_state` instrumentation.
- The existing `execute.py:258-260` still persists per-job `job_internal` onto `Job.tool_state` (the existing free leg).

What changes is purely where the **request-level** payload lands and how the resolver finds it.

## Architecture

```
                ┌─────────────────────────────────┐
                │  Phase 1 converter (unchanged)  │
                │  resolved exec state → request_ │
                │  internal + state enum          │
                └────────────────┬────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
   Tool-request mint     Workflow exec       (future: any new
   (services/jobs.py)    (workflow/modules.py executor)
                         _capture…)
              │                  │
              └──────────────────┴── new ToolExecutionState row
                                     │
                ┌────────────────────┼────────────────────┐
                ▼                    ▼                    ▼
        ToolRequest.tes_id     Job.tes_id        WorkflowInvocationStep.tes_id
                │                    │                    │
                └────────────────────┴────────────────────┘
                                     │
                                     ▼
                ┌──────────────────────────────────────┐
                │ Resolver (managers/                   │
                │  workflow_request_state.py)           │
                │ (Job | ICJ) → ToolExecutionState      │
                │ Walks Job.tool_execution_state first; │
                │ falls back to Job.tool_request.request│
                │ for historical tool-request rows;     │
                │ returns None for historical workflow. │
                └──────────────────┬───────────────────┘
                                   │
                       ┌───────────┴───────────┐
                       ▼                       ▼
               History Graph             workflow/extract.py
               (managers/history_graph)  (step_inputs_by_id)
```

## Steps

### 1. Migration — `28885b317f78_add_tool_execution_state.py`

- [x] **DONE.** File renamed from `..._add_workflow_invocation_step_request.py`. Body rewritten: `create_table("tool_execution_state", ...)` (id, create_time, update_time, request JSONType, state String(32) indexed) + nullable `tool_execution_state_id` FK on each of `tool_request`, `job`, `workflow_invocation_step` with index and FK constraint. Down-revision unchanged (`b8d5e2f9a1c7`); revision id unchanged (`28885b317f78`). Uses `build_foreign_key_name` / `build_index_name` (consistent with `0b49ffb1e890`).

### 2. Model — `lib/galaxy/model/__init__.py`

- [ ] Drop `WorkflowInvocationStep.request` / `request_state` (`~10501-10502`) and their attached docstring. Those columns are the **STEP_STATE** shape; **EXEC_STATE** moves the payload onto the new model.
- [ ] Add `ToolExecutionState(Base, RepresentById)` near `ToolRequest` (`~1416`): `id`, `create_time`, `update_time`, `request: Mapped[dict] = mapped_column(JSONType)`, `state: Mapped[Optional[str]] = mapped_column(TrimmedString(32))`. Optional `ToolRequestState`-style enum class for the validity strings (mirrors `ToolRequest.states`) — naming as `ToolExecutionStateValidity` to avoid colliding with the *class* name and the *column* name simultaneously.
- [ ] Add `tool_execution_state_id` + `tool_execution_state` relationship on `ToolRequest`, `Job`, `WorkflowInvocationStep`. `back_populates="tool_requests"` / `"jobs"` / `"workflow_invocation_steps"` on `ToolExecutionState`.
- [ ] **Naming note for reviewers:** `state` on the new model is *capture validity*, deliberately distinct from `ToolRequest.state` (command lifecycle) and `WorkflowInvocationStep.state` (invocation-step lifecycle). State this in the migration docstring (done) and in the model comment.

### 3. Write side — mint a `ToolExecutionState` at execute time

- [ ] **Tool-request path.** Where `ToolRequest` is currently minted (`lib/galaxy/webapps/galaxy/services/jobs.py:265` per the **CAPTURE** plan), also construct a `ToolExecutionState(request=<validated request_internal>, state="validated")`, link `ToolRequest.tool_execution_state = …`, and when the `Job` is spawned set `Job.tool_execution_state` to the same row. Dual-write `ToolRequest.request` for now (still authoritative for historical reads).
- [ ] **Workflow path.** In `ToolModule.execute`'s `_capture_workflow_tool_request_state` (Phase 1, kept): when capture yields a non-None `request_internal` + enum, mint a `ToolExecutionState` and link `WorkflowInvocationStep.tool_execution_state` + every `Job` produced by this step at it. The 1:1 step↔payload invariant **STEP_STATE** Phase 2.2 documented holds — one row per step execution, mapped jobs share it via the Job FK.
- [ ] **Failure path.** When capture fails (`state != "validated"`), still mint a `ToolExecutionState` row with `state="validation_failed"` (or `not_validated`) and link only `WorkflowInvocationStep` at it — Jobs get a NULL FK in that case (no "claim it succeeded" by FK existence). **Open Q:** alternative is to *not* persist a row at all on failure; trade-off is enum-via-presence vs enum-via-row. Both work, pick before write side lands. See unresolved.

### 4. Resolver — `lib/galaxy/managers/workflow_request_state.py`

The seam already exists (the **STEP_STATE** commit lifted it here). Behavior swap:

- [ ] `resolve_structured_request(job=…, icj=…)`: walk `Job.tool_execution_state` first (the new uniform walk). If `tool_execution_state.state == "validated"` → return payload. If `state` is anything else → return None (legacy fallback). The `ToolRequest`-walking branch becomes the **historical** fallback: `Job.tool_execution_state IS NULL` and `Job.tool_request_id IS NOT NULL` → read `ToolRequest.request` (the transitional source).
- [ ] `_workflow_step_resolved` is **deleted** — there is no longer a workflow-specific source. The unification is the whole point of **EXEC_STATE**.
- [ ] Keep `unambiguous_id()` for the ICJ trichotomy rule; it's still needed for `ICJ → Job → ExecutionState` where >1 distinct ExecutionState id means no single producer.
- [ ] `ResolvedStructuredRequest` keeps its `(source, source_id, payload)` shape but `source` enum collapses to `"tool_execution_state"` (and transitionally `"tool_request"` for historical rows). Drop `"workflow_invocation_step"`. `source_id` is `tool_execution_state.id` for new rows.

### 5. Consumers — minimal touch

- [ ] `lib/galaxy/managers/history_graph.py` (`_hda_producers` / `_hdca_producers` / `_fetch_payloads`): the **STEP_STATE** commit added a parallel workflow-step pass for `tool_request_id IS NULL` producers. Collapse the two passes back into one: every producer Job resolves via the seam, no kind-namespaced WIS pseudo-ids. The wire shape literal `"tool_request"` for node type stays *this branch* (transitional); cleanup is the follow-up node-concept-rename PR.
- [ ] `lib/galaxy/workflow/extract.py`: no change required — `step_inputs_by_id` already reads through `resolve_structured_request_payload`. The function's behavior changes implicitly via the resolver swap.
- [ ] `ToolRequestImplicitCollectionAssociation`: **stays this branch.** Repointing collection associations onto `ToolExecutionState` is the natural completion ([[USING_TOOL_STATE_DESIGN_OPTIONS]] flags it as an **EXEC_STATE** consequence) but adds a row-association migration that doesn't pay for itself this branch — defer to the follow-up.

### 6. Tests (rework, not rewrite)

The **STEP_STATE** commit landed ~13 files of test changes (per `8e2e9d0197 --stat`). The bulk is reusable — only the assertions about *where* the payload lives change.

- [ ] `test/unit/tool_util/test_parameter_convert.py` — **unchanged** (converter is Phase 1, decision-independent). 27 cases.
- [ ] `test/unit/workflows/test_modules.py` — the 66 cases stay. The `_capture_workflow_tool_request_state` taxonomy cases keep their enum-outcome assertions; an added integration-style hook proves a `ToolExecutionState` row gets minted at `state=="validated"`.
- [ ] `test/unit/app/managers/test_HistoryGraphBuilder.py` — the 5 **STEP_STATE** red→green cases rewrite to assert `Job.tool_execution_state.request` is the producer's payload (one producer-node code path, not two). The "namespaced collision-free identity" case becomes moot (no longer two id spaces); replace with a "tool-request and workflow-produced collide cleanly on a shared `ToolExecutionState.id`" case if the surface still warrants coverage.
- [ ] `test/integration/test_workflow_invocation.py::test_workflow_tool_step_persists_validated_job_tool_state` — keep verbatim; it exercises Phase 1's per-job leg, which is unchanged.
- [ ] Add: `test_workflow_tool_step_persists_tool_execution_state` (integration) — the workflow-side counterpart, asserting both `WorkflowInvocationStep.tool_execution_state` and `Job.tool_execution_state` are the same non-None row with `state=="validated"` and `request` shaped like `request_internal`.
- [ ] **Drop** the API-suite parity test the **STEP_STATE** plan added then reverted (see Phase 2.5 first item in [[CAPTURE_WORKFLOW_EXECUTION_STATE_PLAN]]). Same logic — its asserted shape doesn't discriminate structured vs legacy. Mechanism-level proof remains a deferred CI/manual sweep.

### 7. Rebase shape (do last, after green)

The current 8 commits ahead of `dev`:

```
8e2e9d0197 Capture workflow tool-step request state          ← STEP_STATE, replace
9f42e2536e Workflow extract: recover tool identity off ToolSource
6fcfc177b2 Workflow extract: tool_request_ids covers queued/grey (#7003)
cedbdd1176 Rebuild schema.
84761a9dcd Workflow extract: tool_request_ids primitive for jobless executions
7c51b8189f Polish extraction: source-neutral structured-state seam + test trim
7e7f3a9074 Use ToolRequest state for workflow extraction
67963b9b40 Tool-source identity: persist tool_id/version/dynamic_tool; slim queue_jobs message
```

Goal: replace `8e2e9d0197` with one or two **EXEC_STATE** commits. Suggested split:

- `EXEC_STATE: extract tool_execution_state model + capture at execution time` (migration + model + Phase 1 carry-over + write side at both call sites + resolver swap).
- `EXEC_STATE: route History Graph and extraction through the unified resolver` (consumer touch + tests).

Or one commit if the diff is coherent — judge after the code lands. The rebase itself is `git rebase -i b8d5e2f9a1c7` plus `--root` is not needed (we're sitting on top of the EXTRACT chain). Force-push only the local branch; nothing public yet.

## Files to touch (checklist)

| File | Status | Scope |
|---|---|---|
| `lib/galaxy/model/migrations/alembic/versions_gxy/28885b317f78_add_tool_execution_state.py` | ✅ done | renamed + rewritten |
| `lib/galaxy/model/__init__.py` | pending | drop WIS request/request_state; add `ToolExecutionState`; add 3 FKs + relationships |
| `lib/galaxy/webapps/galaxy/services/jobs.py:265` (mint site) | pending | dual-write `ToolExecutionState` next to `ToolRequest` |
| `lib/galaxy/workflow/modules.py` (`_capture_workflow_tool_request_state`) | pending | mint `ToolExecutionState`; link WIS + Jobs |
| `lib/galaxy/managers/workflow_request_state.py` | pending | swap to uniform walk; collapse WIS branch |
| `lib/galaxy/managers/history_graph.py` | pending | collapse the two producer passes |
| `lib/galaxy/workflow/extract.py` | no change | already routes via the resolver |
| `test/unit/app/managers/test_HistoryGraphBuilder.py` | pending | rewrite STEP_STATE cases against new walk |
| `test/unit/workflows/test_modules.py` | pending | add row-mint assertion to taxonomy cases |
| `test/integration/test_workflow_invocation.py` | pending | add `..._persists_tool_execution_state` case |

## Out of scope (follow-ups, not this branch)

- **Drop `ToolRequest.request` column** + migrate any consumers still reading it directly off `ToolRequest`. One-shot follow-up once dual-write proves out. Independent migration; independent risk.
- **Repoint `ToolRequestImplicitCollectionAssociation` onto `ToolExecutionState`** ([[USING_TOOL_STATE_DESIGN_OPTIONS]] consequence). Row-association migration; not free.
- **History Graph public wire-shape rename** off `"tool_request"` node type and `r` id prefix. One PR's worth of API-versioning + UI work; deserves its own visibility.
- **`tool_source` snapshot column on `ToolExecutionState`?** [[CAPTURE_WORKFLOW_EXECUTION_STATE_PLAN]] resolved this as "no" — `tool_id`/version on the workflow step suffice for current consumers. Re-resolve if any **EXEC_STATE** consumer disagrees.
- **Historical-row backfill of any kind.** Per user direction: not concerned, never will be. Mentioned only to nail the door shut.

## Unresolved questions

- Mint `ToolExecutionState` on **capture failure** (row with `state="validation_failed"`) or **only on validation success** (failure = no row, no FK)? Trade: row-on-failure makes the schema self-describing and lets History Graph show "we tried, it didn't validate"; no-row-on-failure keeps `state` always == `"validated"` (a presence enum). Default proposal: **always mint**, mirroring `ToolRequest`'s own pattern.
- `ToolRequest.tool_execution_state_id` nullable forever, or eventually NOT NULL post-`tool_request.request`-drop? Probably NOT NULL once historical rows are accepted as "data loss, not concern."
- Rebase as one commit or two (per §7)? Defer until diff is in hand.
- Does any History Graph consumer key on `source == "tool_request"` after the resolver collapse? Audit before swapping the enum literal.
- `ToolExecutionStateValidity` enum class name — bikeshed (`ToolExecutionStatus`, `ExecutionValidity`, …). Pick before model lands.
