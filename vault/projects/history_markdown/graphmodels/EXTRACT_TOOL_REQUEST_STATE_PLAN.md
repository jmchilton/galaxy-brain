# Workflow Extraction from Tool Request State — Implementation Plan

> **Date:** 2026-05-16
> **Branch:** `graph_workflow_extract` — but the seam (`step_inputs_by_id`) lives in #22706; rebase onto / branch from `history_notebook_extract` first. This plan is blocked-by-dependency on #22706 landing (or being the base).
> **Predecessor:** [[ICJ_NATIVE_PLAN]] — this is its "What still requires walking a representative job" section graduated into its own plan.
> **Tracking issue:** TBD (deferred — create later, then backfill this line)
> **Related research:**
> - `vault/research/Problem - YAML Tool Post-Hoc State Divergence.md` (canonical longer-term-direction note; corrected 2026-05-16 with the facts below)
> - `vault/research/Component - Tool State Specification.md`
> - `vault/research/Component - Workflow Extraction Models.md`
> - `vault/research/PR 22706 - Workflow Extraction by IDs.md`
> - `vault/research/PR 21932 - History Graph API.md`

---


## Progress update (2026-05-16, graph_workflow_extract)

Implemented and verified an initial structured extraction slice on `graph_workflow_extract`:

- Added `to_workflow_step_state` in `lib/galaxy/tool_util/parameters/convert.py`, exported it, and added unit coverage for plain data refs, matched Batch refs, `linked:false` failure, and request-ref input-name derivation.
- Added shared request-internal ref walking in `lib/galaxy/tool_util/parameters/request.py`; `HistoryGraphBuilder._extract_inputs` now reuses it.
- Added `ImplicitCollectionJobs.tool_request` / `tool_request_ids` / ambiguity helper.
- Wired `extract_steps_by_ids` / `step_inputs_by_id` to dispatch to structured `ToolRequest.request` state when a single request exists, and to the legacy state path only when no unambiguous ToolRequest exists.
- Added `workflow_extraction_fallback_to_legacy_state: true` to config schema and sample config, plus warning + statsd counter for legacy fallback.
- Mapped structured conversion failures to `RequestParameterInvalidException` from the workflow extraction service.
- Implemented `{src:url}` request leaves as generated `data_input` workflow steps connected to the tool step, with the original URL request stored as a step annotation.
- Added focused unit coverage for fallback-disabled behavior, structured-conversion failures not falling back, ambiguous multi-ToolRequest ICJs, and URL input annotation generation.
- Added by-IDs API coverage for extracting a ToolRequest-backed `{src:url}` input into an annotated `data_input` step wired to the tool parameter.
- Fixed structured extraction for `multiple="true"` data parameters so workflow state uses a single `ConnectedValue` marker while associations create multiple connections under the formal input name. Added unit and by-IDs API regression coverage.
- Added structured fidelity API coverage for ToolRequest-backed repeat data state (`cat1`), scalar `GalaxyUserTool`, and `multiple=true` data `GalaxyUserTool`; these assert the exported workflow `tool_state` shape and invoke the extracted workflow where the workflow runner supports the shape. Discovery: workflow invocations create normal jobs, not new `ToolRequest` rows, so fidelity tests should compare extracted workflow state rather than a non-existent re-run ToolRequest.
- Added extraction-state API coverage for collection-valued YAML tools (`collection_paired_test_y`) and sample-sheet `GalaxyUserTool` (`gx_data_collection_sample_sheet_y`). Discovery: invoking extracted collection-input workflows into YAML/GalaxyUserTool commands currently projects collections as element dicts without the direct tool-request runtime wrapper (`elements`, `collection_type`, `name`), so collection round-trip invocation is a separate workflow-runner/runtime gap, not part of this extraction change.
- Added ToolRequest-backed matched Batch API coverage for a two-input mapped `cat1` request; this exercises the structured ICJ path and asserts both batched inputs retain `ConnectedValue` state and collection-input wiring.
- Added ToolRequest-backed `list:paired` / subcollection map-over API coverage using `collection_paired_structured_like`; this asserts structured ICJ extraction keeps the parent `list:paired` collection input, linked tool state, and correct input connection.
- Added `workflow_step_linked` parameter-spec coverage for multiple data, optional multiple data, repeat data, and sample-sheet collection parameters.

Verified:

- `tox -e unit -- test/unit/tool_util/test_parameter_convert.py` -> 20 passed.
- `tox -e unit -- test/unit/workflows/test_extract_tool_request_state.py` -> 5 passed.
- `tox -e unit -- test/unit/tool_util/test_parameter_specification.py` -> 7 passed.
- `tox -e unit -- test/unit/tool_util/test_parameter_specification_json_schema.py` -> 4 passed.
- `tox -e unit -- test/unit/app/managers/test_HistoryGraphBuilder.py` -> 44 passed.
- `./run_tests.sh -api lib/galaxy_test/api/test_workflow_extraction.py::TestWorkflowExtractionByIdsApi::test_extract_multiple_data_param_by_ids` -> passed (needed sandbox escalation for localhost port binding).
- `./run_tests.sh -api lib/galaxy_test/api/test_workflow_extraction.py::TestWorkflowExtractionByIdsApi::test_extract_src_url_as_annotated_data_input_by_ids` -> passed (needed sandbox escalation for localhost port binding).
- `./run_tests.sh -api lib/galaxy_test/api/test_workflow_extraction.py::TestWorkflowExtractionByIdsApi::test_extract_with_hda_ids` -> passed (needed sandbox escalation for localhost port binding).
- `./run_tests.sh -api lib/galaxy_test/api/test_workflow_extraction.py::TestWorkflowExtractionByIdsApi::test_extract_mapping_workflow_by_ids` -> passed (needed sandbox escalation for localhost port binding).
- `./run_tests.sh -api lib/galaxy_test/api/test_workflow_extraction.py::TestWorkflowExtractionByIdsApi::test_roundtrip_structured_request_state_by_ids` -> passed (needed sandbox escalation for localhost port binding).
- `./run_tests.sh -api lib/galaxy_test/api/test_workflow_extraction.py::TestWorkflowExtractionByIdsApi::test_roundtrip_user_tool_structured_state_by_ids` -> passed (needed sandbox escalation for localhost port binding).
- `./run_tests.sh -api lib/galaxy_test/api/test_workflow_extraction.py::TestWorkflowExtractionByIdsApi::test_roundtrip_user_tool_multiple_data_structured_state_by_ids` -> passed (needed sandbox escalation for localhost port binding).
- `./run_tests.sh -api lib/galaxy_test/api/test_workflow_extraction.py::TestWorkflowExtractionByIdsApi::test_extract_user_tool_sample_sheet_collection_structured_state_by_ids` -> passed (needed sandbox escalation for localhost port binding).
- `./run_tests.sh -api lib/galaxy_test/api/test_workflow_extraction.py::TestWorkflowExtractionByIdsApi::test_extract_yaml_tool_collection_structured_state_by_ids` -> passed (needed sandbox escalation for localhost port binding).
- `./run_tests.sh -api lib/galaxy_test/api/test_workflow_extraction.py::TestWorkflowExtractionByIdsApi::test_extract_matched_batch_tool_request_state_by_ids` -> passed (needed sandbox escalation for localhost port binding).
- `./run_tests.sh -api lib/galaxy_test/api/test_workflow_extraction.py::TestWorkflowExtractionByIdsApi::test_extract_list_paired_batch_tool_request_state_by_ids` -> passed (needed sandbox escalation for localhost port binding).
- `./run_tests.sh -api lib/galaxy_test/api/test_workflow_extraction.py` -> 48 passed, 1 skipped (needed sandbox escalation for localhost port binding).
- `git diff --check` -> passed.

Still pending from this plan:

- None for the current extraction slice. Collection workflow-invocation projection remains a separate workflow-runner/runtime follow-up, not an extraction blocker.

## Why this exists

[[ICJ_NATIVE_PLAN]] made the ICJ the unit of selection but explicitly punted parameter state: `extract_steps_by_ids` is ID-native for *wiring* yet still reconstructs tool parameters via `tool.get_param_values(job)` → `params_from_strings` → legacy `JobParameter` rows (`basic.py`). For YAML / user-defined tools that flat encoding is lossy (collection runtime metadata, comma-separated `collection_type`, `dce` source) — the divergence in [[Problem - YAML Tool Post-Hoc State Divergence]]. The FIXME at `extract.py:620-624` points exactly here.

This plan re-roots the parameter-state source on the **structured `ToolRequest.request`** for executions that have a tool request, and quarantines the legacy `params_from_strings` path behind a config-gated, tested fallback for jobs predating tool requests.

This is the **gate**. Graph→workflow and notebook→workflow UI ([[GRAPH_WORKFLOW_EXTRACTION_PLAN]]) is cart-before-horse until extraction and the History Graph share one structured-state model. After this lands they do — same `ToolRequest.request` parse, one identity space.

## Verified facts (research, 2026-05-16 — read at `dev` / `history_notebook_extract`)

1. **`ToolRequest` model** `lib/galaxy/model/__init__.py:1411-1428`: `request: Mapped[dict]` JSONType (`:1419`), plus `state`, `state_message`; rels `jobs` (ordered Job.id), `implicit_collections`. Job link `Job.tool_request_id` FK (`:1640`), `Job.tool_request` rel (`:1644`).
2. **No `request_state` field on `ToolRequest`.** It exists only on `ToolLandingRequest`/`WorkflowLandingRequest`. The FIXME / Post-Hoc-doc wording "`ToolRequest.request_state` reader" is a misnomer — **the real reader reads `ToolRequest.request`**.
3. **`ToolRequest.request` representation = `request_internal`**: written `services/jobs.py:272` as `tool_request.request = request_internal_state.input_state` after `decode()` (encoded→int ids). **Not dereferenced** — `{src: url, ...}` survives.
4. **Map-over is encoded as a Batch**, not a plain collection ref: `{"__class__":"Batch","values":[{src: hdca|dce, id: N}, …],"linked": bool}`. Model `BatchRequest` `parameters.py:132-137`. Semantics `meta.py:348-372` (`expand_meta_parameters_async`): `linked: true` → MATCHED (zip / normal map-over); `linked: false` → MULTIPLIED (cross-product). Persisted shape: `test_tool_execute.py:172-173`.
5. **ICJ ↔ ToolRequest is 1:1 by construction.** One ToolRequest per mapped execution; all constituent jobs share `Job.tool_request_id` (same object reused `execute.py:256-257`; ICJ created once `:615`; assoc `:772-776`). Rerun makes a *separate* job not added to the original ICJ. Multiple distinct `tool_request_id` on one ICJ only via corruption / manual SQL. **A legitimately-built ICJ is never mixed-era.**
6. History Graph already treats >1 distinct `tool_request_id` for an item as ambiguous (debug + skip producer edge, `history_graph.py:301-367`). Mirror that rule, do not invent a new one.
7. **Convergence point:** History Graph `_extract_inputs` walks `{src,id}` leaves with `boltons.iterutils.remap` — it already descends *into* Batch `values`, so graph edge identity resolves through Batch today. The extractor reuses that ref-walk for *wiring*; the only net-new piece is the `request_internal → workflow_step_linked` *parameter* conversion.

## Settled decisions (this conversation)

- **Source uniformity.** The structured path reads the **ToolRequest** for mapped *and* non-mapped steps. It never reads constituent `Job.tool_state` — for a mapped step that is element-level (wrong granularity). One modern reader.
- **`representative_job` is fallback-only**, and there it is already deterministic (`ICJ.representative_job`, order_index→id, added by #22706). No decision to make; no new selection logic.
- **ICJ still used on the structured path for output bindings only** (`ICJ.output_dataset_collection_instances`, #22706) — not for params.
- **Per-step gate, trichotomy on the step execution's distinct `tool_request_id`:** exactly one → structured; zero → fallback; >1 → ambiguous, mirror History Graph (fallback + warn).
- **Fallback config:** `workflow_extraction_fallback_to_legacy_state`, default `true`, emit a warning + metric when taken. Deprecation arc: default `true` → (years) flip to `false` (hard, specific error when no tool request; never silent-partial) → (later) delete the legacy module + key.
- **Boundedness invariant (load-bearing — bake into the design, not a guideline):**
  - Path chosen **exactly once**, gated **only** on declarative data state (does this step's execution have a single tool request?). **Never** on "structured conversion raised." Structured-present-but-conversion-fails is a bug to fix loudly, not a fallback trigger. This keeps the test matrix at exactly 2 states forever, not 2^N.
  - Single dispatch seam returning the **existing** common type (`WorkflowStep.tool_inputs` + `IdAssociations`). Nothing downstream may branch on which path ran.
  - Legacy isolated to one removable function/module — end-of-life is deleting one seam.
- **`{src: url}` request_internal inputs:** create a `data_input` step with the URL carried in the step **annotation**. The extraction interface does not support this yet — in scope to add minimally (create + annotate the input step).
- **`linked: false` (cross-product map-over):** **hard-fail** workflow construction with a specific error ("cross-product map-over is not modeled by workflow extraction"). Not modeled at this layer; deferred entirely to [[GRAPH_WORKFLOW_EXTRACTION_PLAN]].

## The atomic piece

A new `lib/galaxy/tool_util/parameters/convert.py` sibling (working name `to_workflow_step_state` / `workflowify`): **`request_internal` → `workflow_step_linked`**, using the existing `visit_input_values` visitor.

- Each data / collection leaf (including inside Batch `values`) → `{"__class__": "ConnectedValue"}` (the workflow step input is wired from upstream, never a literal id).
- Scalar / non-data params → pass through their concrete values.
- Batch wrapper → unwrap to the single connected input; assert `linked is True`, else raise (the `linked:false` hard-fail).
- The converter does **not** do wiring. Wiring still comes from the `{src,id}` association walk keyed by `(content_type, original db_id)` → `id_to_output_pair`, exactly as `extract_steps_by_ids` already does — but the association source for structured steps is the `ToolRequest.request` `{src,id}` walk (reuse the History Graph `_extract_inputs` idiom), not `__cleanup_param_values_by_id`. Same `IdAssociations` shape, different source.

## Current state to build on

Reuse as-is:

| File | Reuse |
|---|---|
| `lib/galaxy/workflow/extract.py` (#22706) | `extract_steps_by_ids` skeleton, `_finalize_workflow`, `_original_hda/_hdca`, `IdKey`/`IdAssociations`, ICJ branch (outputs via `ICJ.output_dataset_collection_instances`) |
| `lib/galaxy/managers/history_graph.py` | `_extract_inputs` `{src,id}` remap idiom — lift/share, do not re-implement |
| `lib/galaxy/tool_util/parameters/visitor.py` | `visit_input_values` — the converter's traversal |
| `lib/galaxy/tool_util/parameters/state.py` | `RequestInternalToolState` (read `ToolRequest.request` into it), `workflow_step_linked` ToolState |
| `lib/galaxy/model/__init__.py` | `ImplicitCollectionJobs.representative_job` (#22706), `Job.tool_request` |

Rewrite:

| File | Scope |
|---|---|
| `lib/galaxy/workflow/extract.py` | `step_inputs_by_id` → dispatch: structured branch (ToolRequest.request → converter + ref-walk) vs legacy branch (current body, untouched, quarantined) |
| `lib/galaxy/tool_util/parameters/convert.py` | add the converter |
| `lib/galaxy/tool_util/parameters/__init__.py` | export it |
| `lib/galaxy/webapps/galaxy/services/workflows.py` | surface `linked:false` → `RequestParameterInvalidException`; thread the config flag |
| `lib/galaxy/config` schema + `config/galaxy.yml.sample` | `workflow_extraction_fallback_to_legacy_state: true` + deprecation comment |

Add:

| File | Scope |
|---|---|
| model helper | `ImplicitCollectionJobs.tool_request` (derive via representative job; encode the 1:1-by-construction + >1-ambiguous trichotomy in one place) |
| fallback telemetry | warning + counter when legacy path taken (history_id + step count) |

Delete: nothing now. Legacy path is quarantined, deleted only at end-of-deprecation.

## Files to touch (checklist)

### `lib/galaxy/tool_util/parameters/convert.py` / `__init__.py`
- [x] Implement `to_workflow_step_state(request_internal, parameter_bundle) -> workflow_step_linked dict` via `visit_input_values`.
- [x] Data/collection leaf (incl. Batch `values`) → `ConnectedValue`; scalars pass through.
- [x] Batch: assert `linked is True` else raise a typed error; unwrap to the connected input.
- [x] Export from `__init__.py`.

### `lib/galaxy/managers/history_graph.py` (or a shared util)
- [x] Extract the `_extract_inputs` `{src,id}` remap into a shared helper both History Graph and extraction call (do not duplicate the walk).

### `lib/galaxy/model/__init__.py`
- [x] `ImplicitCollectionJobs.tool_request` property: distinct `tool_request_id` over constituent jobs — exactly one → that ToolRequest; zero → None; >1 → None + a flag/log mirroring History Graph ambiguity.

### `lib/galaxy/workflow/extract.py`
- [x] `step_inputs_by_id` → single dispatch on the step execution's tool request (per-step trichotomy). Structured: read `ToolRequest.request` → `RequestInternalToolState` → converter (tool_inputs) + shared ref-walk (associations). Legacy: existing body, unchanged, behind the flag, only when no tool request.
- [x] `{src: url}` leaf → create `data_input` step, URL into step annotation.
- [x] Keep the return contract `(tool_inputs, IdAssociations)` identical for both branches.

### `lib/galaxy/webapps/galaxy/services/workflows.py`
- [x] Map the `linked:false` raise to `RequestParameterInvalidException` (400) with the specific message.
- [x] Read `workflow_extraction_fallback_to_legacy_state`; when `false` and a step has no tool request, raise a specific error (no silent partial).

### `lib/galaxy/config` + `config/galaxy.yml.sample`
- [x] `workflow_extraction_fallback_to_legacy_state: true`, comment stating deprecation intent + horizon.

### Tests — see red-to-green.

## Red-to-green test order

Per project convention (tests first, then make green).

1. **Commit 1 — RED fidelity matrix.** Covered for the current slice. `lib/galaxy_test/api/test_workflow_extraction.py` now has ToolRequest-backed API coverage for repeat data state (`cat1`), scalar user-tool state (`gx_boolean_user`), multiple-data user-tool state (`gx_data_multiple_user`), collection extraction state (`collection_paired_test_y`, `gx_data_collection_sample_sheet_y`), multi-input matched Batch (`cat1`), and `list:paired` / subcollection map-over (`collection_paired_structured_like`). Data/scalar/multiple-data cases invoke and assert output. Collection cases assert extracted workflow state only because workflow invocation currently projects YAML/GalaxyTool collection inputs differently than direct ToolRequest execution. Do **not** assert a re-run `ToolRequest`: workflow invocation jobs do not create ToolRequest rows today.
2. **Commit 2 — converter unit + spec.** Complete for the current slice. Converter implemented with focused unit tests, `workflow_step_linked` was confirmed already wired in the spec runner, and `parameter_specification.yml` now covers representative linked states for multiple data, optional multiple data, repeat data, and sample-sheet collection parameters. `test_parameter_specification.py` and the JSON-schema mirror are green.
3. **Commit 3 — structured dispatch.** Core implementation complete. The full `lib/galaxy_test/api/test_workflow_extraction.py` API file passes with 48 passed / 1 skipped, including existing basic/mapped ID extraction, structured fidelity API tests for repeat data, scalar user-tool, multiple-data user-tool, collection extraction states, multi-input matched Batch, and `list:paired` / subcollection map-over. `step_inputs_by_id` dispatch + shared ref-walk + `ImplicitCollectionJobs.tool_request`. Legacy path unchanged for no-tool-request jobs.
4. **Commit 4 — fallback flag + telemetry.** Implementation and focused tests complete. Config key, warning/counter, the `false`-flips-to-hard-error path, and the structured-conversion-does-not-fallback invariant are covered.
5. **Commit 5 — `{src:url}` → annotated input step.** Implementation, focused unit test, and by-IDs API coverage complete.
6. **Commit 6 — ambiguous >1 tool_request_id.** Helper behavior and focused unit test complete; mirrors History Graph by returning no ToolRequest and warning.

Run after each: `./run_tests.sh -api lib/galaxy_test/api/test_workflow_extraction.py` and (commits 2) `pytest test/unit/tool_util/test_parameter_specification.py`. Full workflow extraction API file is green for the current slice. E2E sweep (run YAML tool → Extract → run extracted) stays folded into `lib/galaxy_test/selenium/test_custom_tools.py` once the separate collection runtime projection gap is addressed.

## Out of scope (do not pull in)

- Any graph/notebook UI — [[GRAPH_WORKFLOW_EXTRACTION_PLAN]].
- `linked:false` cross-product modeling — hard-fail here, modeled later in the successor plan.
- Removing the legacy HID `extract_workflow` path or the legacy `params_from_strings` branch — quarantine only; deletion is end-of-deprecation.
- Backfilling `Job.tool_state`/tool requests for old jobs — rejected (the only source is the lossy legacy rows; read-time fallback is strictly better).
- Job-display / rerun structured-state convergence — same root ([[Problem - YAML Tool Post-Hoc State Divergence]]) but separate consumers, separate work.

## Resolved questions

- Canonical structured source → `ToolRequest.request` (`request_internal`); `ToolRequest.request_state` does **not** exist.
- Map-over encoding → Batch; `linked:true` map, `linked:false` cross-product (hard-fail here).
- Modern reader granularity → ToolRequest uniformly; never constituent `Job.tool_state`.
- Mixed-era ICJ → impossible by construction; gate is per-step on shared `tool_request_id`.
- Fallback boundedness → gate on `tool_request absent` only, never on conversion failure; single seam; common return type.
- `{src:url}` → annotated `data_input` step. `linked:false` → 400 hard-fail.

## Unresolved questions

- Resolved for current extraction slice: `workflow_step_linked` works for ToolRequest-backed data-repeat, scalar user-tool, multiple-data user-tool, collection extraction state, multi-input matched Batch, and `list:paired` / subcollection map-over.
- Resolved: `workflow_step_linked` is already wired into the `parameter_specification.yml` test runner's `assertion_functions`.
- #22706 merge timing: branch this off `history_notebook_extract` now, or wait for merge to `dev`? The `step_inputs_by_id` seam only exists there.
- `{src:url}` annotation format: free-text URL, or a structured directive the workflow editor/run path can act on? (Determines whether downstream "run" actually re-fetches.)
- Resolved for simple matched Batch and `list:paired` / subcollection map-over: ToolRequest-backed ICJ extraction emits connected state and associations for the batched inputs.
- Workflow invocation of extracted collection-input YAML/GalaxyUserTool steps currently projects collection runtime values differently than direct ToolRequest execution (`inputs.f1.forward` vs `inputs.f1.elements.forward`, missing `collection_type` / `name`). Track as a separate workflow-runner/runtime issue if collection round-trip invocation is required.
- Partially resolved: current implementation emits both a warning log and a statsd counter (`galaxy.workflow_extraction.legacy_state_fallback`). Whether that is sufficient for the eventual default flip still needs product/ops confirmation.

## References (in-repo)

- Seam to modify: `lib/galaxy/workflow/extract.py` `step_inputs_by_id` (on `history_notebook_extract`), FIXME `:620-624`.
- ToolRequest model: `lib/galaxy/model/__init__.py:1411-1428`; `Job.tool_request_id` `:1640`.
- Write path: `lib/galaxy/webapps/galaxy/services/jobs.py:272` (`decode()` → `request_internal`).
- Batch: `lib/galaxy/tool_util_models/parameters.py:132-137`; expansion `lib/galaxy/tools/parameters/meta.py:348-372`.
- Shared ref-walk source: `lib/galaxy/managers/history_graph.py` `_extract_inputs` / `_fetch_payloads:379`.
- Converter infra: `lib/galaxy/tool_util/parameters/convert.py`, `visitor.py`, `state.py`.
- Representative job: `lib/galaxy/model/__init__.py` `ImplicitCollectionJobs.representative_job` (#22706).
