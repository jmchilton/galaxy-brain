# Plan A: Bottom-Up Parameter Coverage

## Approach

Methodically extend parameter type support across validation and conversion, type-by-type, with red-to-green testing. Audit gaps, design schemas, implement each type, wire into lint, build round-trip harness, integrate export.

## Current Parameter Type Coverage Matrix

| Parameter Type | validation_native | validation_format2 | convert.py | Notes |
|---|---|---|---|---|
| gx_text | - | - | - | Passes through unvalidated |
| gx_integer | Yes | - | Partial | Native: basic int(); Convert: int conversion only |
| gx_float | - | - | - | |
| gx_boolean | - | - | - | |
| gx_color | - | - | - | |
| gx_hidden | - | - | - | |
| gx_data | Yes | - | Partial | Native: checks ConnectedValue/optional; Convert: placeholder |
| gx_data_collection | Yes | - | - | Native: validates like gx_data |
| gx_select | Yes | - | - | Native: validates against options list |
| gx_conditional | Yes | Yes | - | Both: recursive branch validation |
| gx_repeat | Yes | Yes | - | Both: array iteration |
| gx_section | Yes | Yes | - | Both: recursive nesting |
| gx_rules | - | - | - | |
| gx_drill_down | - | - | - | |
| gx_data_column | - | - | - | |
| gx_group_tag | - | - | - | |
| gx_baseurl | - | - | - | |
| gx_genomebuild | - | - | - | |
| gx_directory_uri | - | - | - | |

**Key insight:** `workflow_step` and `workflow_step_linked` were explicitly designed for Format2 state validation (commit `39641f6531`). Pydantic models already exist for ALL parameter types via `pydantic_template()`. `workflow_step` validates raw Format2 `state` (no ConnectedValue, no `__current_case__`, data params absent, most things optional). `workflow_step_linked` validates after merging connections. The validation infrastructure is complete — it's the workflow_state package that hasn't wired into it for most types.

## Implementation Steps

### Phase 1: Scalars (Highest Priority)

Each step follows red-to-green: add test case to `parameter_specification.yml` pattern, run (fails), implement, run (passes).

#### Step 1.1: gx_text
- `convert.py:_convert_state_at_level()` — copy string as-is, handle None for optional
- `validation_native.py:_validate_native_state_at_level()` — validate string or None
- Test: workflows using cat1 tool (text inputs)

#### Step 1.2: gx_float
- Same pattern as gx_integer but with float coercion
- `convert.py` — parse float, handle int-to-float

#### Step 1.3: gx_boolean
- `convert.py` — convert native bool/string ("true"/"false"/"True"/"False") to Python bool
- Native encoding uses string representations; format2 uses YAML booleans

#### Step 1.4: gx_color
- `convert.py` — copy hex string as-is
- Has validator: `validate_color_str` in parameters.py

#### Step 1.5: gx_hidden
- `convert.py` — copy value as-is (usually tool-set, not user-set)

#### Step 1.6: gx_genomebuild, gx_group_tag, gx_baseurl, gx_directory_uri
- All follow TextParameterModel pattern — copy string values

### Phase 2: Complex Types

#### Step 2.1: gx_select (conversion)
- `convert.py` — single select: copy value; multiple select: handle comma-separated vs array
- Validation already done in native; format2 uses same value representation

#### Step 2.2: gx_data_column
- May be absent from state (connected) or contain column index
- Needs special handling for dynamically-populated options

#### Step 2.3: gx_drill_down
- Hierarchical options — single: string value; multiple: array or comma-separated
- Follows select pattern

#### Step 2.4: gx_rules
- Complex dict with rules/mappings — copy dict structure as-is

### Phase 3: Container Conversion (Conditional/Repeat/Section)

These are already validated but not converted.

#### Step 3.1: Conditionals in convert.py
- Determine active `when` branch from test parameter value
- Recursively convert active branch parameters
- Strip `__current_case__` (format2 infers from selector)
- Key function: reuse `_select_which_when()` from validation_format2.py

#### Step 3.2: Repeats in convert.py
- Iterate instances from native indexed-key format (`repeat_0|param`, `repeat_1|param`)
- Build array of instance dicts for format2
- Recursively convert each instance's parameters

#### Step 3.3: Sections in convert.py
- Create nested dict for section
- Recursively convert section parameters
- Handle optional sections (omit if empty)

### Phase 4: Format2 State Validation & Lint Integration

#### Step 4.1: Wire `workflow_step` validation into conversion pipeline
`WorkflowStepToolState.parameter_model_for()` already validates format2 `state` directly — it was designed for this. No new representation needed. The work is:
- Ensure all converted format2 state passes `WorkflowStepToolState` validation
- Ensure merged state (with connections) passes `WorkflowStepLinkedToolState` validation
- Add validation calls at both conversion entry and exit points

#### Step 4.2: Wire validation into gxformat2 lint
- `gxformat2/lint.py` — extend with optional schema-aware validation
- `gxformat2/interface.py` — `ImporterGalaxyInterface` extension or parallel interface
- Schema validation activated when tool definitions available, silent otherwise

### Phase 5: Round-Trip Harness

#### Step 5.1: Build round-trip test utility
- New file: `lib/galaxy/tool_util/workflow_state/roundtrip.py`
- `validate_round_trip(native_workflow, get_tool_info) -> RoundTripResult`
- Pipeline: native → format2 (with `state`) → native → compare

#### Step 5.2: Define "functional equivalence"
- Same parameter values (type-aware comparison, not string comparison)
- Same connections (topology, not ordering)
- Same conditional branch selection
- Explicitly skip: `__current_case__`, `__page__`, `__rerun_remap_job_id__`, position, uuid

#### Step 5.3: Test corpus
- Start: framework test workflows (53 format2 files)
- Expand: native .ga files from `lib/galaxy_test/base/data/`
- Goal: IWC workflow suite

### Phase 6: Export Integration

#### Step 6.1: Schema-aware export path
- New function: `export_workflow_to_format2(workflow_dict, get_tool_info)`
- Uses `convert_state_to_format2()` per step
- Produces `state` (structured) not `tool_state` (JSON strings)

#### Step 6.2: Fallback behavior
- If conversion fails for any step, fall back to native `tool_state`
- Report which steps couldn't be cleanly converted

#### Step 6.3: API endpoint
- Galaxy API returns format2 YAML with `state` blocks
- Only offered for workflows that pass round-trip validation

## Testing Strategy

### Red-to-Green Pattern

For each parameter type:
1. Add workflow fixture using that type (valid/ and invalid/ directories)
2. Add test case to `test_workflow_state_conversion.py`
3. Run → fails (type not handled)
4. Implement in convert.py / validation_*.py
5. Run → passes
6. Add edge cases (optional, connected, default values)

### Existing Test Infrastructure to Leverage

- `parameter_specification.yml` — 2245 lines of valid/invalid payloads, covers `workflow_step` and `workflow_step_linked` for all types
- `test/functional/tools/parameters/` — 104 test tool XML/YAML files, one per parameter type
- `test_parameter_specification.py` — test runner with assertion factory

### New Test Files

| File | Purpose |
|---|---|
| `test/unit/workflows/test_roundtrip.py` | Round-trip harness |

## Deliverable Mapping

| Deliverable | Phase | Key Output |
|---|---|---|
| D1: State Encoding Conversion | Phase 1-3 | `convert.py` with all parameter types |
| D2: State Validation | Phase 1-4 | validation via `workflow_step`/`workflow_step_linked` models |
| D3: Native Workflow Validator | Phase 1-2 | `validate_workflow_native()` covers all types |
| D4: Format2 Workflow Validator | Phase 4 | `WorkflowStepToolState` validation + gxformat2 lint |
| D5: Round-Trip Validation | Phase 5 | `roundtrip.py` + test corpus |
| D6: Format2 Export | Phase 6 | API endpoint + fallback |

## Risks

1. **Long tail of parameter types** — 19+ types means significant implementation work before the system feels "complete." Mitigated by prioritizing the ~8 types that cover 95% of real workflows.
2. **gxformat2 is a separate library** — Schema-aware features must be optional. Can't add galaxy-tool-util dependency to gxformat2.
3. **`workflow_step` model completeness unknown** — We won't know if the `workflow_step` models are complete until we start validating real workflows. Expect to discover and fix gaps as we go.

## Resolved Decisions

- **Defaults:** Don't fill defaults. Native (.ga) workflows are essentially always fully filled in. Format2 workflows may have absent defaults from hand-coding — that's expected and valid.
- **`$link` in state:** `workflow_step` should fail validation if `$link` markers appear. `workflow_step_linked` handles connection markers and may be used as an intermediary during conversion.
- **Unavailable tools:** Fail closed — report error if tool definition can't be resolved.
- **Dynamic selects:** Lenient pass-through when options aren't available at validation time.
- **Toolshed lookup:** Full Tool Shed 2.0 API integration with a local cache for reuse.

## Open Questions

- Where does round-trip utility live — galaxy-tool-util, gxformat2, or both?
