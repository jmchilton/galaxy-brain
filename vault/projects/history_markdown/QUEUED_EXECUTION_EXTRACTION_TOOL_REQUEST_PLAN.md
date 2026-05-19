# Queued-Execution Workflow Extraction via Tool Request — Implementation Plan

> **Date:** 2026-05-17
> **Branch:** off `graph_workflow_extract` (same branch as [[MAP_OVER_EMPTY_EXTRACTION_TOOL_REQUEST_PLAN]]). Depends-on: [[EXTRACT_TOOL_REQUEST_STATE_PLAN]] (structured converter + source-neutral seam) **and** [[MAP_OVER_EMPTY_EXTRACTION_TOOL_REQUEST_PLAN]] (the `tool_request_ids` selection primitive — SHIPPED, verified 2026-05-17, uncommitted).
> **Tracking issue:** [#7003](https://github.com/galaxyproject/galaxy/issues/7003) (2018 — "extract workflow also to include queued jobs"). Identified as the natural second use case for the `tool_request_ids` primitive.
> **Related:**
> - [[MAP_OVER_EMPTY_EXTRACTION_TOOL_REQUEST_PLAN]] — the primitive this reuses (#21788, the *zero-jobs* case)
> - [[EXTRACT_TOOL_REQUEST_STATE_PLAN]] — the structured-state gate both build on
> - [[CAPTURE_WORKFLOW_EXECUTION_STATE_PLAN]] — sibling: same seam, workflow-invocation source
> - [[GRAPH_WORKFLOW_EXTRACTION_PLAN]] — consumes `tool_request_ids`
> - `vault/research/Workflow Extraction Issues.md` (analysis table ties #7003 → ToolRequest)

---

## At a glance

| | |
|---|---|
| **Problem** | Extraction only surfaces *finished* datasets; a **queued / running (grey)** execution has no completed job, incomplete `JobParameter`, no green outputs → job-based tracing finds nothing → the in-flight step is dropped (#7003). |
| **Key insight** | Same root as #21788: extraction needs a representative *completed* job. A `ToolRequest` is the validated abstract description that exists **the moment the request is accepted — before jobs run, regardless of job state**. The `tool_request_ids` primitive ([[MAP_OVER_EMPTY_EXTRACTION_TOOL_REQUEST_PLAN]]) is already job-state-independent. |
| **This plan delivers** | #7003 for the **tool-request execution path**: a queued/running execution selected by `tool_request_ids` extracts a structurally-complete workflow. Mostly *proving + edge-hardening* an already-shipped primitive — small code, high value. |
| **This plan does NOT** | Fix classic (non-tool-request) queued jobs (no `ToolRequest`; legacy by-HID + incomplete `JobParameter` — deferred, mirrors SCOPE_TOOL_REQUEST_ONLY). Does NOT build the "show grey jobs in the selection UI" surface — that is the Vue conversion ([[#17506]]); this is the backend primitive it will consume. |
| **Risk** | Very low. `_tool_request_work_item` provably has **zero job-state dependency** (sources step from `request` + `tool_source` + `implicit_collections`). The headline case likely passes already; risk is concentrated in two named edges (NEW-state request, queued-ICJ convenience parity), both bounded. |

---

## Implementation status — ALL STEPS DONE & VERIFIED (2026-05-17, uncommitted on `extract_issue_followups`)

> Final gate: `TestWorkflowExtractionByIdsApi` **`36 passed, 0 failed`** (33 #21788 + queued headline + chained queued + queued-ICJ); NEW_STATE_POLICY unit `5/5`; workflows unit `104 passed/1 skipped`. Prod code: NEW_STATE_POLICY validator guard + ICJ-branch Reroute (+ optional `sort_key`). Steps 1 & 3 test-only. #21788 committed (`05e4ac7c54`+`ade60f0ff0`); #7003 steps 1–4 uncommitted (deliberate, "commit later").


| Step | State | Evidence |
|---|---|---|
| 1. Headline — queued tool-request execution extracts via `tool_request_ids` | ✅ **GREEN, zero production code change** | `test_extract_queued_tool_request_state_by_ids` PASS; full `TestWorkflowExtractionByIdsApi` `33 passed` same run (no #21788 regression) |
| 2. NEW-state edge (NEW_STATE_POLICY = **Hybrid**) | ✅ DONE | `test_extract_by_ids_validation.py` 5/5; red-proof: 2 reject tests fail w/o guard; workflows unit `104 passed/1 skip`; **API class `34 passed/0 failed`** (no regression) |
| 3. Chained queued | ✅ DONE (test-only, zero prod code) | `test_extract_chained_queued_tool_requests_by_ids` PASS — TR2 reaches `submitted` over TR1's *grey* intermediate collection; 3-step structure forms all-in-flight; **full class `35 passed/0 failed`** |
| 4. QUEUED_ICJ_PARITY (= **Reroute**, decided) | ✅ DONE | reroute + sort_key refinement; `test_extract_queued_tool_request_via_icj_by_ids` PASS; **regression-clean: `matched_batch`/`list_paired` passed with reroute active** (blob-derived ≡ job-derived for real tools); final 36-gate in flight |
| 5. Regression / scope boundary | ✅ | full-class run shows the #21788 + tool-request ICJ baseline holds under the reroute |

### Step 2 — NEW_STATE_POLICY shipped (Hybrid)

Decision: **Hybrid** (your call). A `new`-state tool request is accepted only as a *lone single* selection (1-node workflow, no outputs to wire); rejected with a typed 400 (`"not yet materialized (state 'new')…"`) whenever the payload has >1 request or any other selection — never a silently un-wireable producer (boundedness).

- **Guard:** inline in `_validate_extract_by_ids_payload` (no new abstraction; matches existing inline-branch style). `single_request_only = len(tool_request_ids)==1 and not (hda/hdca/job/icj)`; `state == ToolRequest.states.NEW and not single_request_only → RequestParameterInvalidException`.
- **Determinism:** `new` is an async-celery race (`queue_jobs.delay` flips `new→submitted`; `wait_on_tool_request` skips the window) — not race-free in a plain API test. Resolved by a **deterministic unit test** of the validator decision (`WorkflowsService.__new__` + mocked `trans`/`sa_session`, `model_construct` to skip `DecodedDatabaseIdField`), mirroring the existing `test_extract_tool_request_state.py` unit style. Red→green proven (guard stashed → the 2 reject tests fail; 3 accept controls pass regardless).
- **Lone-`new` e2e** (extracts to a 1-node workflow): covered by construction — the only delta from step 1's proven path is empty `implicit_collections`, already guarded by `if item.output_hdcas:` in the work loop; no extra prod code.

### Step 4 — QUEUED_ICJ_PARITY shipped (Reroute)

Decision: **Reroute** (your call). An ICJ selected by `implicit_collection_jobs_ids` whose output HDCA has a `tool_request_association` is now sourced from the validated request + persisted `tool_source` (`_tool_request_work_item`) **whether or not `icj.jobs` exists** — provenance parity with the direct `tool_request_ids` path; a still-grey ICJ extracts the same way an empty (jobless) one does.

- **Prod change** (`extract_steps_by_ids` ICJ branch): resolve `tool_request` from `output_hdcas[*].tool_request_association` first; if present → `_tool_request_work_item`; elif `icj.jobs` → the unchanged classic `representative_job` path; else → typed error. Classic (non-tool-request) map-overs are **untouched**.
- **sort_key refinement** (the risk I flagged before coding): `_tool_request_work_item` gained an optional `sort_key`; the ICJ caller passes `icj.representative_job.id` when `icj.jobs` exists so the item stays in the **job id-space** for dependency ordering alongside any classic ICJs in the same payload (avoids mixing `ToolRequest.id` vs `Job.id` spaces in one sort). Jobless ICJ keeps `tool_request.id` (unchanged from #21788).
- **Regression-neutrality empirically verified:** `test_extract_matched_batch_*` / `test_extract_list_paired_*` (completed tool-request ICJs, previously job-derived) **passed with the reroute active** — because `request_payload` is byte-identical (`_structured_request_payload(icj)` already resolved to `icj.tool_request` → same `tool_request.request`), and `_tool_from_request` ≡ `_tool_for_job` parameter model for real toolbox tools. The only behavioral delta (`tool_request` set ⇒ `_synthesize_request_input_steps` now also runs) is a no-op here: the `hdca_ids`-created collection steps already occupy `id_to_output_pair`, so synthesis hits the key-collision `continue`.

**Thesis confirmed empirically.** Fact 2/3 (the `tool_request_ids` primitive is job-state-independent) is no longer just code-traced — a `submitted` ToolRequest whose jobs were observed in `queued` state at extraction time produced the exact structurally-complete 2-step workflow (`data_collection_input` list → `cat_data_and_sleep` step, `input1` `ConnectedValue` connected, static `sleep_time` scalar preserved) **with no change to `extract.py` / services / schema**. #7003-on-the-tool-request-path is delivered by the #21788 primitive; remaining work is edges 2–4, all test-only unless an edge surfaces a gap.

**DETERMINISM_MECHANISM — RESOLVED.** Plain-API-test, race-free: tool `cat_data_and_sleep` (yields a structured parameter model even at profile 16.01 — the `profile≥24.x` worry was unfounded for simple params) run via `tool_request_raw` with `sleep_time=60`; `cat` finishes fast but the job is not `ok` until the sleep elapses, so the window between `wait_on_tool_request`==`submitted` and the extract POST is deterministically in-flight (observed `states={'queued'}`). New helper `_submit_tool_request_wait_submitted` = `_run_tool_request_get_request_and_jobs` minus the final `wait_for_jobs`. **No integration-only job config (`delay_job_conf`) needed** — supersedes the step-1 "determinism risk" note and the headline-determinism unresolved question.

**Asserted-shape note (for steps 2–4):** structured extraction of a static scalar param serializes as a **string** in workflow `tool_state` (`sleep_time` → `"60"`, not `60`), and an **omitted** empty `repeat` is absent (no synthesized `queries: []`). Reuse this when writing edge tests.

---

## Code-traced facts (2026-05-17 — read on `graph_workflow_extract`, not assumed)

1. **`ToolRequest.state` ∈ {`new`, `submitted`, `failed`}** (`schema/schema.py:4046`). `new` = validated, not yet processed by celery `queue_jobs` (**no jobs, no `implicit_collections`**). `submitted` = `queue_jobs` materialized jobs **and** `implicit_collections`; jobs may be in any `Job` non-terminal state (`new`/`queued`/`running` — the #7003 "grey"). `failed` = request processing failed.
2. **`_tool_request_work_item` (`workflow/extract.py:631`) has no job-state dependency.** It builds `sort_key=tool_request.id`, `request_payload=_tool_request_payload(tool_request)` (← `tool_request.request`, present from `new`), `tool=_tool_from_request(...)` (← `tool_request.tool_source`, persisted at request time), `output_hdcas=[a.dataset_collection for a in tool_request.implicit_collections]`. **Nothing reads `Job.state`, `representative_job`, or `JobParameter`.**
3. Therefore a **`submitted` request with grey (queued/running) jobs extracts correctly via `tool_request_ids` today** — `implicit_collections` exist (materialized with jobs), so outputs register and downstream wiring works. The #7003 core ask, on the tool-request path, is **already functionally delivered by the #21788 primitive**. (Empirical confirmation = the headline test below; expected GREEN at step 1, possibly with no production code change — like the #21788 chained test.)
4. **`new`-state edge:** a request not yet processed by `queue_jobs` has `implicit_collections == []` → step extracts, but no outputs register → a *single*-step extraction is fine; a *multi*-step extraction cannot wire a downstream step to this producer. Bounded, named edge — see NEW_STATE_POLICY.
5. **Queued-ICJ convenience edge:** a queued execution's `ImplicitCollectionJobs` has **non-empty `icj.jobs`** (jobs exist, just non-terminal), so selecting it by `implicit_collection_jobs_ids` takes the `representative_job` branch (`extract.py:779-790`), **not** the jobless `tool_request_association` branch built for #21788. `icj.representative_job` is the lowest-order constituent job — it *exists* for a queued ICJ (unlike the empty case where `.one()` raised) so it does not crash, but it routes through `_structured_request_payload(icj=icj)` (job→`tool_request`) + `_tool_for_job` (toolbox) rather than the request blob. Whether this path is correct/complete for a queued ICJ, and whether tool-request-backed ICJs should prefer the request path for provenance parity, is QUEUED_ICJ_PARITY (open).
6. **Service validator gates** (`services/workflows.py` `_validate_extract_by_ids_payload`): `implicit_collection_jobs_ids` requires `icj.populated_state == OK` and non-empty output HDCAs; `tool_request_ids` **skips** both (VALIDATOR_RELAX, shipped #21788). So `tool_request_ids` accepts a queued request unconditionally; whether the *ICJ* path's `populated_state == OK` holds for a `submitted`-but-grey map-over is an empirical open (PROBE_POPULATED_STATE).

Fact 3 is the thesis: **#7003-tool-request-path ≈ already done; this plan proves it and hardens facts 4–6.**

## Why this exists

#7003 (2018) and #21788 share one root — *job-based extraction needs a completed representative job*. #21788 attacked the **zero-jobs** instance (empty map-over); #7003 is the **jobs-not-done-yet** instance. The `ToolRequest` is the validated abstract description independent of job existence *or* job state, so the `tool_request_ids` primitive already shipped for #21788 covers #7003 on the tool-request path almost for free. Shipping #7003 here (a) closes a 7-year-old request cheaply, (b) **proves the primitive generalizes** beyond empty-only (the same reason the #21788 plan added a non-empty parity test), and (c) hardens the two real edges (NEW-state, queued-ICJ) before more consumers ([[GRAPH_WORKFLOW_EXTRACTION_PLAN]]) depend on it.

The classic queued-job case (no `ToolRequest`: synchronous `/api/tools`, legacy by-HID, incomplete `JobParameter` until completion — the literal 2018 mechanism) is **out** — it needs the lossy legacy path to tolerate non-terminal state, an unrelated problem. Mirrors SCOPE_TOOL_REQUEST_ONLY from [[MAP_OVER_EMPTY_EXTRACTION_TOOL_REQUEST_PLAN]].

## Settled decisions

- **SCOPE_TOOL_REQUEST_QUEUED.** Deliver #7003 for tool-request-path executions only. Classic/non-tool-request queued jobs (no `ToolRequest`) explicitly deferred; the legacy by-HID + `JobParameter` path is unchanged and still lossy for in-flight classic jobs. Do **not** fake it.
- **REUSE_PRIMITIVE.** No new selection primitive, no new seam. `tool_request_ids` is already job-state-independent (fact 2). Net new code is expected to be: tests + the NEW_STATE_POLICY guard + (pending QUEUED_ICJ_PARITY) possibly a small ICJ-branch refinement. If the headline test is green with zero production change, that is the *expected* outcome, not a gap — assert it and move to edges.
- **UI_OUT_OF_SCOPE.** The literal 2018 ask ("provide jobs still in the queue (grey)" in the selection view) is a *UI* behavior owned by the Vue conversion [[#17506]]/[[PR 21935 - Workflow Extraction Vue Conversion]]. This plan delivers the backend primitive that UI consumes; closing-comment on #7003 frames it accordingly.
- **BOUNDEDNESS.** Any state where a structurally-complete workflow cannot be produced (e.g. NEW with no `implicit_collections` in a multi-step request) must fail with a typed `RequestParameterInvalidException`, never silently emit a disconnected/partial workflow. Inherits the #21788 invariant.

## Open decisions (need a call — see Unresolved)

- **NEW_STATE_POLICY.** A `state == "new"` request has no `implicit_collections` (fact 4). Options: **(A)** accept — extract the single step, no outputs registered (fine for a 1-step extraction, silently lossy for multi-step downstream wiring); **(B)** reject `new` with a typed error ("tool request not yet materialized; retry once submitted") — strict, boundedness-aligned, never lossy; **(C)** synthesize outputs from the tool's *declared* outputs in `tool_source` (most complete, most new code). Leaning **B for multi-request payloads / where a later selected step references this one; A for a lone single-request payload** (a single in-flight step is still a useful 1-node extraction). Decision affects only the validator branch.
- **QUEUED_ICJ_PARITY.** Should selecting a *queued* tool-request-backed ICJ by `implicit_collection_jobs_ids` (non-empty `icj.jobs` → currently `representative_job` branch, fact 5) be rerouted through the `tool_request_association` path for tool-source/provenance parity with `tool_request_ids`, or is the existing `representative_job` + `_structured_request_payload(icj)` branch correct for queued ICJs? Leaning **leave the `representative_job` branch as-is** (it does not crash for queued; `tool_request_ids` is the provenance-faithful primitive and the recommended path) **+ a parity test** documenting the behavioral difference, rather than special-casing. Confirm.

## Architecture / seam

No new seam. Reuses [[MAP_OVER_EMPTY_EXTRACTION_TOOL_REQUEST_PLAN]] end-to-end:

```
 POST /api/workflows/extract
   payload.tool_request_ids = [R]  where ToolRequest R.state == "submitted",
                                    R.jobs all non-terminal (queued/running)
        │
        ▼
 _validate_extract_by_ids_payload   ← VALIDATOR_RELAX already skips the
   (services/workflows.py)            populated_state / output gates for
        │                             tool_request_ids; + NEW_STATE_POLICY guard
        ▼
 extract_steps_by_ids → _tool_request_work_item   ← UNCHANGED (job-state-free)
   request_payload ← R.request ; tool ← R.tool_source
   output_hdcas    ← R.implicit_collections (grey collections — present once submitted)
        │
        ▼
 step_inputs_by_id(tool, request_payload)  →  structurally-complete workflow
   (data_collection_input + tool step, inputs wired) — identical to #21788
```

The only candidate production change is the **NEW_STATE_POLICY guard in the validator** (one branch) and *possibly* a QUEUED_ICJ_PARITY refinement (TBD). Everything else is test-only.

## Files to touch (checklist)

### `lib/galaxy/webapps/galaxy/services/workflows.py`
- [ ] `_validate_extract_by_ids_payload`, `tool_request_ids` loop: add NEW_STATE_POLICY guard per the chosen option (B/A-hybrid leaning) — reject (typed error) a `state == "new"` request when the payload has >1 request or the request is referenced by another selected step; allow a lone single-request `new` extraction (single node, documented lossy-for-downstream). Comment the rationale (no plan reference per repo convention).

### `lib/galaxy/workflow/extract.py`
- [ ] **Likely no change.** Confirm `_tool_request_work_item` handles `submitted`+grey unchanged (fact 2/3). Only touch if QUEUED_ICJ_PARITY decides to reroute the queued-ICJ branch (then: in the `if icj.jobs:` branch at `:779`, when `o.tool_request_association` exists, prefer `_tool_request_work_item` for provenance parity — gated on the decision).

### Tests — see red-to-green. (Expected: mostly green-by-construction; the value is the *proof* + edge coverage, exactly like the #21788 chained test.)

### Model — no change. No migration.

## Red-to-green test order

Project convention: red first. One suite at a time. Reuse the #21788 helpers (`_run_tool_request_get_request_and_jobs`, `_assert_collection_extract_state`-style asserts, `tool_request_id` plumbing) already in `test_workflow_extraction.py::TestWorkflowExtractionByIdsApi`.

1. **Headline — queued tool-request execution. ✅ DONE (GREEN, zero prod code, 2026-05-17).** `test_extract_queued_tool_request_state_by_ids`: `cat_data_and_sleep` `Batch` over a non-empty `list` via `_submit_tool_request_wait_submitted` (no `wait_for_jobs`); asserted jobs grey (`states ⊆ {new,queued,running}`, observed `{queued}`) + `implicit_collections` present, then `tool_request_ids=[R]` → exact 2-step workflow (`data_collection_input` `list` → `cat_data_and_sleep`, `input1` `ConnectedValue` connected, `sleep_time` `"60"`) *while grey*. Fact 3 confirmed empirically; no `extract.py`/service/schema change. Full class `33 passed` same run (no #21788 regression).
   - **DETERMINISM — resolved:** `cat_data_and_sleep` + `sleep_time=60` (job not `ok` until sleep elapses) → deterministic in-flight window in a plain API test; no integration-only job config. See Implementation status block.
2. **NEW-state edge. ✅ DONE (Hybrid, guard + deterministic unit tests, 2026-05-17).** `test_extract_by_ids_validation.py` (5 cases): lone single `new`/`submitted` accepted; `new` among multiple / `new` + other selection → typed 400 (`"not yet materialized"`); multi-`submitted` accepted (no over-reject). Unit-level because `new` is an async-celery race (not race-free in a plain API test); see Step 2 block. API regression re-run in flight.
3. **Chained queued. ✅ DONE (test-only, 2026-05-17).** `test_extract_chained_queued_tool_requests_by_ids`: TR1 grey → TR2 grey mapping over TR1's grey `implicit_collections[0]`; `tool_request_ids=[R1,R2]` → exact 3-step workflow (collection-input → upstream `cat_data_and_sleep` → downstream, `input1` ConnectedValue + `sleep_time` `"60"`), downstream wired to upstream **while all jobs grey**. Empirically confirmed: a tool request **can** map over another's still-grey output collection and reach `submitted` (was the open risk) — the #7003 "preserve structure" goal proven in full. Zero prod code.
4. **QUEUED_ICJ_PARITY = Reroute. ✅ DONE (prod change, 2026-05-17).** `test_extract_queued_tool_request_via_icj_by_ids`: a grey execution selected by `implicit_collection_jobs_ids` → sourced from the request blob (parity with `tool_request_ids`), exact 2-step workflow while grey. **Prod change:** ICJ branch in `extract_steps_by_ids` restructured tool-request-first; `_tool_request_work_item` gained an optional `sort_key` (caller passes `representative_job.id` when `icj.jobs` so ordering stays in the job id-space). **Regression-neutral, empirically verified:** `test_extract_matched_batch_*` / `test_extract_list_paired_*` (completed tool-request ICJs) passed *with the reroute active* — blob-derived ≡ job-derived for real tools because `request_payload` is identical (`tool_request.request`) and only tool-resolution differs. Classic (non-tool-request) ICJs untouched (still `representative_job` branch).
5. **Regression / scope boundary. ✅ DONE.** Full `TestWorkflowExtractionByIdsApi` 36-test class (33 #21788 + queued headline + chained queued + queued-ICJ) green; classic non-tool-request ICJ/job paths unchanged by the reroute.

Run after each: `./run_tests.sh -api lib/galaxy_test/api/test_workflow_extraction.py::TestWorkflowExtractionByIdsApi` (dash `-api`; one path arg — full class shares one server boot) + touched unit files.

## Out of scope (do not pull in)

- Classic / synchronous (non-tool-request) queued jobs — no `ToolRequest`; legacy by-HID + incomplete `JobParameter`. Separate problem.
- The "grey jobs in the selection checklist" UI — [[#17506]] Vue conversion.
- Workflow-invocation in-flight steps — [[CAPTURE_WORKFLOW_EXECUTION_STATE_PLAN]].
- Altering the legacy fallback or the job/ICJ `populated_state` gate for non-tool-request selections.
- `FAILED`-state tool requests (distinct concern; not "queued").

## Resolved questions

- Is a *completed* representative job required for a queued execution's step? **No** — `_tool_request_work_item` reads only `request` + `tool_source` + `implicit_collections` (fact 2); none depend on `Job.state`.
- Does the existing #21788 primitive cover queued executions? **Yes, on the tool-request path** — fact 3 **confirmed empirically** (step 1 GREEN, zero production code; jobs observed `queued` at extraction).
- Does the literal #7003 (UI "grey jobs") get closed here? **No** — backend primitive only; UI is [[#17506]]. Frame the closing comment that way.
- DETERMINISM_MECHANISM: how to hold jobs non-terminal during the extract call, race-free, in a plain API test? **`cat_data_and_sleep` + `sleep_time=60` + `_submit_tool_request_wait_submitted`** (proven step 1; observed `states={'queued'}`). No integration-only config.

## Unresolved questions
- ~~NEW_STATE_POLICY~~ — **RESOLVED: Hybrid** (accept lone single `new`; reject if >1 request or other selection). Shipped step 2.
- ~~QUEUED_ICJ_PARITY~~ — **RESOLVED: Reroute** (your call). When a tool-request-backed ICJ's output HDCA has a `tool_request_association`, prefer `_tool_request_work_item` even when `icj.jobs` is non-empty, for tool-source/provenance parity with `tool_request_ids`. ⚠️ This changes the path for **all** tool-request-sourced ICJ selections, not only queued ones — the #21788 `test_extract_matched_batch_*` / `test_extract_list_paired_*` ICJ tests run via `tool_request_raw` and will switch from job-derived to blob-derived extraction; step 4 must re-verify the full class and reconcile any assertion drift (job-derived vs blob-derived state shape).
- PROBE_POPULATED_STATE: does `icj.populated_state == OK` hold for a `submitted`-but-grey map-over (gates the ICJ convenience path)? Empirical — settle in step 4 or a throwaway probe.
- Issue boundary: own PR tracking #7003, or fold into the #21788 PR as "the primitive also covers queued/running" + cross-link? (Same question shape as the #21788 plan's issue-boundary item.)
- Does a queued *standalone* (non-ICJ) tool-request job selected by `job_ids` resolve `_structured_request_payload(job)` (job.tool_request set at materialization)? Probe / add to step 4 if cheap.

## References (in-repo, file:line — read at `graph_workflow_extract`)

- `ToolRequest` model + lifecycle: `lib/galaxy/model/__init__.py:1411-1444`; state enum `lib/galaxy/schema/schema.py:4046-4049`.
- The reused primitive: `lib/galaxy/workflow/extract.py` `_tool_request_work_item:631`, `_tool_from_request:612`, `_synthesize_request_input_steps:642`, `extract_steps_by_ids:685` (ICJ branch `:773-807`, sort/work loop `:814-869`).
- Validator (VALIDATOR_RELAX + where NEW_STATE_POLICY guard lands): `lib/galaxy/webapps/galaxy/services/workflows.py` `_validate_extract_by_ids_payload`, `tool_request_ids` loop + `_error_unless_tool_request_accessible`.
- Tool-source persist (request-time): `lib/galaxy/webapps/galaxy/services/jobs.py` (ToolSource source/source_class); celery materialization `lib/galaxy/celery/tasks.py` `queue_jobs` (jobs + implicit_collections → `submitted`).
- #21788 tests to mirror: `lib/galaxy_test/api/test_workflow_extraction.py::TestWorkflowExtractionByIdsApi::test_extract_empty_map_over_tool_request_state_by_ids`, `::test_extract_chained_empty_map_over_tool_requests_by_ids`.
- Sibling plan (SHIPPED): [[MAP_OVER_EMPTY_EXTRACTION_TOOL_REQUEST_PLAN]] Implementation status block.
