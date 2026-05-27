# Workflow Extraction — Identify & Label Outputs — Implementation Plan

> **Date:** 2026-05-23
> **Branch:** off `workflow_state_backfill` (after [[HISTORY_GRAPH_UI_INTEGRATION_PLAN]] lands)
> **Tracking issue:** #22709 (umbrella), #17506 (extraction UI modernization); resolves the longstanding gap that workflow extraction has no first-class way to select and label outputs during extraction.
> **Related:**
> - [[HISTORY_GRAPH_UI_INTEGRATION_PLAN]] — same-branch backend prep ([[NotebookEditor]] independent).
> - [[MAP_OVER_EMPTY_EXTRACTION_TOOL_REQUEST_PLAN]] — ships the `tool_request_ids` primitive the payload extends.
> - [[QUEUED_EXECUTION_EXTRACTION_TOOL_REQUEST_PLAN]] — second use case of same primitive.
> - [[CAPTURE_WORKFLOW_EXECUTION_STATE_PLAN]] — `tool_execution_state` capture path.
> - [[NOTEBOOK_EXTRACTION_MVP_PLAN]] — *consumer* of this plan. Notebook MVP sits on top of the primitives shipped here.

---

## At a glance

| | |
|---|---|
| **Problem** | Extracted workflows cannot explicitly expose outputs during extraction. `extract.py` never emits `WorkflowOutput` rows, and the list-extraction UI has no surface for choosing or labeling concrete outputs. Every workflow output must be marked later in the editor. |
| **Key insight** | "Include this tool step" and "expose this produced artifact as a workflow output" are related but distinct user decisions. Extraction needs a first-class, per-output primitive so callers can explicitly select exactly which HDA/HDCA artifacts become workflow outputs. |
| **This plan delivers** | (a) `WorkflowExtractionByIdsPayload` carries explicit `output_labels`; (b) the extractor emits a `WorkflowOutput` row per selected output artifact; (c) the extraction summary annotates every concrete output with its workflow port and suggested label via a reusable 4-tier naming chain; (d) the existing list UI gains a per-output star + rename surface, with stars defaulting off. |
| **Independent value** | The established extraction flow gains precise output-selection infrastructure without changing default behavior: if no outputs are starred/submitted, extraction remains a no-output no-op exactly as today. |
| **Sets up** | [[NOTEBOOK_EXTRACTION_MVP_PLAN]]: report/notebook extraction can pre-star referenced outputs and prefill labels using the same payload instead of duplicating output-marking logic. Future graph-mode extraction UI consumes the same primitive byte-identical. |
| **Risk** | Moderate. The extractor change touches a load-bearing path. The naming chain has four producer-kind branches (Job / ICJ / ToolRequest / TES) with edge cases. All abstractions exist already; this plan composes them. |

---

## Why this exists

Today's extraction story has a quiet structural gap: the user selects which steps go in, the workflow gets created, and then **none of the outputs are marked as workflow outputs**. The user has to open the editor, find the right step, click the output port, mark it as a workflow output, and label it — for every output they care about. That step is invisible in the extraction-flow research notes and tutorials because everyone has internalized it as "what you do after extraction."

The fix should not overload the existing tool-step checkbox. A checked tool row means "include this tool step in the workflow." A starred concrete output means "expose this produced HDA/HDCA as a workflow output." The list-extraction UI should default all output stars off to preserve today's behavior, while richer consumers — especially report/notebook extraction — can pre-star the outputs they know are referenced.

The missing pieces are: (1) a payload field for "expose these specific outputs with these labels," (2) extraction-summary metadata that tells callers which concrete artifacts map to which workflow output ports and what labels to suggest, (3) the extractor honoring the payload, and (4) a UI surface where users can star and label outputs at extraction time instead of after.

This plan is also a precondition for [[NOTEBOOK_EXTRACTION_MVP_PLAN]] — a notebook-driven seed has nothing to populate if the underlying extraction can't accept explicit output selections. Splitting these makes both reviewable in isolation and lets the upstream value land independent of notebook adoption.

## Settled decisions

- **NAMING_CHAIN.** Per-output suggested name resolves to the first of: (a) user-renamed `HDA.name`/`HDCA.name` if diverged from auto-generated runtime name; (b) rendered `ToolOutput.label` via existing `get_output_name(tool, output, params)` (`managers/jobs.py:2091`) when `params` is reachable; (c) raw `ToolOutput.label` template if not renderable; (d) `ToolOutput.name` (port name). Cheetah-template reality of `ToolOutput.label` necessitates the rendered-vs-bare split.
- **OUTPUT_LABELING_PAYLOAD.** Add `output_labels: list[OutputLabelHint]` to `WorkflowExtractionByIdsPayload` (`schema/workflows.py:463`). `OutputLabelHint = {id: DecodedDatabaseIdField, kind: Literal["hda","hdca"], label: str}`. Boundary-validated, sanitized, deduped by `(kind, id)`, and resolved only against outputs produced by selected tool/ICJ/tool-request steps.
- **TOOL_SELECTION_VS_OUTPUT_EXPOSURE.** Tool-row selection and output exposure are separate. Checking a tool includes the step; starring a concrete output exposes that artifact as a workflow output. In the existing history list UI, output stars default off to preserve current behavior. Report/notebook consumers may pre-star known referenced outputs by returning the same summary shape with `exposed=True`.
- **EXTRACTOR_EMITS_WORKFLOW_OUTPUT.** `extract_steps_by_ids` (`workflow/extract.py:700`) gains a post-wire pass that walks `output_labels`, resolves each to its (step, output_name) tuple via the producer mapping already built during extraction, and calls `step.create_or_update_workflow_output(output_name=port, label=hint.label, uuid=None)` (`model/__init__.py:9405`). Idempotent.
- **SUMMARY_ANNOTATES_OUTPUTS.** Add output-level metadata to `WorkflowExtractionOutput` (`schema/workflows.py:309`): `output_name`, `suggested_name`, `suggested_name_source`, and `exposed`. The existing `GET /api/histories/{history_id}/extraction_summary` populates this per concrete output using the new naming-chain helper. This avoids row-level guessing for multi-output tools.
- **FORM_OUTPUT_STAR_AND_RENAME.** Tool rows in `WorkflowExtractionCard.vue` render a star/select control for each concrete output, plus an editable label for starred outputs. Stars default off in history extraction; submit threads only starred outputs into `output_labels`.
- **PORT_GRANULARITY_NOW.** The payload and summary are per-output from v1. The list UI may stay visually compact, but it must target concrete HDA/HDCA outputs rather than a single ambiguous row-level output label.
- **TES_HELPER_PROMOTION.** `_parsed_tool_source_for_tes` (`services/base.py:208`) is currently underscore-private in the target branch. Promote to public (drop leading `_` and re-export from a sensible module) only if the branch being implemented on includes the TES path and the naming-chain helper needs it.

## Architecture / seam

```
POST /api/workflows/extract
  payload:
    job_ids / hdca_ids / tool_request_ids / implicit_collection_jobs_ids / hda_ids   ← existing/branch-dependent
    dataset_names / dataset_collection_names                                         ← existing (input naming)
    output_labels: list[OutputLabelHint]                                             ← NEW explicit output exposure
        │
        ▼
  _validate_extract_by_ids_payload (services/workflows.py)
     - dedup output_labels by (kind, id)
     - sanitize label (strip; 255 max; reject empty)
     - resolve each label target against outputs produced by selected tool/ICJ/tool-request steps
     - reject orphan labels and duplicate workflow-output labels deterministically
        │
        ▼
  extract_steps_by_ids (workflow/extract.py)
     - existing wiring
     - NEW post-wire pass: for each output_label, look up producer + port_name via
       the id_to_output_pair / output_hdcas maps already built; call
       step.create_or_update_workflow_output(output_name=port, label=hint.label, uuid=None)


GET /api/histories/{history_id}/extraction_summary  → WorkflowExtractionSummary
  per concrete tool output:
    output_name: Optional[str]                                                       ← NEW workflow/tool port
    suggested_name: Optional[str]                                                    ← NEW
    suggested_name_source: Optional[SuggestedNameSource]                             ← NEW
    exposed: bool                                                                    ← NEW, false for history UI
        ↑
        │
  managers/workflow_extraction_naming.suggested_output_name(trans, content_id, kind)
     - dispatch by producer kind (Job / ICJ / ToolRequest / TES where available)
     - return SuggestedName via 4-tier chain


WorkflowExtractionForm.vue
  - inputs: existing rename surface, pre-fill from suggested input name (unchanged)
  - tool outputs: NEW star + label field per concrete output
  - history extraction defaults exposed=false; report/notebook extraction may preseed exposed=true
  - submit emits output_labels only for starred/exposed outputs
```

The naming-chain helper is the central reusable abstraction. Consumers in this plan: extraction summary (history) and the notebook MVP plan. Future graph-mode UI hydrates the same way.

## Steps

### 1. Naming-chain helper

- [ ] New `lib/galaxy/managers/workflow_extraction_naming.py` with `suggested_output_name(trans, content_id, content_kind) -> Optional[SuggestedName]`. `SuggestedName = {name: str, source: Literal["renamed", "rendered_label", "bare_label", "port_name"]}`. The source is exposed in the summary as `suggested_name_source` for debugging and future analytics.
- [ ] Four producer-kind resolvers (recipes in §Research Notes below):
    - Regular Job → `JobToOutputDataset*Association` → port name → `tool.outputs[port]` → 4-tier chain.
    - ICJ → `HDCA.implicit_output_name` → representative-job tool → port → chain.
    - Jobless / queued ToolRequest → `HDCA.tool_request_association.output_name` → `_tool_from_request` (`extract.py:618`) → chain.
    - ToolExecutionState (no `ToolRequest`) → promoted `parsed_tool_source_for_tes` → `parse_outputs(app)` → chain.
- [ ] Reuse `get_output_name(tool, output, params)` (`managers/jobs.py:2091`) for the render step. For Job/ICJ paths, use `tool.get_param_values(job, ignore_errors=True)` rather than raw `job.parameters`; skip silently and fall through when params are unavailable.
- [ ] Promote `_parsed_tool_source_for_tes` (`services/base.py:208`) to public only on branches where that helper exists and the TES branch needs it. Update the existing caller in `services/base.py::tool_execution_to_model` when applicable.
- [ ] Unit tests in `test/unit/app/managers/test_workflow_extraction_naming.py`: per producer kind; renamed HDA wins; jobless ToolRequest with no params; port-name fallback; deleted-source-tool edge case (`tool.outputs.get(port_name)` returns None → chain still produces a sensible result via levels c/d).

### 2. Payload extension + validator

- [ ] New `OutputLabelHint` model and `output_labels: list[OutputLabelHint] = Field(default_factory=list, ...)` field on `WorkflowExtractionByIdsPayload` (`schema/workflows.py:463`).
- [ ] Sanitization helper at the API boundary: `_sanitize_output_label(label: str) -> str` — strip, collapse internal whitespace, max-length 255 (matches `WorkflowOutput.label: Unicode(255)` at `model/__init__.py:9616` on the current branch). Reject empty after sanitization with a clear 400.
- [ ] In `_validate_extract_by_ids_payload` (`services/workflows.py`): dedup `output_labels` by `(kind, id)`; reject duplicates with `RequestParameterInvalidException`.
- [ ] Validate each `output_label` id resolves to a concrete output produced by the selected `job_ids`, `implicit_collection_jobs_ids`, and branch-dependent `tool_request_ids`. Do **not** require the output id to appear in `hda_ids`/`hdca_ids`; those are workflow-input selections, not selected tool outputs.
- [ ] Reuse the same original-content normalization as the extractor (`_original_hda` / `_original_hdca`) so copied-history artifacts validate and resolve consistently.
- [ ] Reject duplicate workflow-output labels within the same extraction payload. Do not use last-writer-wins; that would hide user intent and produce editor warnings later.
- [ ] Unit tests: empty-after-sanitize rejection; (kind, id) duplicate rejection; orphan-label rejection; duplicate label rejection; copied-output id resolves through original-content normalization.

### 3. Extractor emits `WorkflowOutput` rows

- [ ] In `extract_steps_by_ids` (`workflow/extract.py:700`): after wiring completes and `id_to_output_pair` is fully populated, iterate `payload.output_labels`. For each `(kind, id)`:
    - Resolve to its (`WorkflowStep`, `output_name`) tuple using the same selected-output resolver used by validation. For HDA: look up the producing job's output_assoc.name. For HDCA: prefer ICJ's `implicit_output_name` or ToolRequest's `output_name`. Use the same producer-precedence the extractor already establishes.
    - Call `step.create_or_update_workflow_output(output_name=port, label=hint.label, uuid=None)` (`model/__init__.py:9405` on the current branch). Idempotent — safe under re-extraction.
    - Treat unresolved ids as defensive errors, not warnings. The validator should catch these before extraction; if extraction still cannot resolve one, raise a clear request error rather than silently creating a partial workflow.
- [ ] Keep `WorkflowOutput.label` unique per extracted workflow by rejecting duplicate labels at the validator boundary. This is distinct from `step_labels` (`extract.py:173`), which dedups *workflow step* labels and is unrelated to output labels.
- [ ] API tests in `lib/galaxy_test/api/test_workflow_extraction.py`:
    - `test_extract_with_output_labels_marks_workflow_outputs` — extract with `output_labels` → assert workflow has `WorkflowOutput` rows with the requested labels and correct `output_name` per step.
    - `test_extract_output_label_for_icj_step` — ICJ producer path.
    - `test_extract_output_label_for_tool_request_step` — jobless ToolRequest path (uses [[MAP_OVER_EMPTY_EXTRACTION_TOOL_REQUEST_PLAN]]'s fixtures).
    - `test_extract_duplicate_output_label_rejected` — validator boundary.
    - `test_extract_output_label_unicode_truncation` — sanitization.
    - `test_extract_with_empty_output_labels_matches_existing_behavior` — empty/missing `output_labels` emits no `WorkflowOutput` rows.

### 4. Extraction summary suggests names

- [ ] Add output-level fields to `WorkflowExtractionOutput` (`schema/workflows.py:309`):
    - `output_name: Optional[str] = None` — workflow/tool output port, e.g. `out_file1`.
    - `suggested_name: Optional[str] = None`.
    - `suggested_name_source: Optional[Literal["renamed", "rendered_label", "bare_label", "port_name"]] = None`.
    - `exposed: bool = False` — default star state for this output.
- [ ] Extract a `_synthesize_input_row(...)` helper from the inline branches in `create_workflow_extraction_summary` (`services/histories.py:824`) — currently the `FakeJob` branch and the `not tool.is_workflow_compatible` branch each build `WorkflowExtractionJob` rows of input-shape inline. Lifting the helper makes it callable from [[NOTEBOOK_EXTRACTION_MVP_PLAN]]'s cross-history input synthesis. Caller behavior unchanged; pure refactor.
- [ ] In `create_workflow_extraction_summary`: for each concrete output on tool-step rows, resolve `output_name`, call `suggested_output_name(trans, ...)`, and populate output-level metadata. For non-tool/input rows, leave output-level fields at defaults; input naming stays on the existing `dataset_names` / `dataset_collection_names` path.
- [ ] History list extraction defaults `exposed=False` for every output. Report/notebook summary producers may set `exposed=True` for outputs explicitly referenced by the source report/page.
- [ ] Performance: batched resolve where the same tool produces multiple selected outputs — single toolbox lookup. Profile threshold ~50 jobs; v1 ships per-row, optimize on data if needed.
- [ ] API test: `test_extraction_summary_includes_output_suggestions` — fixture history with mixed Job / ICJ producers → assert each tool output has `output_name`, `suggested_name`, and `suggested_name_source` where resolvable.
- [ ] Regression test: `test_extraction_summary_output_exposed_defaults_false` — history extraction never pre-stars outputs.
- [ ] Regression test: `test_extraction_summary_response_shape_unchanged_for_old_fields` — old fields remain present; new output-level fields default to `None`/`False` when the chain produces no hit.

### 5. Form output-star + rename surface

- [ ] In `client/src/components/History/WorkflowExtraction/types.ts`: extend output items with local UI state derived from summary metadata: `exposed: boolean`, `outputLabel: string`, and `outputName: string | null` (or use generated schema keys directly if naming is already ergonomic).
- [ ] In `WorkflowExtractionCard.vue`: tool rows render a star/select control for each concrete output. Starred outputs show an editable output-label field pre-populated from `suggested_name || name || output_name`. Unstarred outputs do not submit labels.
- [ ] In `WorkflowExtractionForm.vue`: maintain output exposure/label state on the concrete output objects in `jobsList`; thread starred outputs into the submit payload as `output_labels: [{id, kind, label}]`, where `kind` derives from `history_content_type` (`dataset` → `hda`, `dataset_collection` → `hdca`).
- [ ] UI rules:
    - History extraction initializes every output with `exposed=false`.
    - If a tool row is unchecked, its output stars are disabled or cleared and no labels are submitted for that row.
    - Deleted outputs are not star-selectable by default.
    - A starred output requires a non-empty sanitized label; default the field to `suggested_name || output.name || output_name` when the star is first enabled.
    - Unstarring an output preserves the draft label locally but omits it from `output_labels`.
- [ ] Vitest in `WorkflowExtractionForm.test.ts`:
    - Tool outputs render star controls with all stars off for history extraction.
    - Starring an output reveals/prefills the label field.
    - Submit POSTs `output_labels` only for starred outputs.
    - Unchecked tool rows do not submit starred outputs.
    - Empty label on a starred output disables submit or shows validation error.
    - **Regression:** when no outputs are starred and the user submits with everything else at defaults, the POST body equals the pre-plan body byte-for-byte except for omission/presence of an empty optional `output_labels` field.
- [ ] Selenium hook: `data-output-star` and `data-output-label` attributes on each concrete output row; one selenium assertion in `lib/galaxy_test/selenium/test_workflow_extraction.py` that starring + labeling an output flows through to the created workflow.

### 6. Verify

- [ ] `tox -e unit -- test/unit/app/managers/test_workflow_extraction_naming.py`
- [ ] `./run_tests.sh -api lib/galaxy_test/api/test_workflow_extraction.py` (regression + new `output_labels` cases)
- [ ] `./run_tests.sh -selenium lib/galaxy_test/selenium/test_workflow_extraction.py -k output_label` (the new E2E hook)
- [ ] Manual demo: extract a small workflow with two tool steps; leave all stars off and confirm no workflow outputs are created; repeat with one starred/renamed output and confirm the editor marks exactly that `WorkflowOutput` with the chosen label.

## Files to touch

| File | Step | Scope |
|---|---|---|
| `lib/galaxy/managers/workflow_extraction_naming.py` | 1 | new — 4-tier name resolver per producer kind |
| `lib/galaxy/webapps/galaxy/services/base.py` | 1 | branch-dependent: promote `_parsed_tool_source_for_tes` to public only if TES naming path exists |
| `lib/galaxy/schema/workflows.py` | 2, 4 | `OutputLabelHint`; `output_labels` on payload; output-level `output_name` / `suggested_name` / `suggested_name_source` / `exposed` on summary outputs |
| `lib/galaxy/webapps/galaxy/services/workflows.py` | 2 | sanitization + dedup + orphan-label validator |
| `lib/galaxy/workflow/extract.py` | 3 | post-wire pass emitting `WorkflowOutput` rows |
| `lib/galaxy/webapps/galaxy/services/histories.py` | 4 | populate output-level port, suggested-name, and exposed metadata in summary |
| `client/src/components/History/WorkflowExtraction/types.ts` | 5 | output-level exposure and label UI state |
| `client/src/components/History/WorkflowExtraction/WorkflowExtractionCard.vue` | 5 | per-output star + label affordance on tool rows |
| `client/src/components/History/WorkflowExtractionForm.vue` | 5 | output exposure/label state + submit threading |
| `client/src/api/histories.ts` | 5 | `extractWorkflowByIds` payload type extension |
| `client/src/api/schema/index.ts` | 2, 4 | regenerated |
| `test/unit/app/managers/test_workflow_extraction_naming.py` | 1 | new |
| `lib/galaxy_test/api/test_workflow_extraction.py` | 3, 4 | `output_labels` + summary cases |
| `client/src/components/History/WorkflowExtractionForm.test.ts` | 5 | output star + rename flow |
| `lib/galaxy_test/selenium/test_workflow_extraction.py` | 5 | E2E star + label round-trip |

## What this sets up for downstream

- **[[NOTEBOOK_EXTRACTION_MVP_PLAN]]:** the notebook MVP becomes a thin layer — page scan + backward closure + `GET /api/pages/{id}/workflow_extraction_summary` endpoint that returns the *same* summary shape with report-referenced outputs preseeded as `exposed=True` and `suggested_name` populated by this plan's helper.
- **Graph-mode extraction UI (guerler's future work):** hydrates suggested labels from `extraction_summary`; submits `output_labels` via the same primitive. Byte-identical payload as the list UI.
- **PageAssistantAgent integration (future):** an agent can propose output labels via the same payload, no agent-specific surface.

## Out of scope

- Auto-exposing outputs in the history list UI. Stars default off; explicit output exposure is opt-in for this surface.
- Backfilling `WorkflowOutput` for legacy extracted workflows (never).
- Modifying the input naming path (`dataset_names` / `dataset_collection_names` — unchanged).
- The legacy HID-based `extract_workflow` from `/api/histories/{history_id}/extract_workflow` — payload doesn't gain `output_labels`. New ID-based endpoint only.
- Workflow output uuid stability across re-extractions (fresh each time — simplest).

## Confirmed assumptions / remaining checks

- Multi-output tool default exposure: history extraction stars none by default. Users explicitly star the outputs they want; report/notebook extraction may pre-star referenced outputs.
- Empty `output_labels` payload: backwards-compatible no-op (no `WorkflowOutput` rows emitted, behavior matches today). This is the default path for history extraction when no stars are selected. Confirm in test.
- Form supports exposing an output without manually renaming. Starring an output initializes its label from `suggested_name || output.name || output_name`; the user may leave that label as-is.
- Sanitization helper colocation: keep in `services/workflows.py` at the API boundary. The naming manager suggests labels; the validator polices submitted labels.
- Remaining check: `suggested_name` for tool steps whose tool is no longer installed (`tool_id` resolves to None). Level-a `HDA.name` / `HDCA.name` should still be available because it is model data; confirm in unit test.

## Research Notes — Output naming chain

Folded from research conducted 2026-05-23 (originally for [[NOTEBOOK_EXTRACTION_MVP_PLAN]]; promoted here as the primitives' home).

### Why the original 3-tier proposal needed adjustment

The first-draft chain was `ToolOutput.label` → `ToolOutput.name` → `HDA.name`. Two issues:

1. **`ToolOutput.label` is a Cheetah template, not a finished string** (`tool_util/parser/output_objects.py:53,69,196`). Example: `${tool.name} on ${on_string}`. Rendering needs runtime `params` / `on_string`, which aren't always reachable — particularly for jobless ToolRequest producers.
2. **The current extractor never creates `WorkflowOutput` rows** (`extract.py:179–202, 747–755`). The `dataset_names` / `dataset_collection_names` payload fields only label synthesized `data_input` / `data_collection_input` *input* steps. This plan is what fixes that.

### Final chain (decision NAMING_CHAIN)

1. **User-renamed `HDA.name` / `HDCA.name`** when diverged from the auto-generated runtime name. Strongest signal of user intent.
2. **Rendered `ToolOutput.label`** via `get_output_name(tool, output, params)` (`managers/jobs.py:2091`, wrapping `DefaultToolAction.get_output_name` at `tools/actions/__init__.py:1076`). Used when `params` is reachable.
3. **Bare `ToolOutput.label`** template if not renderable. Still human-authored.
4. **`ToolOutput.name`** (port name like `out_file1`). Guaranteed present.

### Resolution recipes by producer kind

All recipes assume the referenced HDA/HDCA id is access-checked.

**(a) Regular finished Job — HDA output:**
```python
hda = sa_session.get(HistoryDatasetAssociation, hda_id)
original = _original_hda(hda)                                # extract.py:1078 pattern
assoc = next(a for a in original.creating_job_associations
             if not _skip_output_assoc_name(a.name))
job, port_name = assoc.job, assoc.name
tool = trans.app.toolbox.tool_for_job(job, user=trans.user)  # tools/__init__.py:692
tool_output = tool.outputs.get(port_name)
params = tool.get_param_values(job, ignore_errors=True)
return _apply_chain(hda=original, tool_output=tool_output, port_name=port_name, params=params)
```

**(b) ICJ-produced HDCA (map-over):**
```python
hdca = _original_hdca(sa_session.get(HistoryDatasetCollectionAssociation, hdca_id))
port_name = hdca.implicit_output_name                        # model:8110 canonical
icj = hdca.implicit_collection_jobs
rep_job = icj.representative_job
tool = trans.app.toolbox.tool_for_job(rep_job, user=trans.user)
tool_output = tool.output_collections.get(port_name) or tool.outputs.get(port_name)
params = tool.get_param_values(rep_job, ignore_errors=True)
return _apply_chain(hdca=hdca, tool_output=tool_output, port_name=port_name, params=params)
```

**(c) Jobless / queued ToolRequest (no jobs at all):**
```python
hdca = _original_hdca(sa_session.get(HistoryDatasetCollectionAssociation, hdca_id))
trica = hdca.tool_request_association                        # model:8151, 1475
port_name = trica.output_name                                # model:1483
tool = _tool_from_request(trans, trica.tool_request)         # reuse extract.py:618
tool_output = tool.output_collections.get(port_name) or tool.outputs.get(port_name)
return _apply_chain(hdca=hdca, tool_output=tool_output, port_name=port_name, params=None)
```

**(d) ToolExecutionState (workflow tool-step capture, no `ToolRequest`):**
The TES is always reached through `Job.tool_execution_state` in practice, so recipe (a) applies. If you genuinely have only the TES:
```python
parsed = parsed_tool_source_for_tes(tes, trans.app.toolbox)  # promote services/base.py:208 helper
outputs, output_collections = parsed.parse_outputs(trans.app)
tool_output = output_collections.get(port_name) or outputs.get(port_name)
return _apply_chain(hdca=hdca, tool_output=tool_output, port_name=port_name, params=None)
```

### Edge cases

| Edge case | Behavior | Notes |
|---|---|---|
| HDA renamed by user post-job | Prefer renamed `HDA.name` (level 1) | Diverge = renamed; absent rename, levels 1 and 3 are the same string at execution time |
| Implicit-collection leaf HDA referenced | Coerce to parent HDCA + emit warning | `WorkflowOutput` attaches to collection-port-keyed output_name, not leaf elements |
| Multi-output tool, N starred/seeded | All N concrete outputs become `WorkflowOutput` rows on that step; payload accepts N entries per step. List UI surfaces per-output stars from v1 | Per `PORT_GRANULARITY_NOW` |
| HDA name has unsuitable chars | Sanitize at the API boundary (strip, max 255) | Boundary concern, lives in the validator |
| Two `output_labels` resolving to the same `(step, output_name)` | Reject 400 at validator after selected-output resolution | Avoid hidden last-writer behavior and editor duplicate-label warnings |
| Same id appears twice in `output_labels` | Reject 400 at validator (matches existing dedup at `services/workflows.py:280`) | Boundary invariant |
| Tool no longer installed | Naming chain degrades through b→c→d; HDA.name (level a) still available | Confirm in unit test |

### Existing helpers identified (reuse, don't duplicate)

- `managers/jobs.py:2091` `get_output_name(tool, output, params)` — the renderer.
- `managers/jobs.py:2102` `summarize_job_outputs` — same renderer, job-info-UI consumer.
- `extract.py:618` `_tool_from_request` — already rebuilds `Tool` from persisted `ToolSource`.
- `services/base.py:208` `_parsed_tool_source_for_tes` — TES → parser; promote only on branches where this helper exists and the TES path needs it.
- `WorkflowStep.create_or_update_workflow_output(output_name, label, uuid)` — `model/__init__.py:9405` on the current branch. Only API for adding a `WorkflowOutput`; idempotent.

There is **no existing "best label for any HDA/HDCA" helper**. The new naming-chain module is the right place.
