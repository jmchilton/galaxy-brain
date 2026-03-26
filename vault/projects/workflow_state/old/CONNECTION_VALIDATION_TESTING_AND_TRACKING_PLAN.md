# Connection Validation: Testing, Reporting, and Tracking

Replaces Phase 4 reporting and Phase 5 of CONNECTION_VALIDATION.md with a unified approach: fixture-based testing with sidecar expectations, Pydantic report models integrated into the existing `validate.py` infrastructure, and `collection_semantics.yml` tracking via fixture filenames.

---

## 1. Pydantic Report Models

The current connection validation uses dataclass result objects (`ConnectionValidationResult`, `StepConnectionResult`, `WorkflowConnectionResult`) that are separate from the existing `_report_models.py` Pydantic hierarchy. This section adds Pydantic models that:
- Integrate with `--report-json` / `--report-markdown` output
- Carry resolved output types (currently discarded after validation)
- Compose cleanly into the existing `WorkflowValidationResult`

### 1.1 New Models in `_report_models.py`

```python
ConnectionStatus = Literal["ok", "invalid", "skip"]

class ConnectionResult(BaseModel):
    """Single connection between two steps.

    status and mapping are orthogonal:
    - status: whether the connection is valid (ok/invalid/skip)
    - mapping: what collection type is being mapped over (None = direct match)
    A connection can be ok with mapping (valid map-over) or ok without (direct).
    """
    source_step: str
    source_output: str
    target_step: str
    target_input: str
    status: ConnectionStatus
    mapping: Optional[str] = None  # collection type being mapped over, None = direct
    errors: List[str] = []

class ResolvedOutputType(BaseModel):
    """Resolved collection type for a step output."""
    name: str
    collection_type: Optional[str] = None  # None = plain dataset

class ConnectionStepResult(StepResultBase):
    """Connection validation result for one step."""
    step_type: str = "tool"
    map_over: Optional[str] = None
    connections: List[ConnectionResult] = []
    resolved_outputs: List[ResolvedOutputType] = []
    errors: List[str] = []

class ConnectionValidationReport(BaseModel):
    """Connection validation results for one workflow."""
    valid: bool
    step_results: List[ConnectionStepResult] = []
    summary: Dict[str, int] = {}  # {ok, invalid, skip}
```

### 1.2 Extend `WorkflowValidationResult`

Add an optional `connection_report` field to the existing workflow result:

```python
class WorkflowValidationResult(WorkflowResultBase):
    step_results: List[ValidationStepResult] = Field(default=[], serialization_alias="results")
    connection_report: Optional[ConnectionValidationReport] = None
    # ... existing summary computed_field
```

When `--connections` is enabled, `connection_report` is populated. When disabled, it's `None` and excluded from JSON output via `model_dump(exclude_none=True)`. This keeps the existing `--report-json` shape stable for consumers that don't care about connections, while enriching it for those that do.

### 1.3 Resolved Output Types

The validation engine currently builds `resolved_output_types: Dict[str, Dict[str, CollectionTypeOrSentinel]]` during traversal but discards it. Change `validate_connection_graph()` to return this alongside the result, and convert it to `ResolvedOutputType` entries on each `ConnectionStepResult`.

This is the key data that enables testing "what collection type does step X's output Y resolve to after propagation?"

### 1.4 JSON Output Shape (example)

```json
{
  "path": "workflow.ga",
  "results": [ ... tool_state validation ... ],
  "connection_report": {
    "valid": true,
    "step_results": [
      {
        "step": "0",
        "step_type": "data_collection_input",
        "resolved_outputs": [
          {"name": "output", "collection_type": "list:paired"}
        ]
      },
      {
        "step": "1",
        "tool_id": "collection_paired_test",
        "step_type": "tool",
        "map_over": "list",
        "connections": [
          {
            "source_step": "0",
            "source_output": "output",
            "target_step": "1",
            "target_input": "f1",
            "status": "ok",
            "mapping": "list"
          }
        ],
        "resolved_outputs": [
          {"name": "out1", "collection_type": "list"}
        ]
      }
    ],
    "summary": {"ok": 1, "invalid": 0, "skip": 0}
  }
}
```

### 1.5 Formatters

Add text and markdown formatters for `ConnectionValidationReport` following the existing patterns in `validate.py`. The text formatter replaces the current `format_connection_text()`. The markdown formatter adds a "Connection Validation" section to the existing markdown report.

---

## 2. Fixture-Based Test Infrastructure

### 2.1 Directory Layout

```
test/unit/tool_util/workflow_state/
    connection_workflows/
        ok_dataset_to_dataset.gxwf.yml
        ok_paired_to_paired.gxwf.yml
        ok_paired_to_paired_or_unpaired.gxwf.yml
        ok_list_paired_to_paired.gxwf.yml
        ok_list_to_multi_data.gxwf.yml
        ok_collection_type_source_passthrough.gxwf.yml
        ok_structured_like_passthrough.gxwf.yml
        ok_two_inputs_compatible_map_over.gxwf.yml
        ok_chain_map_over_propagates.gxwf.yml
        ok_collection_output_with_map_over.gxwf.yml
        ok_sample_sheet_to_list.gxwf.yml
        fail_list_to_paired.gxwf.yml
        fail_incompatible_map_over.gxwf.yml
        fail_paired_or_unpaired_to_paired.gxwf.yml
        ...
    connection_workflows/expected/
        ok_list_paired_to_paired.yml
        ok_chain_map_over_propagates.yml
        fail_incompatible_map_over.yml
        ...
```

- Workflows are gxformat2 YAML — human-readable, minimal (5-15 lines each)
- Sidecar `.yml` files in `expected/` contain hand-written `[json_path, expected_value]` pairs (see 2.5)
- Not every workflow needs a sidecar — `ok_`/`fail_` prefix is sufficient for the basic assertion
- Sidecars are for cases where we want to verify specific details: mapping types, resolved output types, error messages, skip reasons

### 2.2 Fixture Workflow Format

```yaml
class: GalaxyWorkflow
inputs:
  input_collection:
    type: collection
    collection_type: list:paired
steps:
  step1:
    tool_id: collection_paired_test
    in:
      f1: input_collection
```

Tools referenced by `tool_id` are resolved via `functional_test_tool_source` → `parse_tool`. The functional test tools in `test/functional/tools/` already cover the needed archetypes:

| Tool | Input | Output | Use For |
|------|-------|--------|---------|
| `collection_paired_test` | `f1: paired` | `out1: data` | paired consumption |
| `collection_paired_or_unpaired` | `f1: paired_or_unpaired` | `out1: data` | pou consumption |
| `collection_list_paired_or_unpaired` | `f1: list:paired_or_unpaired` | `out1: data` | compound pou |
| `collection_type_source` | `input_collect: collection(any)` | `list_output: collection(type_source=input_collect)` | dynamic output types |
| `collection_paired_structured_like` | `input1: paired` | `list_output: paired(structured_like)` | structured_like output |
| `collection_creates_pair` | `input1: data` | `paired_output: paired` | paired creation |
| `multi_data_param` | `f1: data(multiple)` | `out1: data` | multi-data reduction |

**Missing tool:** A simple `data → data` tool is needed for basic mapping tests (e.g., `ok_list_to_dataset.gxwf.yml`). None of the existing functional test tools have a single data input and single data output — `collection_creates_pair` takes data but outputs a paired collection. Add a minimal `simple_data_tool.xml` to `test/functional/tools/` with one data input and one data output.

### 2.3 `FunctionalGetToolInfo`

Adapter that bridges `functional_test_tool_source` to the `GetToolInfo` protocol:

```python
class FunctionalGetToolInfo:
    """GetToolInfo backed by functional test tool XMLs."""

    def __init__(self):
        self._cache: Dict[str, Optional[ParsedTool]] = {}

    def get_tool_info(self, tool_id: str, tool_version: Optional[str]) -> Optional[ParsedTool]:
        if tool_id not in self._cache:
            try:
                ts = functional_test_tool_source(tool_id)
                self._cache[tool_id] = parse_tool(ts)
            except Exception:
                self._cache[tool_id] = None
        return self._cache[tool_id]
```

Shared as a module-level or session-scoped pytest fixture to avoid re-parsing tools per test.

### 2.4 Test Runner: `test_connection_workflows.py`

```python
import pytest
import yaml
from pathlib import Path
from gxformat2.converter import python_to_workflow

WORKFLOW_DIR = Path(__file__).parent / "connection_workflows"
EXPECTED_DIR = WORKFLOW_DIR / "expected"

def discover_workflows():
    return sorted(WORKFLOW_DIR.glob("*.gxwf.yml"))

def workflow_ids():
    return [p.stem for p in discover_workflows()]

@pytest.fixture(scope="module")
def tool_info():
    return FunctionalGetToolInfo()

@pytest.mark.parametrize("workflow_path", discover_workflows(), ids=workflow_ids())
def test_connection_workflow(workflow_path, tool_info):
    """Validate fixture workflow and check ok_/fail_ expectation + sidecar assertions."""
    wf_dict = yaml.safe_load(workflow_path.read_text())
    native = python_to_workflow(wf_dict, MinimalGalaxyInterface())
    result = validate_connections(native, tool_info)
    report = to_connection_validation_report(result)

    stem = workflow_path.stem
    if stem.startswith("ok_"):
        assert report.valid, f"Expected valid but got errors: {_collect_errors(report)}"
    elif stem.startswith("fail_"):
        assert not report.valid, f"Expected invalid but workflow validated"
    else:
        pytest.skip(f"Unknown prefix for {stem}")

    # Check sidecar expectations if present
    expected_path = EXPECTED_DIR / f"{stem}.yml"
    if expected_path.exists():
        raw = yaml.safe_load(expected_path.read_text())
        expectations = [(e["target"], e["value"]) for e in raw]
        report_dict = report.model_dump(by_alias=True)
        dict_verify_each(report_dict, expectations)
```

The parametrized test auto-discovers workflows. Adding a new test case = dropping a YAML file.

### 2.5 Sidecar Expectation Files

Sidecar `.yml` files are hand-written lists of `[json_path, expected_value]` pairs — the same pattern as `dict_verify_each` in `test/unit/tool_util/util.py`. Each assertion is a deliberate human/agent judgment, not a snapshot.

Example for `ok_list_paired_to_paired.yml`:
```yaml
- target: [valid]
  value: true
- target: [step_results, 1, map_over]
  value: "list"
- target: [step_results, 1, connections, 0, status]
  value: "ok"
- target: [step_results, 1, connections, 0, mapping]
  value: "list"
- target: [step_results, 1, resolved_outputs, 0, collection_type]
  value: "list"
```

Example for `fail_incompatible_map_over.yml`:
```yaml
- target: [valid]
  value: false
- target: [step_results, 2, errors, 0]
  value: "Incompatible map-over types: list vs paired"
```

Properties:
- Each pair is a deliberate assertion — someone decided this specific path should have this value
- Not every field is checked — only the behaviors that matter for the scenario
- Easy to review: each line is a self-contained claim about the validation result
- No regeneration scripts needed — these are authored, not generated

---

## 3. Relationship to Existing Tests

### 3.1 What Moves to Fixtures

The following tests from `test_connection_validation.py` become fixture workflows:

| Current Test | Fixture |
|-------------|---------|
| `test_dataset_to_dataset_ok` | `ok_dataset_to_dataset.gxwf.yml` |
| `test_collection_to_matching_collection_ok` | `ok_paired_to_paired.gxwf.yml` |
| `test_incompatible_collection_types_invalid` | `fail_list_to_paired.gxwf.yml` |
| `test_paired_to_paired_or_unpaired_ok` | `ok_paired_to_paired_or_unpaired.gxwf.yml` |
| `test_list_to_any_collection_ok` | `ok_any_collection_accepts_list.gxwf.yml` |
| `test_list_paired_over_paired` | `ok_list_paired_to_paired.gxwf.yml` + expectations |
| `test_list_over_dataset` | `ok_list_to_dataset.gxwf.yml` + expectations |
| `test_list_to_multi_data_ok` | `ok_list_to_multi_data.gxwf.yml` |
| `test_paired_to_multi_data_not_reduction` | `ok_paired_maps_over_multi_data.gxwf.yml` + expectations |
| `test_incompatible_map_over_types_error` | `fail_incompatible_map_over.gxwf.yml` + expectations |
| `test_map_over_propagates_through_chain` | `ok_chain_map_over_propagates.gxwf.yml` + expectations |
| `test_collection_output_with_map_over` | `ok_collection_output_with_map_over.gxwf.yml` + expectations |
| `test_collection_type_source_resolution` | `ok_collection_type_source.gxwf.yml` + expectations |
| `test_structured_like_resolution` | `ok_structured_like.gxwf.yml` + expectations |

### 3.2 What Stays Programmatic

- `test_connection_types.py` — unit tests for the adapter free functions. These test `can_match`, `can_map_over`, `effective_map_over` directly against collection type pairs. No workflow context needed.
- `test_connection_graph.py` — unit tests for graph building internals: `_parse_connections`, `_collect_data_inputs` (conditional/repeat/section walking), `_collect_outputs`, `_topological_sort`, cycle detection. These test the graph builder's parameter tree navigation, not validation outcomes.
- `test_unresolved_tool_skips` — stays programmatic since it requires a tool_id that doesn't exist in functional test tools, and this is specifically about the skip behavior. Could also be a fixture with a `skip_` prefix if we add that convention.

### 3.3 Migration Path

1. Build the Pydantic report models and wire resolved outputs
2. Build `FunctionalGetToolInfo` and the test runner
3. Write fixture workflows one at a time, verifying against existing programmatic test assertions
4. Write sidecar expectation files for fixtures needing detailed assertions
5. Remove corresponding programmatic tests as fixtures take over
6. Keep `test_connection_types.py` and `test_connection_graph.py` as-is

---

## 4. `collection_semantics.yml` Tracking

### 4.1 New Test Category

Add `workflow_format_validation` to each example's `tests:` block. The value is the fixture workflow filename (without `.gxwf.yml`):

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
        workflow_format_validation: "ok_list_paired_to_paired"
```

The entry IS the filename. The test runner discovers the file by name, validates it, and the ok/fail status maps directly to the collection_semantics.yml example's expected behavior.

### 4.2 Fixture ↔ Example Mapping

Each `collection_semantics.yml` example that describes a connection scenario gets a fixture workflow. The fixture filename should be traceable to the example label:

| Example Label | Fixture | Expected |
|--------------|---------|----------|
| `BASIC_MAPPING_PAIRED` | `ok_basic_mapping_paired.gxwf.yml` | valid, map_over=paired |
| `BASIC_MAPPING_LIST` | `ok_basic_mapping_list.gxwf.yml` | valid, map_over=list |
| `COLLECTION_INPUT_PAIRED` | `ok_collection_input_paired.gxwf.yml` | valid, direct match |
| `COLLECTION_INPUT_PAIRED_NOT_CONSUMES_LIST` | `fail_paired_not_consumes_list.gxwf.yml` | invalid |
| `PAIRED_OR_UNPAIRED_CONSUMES_PAIRED` | `ok_pou_consumes_paired.gxwf.yml` | valid, direct match |
| `PAIRED_OR_UNPAIRED_NOT_CONSUMED_BY_PAIRED` | `fail_pou_not_consumed_by_paired.gxwf.yml` | invalid |
| `MAPPING_LIST_PAIRED_OVER_PAIRED` | `ok_list_paired_to_paired.gxwf.yml` | valid, map_over=list |
| `LIST_REDUCTION` | `ok_list_to_multi_data.gxwf.yml` | valid, reduction |
| `PAIRED_REDUCTION_INVALID` | `fail_paired_reduction.gxwf.yml` | invalid |
| `SAMPLE_SHEET_MATCHES_LIST` | `ok_sample_sheet_to_list.gxwf.yml` | valid |
| `LIST_NOT_MATCHES_SAMPLE_SHEET` | `fail_list_not_matches_sample_sheet.gxwf.yml` | invalid |

Not every example maps 1:1 — some examples describe runtime behavior (job execution, element identity) that connection validation can't test. Those get `workflow_format_validation: ~` (null) to explicitly mark them as not applicable.

### 4.3 Coverage Verification

A script or test that loads `collection_semantics.yml`, extracts all examples with `workflow_format_validation` entries, and verifies that the referenced fixture file exists and passes/fails as expected. This prevents drift between the tracking document and the test fixtures.

```python
def test_collection_semantics_coverage():
    """Verify all collection_semantics.yml entries have matching fixtures."""
    examples = load_collection_semantics_examples()
    for ex in examples:
        fixture_name = ex.tests.get("workflow_format_validation")
        if fixture_name is None:
            continue  # Not applicable for this example
        fixture_path = WORKFLOW_DIR / f"{fixture_name}.gxwf.yml"
        assert fixture_path.exists(), f"Missing fixture for {ex.label}: {fixture_name}"
```

### 4.4 Example Entries Without Fixture Workflows

Some examples describe behaviors that can't be tested by connection validation alone:
- Runtime element identity/ordering — requires actual job execution
- `collection_type_from_rules` — explicitly out of scope
- Scatter/merge semantics — explicitly out of scope

These get `workflow_format_validation: ~` with a comment explaining why.

---

## 5. Implementation Order

| Step | Delivers | Depends On |
|------|----------|------------|
| 5.1 | Pydantic report models (`ConnectionResult`, `ConnectionStepResult`, `ConnectionValidationReport`) | Existing dataclass models |
| 5.2 | Wire resolved output types into validation result | 5.1 |
| 5.3 | Extend `WorkflowValidationResult` with `connection_report` | 5.1 |
| 5.4 | Update `validate.py` to use Pydantic reports (replace `format_connection_text`, integrate into `emit_reports`) | 5.1, 5.3 |
| 5.5 | Text + markdown formatters for connection report | 5.4 |
| 5.6 | `FunctionalGetToolInfo` adapter + gxformat2 conversion helper | — |
| 5.7 | Test runner (`test_connection_workflows.py`) with fixture discovery + `dict_verify_each` sidecar loading | 5.6 |
| 5.8 | First batch of fixture workflows (10-15 covering the main cases) + hand-written expectation files | 5.7 |
| 5.9 | Remove migrated programmatic tests from `test_connection_validation.py` | 5.8 |
| 5.10 | `collection_semantics.yml` entries for all fixture workflows | 5.8 |
| 5.11 | Coverage verification test | 5.10 |

---

## 6. Unresolved Questions

- For the `sample_sheet` asymmetry cases (`LIST_NOT_MATCHES_SAMPLE_SHEET`): the base class `can_match_type` normalizes symmetrically. Do we need to add asymmetry enforcement to the connection validator before writing those fixtures, or mark them as known gaps?
- Format2 connection validation support: when it lands, do the same fixtures run through a second parametrize axis (`@pytest.mark.parametrize("format", ["native", "format2"])`)? Seems like yes.
