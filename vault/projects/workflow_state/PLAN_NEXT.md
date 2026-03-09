# Plan: Phases 3+ (Building on Completed Phases 1-2.6)

## Starting Point

Phases 1, 2, 2.5, and 2.6 of Plan B are complete. What exists:

- **Conversion library** (`convert.py`, `_walker.py`): all parameter types, conditionals, repeats, sections, subworkflows
- **Validation** (`validation_native.py`, `validation_format2.py`): both native + format2 validated against `workflow_step`/`workflow_step_linked` Pydantic models
- **Round-trip harness** (`test_roundtrip.py`): 43/43 per-step (100%), 16/16 full round-trip (100%) — stock tools only
- **`GetToolInfo` Protocol**: generic interface, `GalaxyGetToolInfo` (stock), `ToolShedGetToolInfo` (API+cache), `CombinedGetToolInfo` (stock+toolshed)
- **Shared walker** (`_walker.py`): unified tree traversal for convert + validate

All stock-tool workflows pass. The gap: **ToolShed tools need cache infrastructure before IWC validation, no execution equivalence proof, no Galaxy export endpoint**.

---

## Phase 2.7: Tool Info Cache Infrastructure — COMPLETE

**Goal:** Build local cache + CLI tooling for ToolShed tool metadata, enabling Phase 3+ without requiring a fully-working ToolShed API.

**Full plan:** See `CLIENT_TOOL_CACHE_PLAN.md`

### Commits (branch `wf_tool_state`)
- `cfe3898e87` — `ToolShedGetToolInfo` with API fetch + filesystem cache, `CombinedGetToolInfo`, `gx_validator.py` wiring
- `aab87eeca8` — `galaxy-tool-cache` CLI, cache index, workflow extractor, Galaxy API stub, 33 unit tests

### What was built
- **`toolshed_tool_info.py`** — `ToolShedGetToolInfo` with API fetch, memory + filesystem cache, `CacheIndex` (index.json with provenance), `populate_from_parsed_tool()`, `has_cached()`, `list_cached()`, `clear_cache()`, `GALAXY_TOOL_CACHE_DIR` env var, backfill for legacy cache files
- **`workflow_tools.py`** — Extract toolshed tool refs from native (.ga) and format2 (.gxwf.yml) workflows with subworkflow recursion and deduplication
- **`tool_cache.py`** — `galaxy-tool-cache` CLI with subcommands: `populate-workflow`, `add`, `add-local`, `list`, `info`, `clear`. Sources: ToolShed API (working), Galaxy instance API (stubbed `NotImplementedError`), local XML
- **`packages/tool_util/setup.cfg`** — `galaxy-tool-cache` entry point registered
- **`test/unit/workflows/iwc/`** — 2 IWC sample workflows (RepeatMasking, average-bigwig)
- **33 unit tests** — CacheIndex CRUD/persistence/corruption recovery, parse_toolshed_tool_id, get_cache_dir, ToolShedGetToolInfo cache ops + backfill, workflow extraction (native/format2/subworkflow/dedup/IWC), CLI parser, Galaxy API stub

### Remaining (deferred to Phase 3)
- Wire IWC tests into `test_roundtrip.py` with `GET_TOOL_INFO_WITH_TOOLSHED`
- Galaxy instance API source implementation

---

## Phase 3: ToolShed Tool Validation at Scale

**Goal:** Prove round-trip works on real-world workflows with ToolShed tools.

**Depends on:** Phase 2.7 (cache populated for target tools)

### 3.1: IWC workflow selection

Select 10-20 IWC workflows spanning different complexity levels:
- Simple linear pipelines (2-3 tools)
- Branching/conditional workflows
- Workflows with repeats, sections
- Subworkflow-containing workflows
- Workflows with collection operations

### 3.2: Cache population for IWC corpus

Use `galaxy-tool-cache populate-workflow` to cache all tool metadata:
```bash
for wf in test/unit/workflows/iwc/*.ga; do
    galaxy-tool-cache populate-workflow "$wf" --source api
done
```

Catalog failures: tools that can't be resolved from any source.

### 3.3: IWC round-trip sweep

Extend `test_roundtrip.py` with an IWC test class:
- Per-step conversion sweep (with `GET_TOOL_INFO_WITH_TOOLSHED`)
- Full round-trip sweep
- Catalog failures by class (same `FailureClass` enum)

**Expected failures:** New parameter types, tool version mismatches, `workflow_step` model gaps for ToolShed-specific parameter patterns. Each failure drives a fix.

### 3.4: Fix IWC-specific failures

Work through failures systematically (same red-to-green pattern as Phase 2). Likely issues:
- Parameter types not yet exercised by stock-tool workflows
- `workflow_step` model gaps for ToolShed-specific parameter patterns
- Tool versions not found (version fallback needed)

**Target:** 90%+ of IWC workflows pass per-step conversion. 100% not expected — some may use deprecated tool versions or exotic patterns.

---

## Phase 4: Execution Equivalence

**Goal:** Prove that round-tripped workflows produce identical execution results, and that `__current_case__` omission is safe.

### 4.1: `__current_case__` stripping test

This is the key proof that `__current_case__` is unnecessary:

1. Take the 24 framework format2 workflows (already have execution specs in `{name}.gxwf-tests.yml`)
2. Convert format2 → native (produces `__current_case__`)
3. Strip all `__current_case__` values from native
4. Run through Galaxy's workflow test runner
5. All tests must pass

**Implementation:** Add a pytest fixture or test class in `test/integration/workflows/` that:
- Loads each framework workflow
- Converts to native via `python_to_workflow()`
- Strips `__current_case__` from every conditional in every step's `tool_state`
- Submits to Galaxy for execution
- Asserts execution matches the `.gxwf-tests.yml` spec

If any fail, that's a bug to fix in Galaxy's workflow execution engine (it should derive case from selector value, not rely on persisted index).

### 4.2: Round-tripped workflow execution

For the 16 native workflows that pass full round-trip:
1. Run original native workflow through Galaxy test infrastructure
2. Run round-tripped native' workflow through same infrastructure
3. Compare: same jobs created, same outputs produced

**New file:** `test/integration/workflows/test_roundtrip_execution.py`

This is heavy (needs running Galaxy instance + test tools). Run selectively, not in every CI build.

---

## Phase 5: Format2 Export from Galaxy

**Goal:** D6 — Galaxy can export workflows as clean Format2 with `state` (not `tool_state`).

### 5.1: Export function

**New or extend:** `lib/galaxy/workflow/` export path

```python
def export_workflow_to_format2(workflow_dict: dict, get_tool_info: GetToolInfo) -> dict:
    """Export native workflow as format2 with clean `state` blocks.

    For each tool step:
    1. convert_state_to_format2() → Format2State(state, in_)
    2. Replace tool_state with state, merge in_ into step

    Falls back to tool_state for steps that fail conversion.
    """
```

Currently `gxformat2.export.from_galaxy_native()` produces `tool_state` (JSON strings) because it has no tool definitions. The schema-aware path uses `convert_state_to_format2()` per step to produce clean `state`.

### 5.2: API endpoint

Add or modify Galaxy API endpoint to return format2 YAML:
- `GET /api/workflows/{id}/download?format=format2` (or similar)
- Uses `CombinedGetToolInfo` (stock tools + ToolShed)
- Returns format2 with `state` blocks where conversion succeeds
- Falls back to `tool_state` for steps that fail (with warning annotation)

### 5.3: Round-trip validation gate

Only offer format2 export for workflows that pass round-trip validation:
- Run `convert_state_to_format2()` for all steps
- If any step fails, warn user and offer native-only export
- If all pass, export with confidence

---

## Phase 6: External Tooling Support

**Goal:** Enable validation of format2 workflows without a Galaxy instance, using only Tool Shed API + local cache.

### 6.1: JSON Schema generation from workflow_step models

```python
def format2_state_json_schema(parsed_tool: ParsedTool) -> dict:
    model = WorkflowStepToolState.parameter_model_for(parsed_tool.inputs)
    return model.model_json_schema(mode="validation")
```

This is nearly free — `pydantic_template("workflow_step")` already exists for all parameter types.

### 6.2: Tool Shed API endpoint for workflow state schema

Serve the JSON Schema via Tool Shed 2.0 API:
- `GET /api/tools/{trs_tool_id}/version/{version}/workflow_state_schema`
- Returns JSON Schema that validates format2 `state` blocks
- External tools (IDEs, linters, AI agents) validate without Galaxy

### 6.3: gxformat2 lint integration

Extend `gxformat2/lint.py` with optional schema-aware validation:
- When tool definitions available (via ToolShed API, cache, or local), validate each step's `state` against `WorkflowStepToolState`
- When not available, fall back to current structural-only lint
- `gxformat2` stays dependency-free — tool definitions passed in as `ParsedTool` dicts or JSON Schemas
- `galaxy-tool-cache` provides the bridge: populate cache → lint uses cached `ParsedTool`

---

## Phase Summary

| Phase | Delivers | Depends On | Key Risk |
|-------|----------|------------|----------|
| 2.7: Cache Infrastructure | `galaxy-tool-cache` CLI, cache index, multi-source | **COMPLETE** | — |
| 3: ToolShed Validation | IWC round-trip at scale | Phase 2.7 | Unknown parameter patterns |
| 4: Execution Equivalence | `__current_case__` proof, execution comparison | — (stock tools only) | Galaxy engine bugs |
| 5: Format2 Export | Galaxy export API with `state` blocks | Phases 3-4 | Fallback UX |
| 6: External Tooling | IDE/agent validation support | Phase 2.7, 3 | gxformat2 dependency boundary |

**Parallelism:** Phase 2.7 is complete. Phase 3 and 4 can start in parallel — Phase 4 uses only stock tools, Phase 3 uses the cache infra from 2.7. Phase 5 depends on confidence from 3+4. Phase 6 depends on 3 but not on 4+5.

---

## Resolved Questions

- **ToolShed tool ID parsing:** `toolshed.g2.bx.psu.edu/repos/owner/repo/tool_name/version` → split on `/repos/`, join with `~` for TRS ID. Implemented in `parse_toolshed_tool_id()`.
- **IWC corpus access:** Vendor a small subset (2-3 .ga files) in `test/unit/workflows/iwc/`; larger corpus fetched by CI or `galaxy-tool-cache populate-workflow`.
- **Execution equivalence tests:** Integration tests requiring Galaxy server — CI with selective runs, not every build.
- **Format2 export API:** Extend existing `/api/workflows/{id}/download` with `format=format2` parameter.
- **gxformat2 lint:** Pass `ParsedTool` dicts (not as a dependency); `galaxy-tool-cache` populates the cache, lint reads it.
- **Cache infrastructure:** `galaxy-tool-cache` CLI in `packages/tool_util`, `GALAXY_TOOL_CACHE_DIR` env var, no TTL. See `CLIENT_TOOL_CACHE_PLAN.md`.
