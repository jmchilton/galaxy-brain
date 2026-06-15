# Map-Over-Empty Workflow Extraction via Tool Request — Implementation Plan

> **Date:** 2026-05-17
> **Branch:** `extract_issue_followups` (off `graph_workflow_extract`). Depends-on: [[EXTRACT_TOOL_REQUEST_STATE_PLAN]] landed/being the base (the structured converter, shared ref-walk, and the source-neutral `_structured_request_payload` seam this plan extends all live there, commit `a34923b7c9`).
> **Tracking issue:** [#21788](https://github.com/galaxyproject/galaxy/issues/21788) (empty collection → empty workflow); class also covers the #18484 follow-up and the `extract.py:323` "track via tool request model" TODO.
> **Related:**
> - [[EXTRACT_TOOL_REQUEST_STATE_PLAN]] — the gate this builds on
> - [[CAPTURE_WORKFLOW_EXECUTION_STATE_PLAN]] — the *pair*: closes the literal repro by feeding the same seam
> - [[GRAPH_WORKFLOW_EXTRACTION_PLAN]] — consumes the new `tool_request_ids` selection primitive
> - [[QUEUED_EXECUTION_EXTRACTION_TOOL_REQUEST_PLAN]] — the *second use case*: same primitive, queued/running (grey) executions (#7003)
> - `vault/research/Workflow Extraction Issues.md`

---

## At a glance

| | |
|---|---|
| **Problem** | Empty collection → map-over expands to **zero jobs** → job-based extraction has no representative job → step dropped → 0-step workflow (#21788). |
| **Key insight** | The `ToolRequest` is the *abstract step description that exists with zero jobs*. Extraction should source the step from the request, not from jobs. |
| **This plan delivers** | A `tool_request`-sourced extraction path: select by `tool_request_ids`, synthesize the tool step from `ToolRequest.request` + `ToolRequest.tool_source` with **no job**. Closes the #21788 *class* on the async tool-request API path. |
| **This plan does NOT** | Close the literal repro `test_empty_collection_map_over_extract_workflow` — that runs via workflow invocation (no `ToolRequest`). That remainder is [[CAPTURE_WORKFLOW_EXECUTION_STATE_PLAN]], which feeds the *same* seam built here (one function, no re-architecture). |
| **Risk** | Low. Every hard part (structured conversion, ref-walk, source-neutral seam, error mapping) already exists and is tested. New work is selection plumbing + dropping a job-dependency + `ToolSource`→`Tool` reuse. |

---

## Implementation status — SHIPPED (verified 2026-05-17, uncommitted on `graph_workflow_extract`)

| Step | State | Evidence |
|---|---|---|
| Spike (TOOL_FROM_SOURCE) | ✅ | `test_tool_from_persisted_source_drives_workflow_step_state` PASS |
| Schema `tool_request_ids` + `_at_least_one_input` | ✅ | unit + API |
| Validator branch (skip job/output gates; access-check) | ✅ | full ByIds class |
| Jobless extract path + severed `job` dep in `_structured_step_inputs_by_id` | ✅ | headline test PASS |
| Output wiring / chained jobless map-overs | ✅ | `test_extract_chained_empty_map_over_tool_requests_by_ids` PASS |
| Scope boundary (workflow-invocation repro stays red) | ✅ | untouched, SCOPE_TOOL_REQUEST_ONLY held |

**Verification:** unit `99 passed, 1 skipped`; API `TestWorkflowExtractionByIdsApi` `33 passed, 0 failed`; black + isort clean. Headline `test_extract_empty_map_over_tool_request_state_by_ids` (#21788) green; was 500 before.

**Decisions taken during impl (beyond the plan's settled set):**
- **AUTH_ACCESSIBLE.** Implemented owner-only first (least-privilege for a new exposure of full request + tool-source blob), then reverted to **accessibility parity** per the plan's literal wording — `history_manager.error_unless_accessible` on the ToolRequest's history, matching `get_accessible_job` / ICJ-output gating. Shared `_error_unless_tool_request_accessible` helper applied to *both* the direct `tool_request_ids` path and the jobless-ICJ resolution.
- **REJECT_MIXED_PAYLOAD.** `tool_request_ids` combined with `job_ids`/`implicit_collection_jobs_ids` in one payload → **400** (id-spaces `ToolRequest.id` vs `Job.id` aren't comparable for dependency ordering). This *supersedes* the old unresolved "tool-request id wins / assert no overlap" tentative answer — chose hard-reject over silent-partial (boundedness invariant) rather than a dedupe rule.
- Subagent review (S1 auth consistency, S2 sort_key overclaim + mixed-payload guard, S3 `_tool_from_request` docstring) — all addressed.

---

## Verified facts (probe, 2026-05-17 — empirical, not assumed)

A throwaway probe (`tool_request_raw` of `cat1` `Batch` over a genuine empty `list` produced by the `empty_list` tool) established the real behavior on a running server:

1. `tool_request_raw` over an **empty collection returns 200** and **creates a `ToolRequest`** that resolves to a terminal/OK state (`wait_on_tool_request` → `True`).
2. `ToolRequest.request` is preserved intact: `{"input1": {"__class__": "Batch", "values": [{"src": "hdca", "id": <empty hdca>}]}}`. The empty HDCA **still carries its db id** in the payload → the collection-input step and its connection are fully recoverable.
3. `jobs == []` — **zero jobs, no representative job**. Exactly the #21788 condition, reproduced on the tool-request API path (no workflow invocation).
4. `ToolRequest.implicit_collections == [{"src": "hdca", "id": <hdca>, "output_name": "out_file1"}]` — an **empty output HDCA + a `ToolRequestImplicitCollectionAssociation` exist even with zero jobs**. Outputs are resolvable from the request, not jobs.
5. Current `POST /api/workflows/extract` selecting that ICJ → **HTTP 500** (unhandled crash at `ImplicitCollectionJobs.representative_job`, "lowest-order constituent job" over an empty set).
6. The jobless ICJ's `ImplicitCollectionJobs.tool_request` (the helper added in [[EXTRACT_TOOL_REQUEST_STATE_PLAN]], *derived from constituent jobs*) returns **None** — there are no jobs to derive it from. The ToolRequest for a jobless execution is reachable **only** via the output HDCA's `tool_request_association`, or by selecting the `ToolRequest` directly.

Fact 6 is the design pivot.

## Why this exists

#21788 (and the copied/dynamic-collection cluster's "nothing to trace" failures) all share one root: **extraction needs a representative job, and an empty map-over has none.** The whole point of `ToolRequest` ([[EXTRACT_TOOL_REQUEST_STATE_PLAN]]) is that it is the validated abstract description of an execution that exists *before and independent of* jobs. [[EXTRACT_TOOL_REQUEST_STATE_PLAN]] proved structured state can be synthesized from `ToolRequest.request` alone. This plan removes the last job-dependency in that path so a step with **zero jobs** still extracts — turning "0-step workflow" into the correct structurally-complete workflow.

The literal repro is workflow-invocation-produced (no `ToolRequest`); that remainder is owned by [[CAPTURE_WORKFLOW_EXECUTION_STATE_PLAN]]. Critical: because [[EXTRACT_TOOL_REQUEST_STATE_PLAN]]'s `_structured_request_payload(job, icj)` seam is source-neutral (returns a payload dict, not a `ToolRequest` object), capture-state closes the remainder by extending that **one function** to also source `WorkflowInvocationStep` — no re-architecture, no consumer changes. This plan and the capture plan are a pair; this one ships the mechanism + a real slice now.

## Settled decisions

- **SELECT_BY_TOOL_REQUEST.** Add `tool_request_ids` to `WorkflowExtractionByIdsPayload`. A jobless ICJ cannot resolve its request via constituent jobs (fact 6); selecting the `ToolRequest` directly is the only robust primitive and is *also* exactly the reverse `tool_request_id → payload` mapping [[GRAPH_WORKFLOW_EXTRACTION_PLAN]] step 2 needs. One primitive, two plans advanced. (Also handle the convenience case: an HDCA / ICJ whose producer is a jobless tool request resolves through `HistoryDatasetCollectionAssociation.tool_request_association` rather than crashing.)
- **JOBLESS_STEP.** A tool-request work item carries no `Job`. `_structured_step_inputs_by_id` uses `job` *only* to resolve the tool; sever that. Structured state + associations already need only `request_payload` (the seam from [[EXTRACT_TOOL_REQUEST_STATE_PLAN]]).
- **TOOL_FROM_SOURCE.** Resolve the tool from `ToolRequest.tool_source` by reusing the **existing** executor reconstruction — `galaxy.tools.create_tool_from_representation` (`lib/galaxy/tools/__init__.py:471-479`), the same function the celery `queue_jobs` task uses (`lib/galaxy/celery/tasks.py:447-456`, via the `@lru_cache`'d `cached_create_tool_from_representation` `:95-109`). The tool-request path **never reloads the toolbox** — it rebuilds the `Tool` from the persisted blob. Extraction uses the identical path for parity and provenance fidelity (consistent with [[EXTRACT_TOOL_REQUEST_STATE_PLAN]]). Not from a (nonexistent) job, not from the toolbox.
- **VALIDATOR_RELAX.** A tool-request-backed selection is extractable even when it has zero jobs / `populated_state != OK` / no non-empty outputs. The request *is* validated structured state by construction; the job/output gates (`services/workflows.py:290,296`) apply only to job/ICJ-sourced selections.
- **SCOPE_TOOL_REQUEST_ONLY.** Workflow-invocation-produced empty map-overs are explicitly out (no `ToolRequest`); deferred to [[CAPTURE_WORKFLOW_EXECUTION_STATE_PLAN]]. The literal `test_empty_collection_map_over_extract_workflow` stays red (its TODO unchanged) — do **not** fake it green.
- **NO_BACKFILL.** New tool-request executions only; legacy/no-request still uses the quarantined fallback from [[EXTRACT_TOOL_REQUEST_STATE_PLAN]].

## Architecture / seam

```
 POST /api/workflows/extract
   payload.tool_request_ids = [R]                ← NEW selection primitive
        │
        ▼
 _validate_extract_by_ids_payload                ← NEW branch: tool-request
   (services/workflows.py)                         selection skips job/output
        │                                          gates; access-check the
        ▼                                          ToolRequest's history
 extract_steps_by_ids (workflow/extract.py)
   work item = (job=None,
                output_hdcas ← ToolRequest.implicit_collections,
                request_payload ← _structured_request_payload(...))   ← seam, reused
        │
        ▼
 step_inputs_by_id(trans, job=None, request_payload=…)
        │  request_payload is not None → structured path (unchanged dispatch)
        ▼
 _structured_step_inputs_by_id(trans, tool, request_payload)   ← job dependency REMOVED
   tool ← TOOL_FROM_SOURCE(ToolRequest.tool_source)            ← reuse executor recon
   state ← to_workflow_step_state(RequestInternalToolState(payload), bundle)  [exists]
   assoc ← request_internal_input_refs(payload)                              [exists]
        │
        ▼
 WorkflowStep(tool) + data_collection_input(empty hdca, type "list") wired
   outputs (empty HDCA) registered in id_to_output_pair via
   ToolRequest.implicit_collections[*].output_name  → downstream steps still wire
```

The only genuinely new logic is: the `tool_request_ids` selection + validator branch, the jobless work-item construction, and `TOOL_FROM_SOURCE`. Everything below the seam is reused unchanged from [[EXTRACT_TOOL_REQUEST_STATE_PLAN]].

## TOOL_FROM_SOURCE — RESOLVED (spike passing 2026-05-17)

The reconstruction function **already exists and is the production tool-request path** — confirmed by tracing the celery task:

- Write: `lib/galaxy/webapps/galaxy/services/jobs.py:267-273` persists `ToolSourceModel(source=tool.tool_source.to_string(), source_class=type(tool.tool_source).__name__)` onto `ToolRequest.tool_source`.
- Run: the celery `queue_jobs` handler (`lib/galaxy/celery/tasks.py:447-456`) calls `cached_create_tool_from_representation` (`:95-109`, `@lru_cache`) → `galaxy.tools.create_tool_from_representation(app, raw_tool_source, tool_dir, tool_source_class, guid)` (`lib/galaxy/tools/__init__.py:471-479`) → `get_tool_source(...)` → `create_tool_from_source(...)` → a full `Tool` with `.parameters` / `.id` / `.version`. **No toolbox reload, no job.**

Extraction reuses `create_tool_from_representation` directly (OPTION_RECONSTRUCT — the only option that handles uninstalled/dynamic tools and matches the executor for provenance fidelity). OPTION_TOOLBOX (`toolbox.get_tool`) is rejected: the whole point is decoupling from live toolbox state.

**The narrowed residual question — RESOLVED by spike (2026-05-17).** The persisted `ToolSource` model (`model/__init__.py:1402-1408`) stores **only** `source` + `source_class` — **not** `tool_dir` or `tool_id`/`guid`. The celery path supplies those from the *live* tool at request time (`services/jobs.py:281-286`); at extraction time we have only the blob. Spike `test/unit/workflows/test_extract_tool_request_state.py::test_tool_from_persisted_source_drives_workflow_step_state` (PASSING) pins it: a `cat1`-shaped tool reconstructed via `create_tool_from_representation(app, original.tool_source.to_string(), tool_dir=None, tool_source_class="XmlToolSource", guid=None)` yields correct `id`/`version`, non-None `.parameters`, and that bundle drives the exact `_structured_step_inputs_by_id` pipeline (`ToolParameterBundleModel` → `RequestInternalToolState.validate` → `to_workflow_step_state`) to `{"input1": {"__class__": "ConnectedValue"}}`. Independently corroborated by pre-existing `test/unit/app/tools/test_tool_deserialization.py` (XML/YAML reconstruct with no `tool_dir`, `tool.inputs` populated). **`tool_dir=None`/`guid=None` is sufficient for the built-in slice — extract.py is unblocked.** Installed-tool/macro edge (relative file/macro resolution) deferred, not on the built-in path; if it ever bites, fallback options unchanged: (a) `toolbox.get_tool` by source-derived id when installed, (b) typed error (boundedness invariant), (c) persist `tool_dir`/`guid` follow-up.

## Files to touch (checklist)

### `lib/galaxy/schema/workflows.py`
- [ ] Add `tool_request_ids: list[DecodedDatabaseIdField]` to `WorkflowExtractionByIdsPayload` (`:450`), mirroring `job_ids`/`implicit_collection_jobs_ids` field style (`:456,:471`). Doc the semantics: select an execution by its tool request (covers jobless / empty map-over).

### `lib/galaxy/webapps/galaxy/services/workflows.py`
- [ ] `_validate_extract_by_ids_payload` (`:259`): new branch — load each `ToolRequest`, access-check via its `history` (auth like the existing job/ICJ checks), and **skip** the `populated_state == OK` / output-collections gates (`:290,:296`) for tool-request-sourced items. Keep `RequestInternalToWorkflowStateError → RequestParameterInvalidException` mapping (already wired).
- [ ] Thread `payload.tool_request_ids` into `extract_workflow_by_ids`.

### `lib/galaxy/workflow/extract.py`
- [ ] `extract_steps_by_ids`: new work-item source for `tool_request_ids` — `job=None`, `output_hdcas` from `ToolRequest.implicit_collections[*].dataset_collection`, `request_payload` via the existing `_structured_request_payload` (extend it to accept a `ToolRequest` directly, or add a thin `tool_request=`-keyed sibling — keep it the single seam).
- [ ] Sever the `job` dependency in `_structured_step_inputs_by_id`: take a resolved `tool` (or `(tool_id, tool_version, bundle)`) instead of `job`. Tool comes from `TOOL_FROM_SOURCE` for tool-request items, from `toolbox.get_tool(job…)` for job/ICJ items — resolved by the caller, not inside the structured helper. Return contract unchanged.
- [ ] Output wiring: register `id_to_output_pair` from `ToolRequest.implicit_collections[*].output_name` + `dataset_collection` (so a downstream selected step still connects to the empty producer). Guard `representative_job` so a jobless ICJ never reaches it.
- [ ] Convenience resolution: an HDCA/ICJ selected whose producer is a jobless tool request resolves the request via `HistoryDatasetCollectionAssociation.tool_request_association` (don't crash, don't legacy-fallback).

### Model (`lib/galaxy/model/__init__.py`) — likely no schema change
- [ ] Add a read helper if needed: `ToolRequest` → its implicit output HDCAs + names (`ToolRequest.implicit_collections` already gives this; wrap only if it clarifies the call site). No migration.

### Tests — see red-to-green.

## Red-to-green test order

Project convention: red first, then green. One suite at a time; API suite needs the localhost-bind sandbox escalation.

1. **RED — API repro (the headline).** `test/…/api/test_workflow_extraction.py::TestWorkflowExtractionByIdsApi`: produce an empty `list` via the `empty_list` tool, `tool_request_raw` `cat1` `Batch` over it, `POST /api/workflows/extract` with `tool_request_ids=[R]`. Assert the **desired green**: a 2-step workflow — `data_collection_input` (`collection_type == "list"`) + `cat1` tool step (`tool_state == {"input1": {"__class__":"ConnectedValue"}}`), input connected. Currently 500 → fails. (Reuse `_run_tool_request_get_request_and_jobs`, `_assert_collection_extract_state`-style assertions, and the `_icj_id_for_hdca`/`tool_request` helpers already in the file.)
2. **Spike unit test.** `test/unit/tool_util/…` or `test/unit/workflows/test_extract_tool_request_state.py`: `ToolSource(source=…, source_class=…)` reconstructs to a tool whose `parameters` bundle drives `to_workflow_step_state` for a representative tool (`cat1`). Pins `TOOL_FROM_SOURCE`.
3. **GREEN — schema + validator.** `tool_request_ids` field + validator branch. Add a focused service/API test: tool-request selection with zero jobs is accepted (no 400/500 from the job/output gates).
4. **GREEN — jobless extraction path.** `extract_steps_by_ids` tool-request work item + severed `job` dependency in `_structured_step_inputs_by_id`. Makes test 1 green. Add a non-empty tool-request `tool_request_ids` test too (parity with the existing job/ICJ-sourced structured tests — proves the new selection primitive is general, not empty-only).
5. **GREEN — output wiring.** Two-step selection: an empty map-over feeding a downstream tool-request step, both selected by `tool_request_ids`; assert the downstream step connects to the empty producer's output (the #21788 "structure preserved" goal in full).
6. **Regression guard — scope boundary.** Keep `test_empty_collection_map_over_extract_workflow` (workflow-invocation) **red/TODO unchanged**; add a comment-free assertion in the new tests that this path is tool-request-only. Do not green the workflow-invocation repro here.

Run after each: `./run_tests.sh -api lib/galaxy_test/api/test_workflow_extraction.py` and the touched unit files (`tox -e unit -- …`).

## Out of scope (do not pull in)

- Workflow-invocation-produced empty map-overs — [[CAPTURE_WORKFLOW_EXECUTION_STATE_PLAN]] (feeds this same seam).
- Any graph/notebook UI — [[GRAPH_WORKFLOW_EXTRACTION_PLAN]] (consumes `tool_request_ids`).
- `linked:false` cross-product — still hard-fail per [[EXTRACT_TOOL_REQUEST_STATE_PLAN]].
- Removing/altering the legacy HID `extract_workflow` path or the `populated_state` gate for job/ICJ-sourced selections.
- Backfilling old executions.

## Resolved questions

- Does an empty-collection tool request create a usable `ToolRequest`? **Yes** (probe facts 1–4).
- Is a representative job required to synthesize the step? **No** — `to_workflow_step_state` + `request_internal_input_refs` need only `request_payload` ([[EXTRACT_TOOL_REQUEST_STATE_PLAN]]); tool identity comes from `tool_source`.
- How is the request reached for a jobless ICJ? **Not** via constituent jobs (fact 6) — via direct `tool_request_ids` selection or `HDCA.tool_request_association`.
- Does this close the literal #21788 repro? **No** — workflow-invocation, no `ToolRequest`; deferred to the paired capture plan, which reuses this path.
- `TOOL_FROM_SOURCE`: does `tool_dir=None`/`guid=None` from the stored `ToolSource` yield a usable `parameters` bundle + correct `id`/`version`? **Yes for the built-in slice** — spike `test_tool_from_persisted_source_drives_workflow_step_state` PASSING (drives the exact `_structured_step_inputs_by_id` pipeline); corroborated by pre-existing `test_tool_deserialization.py`. extract.py unblocked. Installed-tool/macro edge deferred (not on built-in path).

## Unresolved questions
- `tool_request_ids` ↔ job/ICJ-sourced selections in one payload: dedupe rule when the same execution is referenced both ways? (Probably: tool-request id wins; assert no overlap, mirror the existing duplicate check `services/workflows.py:271`.)
- Empty output HDCA in `id_to_output_pair`: does a downstream step connecting to a known-empty collection input validate in the workflow editor/runner, or does it need a marker? (Test 5 answers empirically.)
- Workflow step label/name for a jobless tool-request step — derive from tool id/version (no job name available); confirm acceptable vs the job-sourced naming.
- Issue boundary: ship as its own PR tracking #21788 (class, tool-request slice) with an explicit "literal repro closes when [[CAPTURE_WORKFLOW_EXECUTION_STATE_PLAN]] lands" note?

## References (in-repo, file:line — read at `extract_issue_followups`)

- Payload schema: `lib/galaxy/schema/workflows.py:450` (`WorkflowExtractionByIdsPayload`), fields `:456,:466,:471`.
- Validator gates to branch around: `lib/galaxy/webapps/galaxy/services/workflows.py:259` (`_validate_extract_by_ids_payload`), `:290` (`populated_state == OK`), `:296` (output-collections-required).
- Extraction seam to extend: `lib/galaxy/workflow/extract.py` `_structured_request_payload`, `step_inputs_by_id`, `_structured_step_inputs_by_id`, `extract_steps_by_ids` (all `a34923b7c9`).
- Reused converters: `to_workflow_step_state` (`lib/galaxy/tool_util/parameters/convert.py`), `request_internal_input_refs` (`lib/galaxy/tool_util/parameters/request.py`).
- `ToolRequest` model + `tool_source`: `lib/galaxy/model/__init__.py:1411-1428`; `ToolSource` model `:1402-1408`; `ToolRequestImplicitCollectionAssociation` `:1430-1444`.
- Tool-source persist: `lib/galaxy/webapps/galaxy/services/jobs.py:267-286`.
- **Tool-from-source reconstruction (the reuse target — found, existing):** `galaxy.tools.create_tool_from_representation` `lib/galaxy/tools/__init__.py:471-479`; celery wrapper `cached_create_tool_from_representation` `lib/galaxy/celery/tasks.py:95-109`; live use in `queue_jobs` `lib/galaxy/celery/tasks.py:447-456`.
- Probe (removed; reproduce from "Verified facts" if needed): `empty_list` tool → empty `list` HDCA → `tool_request_raw` `cat1` `Batch`.
