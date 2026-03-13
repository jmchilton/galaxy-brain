# Plan B: Round-Trip First (IWC-Driven)

## Approach

Start from the end goal (D5: round-trip validation) and work backward. Build a harness that takes real workflows through native→format2→native, catalog every failure, and let those failures drive library work. The workflows are the agenda — we don't guess what to build; failures tell us.

## Test Workflow Inventory

### Framework Test Workflows (53 files)
**Location:** `lib/galaxy_test/workflow/`
Each has `{name}.gxwf.yml` (format2 source) + `{name}.gxwf-tests.yml` (execution spec).

| Category | Count | Examples |
|----------|-------|---------|
| Basic types | 5 | `default_values`, `default_values_optional`, `multiple_text` |
| Integer handling | 3 | `multiple_versions`, `integer_into_data_column` |
| Collections | 6 | `zip_collection`, `flatten_collection`, `empty_collection_sort` |
| Collection mapping | 5 | `multi_select_mapping`, `subcollection_rank_sorting` |
| Conditionals | 2 | `optional_conditional_inputs_to_build_list` |
| Replacement params | 3 | `replacement_parameters_text`, `_legacy`, `_nested` |
| Other | ~29 | Various advanced patterns |

**Strengths:** Already format2, have execution specs. Good for format2→native→format2 direction.
**Limitation:** Not native .ga, no toolshed tools.

### Native Test Workflows (13 files)
**Location:** `lib/galaxy_test/base/data/`

| File | Status | Blocker |
|---|---|---|
| `test_workflow_1.ga` (2.7KB) | Baseline target | - |
| `test_workflow_2.ga` (3.2KB) | Target | - |
| `test_workflow_two_random_lines.ga` (3.3KB) | Currently validates | - |
| `test_workflow_pause.ga` (3.7KB) | Target | Pause step handling |
| `test_workflow_missing_tool.ga` (2.8KB) | Error case | Tool not in toolbox |
| `test_workflow_matching_lists.ga` (3.6KB) | Target | List matching |
| `test_workflow_randomlines_legacy_params.ga` (1.8KB) | Target | Legacy param format |
| `test_workflow_randomlines_legacy_params_mixed_types.ga` (1.8KB) | Target | Mixed types |
| `test_workflow_batch.ga` (5.1KB) | Blocked | gx_text not handled |
| `test_workflow_map_reduce_pause.ga` (6.7KB) | Blocked | Double-nested JSON |
| `test_subworkflow_with_integer_input.ga` (16KB) | Blocked | Subworkflows |
| `test_subworkflow_with_tags.ga` (5.1KB) | Blocked | Subworkflows |
| `test_workflow_topoambigouity.ga` (13KB) | Blocked | Disconnected input |

### Unit Test Workflows (5 files)
**Location:** `test/unit/workflows/valid/` and `invalid/`
- `simple_data.gxwf.yml`, `simple_int.gxwf.yml` — validation fixtures
- 3 invalid fixtures for error testing

## The Round-Trip Pipeline

The existing `workflow_step` and `workflow_step_linked` Pydantic representations were designed for format2 state validation (commit `39641f6531`). Conversion is a representation transform: parse native encoding → validate as `workflow_step_linked` → strip ConnectedValue markers → produce `workflow_step` (= format2 `state`) + connections dict (= format2 `in`).

```
Native (.ga) tool_state JSON
    │
    ▼  parse + type-coerce + strip bookkeeping
workflow_step_linked dict (structured, with ConnectedValue)
    │
    ▼  validate against WorkflowStepLinkedToolState model
    │
    ▼  strip ConnectedValue → separate connections dict
workflow_step dict (= Format2 state) + connections (= Format2 in)
    │
    ▼  validate against WorkflowStepToolState model
    │
    ▼  convert_from_format2() [gxformat2: python_to_workflow()]
Native' (.ga)
    │
    ▼  compare(Native, Native')
    │
  PASS / FAIL with structured diff
```

### Comparison Logic: "Functional Equivalence"

**Fields that MUST match:**
- `tool_id`, `tool_version`
- `tool_state` (parsed JSON, semantic comparison — not string comparison)
- `input_connections` (same topology: same sources, same targets)
- Conditional branch selection (same `when` path chosen)

**Fields explicitly SKIPPED:**
- `__current_case__` (derivable from selector value)
- `__page__`, `__rerun_remap_job_id__` (bookkeeping artifacts)
- `position`, `uuid`, `label` ordering
- `errors` field

**Comparison implementation:**
```python
def compare_tool_state(orig: dict, after: dict, path: str = "") -> List[str]:
    """Recursively compare parsed tool_state dicts.
    Skip bookkeeping keys. Report diffs with dot-path."""
    SKIP_KEYS = {"__current_case__", "__page__", "__rerun_remap_job_id__"}
    diffs = []
    for key in set(list(orig.keys()) + list(after.keys())):
        if key in SKIP_KEYS:
            continue
        # ... recursive comparison with type-aware matching
    return diffs
```

## Phased Execution

### Phase 1: Harness + Simple Workflows (2-3 weeks)

**Goal:** Build harness, get 3-5 native workflows passing, catalog all failure modes.

#### Step 1.1: Build round-trip test harness
**New file:** `test/unit/workflows/test_roundtrip.py`
- `roundtrip_native(workflow_dict) -> (format2_dict, native_prime_dict)`
- `compare_steps(original, roundtripped) -> List[Diff]`
- `compare_tool_state(orig, after, path) -> List[Diff]`
- Diff reporting with paths: `steps/0/tool_state/seed_source/__current_case__`

#### Step 1.2: Run initial sweep against all 71 workflows
- 13 native .ga files: native→format2→native
- 53 framework format2: format2→native→format2
- 5 unit test fixtures

**Expected output:** Failure classification table:
```
| Workflow | Failure Class | Details |
| test_workflow_batch.ga | TYPE_NOT_HANDLED | gx_text parameter |
| test_workflow_map_reduce.ga | PARSE_ERROR | double-nested JSON |
| test_subworkflow_*.ga | NOT_SUPPORTED | subworkflows |
```

#### Step 1.3: Get baseline workflows passing
- `test_workflow_1.ga` — minimal cat workflow (3 steps)
- `test_workflow_two_random_lines.ga` — already validates
- `simple_data.gxwf.yml`, `simple_int.gxwf.yml`
- Fix any harness issues these reveal

#### Step 1.4: Document failure categories
Each failure maps to a D1-D3 work item. Expected categories:

| Failure Class | Count (est.) | Root Cause | Maps To |
|---|---|---|---|
| Type coercion (string↔int) | ~10 | Native uses strings, format2 typed | D1 |
| `__current_case__` mismatch | ~5 | Case index not recalculated | D1 |
| gx_text not handled | ~5 | Missing parameter type | D1/D2 |
| Tool not found | ~3 | Stock tool registry incomplete | D2 (GetToolInfo) |
| Double-nested JSON | ~2 | Legacy encoding | D1 |
| Subworkflows | ~2 | Not yet supported | D1 (early priority) |
| Disconnected input | ~1 | Non-optional without connection | D2 |

### Phase 2: Fix Failures Systematically (3-4 weeks)

**Goal:** Fix failure classes in priority order (most workflows unblocked per fix). Target: 70%+ passing.

#### Step 2.1: Native → workflow_step_linked parser
**Unblocks:** Most failures at once (the core conversion)
- Build `parse_native_to_workflow_step_linked()` using `visit_input_values()` visitor pattern
- Type-coerce per-value JSON strings to typed Python values (string "5" → int 5, "true" → bool True) using parameter type info from `pydantic_template("workflow_step")`
- Inject ConnectedValue for connected params, strip `__page__`/`__rerun_remap_job_id__`/`__current_case__`
- Validate result against `WorkflowStepLinkedToolState` model
- This replaces per-type `_convert_state_at_level()` with a generic visitor approach

#### Step 2.2: workflow_step_linked → workflow_step (format2 state)
**Unblocks:** Clean format2 export
- Strip ConnectedValue markers → connections dict
- Validate result against `WorkflowStepToolState` model
- All parameter types handled automatically by visitor pattern — no per-type code

#### Step 2.3: Conditional handling in parser
**Unblocks:** ~5 workflows with conditionals
- The `workflow_step` discriminated union already handles conditionals without `__current_case__` — it uses the test param value as discriminator
- Parser just needs to strip `__current_case__` and let the model handle branch selection
- Validation catches mismatched branch params automatically

#### Step 2.4: Type coercion edge cases
**Unblocks:** remaining type-specific failures
- Boolean: native truevalue/falsevalue strings → Python bool (StrictBool in `workflow_step`)
- Float: string → float coercion
- Select: verify options validation works with `workflow_step` model

#### Step 2.5: Stock tool registry expansion
**Unblocks:** ~3 workflows with tool-not-found
- `gx_validator.py:GalaxyGetToolInfo` — verify all test workflow tools are indexed
- Add any missing stock tools

#### Step 2.6: Fix connection merging bugs
**File:** `validation_native.py:native_connections_for()`
- Known bug: calls `step.get("input_connections", {})` but discards result
- Fix: use input_connections dict correctly

#### Step 2.7: Double-nested JSON handling
**Unblocks:** test_workflow_map_reduce_pause.ga
- Some older workflows have triple-encoded JSON (JSON string of JSON string of JSON string)
- Add detection and recursive parsing in convert.py

**Red-to-green for each fix:**
1. Identify failing workflow in test_roundtrip.py
2. Write focused test case for the specific failure
3. Implement fix
4. Verify focused test passes
5. Re-run full sweep to check for regressions

#### Phase 2.5: Refactor to visitor pattern

**Motivation:** `convert.py` and `validation_native.py` each hand-roll tree traversal (conditional branch selection, repeat iteration, section recursion) that duplicates `visit_input_values()` in `visitor.py`. Three places to update when adding parameter types or fixing traversal bugs.

**Current visitor limitations** (must fix first):
- `Callback` protocol is `(parameter, value) -> replacement` — no path context, no dual output (state + in), no access to step/input_connections
- `_select_which_when()` has debug `print()` statements (lines 120-121)
- Assumes clean structured dicts — native state has JSON-encoded substates and repeat instances discovered from input_connections

**Approach:**
1. Fix `visitor.py` bugs (remove print statements)
2. Extend callback protocol with path context: `(parameter, value, path, context) -> replacement`
   - `path`: flat state path (e.g. `cond|repeat_0|param`) — visitor already computes this via `flat_state_path()`
   - `context`: opaque dict passed through (carries `step`, `format2_in`, etc.)
3. Add pre-processing hook for native state: JSON string decoding, connection merge — runs before visitor walks each level
4. Refactor `convert.py` to use visitor for tree traversal, keep leaf logic in callback:
   - Callback handles: connection check → `format2_in`, type coercion → `format2_state`, RuntimeValue detection
   - ~30 lines of callback replacing ~60 lines of manual traversal
5. Refactor `validation_native.py` similarly — merge + validation as visitor callback
6. Verify 100% sweep still passes (no behavioral change, pure refactor)

**Risk:** Low — existing 41/41 sweep is the safety net. Pure refactor, no new functionality.

**When:** Before Phase 3 (subworkflows, IWC corpus). Subworkflows will add another traversal concern; better to have one traversal path first.

### Phase 2.6: Subworkflow Support

**Motivation:** Two native test workflows (`test_subworkflow_with_integer_input.ga`, `test_subworkflow_with_tags.ga`) and one framework workflow (`replacement_parameters_nested.gxwf.yml`) are blocked. Subworkflows are structural (no `tool_state`), so they need a different code path than tool steps. gxformat2 already handles them recursively in both directions — the gap is entirely in the `workflow_state` module and the round-trip test harness.

**Key insight:** Subworkflow steps have **no tool_state to convert**. The `tool_state` field is `null`/absent. The work is: (1) don't crash on them, (2) recursively process nested tool steps within the embedded subworkflow, (3) compare nested structures in round-trip.

#### Step 2.6.1: Understand the native subworkflow representation
- Subworkflow steps: `type: "subworkflow"`, `tool_id: <uuid>`, `tool_state: null`
- `subworkflow` key contains a full nested workflow dict (recursive structure)
- Input connections use `"{step_id}:{step_name}"` keys with `input_subworkflow_step_id` field
- Format2 uses `run:` block with inline `class: GalaxyWorkflow` dict or external reference string

#### Step 2.6.2: Handle subworkflow steps in convert.py
- `convert_state_to_format2()` currently requires tool lookup via `get_parsed_tool_for_native_step()` — subworkflow `tool_id` (UUID) won't resolve
- Add early return for `type: "subworkflow"` steps — no `tool_state` conversion needed (state is `null`)
- Recursively call per-step conversion on each tool step within `step["subworkflow"]["steps"]`
- Subworkflow inputs/outputs are structural (data_input, parameter_input) — already handled as non-tool steps

#### Step 2.6.3: Handle subworkflow steps in validation_native.py
- `validate_step_native()` will fail trying to look up subworkflow UUID as a tool
- Add early detection: if `step.get("type") == "subworkflow"`, skip tool validation
- Recursively validate tool steps within nested `step["subworkflow"]["steps"]`
- Validate subworkflow-specific connection format (`input_subworkflow_step_id` present)

#### Step 2.6.4: Update round-trip test harness
- Add `test_subworkflow_with_integer_input.ga` and `test_subworkflow_with_tags.ga` to `NATIVE_WORKFLOWS` inventory
- Remove the `FailureClass.SUBWORKFLOW` early-return in `convert_and_compare_step()`
- For subworkflow steps: recurse into `step["subworkflow"]["steps"]` and convert/compare each tool step
- Add `compare_subworkflow()` function that:
  - Compares nested step count
  - Recursively calls `compare_steps()` on matched tool steps
  - Compares subworkflow input/output structure
  - Compares subworkflow-level input_connections (with `input_subworkflow_step_id`)
- Handle `replacement_parameters_nested.gxwf.yml` in framework sweep (format2→native→format2 direction — the `run:` block should survive round-trip)

#### Step 2.6.5: Full round-trip with nested subworkflows
- `full_roundtrip_native()` currently builds format2 via `from_galaxy_native()` which already handles subworkflows recursively
- Ensure the format2 output includes `run:` blocks for subworkflow steps
- `python_to_workflow()` already reconstructs `subworkflow` key recursively
- Verify: original `subworkflow` dict ≈ roundtripped `subworkflow` dict (same tool steps, same connections, same state)

#### Step 2.6.6: Edge cases
- **Recursive nesting:** Subworkflows can contain subworkflows — ensure recursion handles arbitrary depth
- **External references:** Format2 `run:` can be a string (graph ID or URL) instead of inline dict — handle gracefully (skip or resolve)
- **`content_id` vs `subworkflow`:** Native steps may use `content_id` to reference stored workflows instead of embedding — detect and handle (likely skip for now, flag as limitation)
- **Subworkflow outputs:** `workflow_outputs` on subworkflow steps reference nested step outputs — verify these survive round-trip

**Test plan (red-to-green):**
1. Add subworkflow test files to inventory → tests fail (SUBWORKFLOW failure class)
2. Handle subworkflow steps in convert.py → per-step conversion passes for nested tool steps
3. Handle in validation_native.py → validation passes
4. Update comparison logic → full round-trip comparison works
5. Assert 100% sweep still holds with subworkflow workflows included

**Risk:** Low-medium. gxformat2 does the heavy lifting for structural conversion. Main risk is edge cases in nested connection comparison and subworkflow output mapping.

**When:** After Phase 2.5 (visitor refactor), before Phase 3 (IWC/ToolShed). Subworkflows are common in IWC corpus — must work before scaling to real-world workflows.

### Phase 3: IWC Scale + Execution Validation (3-4 weeks)

**Goal:** Extend to IWC workflows, prove execution equivalence.

#### Step 3.1: IWC workflow collection
- Select 10-20 representative IWC workflows
- These use toolshed tools → need `GetToolInfo` for shed tools
- Full Tool Shed 2.0 API integration with local cache for reuse

#### Step 3.2: Toolshed tool support in GetToolInfo
- Extend `GalaxyGetToolInfo` or create `ToolShedGetToolInfo`
- Tool Shed 2.0 API already serves `ParsedTool` via `show_tool` endpoint
- `lib/tool_shed/webapp/api2/tools.py` — endpoint exists
- Wire into GetToolInfo protocol

#### Step 3.3: Execution equivalence testing
For workflows that pass structural round-trip:
1. Run original native workflow through Galaxy test infrastructure
2. Run round-tripped native' workflow through same infrastructure
3. Compare job outputs (not just metadata)
- Use framework test execution specs (`{name}.gxwf-tests.yml`) as assertions

#### Step 3.4: Framework test workflows WITHOUT `__current_case__`
- Take the 53 framework workflows
- Convert format2→native (produces `__current_case__`)
- Strip all `__current_case__` values
- Run through Galaxy's workflow test runner
- If tests pass → proves `__current_case__` is unnecessary

## How Failures Map to Deliverables

```
Phase 1 failures
    │
    ├─→ "10 workflows fail type coercion"
    │   └─→ D1 work: convert.py type handlers
    │
    ├─→ "5 workflows fail conditional case"
    │   └─→ D1 work: __current_case__ inference
    │
    ├─→ "5 workflows fail gx_text"
    │   └─→ D1+D2: text parameter support
    │
    ├─→ "3 workflows fail tool lookup"
    │   └─→ D3: GetToolInfo expansion
    │
    └─→ "2 workflows fail subworkflows"
        └─→ D1: subworkflow support (early priority)

Phase 2 fixes → D1 (conversion library) + D2 (validation library)
Phase 3 fixes → D3 (native validator) + D4 (format2 validator)
Harness itself → D5 (round-trip utility)
Export integration → D6
```

## Key File Paths

### Files to Create
| File | Purpose | Phase |
|---|---|---|
| `test/unit/workflows/test_roundtrip.py` | Round-trip harness + comparison | 1 |
| `lib/galaxy/tool_util/workflow_state/roundtrip.py` | Reusable round-trip utility | 2 |
| `test/integration/workflows/test_roundtrip_execution.py` | Execution equivalence | 3 |

### Files to Modify
| File | Changes | Phase |
|---|---|---|
| `lib/galaxy/tool_util/workflow_state/convert.py` | Replace per-type `_convert_state_at_level()` with visitor-based parse → `workflow_step_linked` → `workflow_step` pipeline | 2 |
| `lib/galaxy/tool_util/workflow_state/validation_native.py` | Fix connection bug, simplify to use `WorkflowStepLinkedToolState` models | 2 |
| `lib/galaxy/workflow/gx_validator.py` | Expand tool registry | 2-3 |
| `test/unit/workflows/test_workflow_validation.py` | Uncomment blocked tests | 2 |

### Reference Files (read, don't modify)
| File | What It Tells Us |
|---|---|
| `gxformat2/export.py:from_galaxy_native()` | Current export behavior (produces tool_state not state) |
| `gxformat2/converter.py:python_to_workflow()` | Current import behavior (state vs tool_state paths) |
| `lib/galaxy/tool_util_models/parameters.py` | All parameter model classes + `pydantic_template("workflow_step")` — the target representation |
| `lib/galaxy/tool_util/parameters/convert.py` | fill_static_defaults() and visitor pattern |
| `lib/galaxy/tool_util/parameters/visitor.py` | `visit_input_values()` — tree traversal for representation transforms |

## Advantages of This Approach

1. **Real-world driven** — test against actual workflows, not synthetic data
2. **Failure-prioritized** — fix what's broken first, not what we think matters
3. **Incremental value** — each phase produces working functionality
4. **Natural prioritization** — the most common parameter types appear in the most workflows, so they get fixed first
5. **D5 is the harness itself** — the testing infrastructure IS the deliverable

## Risks

1. **gxformat2 export limitations** — `from_galaxy_native()` currently produces `tool_state` not `state`. The round-trip pipeline bypasses this by doing its own conversion: parse native → `workflow_step_linked` → `workflow_step` (= format2 `state`). The gxformat2 export path is only used for non-state parts of the workflow (connections, metadata, structure).
2. **Tool availability** — Framework workflows use stock tools (available). IWC workflows use toolshed tools (need API integration). Phase 3 may be blocked on Tool Shed integration.
3. **Subworkflows** — ~~2 native + 1 framework test workflows use subworkflows.~~ Resolved in Phase 2.6 (`42ae7a48aa`).
4. **Execution tests require Galaxy instance** — Phase 3 execution equivalence needs a running Galaxy with test tools. Heavier infrastructure than structural comparison.

## Resolved Decisions

- **Subworkflows:** Support in early phases — don't get too far without it.
- **Toolshed lookup:** Full Tool Shed 2.0 API integration with local cache.
- **Defaults in round-trip:** Don't fill defaults. Native workflows are fully filled in; format2 may have absent defaults from hand-coding. Comparison should account for this asymmetry.
- **Round-trip in CI:** Integrate round-trip validation into existing workflow framework tests — all workflow tests exercise this in CI without adding new standalone tests.
- **`$link` markers:** `workflow_step` should fail validation if `$link` appears. `workflow_step_linked` handles connection markers.
- **`__current_case__` in reverse pipeline:** Assume omitting it works; validate via framework tests and IWC corpus. Fixing any defects from this is a project deliverable.

## Progress

### Phase 1+2 Complete (2026-03-07)

All stock-tool test workflows pass both per-step conversion and full native→format2→native round-trip comparison.

**Per-step conversion sweep:** 41/41 (100%) — 1 excluded (intentional missing tool)
**Full round-trip sweep:** 14/14 (100%) native workflows

#### Commits (branch `wf_tool_state`)
1. `be3344f8c2` — Round-trip harness + extend native validation/conversion to all param types (35/42)
2. `244bd48f12` — Version-tolerant tool lookup, full round-trip comparison tests (37/42, 14/15 full)
3. `422d1524a5` — Fix ToolExpressionOutput.to_model() for boolean type (40/42)
4. `baf139333e` — Fix native validation merge for gxformat2 output reference strings (41/42)
5. `2c1484cabd` — Exclude list for intentional missing tool, assert 100% in sweeps

#### What was built
- **`test/unit/workflows/test_roundtrip.py`** (~820 lines) — full harness with per-step + full round-trip sweeps, structured failure classification, type-aware comparison logic, exclude list
- **`lib/galaxy/tool_util/workflow_state/convert.py`** — all parameter types converted (conditionals, repeats, sections, rules, all scalars), post-conversion validation, replacement param detection
- **`lib/galaxy/tool_util/workflow_state/validation_native.py`** — all parameter types validated, double-encoded JSON handling, ConnectedValue merge from input_connections
- **`lib/galaxy/workflow/gx_validator.py`** — version-tolerant tool lookup with fallback to latest
- **`lib/galaxy/tool_util/parser/output_objects.py`** — fixed boolean type for expression tool outputs

#### Key bugs fixed
- `ToolExpressionOutput.to_model()` checked `"bool"` but production tools use `"boolean"`
- `_merge_into_state()` only replaced `None`/`"null"` with ConnectedValue; gxformat2 puts output reference strings in tool_state for connected params
- Tool version lookup was exact-match only; added fallback to latest version
- Repeat conversion failed when tool_state had no repeat instances but input_connections referenced them
- Various comparison asymmetries: RuntimeValue/ConnectedValue absence, bookkeeping keys, JSON string encoding, empty lists

#### Known limitations
- Post-conversion validation silently passes when the only errors are ConnectedValue type mismatches (model gap, not conversion bug)
- Replacement parameter states skip post-conversion validation entirely

#### Plan deviations
- Per-type conversion approach kept (no visitor pattern rewrite) — explicit, debuggable, works well
- Phases 1+2 collapsed into ~3 sessions instead of 5-7 weeks
- Full round-trip comparison wired up early (was planned as separate step)

### Phase 2.6 Complete (2026-03-08)

Subworkflow steps now fully supported in round-trip pipeline.

**Per-step conversion sweep:** 43/43 (100%) — was 41, +2 subworkflow workflows
**Full round-trip sweep:** 16/16 (100%) — was 14, +2 subworkflow workflows

#### Commit (branch `wf_tool_state`)
6. `42ae7a48aa` — Subworkflow support for round-trip conversion and validation

#### What was built
- **`test/unit/workflows/test_roundtrip.py`** — recursive subworkflow handling:
  - `_roundtrip_subworkflow_step()` recurses into `step["subworkflow"]["steps"]` for per-step conversion
  - `_compare_workflow_steps()` recurses into subworkflows for nested tool step comparison
  - `_replace_tool_state_with_format2_state()` recurses into format2 `run:` blocks
  - `_ensure_export_defaults()` recurses for gxformat2 export prep
  - `TestSubworkflowRoundTrip` class with dedicated tests for both subworkflow files
- **`lib/galaxy/tool_util/workflow_state/validation_native.py`** — `validate_workflow_native()` recurses into subworkflow steps

#### Key insight
Subworkflow steps have **no `tool_state`** — they're structural. No changes needed in `convert.py` or `_walker.py`. The work was entirely in the test harness (recursion into nested workflows) and the validation entry point.

### Remaining: Phase 3

**Phase 3** (IWC scale + execution validation) is not started. Key items:
- IWC workflow corpus with toolshed tool support
- Execution equivalence testing
- `__current_case__` omission validation via framework tests

## Open Questions

- `workflow_step` model completeness unknown — we won't know until we start validating real workflows. Expect to discover and fix gaps.
