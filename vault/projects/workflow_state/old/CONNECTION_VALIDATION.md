# Workflow Connection Type Validation

## Motivation

Galaxy workflows connect steps via typed data/collection connections. Today the **only** place these connections are validated is in the workflow editor's TypeScript code (`terminals.ts` / `collectionTypeDescription.ts`). The backend validates nothing — it just tries to run and fails at execution time if types are incompatible. Our `galaxy-tool-util` validation infrastructure (`galaxy-workflow-validate`) already validates each step's **tool_state** against its tool definition, but completely ignores inter-step connections.

Adding connection type validation to the offline validator means:
- IWC and other workflow repos can lint connection compatibility without a Galaxy server
- AI agents composing workflows get feedback before submission
- The collection semantics test tracking document (`collection_semantics.yml`) gains a new testing layer

---

## Problem

Given a workflow dict (native or format2), we know:
- Each step's **inputs** (from `ParsedTool.inputs`) — what data/collection types each parameter accepts
- Each step's **outputs** (from `ParsedTool.outputs`) — what each output produces
- Each step's **connections** (from `input_connections` / format2 `in`) — which output feeds which input
- Input step metadata — collection_type declared in tool_state for `data_collection_input` steps

We do NOT currently:
- Check that an output collection type is compatible with the connected input's expected type
- Determine whether mapping or reduction will occur
- Verify that multiple inputs on the same step have compatible map-over types
- Check that output constraints are satisfiable given input mappings
- Verify datatype (extension) compatibility between connected outputs and inputs

---

## Scope

### In Scope
1. **Collection type compatibility** — can this output connect to this input? (direct match, mapping, reduction)
2. **Map-over inference** — what collection type does this step map over, given its connections?
3. **Cross-input constraint checking** — are all inputs on a step compatible in their mapping?
4. **Output collection type resolution** — given map-over state and tool output definitions, what collection type does each output produce?
5. **Transitive validation** — propagate resolved output types through the full workflow DAG
6. **New `workflow_format_validation` test tracking type** in `collection_semantics.yml`

### Out of Scope (for now)
- **Datatype/extension compatibility** — checking that `bam` output connects to an input expecting `bam` (requires a datatype hierarchy/subtype graph we don't have offline; could add later)
- **Parameter type connections** — integer/text/select parameter connections (already validated by tool_state validation)
- **Scatter/merge semantics** — `cross_product` and `flat_cross_product` scatter types (rare, complex)
- **collection_type_from_rules** — rule-based dynamic collection types (runtime-only)

---

## Prerequisites

### Collection Type Refactoring (DONE — 392f607)

Commit `392f607861` extracted the pure-logic `CollectionTypeDescription` from `galaxy.model.dataset_collections.type_description` into `galaxy.tool_util.collections`. The galaxy-data shim re-exports with `rank_type_plugin()` added back. This gives us the foundation for connection validation without a galaxy-data dependency.

**What `galaxy.tool_util.collections` provides:**
- `CollectionTypeDescription` — full type abstraction (subcollection navigation, matching, normalization)
- `CollectionTypeDescriptionFactory` — factory (registry-free in tool-util)
- `COLLECTION_TYPE_REGEX` — regex validation
- `_normalize_collection_type()` — `sample_sheet` → `list` normalization
- `can_match_type(other)` — direct match checking (equivalent to TS `canMatch`)
- `has_subcollections_of_type(other)` — subcollection containment check
- `effective_collection_type(subcollection_type)` — compute type after subcollection stripping
- `map_over_collection_type()` — combine collection types (equivalent to TS `append`)

**What it does NOT provide (gaps vs TypeScript `collectionTypeDescription.ts`):**
1. ~~**`canMapOver` logic** — compound `:paired_or_unpaired` suffix handling~~ — **FIXED** in `has_subcollections_of_type` and `effective_collection_type` (see Bugfix section below)
2. **Sentinel types** — `NULL_COLLECTION_TYPE_DESCRIPTION` and `ANY_COLLECTION_TYPE_DESCRIPTION` don't exist in Python
3. **`rank` property** — Python has `dimension` = `len(split(':')) + 1`, TS has `rank` = `split(':').length` (off by one)
4. **`isCollection`** — not present (trivial)

### Compound `:paired_or_unpaired` Bugfix (DONE)

During review we found that `has_subcollections_of_type` and `effective_collection_type` only handled `paired_or_unpaired` as an exact match, missing compound suffix cases like `list:paired_or_unpaired`. This was both a validation gap AND a backend bug — `query.py:can_map_over()` uses `is_subcollection_of_type` at runtime.

**Example:** `list:list` should be mappable over `collection<list:paired_or_unpaired>` per `collection_semantics.yml` (MAPPING_LIST_LIST_OVER_LIST_PAIRED_OR_UNPAIRED), but `has_subcollections_of_type` returned False.

Fix: added `endswith(":paired_or_unpaired")` branch to `has_subcollections_of_type` and corresponding compound handling in `effective_collection_type`, mirroring the TS logic.

---

## Architecture

### New Module: `connection_types.py`

Thin adapter layer over `galaxy.tool_util.collections` that adds sentinel types and connection-validation-specific helpers. No Galaxy dependencies. Lives in `galaxy.tool_util.workflow_state`.

```
# Imports from galaxy.tool_util.collections:
CollectionTypeDescription          # the existing class — used directly
_normalize_collection_type         # reused for normalization
COLLECTION_TYPE_DESCRIPTION_FACTORY  # reused for creating instances

# New in this module:
can_match(output, input) -> bool                       # delegates to can_match_type + sentinel handling
can_map_over(output, input) -> bool                    # delegates to has_subcollections_of_type + sentinel handling
effective_map_over(output, input) -> CollectionTypeDescription | None  # delegates to effective_collection_type + sentinel handling
rank(ctd) -> int                                       # TS-compatible rank (split(':').length)

NULL_COLLECTION_TYPE     # not a collection (sentinel)
ANY_COLLECTION_TYPE      # collection with unknown type (sentinel)
```

**Design principle:** With the compound `:paired_or_unpaired` bugfix applied to the base class, `has_subcollections_of_type` and `effective_collection_type` now match TS semantics. The adapter functions delegate to the base class and add sentinel handling.

**Key rules:**
1. `can_match` — delegates to existing `can_match_type()`, handles sentinels
2. `can_map_over` — delegates to existing `has_subcollections_of_type()`, handles sentinels
3. `effective_map_over` — delegates to existing `effective_collection_type()`, handles sentinels
4. `sample_sheet` normalization — already handled in base class methods

### New Module: `connection_validation.py`

Workflow-level connection validation. Builds a step graph, resolves connections, validates types.

```
ConnectionResult         # per-connection validation result
StepConnectionResult     # per-step aggregation (all inputs)
WorkflowConnectionResult # whole-workflow result

validate_connections(
    workflow_dict: dict,
    get_tool_info: GetToolInfo,
) -> WorkflowConnectionResult
```

### Integration into `validate.py`

Extend `validate_workflow_cli()` and `ValidateOptions` to optionally run connection validation alongside existing tool_state validation. New flag: `--connections` / `connections: bool = False`.

---

## Detailed Design

### Phase 1: Collection Type Matching Adapter (`connection_types.py`)

Adapter over existing `galaxy.tool_util.collections.CollectionTypeDescription` adding TS editor's map-over reasoning as free functions. No new class — reuses the existing one.

#### 1.1 Sentinel Types

```python
from galaxy.tool_util.collections import (
    CollectionTypeDescription,
    CollectionTypeDescriptionFactory,
    _normalize_collection_type,
    COLLECTION_TYPE_DESCRIPTION_FACTORY,
)

# Protocol-compatible sentinels (duck-typed, not subclasses)
NULL_COLLECTION_TYPE = _NullCollectionType()   # plain dataset
ANY_COLLECTION_TYPE = _AnyCollectionType()     # unconstrained collection input
```

#### 1.2 Free Functions (delegating to base class)

```python
def collection_type_rank(ctd: CollectionTypeDescription) -> int:
    """TS-compatible rank: 'list' = 1, 'list:paired' = 2."""
    return ctd.collection_type.count(":") + 1

def can_match(output: CollectionTypeDescription, input_type: CollectionTypeDescription) -> bool:
    """Delegates to can_match_type(). Handles sentinels."""
    ...

def can_map_over(output: CollectionTypeDescription, input_type: CollectionTypeDescription) -> bool:
    """Delegates to has_subcollections_of_type(). Handles sentinels."""
    ...

def effective_map_over(
    output: CollectionTypeDescription, input_type: CollectionTypeDescription
) -> Optional[CollectionTypeDescription]:
    """Delegates to effective_collection_type(). Handles sentinels.
    Returns remainder collection type after mapping, or None."""
    ...
```

#### 1.4 Matching Rules (from `collectionTypeDescription.ts`)

**`can_match(output_type, input_type)`** — can output directly satisfy input (no mapping)?

| Output | Input | Result | Reason |
|--------|-------|--------|--------|
| `list` | `list` | YES | exact match |
| `paired` | `paired` | YES | exact match |
| `paired` | `paired_or_unpaired` | YES | paired is subset of paired_or_unpaired |
| `paired_or_unpaired` | `paired` | NO | paired_or_unpaired may lack forward/reverse |
| `sample_sheet` | `list` | YES | sample_sheet is a list with metadata |
| `list` | `sample_sheet` | NO | list lacks sample_sheet metadata |
| `sample_sheet:paired` | `list:paired` | YES | same normalization |
| `list:paired` | `sample_sheet:paired` | NO | asymmetry |
| `list:paired` | `list:paired_or_unpaired` | YES | paired suffix matches |
| `list` | `list:paired_or_unpaired` | YES | list elements as unpaired |

**`can_map_over(output_type, input_type)`** — can output be mapped over input?

Returns the "remainder" collection type (what the step maps over), or None if incompatible.

| Output | Input | Map-Over | Remainder |
|--------|-------|----------|-----------|
| `list` | dataset | YES | `list` |
| `paired` | dataset | YES | `paired` |
| `list:paired` | dataset | YES | `list:paired` |
| `list:paired` | `paired` | YES | `list` |
| `list:paired` | `paired_or_unpaired` | YES | `list` |
| `list:list` | `list` (multi-data) | YES | `list` |
| `list:paired` | `list` | NO | paired ≠ list |
| `paired` | `list` | NO | rank too low |
| `list` | `paired_or_unpaired` | YES | `list` (via single_datasets) |
| `list:list` | `paired_or_unpaired` | YES | `list:list` (via single_datasets) |
| `list:paired_or_unpaired` | `paired` | NO | paired_or_unpaired ⊄ paired |

#### 1.5 Test Plan

Unit tests in `test/unit/workflows/test_connection_types.py`:
- Port relevant test cases from `terminals.test.ts` covering `can_match`, `can_map_over`, `effective_map_over`
- Each test case references a `collection_semantics.yml` example label where applicable
- Test the `paired_or_unpaired` asymmetries extensively — especially compound suffix cases that diverge from `has_subcollections_of_type`
- Test `sample_sheet` normalization and asymmetry
- Test sentinel behavior (NULL/ANY)
- Test that `can_match` delegates correctly to `can_match_type`

**Red-to-green approach:** Write tests first from the collection_semantics.yml examples and terminals.test.ts, then implement `can_map_over` and `effective_map_over` free functions until green.

---

### Phase 2: Workflow Graph Builder

#### 2.1 Step Info Extraction

Given a workflow dict + GetToolInfo, build a graph of steps with typed inputs/outputs:

```python
@dataclass
class ResolvedInput:
    name: str
    is_data: bool              # gx_data or gx_data_collection
    is_collection: bool        # gx_data_collection specifically
    collection_type: Optional[CollectionTypeDescription]  # from tool def
    multiple: bool             # data param with multiple=true
    optional: bool
    extensions: List[str]      # accepted datatypes

@dataclass
class ResolvedOutput:
    name: str
    is_data: bool              # type == "data"
    is_collection: bool        # type == "collection"
    collection_type: Optional[CollectionTypeDescription]  # static or None
    collection_type_source: Optional[str]  # input param name for dynamic type
    structured_like: Optional[str]         # input param name for structure
    format: Optional[str]
    format_source: Optional[str]

@dataclass
class ResolvedStep:
    step_index: str
    tool_id: Optional[str]
    step_type: str             # "tool", "data_input", "data_collection_input", "parameter_input", "subworkflow", "pause"
    inputs: Dict[str, ResolvedInput]
    outputs: Dict[str, ResolvedOutput]
    input_connections: Dict[str, List[ConnectionRef]]

    # For data_collection_input steps:
    declared_collection_type: Optional[CollectionTypeDescription]

@dataclass
class ConnectionRef:
    source_step: str           # step index
    output_name: str
```

#### 2.2 Building the Graph

**For tool steps:** Use `ParsedTool` to resolve inputs/outputs
- Walk `ParsedTool.inputs` extracting `DataParameterModel` and `DataCollectionParameterModel` instances (recursing into conditionals/sections/repeats for the input name paths)
- Walk `ParsedTool.outputs` extracting `ToolOutputDataset` and `ToolOutputCollection` instances

**For input steps:** Extract from tool_state
- `data_input`: single dataset output, type from `extensions` in tool_state
- `data_collection_input`: collection output, `collection_type` from tool_state

**For subworkflow steps:** Recurse — validate inner workflow, then expose its declared workflow_outputs as step outputs

**For pause/parameter steps:** No data outputs to validate

#### 2.3 Topological Sort

Process steps in dependency order (topological sort on the DAG formed by `input_connections`). This ensures that when we validate step N's inputs, we've already resolved step N-1's output collection types (including any dynamic `collection_type_source` resolution).

---

### Phase 3: Connection Validation Engine

#### 3.1 Per-Connection Validation

For each connection (source_step/output_name → target_step/input_name):

1. **Resolve source output type:** Look up `ResolvedOutput` for source step. If `collection_type_source` is set, resolve from the source step's own input connections (requires the step's already-resolved input map-over state).

2. **Resolve target input type:** Look up `ResolvedInput` for target step.

3. **Check compatibility:**
   - If output is plain dataset and input expects plain dataset → OK (basic connection)
   - If output is plain dataset and input expects collection → INVALID (can't connect dataset to collection input)
   - If output is collection and input expects plain dataset → MAP_OVER (implicit mapping)
   - If output is collection and input expects collection → check `can_match` first, then `can_map_over`
   - If output is collection and input is multi-data → check list reduction rules (list OK, paired NOT OK, list:list OK via subcollection)
   - Handle `paired_or_unpaired` and `sample_sheet` asymmetries per rules in Phase 1

4. **Compute map-over contribution:** Each connection contributes either:
   - No map-over (direct match / reduction)
   - A map-over collection type (the "remainder" after the input consumes its portion)

```python
@dataclass
class ConnectionValidationResult:
    source_step: str
    source_output: str
    target_step: str
    target_input: str
    status: Literal["ok", "map_over", "invalid", "skip"]
    map_over_type: Optional[CollectionTypeDescription]  # if status == "map_over"
    errors: List[str]
```

#### 3.2 Per-Step Map-Over Resolution

After validating all connections INTO a step, resolve the step's effective map-over:

1. Collect all map-over contributions from each input connection
2. All non-None map-over types must be **compatible** (same type, or one is a prefix of another in the same hierarchy)
3. The step's effective map-over is the "most specific" (highest rank) compatible type
4. If incompatible → error: "inputs have incompatible map-over collection types"

```python
@dataclass
class StepMapOverState:
    step_index: str
    map_over: Optional[CollectionTypeDescription]  # None if no mapping
    per_input: Dict[str, Optional[CollectionTypeDescription]]  # per-input map-over
```

#### 3.3 Output Type Resolution

After resolving a step's map-over state, resolve each output's effective collection type:

1. **Static collection output** (has `collection_type`): output type is `collection_type`. If step is mapped over, prepend the map-over type: `map_over.append(collection_type)`.

2. **Dynamic collection output** (`collection_type_source` set): look up the connected input param, find what collection was connected to it, use that collection's type (after consuming any subcollection). If step is mapped over, prepend.

3. **`structured_like` output**: same structure as the referenced input's connected collection.

4. **Plain dataset output**: if step is mapped over, output becomes a collection with the map-over type. Otherwise, plain dataset.

Store resolved output types on the `ResolvedStep` for downstream consumers.

#### 3.4 Output Constraint Checking

The workflow editor enforces a rule: if a step's outputs are already connected downstream, those connections constrain what map-over types the step's inputs can accept. We replicate this.

**Why it matters:** A step that maps over `list:paired` produces `list:paired` implicit collections from its outputs. If a downstream step is connected expecting a `list` output, then the upstream step can't suddenly start mapping over `list:list:paired` — that would produce `list:list:paired` outputs, breaking the downstream connection.

**Algorithm:** After the initial forward pass (topological order) resolves all map-over states and output types:

1. For each step, check if any of its outputs are connected to downstream steps
2. If so, the downstream connection's expectations constrain this step's outputs
3. Verify that the step's resolved output types are compatible with all downstream connections
4. If a downstream connection expects a collection type that doesn't match the resolved output → error: "output constraint violation: step {N} output '{name}' resolves to {actual_type} but downstream step {M} expects {expected_type}"

**Implementation note:** This is naturally handled by the forward-pass validation — when we validate step M's input connection from step N, we use step N's already-resolved output type. If they're incompatible, the connection validation for step M catches it. The additional value of explicit output constraint checking is producing **better error messages** — attributing the error to the constrained step rather than the downstream consumer.

```python
@dataclass
class OutputConstraint:
    output_name: str
    downstream_step: str
    downstream_input: str
    expected_type: Optional[CollectionTypeDescription]

def check_output_constraints(step: ResolvedStep, all_steps: Dict[str, ResolvedStep]) -> List[str]:
    """Check that resolved output types satisfy all downstream connections."""
    errors = []
    for other_step in all_steps.values():
        for input_name, connections in other_step.input_connections.items():
            for conn in connections:
                if conn.source_step == step.step_index:
                    # Verify step's resolved output type is compatible
                    # with what other_step's input expects
                    ...
    return errors
```

#### 3.5 Workflow-Level Validation

```python
def validate_connections(
    workflow_dict: dict,
    get_tool_info: GetToolInfo,
) -> WorkflowConnectionResult:
    steps = build_resolved_steps(workflow_dict, get_tool_info)
    sorted_steps = topological_sort(steps)

    all_results = []
    for step in sorted_steps:
        step_result = validate_step_connections(step, steps)
        resolve_step_map_over(step, step_result)
        resolve_output_types(step)  # uses map-over state
        all_results.append(step_result)

    return WorkflowConnectionResult(step_results=all_results)
```

---

### Phase 4: Integration

#### 4.1 Extend `validate_workflow_cli`

Add optional `validate_connections=False` parameter. When true, run connection validation after tool_state validation and include results in the report.

#### 4.2 Extend CLI

Add `--connections` flag to `galaxy-workflow-validate`:
```
galaxy-workflow-validate workflow.ga --connections
```

#### 4.3 Result Models

Extend `_report_models.py`:

```python
class ConnectionValidationResult(BaseModel):
    source_step: str
    source_output: str
    target_step: str
    target_input: str
    status: Literal["ok", "map_over", "invalid", "skip"]
    map_over_type: Optional[str] = None
    errors: List[str] = []

class StepConnectionResult(BaseModel):
    step: str
    tool_id: Optional[str] = None
    map_over: Optional[str] = None
    connections: List[ConnectionValidationResult] = []
    errors: List[str] = []  # step-level errors (e.g. incompatible map-overs)

class WorkflowConnectionReport(BaseModel):
    step_results: List[StepConnectionResult] = []

    @computed_field
    @property
    def summary(self) -> Dict[str, int]: ...
```

#### 4.4 Formatters

Text, JSON, and Markdown formatters for connection validation results, following the same patterns as existing `validate.py` formatters.

---

### Phase 5: Test Tracking in `collection_semantics.yml`

#### 5.1 New Test Type

Add `workflow_format_validation` as a test tracking category alongside the existing `tool_runtime`, `workflow_runtime`, and `workflow_editor` types.

Example update to an existing entry:
```yaml
- example:
    label: BASIC_MAPPING_PAIRED
    # ... existing content ...
    tests:
        tool_runtime:
            api_test: "test_tool_execute.py::test_map_over_collection"
        workflow_runtime:
            framework_test: "collection_semantics_cat_0"
        workflow_editor: "accepts paired data -> data connection"
        workflow_format_validation: "test_connection_types.py::test_basic_mapping_paired"
```

#### 5.2 Test Workflow Fixtures

Create minimal workflow dict fixtures that encode each collection_semantics.yml scenario as a 2-3 step workflow:

```
Step 0: data_collection_input (collection_type from example)
Step 1: tool (inputs/outputs from example assumptions)
```

These live in `test/unit/workflows/connection_fixtures/` as small `.ga` or inline dicts.

#### 5.3 Parameterized Test Suite

`test/unit/workflows/test_connection_validation.py`:

```python
# Load collection_semantics.yml examples
# For each example with is_valid: false → assert validation fails
# For each example with type: map_over → assert map_over detected with correct remainder
# For each example with type: reduction → assert direct match (no map_over)
# For each example with type: equivalence → assert both sides produce same result
```

Structure tests so each has a name that matches the `workflow_format_validation` entry in `collection_semantics.yml`.

#### 5.4 Coverage of All Examples

All ~35 examples in `collection_semantics.yml` should get a `workflow_format_validation` test entry. Group tests by category:
- Basic mapping (BASIC_MAPPING_*)
- Nested mapping (NESTED_*)
- Collection input/reduction (COLLECTION_INPUT_*)
- Multi-data reduction (LIST_REDUCTION, PAIRED_REDUCTION_INVALID, etc.)
- Sub-collection mapping (MAPPING_LIST_PAIRED_OVER_*)
- paired_or_unpaired semantics
- sample_sheet semantics

---

## Implementation Order

| Step | Delivers | Depends On | Test Strategy |
|------|----------|------------|---------------|
| 0.1 | `galaxy.tool_util.collections` extraction | — | **DONE** (392f607) — existing tests pass |
| 0.2 | Compound `:paired_or_unpaired` bugfix in base class | 0.1 | **DONE** — new tests for compound suffix cases from collection_semantics.yml |
| 1.1 | Sentinel types (NULL, ANY) | 0.2 | Tests for edge cases |
| 1.2 | Adapter free functions (delegating to base class) | 0.2 | Tests ported from terminals.test.ts |
| 1.3 | Full test suite for connection_types | 1.1-1.2 | Red-to-green against collection_semantics.yml |
| 2.1 | `ResolvedInput/Output/Step` models | — | Unit tests |
| 2.2 | Graph builder from workflow dict | 2.1, 1.1 | Tests with fixture workflows |
| 2.3 | Topological sort | 2.2 | Tests with cyclic detection |
| 3.1 | Per-connection validation | 1.1-1.3, 2.1-2.2 | Tests per collection_semantics.yml example |
| 3.2 | Step map-over resolution | 3.1 | Tests with multi-input steps |
| 3.3 | Output type resolution | 3.2 | Tests with collection_type_source |
| 3.4 | Output constraint checking | 3.3 | Tests with downstream-constrained steps |
| 3.5 | Workflow-level orchestrator | 3.1-3.4 | End-to-end tests with IWC workflows |
| 4.1 | `validate_workflow_cli` integration | 3.4 | Existing test suite still passes |
| 4.2 | CLI `--connections` flag | 4.1 | CLI integration tests |
| 4.3 | Result/report models | — | Pydantic model tests |
| 4.4 | Formatters | 4.3 | Output format tests |
| 5.1 | `collection_semantics.yml` updates | 3.1 | Cross-reference validation |
| 5.2 | Workflow fixtures | 2.2 | Fixture loading tests |
| 5.3 | Parameterized test suite | 5.2, 3.4 | All examples covered |

**Suggested commit groupings:**
0. ~~Extract `CollectionTypeDescription` to `galaxy.tool_util.collections`~~ — **DONE** (392f607)
0b. ~~Fix compound `:paired_or_unpaired` bug in `has_subcollections_of_type`/`effective_collection_type`~~ — **DONE**
1. ~~Phase 1 (connection_types.py adapter + tests) — sentinel types, delegating free functions~~ — **DONE** (see findings below)
2. Phase 2 (graph builder) — depends on Phase 1
3. Phase 3 (validation engine) — depends on Phase 2
4. Phase 4 (integration + CLI) — depends on Phase 3
5. Phase 5 (collection_semantics.yml tracking) — depends on Phase 3

---

## Key Design Decisions

### D1: Fix base class + thin adapter vs parallel implementation

**Decision:** Fix the compound `:paired_or_unpaired` bug directly in `has_subcollections_of_type` and `effective_collection_type` on the base class. Then build `connection_types.py` as a thin adapter that delegates to the base class and adds sentinel types.

**Why:** The base class and TS model the same abstract concepts — they must agree. The bug affected both validation AND the backend runtime (`query.py:can_map_over`). Fixing at the source keeps one implementation, not two.

### D2: Where to put `connection_types.py`

**Decision:** `galaxy.tool_util.workflow_state.connection_types`

**Why:** Same package as the rest of the validation infrastructure. No Galaxy server dependency. Can be used by CLI tools and gxformat2.

### D3: How to handle `collection_type_source` (dynamic output types)

**Decision:** Resolve during topological traversal. When processing a step, look at what's connected to the referenced input param and use that connection's resolved output type.

**Why:** This mirrors what the workflow editor does — OutputCollectionTerminal resolves its type from connected inputs. The topological sort guarantees upstream types are resolved before we need them.

**Limitation:** If the source input is unconnected, we can't resolve the output type → report as "skip" (unknown output type), which may cascade to downstream connection validations.

### D4: How to handle subworkflows

**Decision:** Recursively validate. Subworkflow steps contain an inline `subworkflow` dict (native) or `run` dict (format2). Validate the inner workflow's connections first, then expose its `workflow_outputs` as the subworkflow step's resolved outputs with their computed collection types. The subworkflow step's inputs map to the inner workflow's input steps.

**Why:** Subworkflows are common in real-world workflows (especially IWC). Skipping them leaves a large validation gap. The topological sort within the inner workflow handles dependency ordering naturally — we just need to recurse before resolving the outer step's output types.

**Implementation:** When the graph builder encounters a subworkflow step:
1. Recursively call `validate_connections()` on the inner workflow dict
2. Map the inner workflow's input steps to the subworkflow step's inputs (by name)
3. Map the inner workflow's `workflow_outputs` to the subworkflow step's outputs, carrying the resolved collection types from the inner validation
4. Connection validation for the subworkflow step's inputs validates against the inner workflow's input step expectations
5. Report inner workflow connection results as nested results (prefixed with step index, e.g. "3.0", "3.1")

### D5: Validation strictness

**Decision:** Connection validation is opt-in (`--connections` flag), not on by default.

**Why:** Connection validation requires resolving more tool definitions (for outputs, not just inputs). Some workflows may have tools whose outputs can't be resolved. Making it opt-in avoids breaking existing `galaxy-workflow-validate` usage.

### D6: What about `ANY_COLLECTION_TYPE` inputs

Some `data_collection` inputs have no `collection_type` specified — they accept any collection. These should always match (similar to the editor's `ANY_COLLECTION_TYPE_DESCRIPTION`).

### D7: Multi-data inputs and list reduction

`data` inputs with `multiple=true` effectively accept `list` collections (reduction). But NOT `paired` or `paired_or_unpaired`. This needs to be handled as a special case in the connection validator — treat multi-data as an implicit `collection<list>` input for matching purposes, with the additional constraint that only list-like collection types can be reduced.

---

## Edge Cases

### E1: Unconnected optional inputs
Not an error. Skip validation for unconnected inputs.

### E2: Multiple connections to same input
Only valid for `multiple=true` data inputs. Each connection validated independently. All must be compatible (can't mix collection and non-collection connections to same multi-data input).

### E3: Connected non-data parameters
`input_connections` may reference non-data params (integer, text, etc. connected to workflow parameter outputs). These don't affect collection type validation — skip them.

### E4: `__NO_INPUT_OUTPUT_NAME__` connections
Non-data connections used for step ordering. Skip these.

### E5: Steps with no tool definition
Can't resolve input/output types → skip all connections to/from this step. Report as "skip".

### E6: Circular dependencies
Shouldn't exist in valid workflows, but detect and report as error during topological sort.

### E7: Input steps as connection sources
`data_input` steps produce a single dataset. `data_collection_input` steps produce a collection with the declared `collection_type`. These are the starting points for type propagation.

### E8: Nested parameter paths in input_connections
`input_connections` keys can be nested paths like `"conditional|inner_param"` or `"repeat_0|param"`. Need to resolve these against the tool's parameter tree to find the actual `DataParameterModel` or `DataCollectionParameterModel`.

---

## Phase 1 Findings

### F1: `sample_sheet` asymmetry not enforced at `can_match_type` level

`can_match_type` normalizes both sides (`sample_sheet` → `list`), so `list.can_match_type("sample_sheet")` returns True. The TS `canMatch` behaves identically. The asymmetry (`LIST_NOT_MATCHES_SAMPLE_SHEET`) is enforced at the terminal/connection level, not in `CollectionTypeDescription`. Connection validation (Phase 3) will need to handle this — when checking connections, if the input expects `sample_sheet` specifically, a `list` output should not satisfy it.

### F2: `endswith` bug in `has_subcollections_of_type`

`"list:paired_or_unpaired".endswith("paired")` → True because the substring "paired" appears at the end of "paired_or_unpaired". This means `has_subcollections_of_type` incorrectly reports that `list:paired_or_unpaired` has subcollections of type `paired`. The TS `canMapOver` avoids this by checking `endsWith(":paired")` (with colon prefix). Marked as `xfail` in tests. Fix requires adding colon-prefix awareness to the base class `endswith` check.

---

## Unresolved Questions

- Support `format_source` / `metadata_source` resolution for datatype checking in a future phase?
- Should connection validation warnings (not errors) be reported for `collection_type_source` that can't be resolved? (Seems like yes — "skip" with message)
- Do we want to support validating format2 connections too, or only native? (Format2 uses `in:` blocks with step labels instead of step IDs — different resolution logic but same underlying type checking. Should support both.)
- `collection_type_source` that references an input which itself has `collection_type_source` — need to handle transitive resolution. The topological sort should handle this naturally.
