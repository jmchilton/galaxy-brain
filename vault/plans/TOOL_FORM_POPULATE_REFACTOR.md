---
type: plan
tags:
  - plan
  - galaxy/tools
  - galaxy/api
  - galaxy/refactor
related_notes:
  - "[[Problem - basic.py Parameter Hierarchy]]"
  - "[[Problem - YAML Tool Post-Hoc State Divergence]]"
status: draft
created: 2026-05-21
revised: 2026-05-21
revision: 3
ai_generated: true
summary: "Extract tool-form-building from Tool.to_json into ToolFormBuilder with Pydantic envelope models; regression gate is a declarative YAML expectation suite."
---

# Tool Form Build Pipeline Refactor

## Executive Summary

`Tool.to_json` in `lib/galaxy/tools/__init__.py:3072` is the orchestrator behind `GET /api/tools/{tool_id}/build` and four other callers (rerun, dynamic tools, workflow editor full-load, workflow editor step-click). It mingles forward parameter description, backward value-codec (rerun job prefill), workflow-editor-mode workarounds, and response envelope construction into one untyped dict-returning method on the `Tool` god class.

This plan extracts that pipeline into a dedicated `ToolFormBuilder` module and introduces Pydantic envelope models (`BuiltToolForm`, `WorkflowStepForm`) for the response shape. **It does not** type the inner `inputs` field per-parameter — that is a separate follow-up against [[Problem - basic.py Parameter Hierarchy]] §12.7.

### Goals

- Cleave the forward-direction form-building pipeline out of `Tool` into its own module.
- Create a typed API contract for the build response (envelope-only).
- Name the rerun-prefill mingling (`JobPrefill`) and workflow-editor-prefill mingling (`WorkflowPrefill`) as separate domain objects.
- Make the workflow-editor response shape explicit (`WorkflowStepForm`) rather than a "Tool.to_json plus four extra fields stuffed on the dict" pattern.
- Delete `populate_state_async` if no remaining caller after migration (one caller today, execution-side — investigate).

### Non-Goals

- Per-parameter Pydantic typing of `inputs` field (deferred — separate multi-PR series).
- Touching `basic.py` parameter classes directly.
- Replacing `populate_state` / `populate_model` (they remain module-level utilities; the form-builder *uses* them, doesn't own them).
- Touching workflow execution paths.
- Resolving the YAML-tool post-hoc state divergence (separate problem, this refactor *enables* progress on it via `JobPrefill`).

### Scannable Outline

- **Modules created:** `lib/galaxy/tools/form_builder/{builder.py, job_prefill.py, workflow_prefill.py, models/{request.py, response.py}}`
- **Modules touched:** `tools/__init__.py` (Tool.to_json becomes shim, then deletes); `webapps/galaxy/api/tools.py`, `webapps/galaxy/api/jobs.py`, `webapps/galaxy/api/dynamic_tools.py`, `managers/workflows.py`, `workflow/modules.py` (call sites)
- **Pydantic models:** `BuildToolFormRequest`, `BuiltToolForm`, `WorkflowStepForm(BuiltToolForm)`; deferred: per-parameter `inputs` typing
- **Migration sequencing:** prep PRs (expectation suite, ToolStaticDict, JobPrefill extraction) → builder extraction → caller migration → Tool.to_json deletion
- **Risk gates:** YAML expectation suite (unit, `UsesTools` + MockApp) before any caller moves; per-caller integration test after each migration; thin API smoke test as transport backstop

---

## Table of Contents

1. [Background](#1-background)
2. [Workflow Editor Verification](#2-workflow-editor-verification)
3. [Target Module Shape](#3-target-module-shape)
4. [Pydantic Models](#4-pydantic-models)
5. [Migration Plan](#5-migration-plan)
6. [Blockers and Mitigations](#6-blockers-and-mitigations)
7. [Testing Strategy](#7-testing-strategy)
8. [Open Questions](#8-open-questions)
9. [Appendix: Expectation Suite Schema](#9-appendix-expectation-suite-schema)

---

## 1. Background

### Current State

`Tool.to_json` (`tools/__init__.py:3072–3197`, ~125 lines) executes the following pipeline:

1. Resolve `request_context` (with history, workflow_building_mode)
2. *Optional rerun path:* `get_param_values(job)` → `check_and_update_param_values(mutates!)` → `_map_source_to_history` → `params_to_incoming` (lines 3110–3118)
3. `params = Params(kwd, sanitize=False)`
4. `input_translator.translate(params)` for datasource tools
5. `set_dataset_matcher_factory(request_context, self)`
6. `populate_state(...)` — fills state_inputs from incoming kwd
7. `tool.to_dict(request_context)` — static tool metadata
8. `populate_model(...)` — recurses ToolParameter tree, calls `to_dict` on each (where `DataOptionsBuilder` / pagination lives)
9. `unset_dataset_matcher_factory(...)`
10. Render help (restructuredtext)
11. Build action URL
12. `params_to_json(...)` — state envelope codec
13. Build `job_credentials_context`
14. Assemble final dict, `swap_inf_nan(...)`, return

### Callers of `Tool.to_json`

| Caller | File:line | Mode | Notes |
|---|---|---|---|
| Build endpoint | `webapps/galaxy/api/tools.py:574` | fresh | + `history`, + `options_pagination` |
| Rerun endpoint | `webapps/galaxy/api/jobs.py:695` | `job=` | empty kwd |
| Dynamic tools | `webapps/galaxy/api/dynamic_tools.py:171` | fresh | no inputs, no pagination |
| Workflow editor (full load) | `managers/workflows.py:1161` | `USE_HISTORY` | augments dict with `post_job_actions`, `when`, `replacement_parameters`, `step_type` |
| Workflow editor (step click) | `workflow/modules.py:2579` | `True` | `WorkflowToolModule.get_config_form` |

The workflow editor sites *pre-process* state via `params_to_incoming(incoming, tool.inputs, step.state.inputs, trans.app)` *before* calling `to_json` — symmetric to the rerun-side `params_to_incoming` call inside `to_json:3116`.

### Why Extract

`Tool.to_json` is structurally untyped orchestration on the `Tool` god class. Extraction:

- Creates a stable seam for [[Problem - basic.py Parameter Hierarchy]] §12.3 (split description from codec) and §12.7 (Pydantic delegation) without committing to them now.
- Names the rerun-prefill mingling as `JobPrefill`, exposing the seam needed for [[Problem - YAML Tool Post-Hoc State Divergence]] to attack the `Tool.get_param_values(job) → basic.py.to_python` legacy path later.
- Models workflow-editor response augmentations (`post_job_actions` etc.) in a Pydantic class instead of "extra fields stuffed on a returned dict."
- Removes `to_json` and its 30+ field assembly from `Tool`.

---

## 2. Workflow Editor Verification

The workflow editor reads roughly 15 of the ~40 fields emitted by `to_json`, and never reads ~25 of them.

### Frontend Consumers

Both backend sites (`managers/workflows.py:1161` and `workflow/modules.py:2579`) feed the same frontend code paths:

- `managers/workflows.py:1161` flows via `GET /api/workflows/{id}/download?style=editor` → `workflowStepStore` → `FormTool.vue` via `useStepProps` → reads `step.config_form`.
- `workflow/modules.py:2579` flows via `POST /api/workflows/build_module` → right-rail step refresh → same `FormTool.vue` / `useStepProps` / `step.config_form` consumer.

### Fields Read by the Workflow Editor

`id`, `version`, `name`, `description`, `inputs`, `errors`, `help`, `help_format`, `citations`, `xrefs`, `license`, `creator`, `requirements`, `credentials`, `sharable_url`, `versions`, `hidden_versions`, `tool_shed_repository`, `job_credentials_context`.

### Fields Not Read by the Workflow Editor

`action`, `method`, `enctype`, `display`, `history_id`, `job_id`, `job_remap`, `message`, `tool_errors`, `state_inputs`, plus assorted `to_dict()` panel/icon/edam fields.

### Implication for the Refactor

`WorkflowStepForm` is a real model and a *slim* one. It does **not** inherit from `BuiltToolForm`. Instead it carries only the ~15 fields the editor reads, plus the per-step augmentation fields (`post_job_actions`, `when`, `replacement_parameters`, `step_type`). This drops execution-shaped fields (`action`/`method`/`enctype`/`display`/`history_id`/`job_id`/`job_remap`) that the editor never uses, and drops the runtime-form diagnostics (`message`/`tool_errors`/`state_inputs`) that aren't displayed in the editor.

This is the deliberate inverse of the previous draft, which would have inherited the full envelope and marked fields as drop-candidates. Net effect: smaller wire payload, less coupling between rerun-form and workflow-editor wire formats, and the editor's response shape is *defined by what it uses* rather than *defined by what `Tool.to_json` happens to emit*.

### Fallback Plan if 15 Fields Are Insufficient

The research is high-confidence (direct `step.config_form` reads were traced) but not exhaustive — generic form mixins or non-editor consumers may pull extra fields. If during Phase 3 migration a workflow-editor expectation case or any client-side / API integration test fails because a slim-`WorkflowStepForm` is missing a field:

1. **Identify the missing field** via the failing test or runtime error.
2. **Add it directly to `WorkflowStepForm`** — single-line addition. The expectation suite + existing client/API tests catch the regression at PR time, not in production.
3. **Document the addition in §2** of this plan, noting which frontend consumer needed it (the audit grows from real evidence, not speculation).
4. **Worst-case fallback:** if 3+ fields turn out to be needed and the slim model is becoming a maintenance problem, switch `WorkflowStepForm` to inherit from `BuiltToolForm` (or compose it). This is mechanical — change the class declaration, drop the duplicated field definitions. The Phase 3 migration is the safe place to make this call because the expectation suite is fully wired by then.

The cost of being wrong about a field is one extra line per missed field. The cost of carrying ~25 unused fields permanently is API surface area and an open-ended audit task that never lands.

### Sanity-Check Items

Still worth checking during Phase 0:

- Workflow export round-trip (`/api/workflows/{id}/download` formats other than `editor`) — does that go through a different code path or share the per-step `to_json`? Verify during P0.1 — if it shares the path, add a non-editor case to the expectation suite.
- Is there a `FormGeneric.vue` / `FormParameter.vue` access pattern the per-caller research missed? Less critical now — if missed, the slim-model approach surfaces it as a Phase 3 test failure (see fallback above), not as silent data loss.

---

## 3. Target Module Shape

```
lib/galaxy/tools/form_builder/
  __init__.py              # re-exports ToolFormBuilder, BuiltToolForm, WorkflowStepForm
  builder.py               # ToolFormBuilder orchestrator
  job_prefill.py           # JobPrefill — rerun mingling
  workflow_prefill.py      # WorkflowPrefill — workflow-editor mingling
  models/
    __init__.py
    request.py             # BuildToolFormRequest, OptionsPaginationModel
    response.py            # BuiltToolForm, WorkflowStepForm
    common.py              # CredentialDict, RequirementDict, JobCredentialsContext, etc.
```

### `ToolFormBuilder` Interface

```python
class ToolFormBuilder:
    def __init__(
        self,
        tool: "Tool",
        request_context: WorkRequestContext,
        *,
        history: Optional[History] = None,
        options_pagination: Optional[OptionsPaginationT] = None,
        workflow_building_mode: WorkflowBuildingMode = WorkflowBuildingMode.OFF,
    ):
        ...

    def build(self, incoming: Mapping[str, Any]) -> BuiltToolForm:
        """Fresh build — used by /api/tools/{id}/build, dynamic tools."""

    def build_from_job(self, job: Job) -> BuiltToolForm:
        """Rerun — encapsulates JobPrefill."""

    def build_for_workflow_step(self, step) -> WorkflowStepForm:
        """Workflow editor — returns WorkflowStepForm with PJA fields."""

    def _build(self, incoming, *, message="", warnings=None) -> BuiltToolForm:
        """Shared assembly (steps 5–14 of current to_json)."""
```

### `JobPrefill`

```python
class JobPrefill:
    def __init__(self, tool: "Tool", request_context: WorkRequestContext): ...

    def load(self, job: Job) -> JobPrefillResult:
        """
        Encapsulates Tool.to_json:3110–3118.
        Returns (incoming, message, warnings) — incoming kwd + version-skew message + validation warnings.
        Does NOT silently drop check_and_update_param_values mutation behavior.
        """
```

`JobPrefillResult` is a small NamedTuple or dataclass — not a Pydantic model (internal type, not wire-bound).

### `WorkflowPrefill`

```python
class WorkflowPrefill:
    def __init__(self, tool: "Tool", request_context: WorkRequestContext, app): ...

    def load(self, step) -> Mapping[str, Any]:
        """
        Encapsulates the params_to_incoming pre-pass at
        managers/workflows.py:1160 and workflow/modules.py:2578.
        Returns incoming kwd.
        """
```

### `Tool.to_json` Becomes a Shim

```python
def to_json(self, trans, kwd=None, job=None, workflow_building_mode=False,
            history=None, options_pagination=None):
    ctx, history = self._build_context(trans, history, workflow_building_mode)
    builder = ToolFormBuilder(self, ctx, history=history,
                              options_pagination=options_pagination,
                              workflow_building_mode=workflow_building_mode)
    if job:
        return builder.build_from_job(job).model_dump()
    return builder.build(kwd or {}).model_dump()
```

After all 5 callers migrate to the builder directly, `Tool.to_json` deletes.

---

## 4. Pydantic Models

### `BuildToolFormRequest`

```python
class OptionsPaginationModel(BaseModel):
    model_config = ConfigDict(extra="forbid")
    # exact fields lifted from _parse_options_pagination — currently:
    # offset, limit, q, qv (Galaxy paginated-options convention)
    # See tools/parameters/pagination.py for canonical field list.

class BuildToolFormRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    history_id: Optional[DecodedDatabaseIdField] = None
    tool_version: Optional[str] = None
    tool_uuid: Optional[str] = None
    options_pagination: Optional[OptionsPaginationModel] = None
    inputs: dict[str, Any] = Field(default_factory=dict)
```

### `BuiltToolForm`

The shape of the current build response, with `inputs` and `state_inputs` deliberately untyped.

```python
class BuiltToolForm(ToolStaticDict):  # ToolStaticDict = Pydantic-ified tool.to_dict()
    model_config = ConfigDict(extra="forbid")  # closed — see B1
    help: str
    help_format: str  # "restructuredtext" | "html" | "markdown"
    citations: bool
    sharable_url: Optional[str]
    message: str
    warnings: Optional[Any]  # ParameterValidationErrorsT — kept loose
    versions: list[str]
    hidden_versions: list[str]
    requirements: list[RequirementDict]
    credentials: list[Any]
    errors: dict[str, Any]
    tool_errors: Optional[Any]
    state_inputs: dict[str, Any]  # ToolStateDumpedToJsonT — kept loose by design
    inputs: list[dict[str, Any]]  # NOT typed per-parameter — deferred
    job_id: Optional[str]
    job_remap: Optional[bool]
    job_credentials_context: Optional[JobCredentialsContext]
    history_id: Optional[str]
    display: Any
    action: str
    license: Optional[str]
    creator: Optional[Any]
    method: str
    enctype: str
```

### `WorkflowStepForm`

Slim model — does *not* inherit from `BuiltToolForm`. Carries exactly the fields the workflow editor frontend reads (§2), plus per-step augmentations.

```python
class WorkflowStepForm(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # Identity / display (read by FormTool.vue / ToolCard.vue)
    id: str
    version: str
    name: str
    description: str

    # Form body (read by FormDisplay)
    inputs: list[dict[str, Any]]  # NOT typed per-parameter — same deferral as BuiltToolForm
    errors: dict[str, Any]

    # Footer metadata (read by ToolCard footer)
    help: str
    help_format: str
    citations: bool
    xrefs: list[Any]
    license: Optional[str]
    creator: Optional[Any]
    requirements: list[RequirementDict]

    # Credentials (read by credentials editor)
    credentials: list[Any]
    job_credentials_context: Optional[JobCredentialsContext]

    # Version selector + sharing (read by ToolCard options menu)
    sharable_url: Optional[str]
    versions: list[str]
    hidden_versions: list[str]
    tool_shed_repository: Optional[Any]

    # Workflow-step augmentations (added by managers/workflows.py:1164+ today)
    post_job_actions: list[PostJobActionDict]
    when: Optional[str]
    replacement_parameters: list[str]
    step_type: str
```

Deliberately omits — confirmed unused by workflow editor frontend research (§2):

- `action`, `method`, `enctype` — execution form submission metadata
- `display`, `history_id`, `job_id`, `job_remap` — runtime-form fields
- `message`, `tool_errors`, `state_inputs` — runtime-form diagnostics

**Fallback if a field turns out to be needed:** add it directly to `WorkflowStepForm`. See §2 fallback plan.

### What This Plan Does Not Model

- Per-`ToolParameter`-subclass models for `inputs` items. Today emitted as `dict[str, Any]` via each parameter's `to_dict`. Aligning these with `lib/galaxy/tool_util_models/parameters.py` is the [[Problem - basic.py Parameter Hierarchy]] §12.7 work and gets its own plan.
- Pydantic wrapping of `state_inputs` / `ToolStateDumpedToJsonT`. Same reason — depends on per-parameter typing.

---

## 5. Migration Plan

### Phase 0 — Prep (independent PRs)

**P0.1 — Tool-form expectation suite (unit).** New unit test `test/unit/app/tools/test_form_builder_expectations.py` driven by `test/unit/app/tools/form_builder/expectations.yaml`. Uses `UsesTools` + `MockApp` from `galaxy.app_unittest_utils.tools_support` — same harness as `test_tool_serialization_roundtrip.py`, `test_dynamic_options.py`, `test_validation_parsing.py`. In-process, no HTTP, no server.

Each YAML entry declares:
- `tool_path:` (path to a tool XML fixture, *not* a toolbox id — MockApp has no toolbox loaded)
- `mode:` `fresh` | `rerun` | `workflow_step`
- Optional `prior_state:` (for `rerun` — harness builds a synthetic `Job` against MockApp's in-memory model)
- Optional `step_state:` (for `workflow_step` — harness builds a synthetic `WorkflowStep`)
- `assert:` — list of typed assertions, each with a `because:` line documenting *what the tool form needs and why*

Schema and assertion vocabulary in §9.

Coverage tools to seed the suite with:

- Simple XML tool (cat1 — already in `test/functional/tools/`)
- Data param tool (data param + format restrictions)
- Conditional + repeat structure (bowtie2-style)
- Dynamic-options tool (something with `<options from_dataset=...>`)
- YAML / user-defined tool
- Datasource tool (UCSC main — exercises `input_translator`)
- Hidden-data tool (`HiddenDataToolParameter` user)
- DataManager tool
- Workflow-editor mode tool (drives `build_for_workflow_step`)
- Rerun mode (synthesized job state, covers version-skew and cross-history variants)
- Anonymous user + simple tool (no history)
- `options_pagination` with `offset > 0` against a dynamic-options tool

This is the regression gate. Nothing else lands without it.

**P0.1b — API smoke test (backstop).** Single new test in `lib/galaxy_test/api/test_tools.py` (or extend existing) that issues `GET /api/tools/{id}/build` for one simple tool and one data-param tool and asserts the envelope round-trips end-to-end (top-level fields present, `inputs` is a list, content-type is JSON). Its purpose is not coverage — that lives in P0.1 — its purpose is "the HTTP wiring isn't broken." Keep small; do not duplicate P0.1's assertions over HTTP.

**P0.2 — `ToolStaticDict` Pydantic model.** Lift `Tool.to_dict(request_context)` (separate from `Tool.to_dict()` — note: same method name, different signatures, sigh) to return a typed Pydantic model. Independent of the form-builder work. Probably belongs in `lib/galaxy/schema/tools.py` (new file).

**P0.3 — `JobPrefill` extraction.** Move lines `tools/__init__.py:3110–3118` into `JobPrefill.load(job)`. Add unit tests against persisted-job fixtures (rerun-with-removed-input, rerun-cross-history, rerun-with-version-skew). The `check_and_update_param_values` *mutates inputs in place* — preserve exactly.

**P0.4 — `WorkflowPrefill` extraction.** Move the `params_to_incoming(incoming, tool.inputs, step.state.inputs, trans.app)` pre-pass from `managers/workflows.py:1160` and `workflow/modules.py:2578` into `WorkflowPrefill.load(step)`. Both callers shift to using the named object; `tool.to_json` keeps working.

**P0.5 — Decide on `populate_state_async`.** Only caller is `tools/__init__.py:2307` (tool execution path, not form-builder). Confirm no Galaxy plugins / external consumers use it. If clear, schedule deletion as a separate PR.

### Phase 1 — Pydantic Envelope (independent PR)

**P1.1 — `BuildToolFormRequest` + `BuiltToolForm` + `WorkflowStepForm`.** Define models. `Tool.to_json` continues to return a dict — at this phase, no validation, no routing change. The models are defined for the next phase to use.

### Phase 2 — Builder Extraction (one PR)

**P2.1 — Create `ToolFormBuilder` as a wrapper.** Pulls assembly logic into the new class. `Tool.to_json` becomes a thin shim:

```python
def to_json(self, trans, kwd=None, ...):
    builder = ToolFormBuilder(self, ...)
    return builder.build(kwd or {}).model_dump()
```

Snapshot test (P0.1) must pass.

**P2.2 — Add `build_from_job`, `build_for_workflow_step`.** Use `JobPrefill` and `WorkflowPrefill` from Phase 0.

### Phase 3 — Caller Migration (one PR per caller, lowest risk first)

In order:
1. `webapps/galaxy/api/dynamic_tools.py:171` — minimal kwargs, easiest target.
2. `webapps/galaxy/api/tools.py:574` — main build endpoint. After this, `BuildToolFormRequest` validates incoming.
3. `webapps/galaxy/api/jobs.py:695` — rerun. Migrates to `builder.build_from_job(job)`.
4. `workflow/modules.py:2579` (`WorkflowToolModule.get_config_form`) — migrates to `builder.build_for_workflow_step(step)`. `params_to_incoming` pre-pass disappears at the call site (it lives in `WorkflowPrefill` now).
5. `managers/workflows.py:1161` — workflow editor full load. Same migration as (4). Augmentations (`post_job_actions`, `when`, `replacement_parameters`, `step_type`) become part of `WorkflowStepForm`.

Each migration runs the full P0.1 expectation suite, the P0.1b API smoke test, and the relevant integration tests for that endpoint.

### Phase 4 — Cleanup

**P4.1 — Delete `Tool.to_json`.** All callers migrated. Method deletes. Imports clean up.

**P4.2 — Delete `populate_state_async`** if P0.5 cleared it.

**Note:** there is no Phase 4 field-drop audit — the slim `WorkflowStepForm` already excludes the never-read fields by design. If a field was missing, it was added during Phase 3 via the §2 fallback path.

---

## 6. Blockers and Mitigations

### B1 — Workflow Editor Augments the Dict After the Fact

**Current state:** `managers/workflows.py:1164–1189` adds `post_job_actions`, `when`, `replacement_parameters`, `step_type` to the dict returned by `tool.to_json`.

**Mitigation:** Modeled as `WorkflowStepForm` (a *slim* standalone model — see §4). Builder method `build_for_workflow_step(step)` returns the model with these fields populated. Closed `extra="forbid"`.

**Confirmed by the user:** `WorkflowStepForm` modeled as part of this work, not `extra="allow"`. Plan further restricts the model to the ~15 fields the editor actually reads, with a fallback path (§2) if any field turns out to be needed in addition.

### B2 — `workflow_building_mode` Is Tri-State

`USE_HISTORY` / `DISABLED` / legacy `True`/`False`. Threads through `populate_state`, dataset matcher, `swap_inf_nan`, `from_json`.

**Mitigation:** keep as a builder constructor arg; consolidate around the existing `workflow_building_modes` enum in `tools/parameter_validation_utils.py`. Fix legacy boolean callers during migration. Don't proliferate subclasses.

### B3 — `Tool.to_dict(request_context)` Is the Static-Tool Dict

The build response is `tool.to_dict() ∪ dynamic-fields`. Two methods, same name, different signatures.

**Mitigation:** P0.2 — lift to `ToolStaticDict` Pydantic model first. Independent prep PR. `BuiltToolForm` extends it.

### B4 — `swap_inf_nan` Walks the Whole Envelope

Recursively rewrites `inf`/`nan` floats. Pydantic JSON serialization handles these differently.

**Mitigation:** keep as post-`model_dump()` walk for now. Revisit when the wire format is owned end-to-end.

### B5 — `set_dataset_matcher_factory` Lifecycle

Currently set+unset around `populate_model` in `to_json`. Affects `to_dict` on `DataToolParameter`.

**Mitigation:** `ToolFormBuilder._build` wraps the call in a context manager. Cleaner than current implicit lifecycle.

### B6 — Per-Instance `_acceptable_extensions_cache` on Data Params

[[Problem - basic.py Parameter Hierarchy]] §6 — mutates `ToolParameter` instance state during `to_dict`. Becomes more visible because the form-builder is now the sole caller of `to_dict` on data params.

**Mitigation:** out of scope for this refactor. Document as a known wart, address in basic.py work. Form-builder doesn't make it worse.

### B7 — Wire Shape Is Locked

Tests, client TypeScript types, workflow round-trip exports all key on exact field names.

**Mitigation:** two complementary locks, no byte-for-byte snapshot:
- `extra="forbid"` on `BuiltToolForm` / `WorkflowStepForm` catches accidental field *additions*.
- The P0.1 expectation suite asserts that *named, semantically-meaningful* fields are present with the right type — anything a `because:` line names is locked.
- Generated TS types (`client/src/api/schema/schema.ts`) and existing API integration tests are the backstop for incidental fields the expectation suite doesn't name.

Tradeoff vs. snapshot testing: silent removal of an *unasserted* field is not caught by P0.1 alone. Accepted because (a) `extra="forbid"` blocks the more dangerous direction (additions); (b) the expectation suite documents *intent* in a way snapshots cannot; (c) the cost of a missed regression is one new assertion in YAML, vs. the permanent cost of a brittle snapshot that resists every legitimate change.

### B8 — `input_translator` (Datasource Tools)

Datasource tools have weird input translation that mutates `Params` before state population. `Tool.to_json:3124–3125`.

**Mitigation:** migrate verbatim into `ToolFormBuilder._build`. Flag as cleanup candidate for a later pass; don't touch now.

### B9 — `populate_state` Has 6+ External Callers

`library_datasets`, `workflows` API, `recommendations`, `actions/library`, `workflow/modules`, `tool` execution.

**Mitigation:** **leave `populate_state` exactly where it is.** Form-builder uses it; does not own it. Critical — do not pull `populate_state` into the form-builder module or this refactor doubles in scope.

### B10 — `JobPrefill.load` Is the Riskiest Extraction

8 lines mingling 4 real domain operations. `check_and_update_param_values` *mutates inputs in place*. Returns warnings that flow into the response.

**Mitigation:** P0.3 extracts verbatim with unit tests against rerun fixtures *before* internal splitting. Tests assert the returned `(incoming, message, warnings)` against several persisted-job fixtures.

### B11 — `dynamic_tools.py:171` Calls Without `inputs`

`tool.to_json(trans=trans, history=…)` — uses default empty dict.

**Mitigation:** included as a case in the P0.1 expectation suite. `BuildToolFormRequest.inputs` defaults to `{}`.

### B12 — Anonymous User / No-History Path

`@expose_api_anonymous` on the build endpoint. `Tool.to_json` has an "anonymous user, no history is OK" branch.

**Mitigation:** preserve in builder. P0.1 expectation suite includes the anonymous case (MockApp can drive `trans.get_user() is None`).

### B13 — YAML `tool_state` Bypass Opportunity

PRs 20935 / 21828 / 21842 made `Job.tool_state` Pydantic-validated for YAML tools. The rerun path still goes through legacy `get_param_values` → basic.py `to_python`.

**Mitigation:** out of scope for this refactor, but `JobPrefill` is the home for that future bridge. After P0.3 lands, [[Problem - YAML Tool Post-Hoc State Divergence]] can extend `JobPrefill` to short-circuit the legacy path when a validated `tool_state` exists.

### B14 — Two Workflow-Editor API Endpoints, Same Frontend

Frontend research confirmed both `managers/workflows.py:1161` and `workflow/modules.py:2579` feed `FormTool.vue` via `step.config_form`.

**Mitigation:** `build_for_workflow_step` is one method; both callers route through it. No code duplication between the two sites.

### B15 — Workflow Export Round-Trip

`/api/workflows/{id}/download` with non-`editor` formats may share the per-step `to_json` path or use a different code path.

**Mitigation:** verify during P0.1 — add a `workflow_step` case in the expectation suite for at least one non-editor download format if it shares the path. If it shares the path, treat as a third workflow consumer and confirm `WorkflowStepForm` covers its needs.

### B16 — Slim `WorkflowStepForm` May Miss a Field

`WorkflowStepForm` defines exactly the ~15 fields frontend research identified. If a generic component (e.g. `FormGeneric.vue` shared mixin) reads a field the research missed, the slim model omits it and the editor breaks.

**Mitigation:** §2 fallback plan — add the missing field directly to `WorkflowStepForm` when a test or runtime error surfaces it. The expectation suite (P0.1) catches this at PR review time when an asserted field is missing, and the existing workflow-editor client/integration tests catch it for unasserted fields. Worst-case fallback: switch `WorkflowStepForm` to inherit from `BuiltToolForm` — mechanical change.

**Why this is safer than the inverse:** the symmetric risk (carrying ~25 unused fields permanently) is open-ended API surface + a never-landing audit task. Bias toward the fixable error (missing field, single-line add) over the unfixable one (permanent over-emission).

---

## 7. Testing Strategy

### Regression Gate

**P0.1 expectation suite** is the gate. Unit test, `UsesTools` + `MockApp`, driven by `expectations.yaml`. Without it, any phase that touches assembly logic is unsafe. Tool coverage list and YAML schema in §5 Phase 0 and §9.

**P0.1b API smoke test** is the transport backstop — one or two end-to-end cases over HTTP, just enough to catch wiring breakage.

### Unit Tests for Phase 0 Extractions

- `JobPrefill` against ≥3 synthetic-job cases covering rerun-cross-history, rerun-with-version-skew, rerun-with-removed-input. Jobs are constructed against MockApp's in-memory model from declarative YAML (no pickled fixtures). Assert `(incoming, message, warnings)` against named expectations, not byte-for-byte.
- `WorkflowPrefill` against ≥2 step cases covering single-input and connected-input cases — same approach.

### Integration Tests for Phase 3 Migrations

Each caller migration runs:
- P0.1 expectation suite (unit, fast)
- P0.1b API smoke test
- The caller's existing API integration tests
- For workflow-editor migrations: workflow round-trip tests (download → upload → execute equivalent)

### What to Test

- Add a `because:`-annotated assertion every time a bug is fixed in this area. The suite grows into a regression journal that documents *why* the form needs each field.
- Add cases for behaviors that should be locked in: anonymous user, datasource translation, options pagination boundaries, version-skew warnings.

### What Not to Test

- Don't write byte-for-byte snapshot tests. `extra="forbid"` on the Pydantic envelope is the lock for additions; the expectation suite is the lock for semantically-meaningful behavior.
- Don't add per-parameter input shape tests — out of scope (deferred to the basic.py work).
- Don't restate generic Pydantic validation in YAML — the model does that. Assertions should encode *product behavior*, not field-presence trivia.

---

## 8. Open Questions

- Are `state_inputs` or any of the "never-read" fields read by `FormGeneric.vue`/`FormParameter.vue` via generic helpers the frontend research missed? Audit before Phase 4.
- Does `/api/workflows/{id}/download` non-editor format share the per-step `to_json` path? Verify during P0.1 — if it shares the path, add a non-editor case to the expectation suite.
- Is the existing `workflow_building_modes` enum used consistently, or are there callers still passing raw `True`/`False`? Audit during Phase 3.
- Does `_parse_options_pagination` (`webapps/galaxy/api/tools.py:974`) accept any field shapes that `OptionsPaginationModel` would reject? Audit against `lib/galaxy/tools/parameters/pagination.py` (now landed: `OptionsPaginationT`, `DEFAULT_OPTIONS_PAGE_SIZE`, `MAX_OPTIONS_PAGE_SIZE`, `normalize_pagination`) when building the model.
- Should `BuildToolFormRequest.inputs` be a tighter type than `dict[str, Any]`? Probably not at this phase — it's the kwd bag and parameters are typed downstream by `populate_state`. Defer.
- After P0.5: does `populate_state_async` have any out-of-tree callers (Galaxy plugins, external tools)? grep won't cover; consider deprecation cycle before deletion.
- Should the expectation harness reference tools by `tool_path:` (filesystem path to a fixture XML) only, or also support `bundled:` (resolved against a known set of bundled built-ins)? Start with `tool_path:` and add `bundled:` only if a real case demands it.
- For rerun cases, the harness needs to synthesize a `Job` with `parameters` populated. Path of least resistance: declare `prior_state:` in YAML, encode via the tool's own params machinery, persist to MockApp's in-memory model. Confirm this round-trips correctly for tools with `HiddenDataToolParameter` etc.

---

## Methodology Note

Workflow editor field-usage research (§2) was performed by a sub-agent reading `client/src/components/Workflow/Editor/` and the workflow-build API services. The user's prior intuition was that the editor needs the full `to_json` envelope; the research disagreed, finding ~15 fields read of ~40 emitted.

Revision 1 of this plan modelled `WorkflowStepForm` with the full envelope and deferred drops to Phase 4. Revision 2 inverted: slim model up-front, fallback path if research missed a field. Rationale: the cost of "missing field" is single-line add caught by tests; the cost of "over-emitted field" is permanent API surface and an open-ended audit task.

Revision 3 (this version) reshapes Phase 0's regression gate. The previous draft proposed a byte-for-byte API snapshot test as the gate. Per user direction, this version replaces the snapshot with a declarative YAML expectation suite executed as a unit test (`UsesTools` + `MockApp` pattern, in line with `test_tool_serialization_roundtrip.py` etc.) plus a thin API smoke test as transport backstop. Rationale: the snapshot would lock byte-shape but document *nothing*; the YAML lets each assertion carry a `because:` line explaining what the tool form needs and why. The suite becomes a regression journal. Tradeoff (silent removal of unasserted fields) is accepted because `extra="forbid"` on `BuiltToolForm` / `WorkflowStepForm` already locks the dangerous direction (additions), and TS schema + existing API integration tests backstop incidental shape drift.

---

## 9. Appendix: Expectation Suite Schema

### File layout

```
test/unit/app/tools/
  test_form_builder_expectations.py        # harness
  form_builder/
    expectations.yaml                      # the suite
    fixtures/
      tools/                               # tool XML fixtures (or symlinks/copies of test/functional/tools)
        cat1.xml
        bowtie2.xml
        ...
```

### YAML schema

```yaml
# expectations.yaml — top-level is a list of entries
- tool_path: fixtures/tools/cat1.xml
  description: "Simplest tool — proves envelope contract"
  cases:
    - name: fresh_load
      mode: fresh                          # fresh | rerun | workflow_step
      inputs: {}                           # incoming kwd; default {}
      # options_pagination: {param_name: {hda: {offset: 0, limit: 50}}}  # optional
      assert:
        - kind: top_level_field
          name: inputs
          type: list
          because: "FormDisplay iterates inputs[] to render parameter tree"
        - kind: top_level_field
          name: action
          type: string
          because: "Form POSTs execution to this URL"
        - kind: input_present
          path: input1
          type: data
          because: "Tool requires a dataset to operate on"
```

#### Mode-specific fields

- `mode: rerun` — must include `prior_state:` (a flat dict of param paths → values, encoded the same way the tool's `params_to_strings` would). Harness synthesizes a `Job` against MockApp's model with `parameters` populated from `prior_state`, then drives `builder.build_from_job(job)`.
- `mode: workflow_step` — must include `step_state:` (state for the synthesized `WorkflowStep`). Harness builds the step against MockApp and drives `builder.build_for_workflow_step(step)`.
- Optional `tool_version:` per case to exercise version-skew warnings.
- Optional `anonymous: true` to drive `trans.get_user() is None`.

### Assertion vocabulary (initial set)

Each `assert:` entry is a dict with `kind:` and `because:` (both required). Other fields depend on `kind`.

| `kind`                          | Other fields                                       | Meaning                                                                                                              |
| ------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `top_level_field`               | `name`, `type` (`string`/`list`/`object`/`bool`/`number`), optional `contains` | Envelope has this field with the right type; if `contains:` is given (string subsubstring), value must contain it.   |
| `top_level_field_absent`        | `name`                                             | Field must not be present. Used to prove slim-model exclusions.                                                       |
| `input_present`                 | `path`, `type` (`data`/`integer`/`select`/`conditional`/`repeat`/...) | Navigates `inputs[]` tree by path (`a.b.c`; conditional cases via `cond.case_name.child`; repeat children via `repeat.child`). |
| `input_absent`                  | `path`                                             | Path must not resolve.                                                                                                |
| `conditional_branches`          | `path`, `min` / `exact`                            | Conditional at `path` has at least `min` (or exactly `exact`) cases.                                                  |
| `repeat_bounds`                 | `path`, optional `min_items`, optional `max_items` | Repeat at `path` exposes the declared bounds.                                                                         |
| `data_formats_include`          | `path`, `formats: [list]`                          | Data param at `path` accepts at least these datatypes (subset check, not equality).                                   |
| `select_options_include`        | `path`, `values: [list]`                           | Select param at `path` exposes at least these option values.                                                          |
| `input_options_paginated`       | `path`, `expected_count`                           | Dynamic options for `path` honor the case's `options_pagination`. Count matches `expected_count`.                     |
| `state_input_set`               | `path`                                             | `state_inputs[path]` resolves to a non-null value. Used in rerun cases to prove prefill happened.                     |
| `warnings_absent`               | —                                                  | `warnings` field is empty/absent.                                                                                     |
| `warnings_contain`              | `text`                                             | `warnings` (or `message`) contains the given substring.                                                               |
| `action_url_matches`            | `pattern`                                          | Regex match against `action` URL — for datasource tools and external redirects.                                       |
| `help_nonempty`                 | —                                                  | `help` field is a non-empty string.                                                                                   |

Extending: new `kind`s land as small dispatch entries in the harness — keep the vocabulary lean and prefer composing existing kinds where possible.

### Linting

- `because:` ≥ N characters (suggest 20). Empty or one-word reasons defeat the purpose.
- Every assertion must have both `kind:` and `because:`.
- Suggest a CI check (or pre-commit hook) that runs `pytest --collect-only` plus a YAML linter over `expectations.yaml`.
