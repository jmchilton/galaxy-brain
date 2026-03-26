# Plan: Structured Diff Classification for Roundtrip Validation

## Goal

Replace plain string diffs with structured objects that classify each mismatch by type and severity. Known-benign representation artifacts (all-None sections dropped, empty repeats dropped, connection-only sections dropped) are distinguished from real data loss. Reporting surfaces the distinction in text, JSON, and summary output.

## Data Model

```python
class DiffType(Enum):
    VALUE_MISMATCH = "value_mismatch"
    MISSING_IN_ROUNDTRIP = "missing_in_roundtrip"
    MISSING_IN_ORIGINAL = "missing_in_original"
    CONNECTION_MISMATCH = "connection_mismatch"
    POSITION_MISMATCH = "position_mismatch"
    LABEL_MISMATCH = "label_mismatch"
    ANNOTATION_MISMATCH = "annotation_mismatch"
    COMMENT_MISMATCH = "comment_mismatch"

class DiffSeverity(Enum):
    ERROR = "error"
    BENIGN = "benign"

@dataclass
class StepDiff:
    step_path: str                        # "step 6" or "step 22:subworkflow//step 3"
    key_path: str                         # "single_paired.global_trimming_options"
    diff_type: DiffType
    severity: DiffSeverity
    description: str                      # human-readable summary
    original_value: Optional[Any] = None
    roundtrip_value: Optional[Any] = None
    benign_reason: Optional[str] = None   # why it's benign, if severity=BENIGN
```

## Benign Classification

Three patterns, classified at construction time in `compare_tool_state`:

### 1. All-None section dropped
`MISSING_IN_ROUNDTRIP` where original value is a dict with every leaf `None`/`"null"`.

```python
def _is_all_none_dict(d):
    if not isinstance(d, dict):
        return False
    for v in d.values():
        if isinstance(v, dict):
            if not _is_all_none_dict(v):
                return False
        elif v not in (None, "null"):
            return False
    return True
```

Benign reason: `"all-None section omitted by format2 export"`

### 2. Empty repeat/list dropped
`MISSING_IN_ROUNDTRIP` where original value is `[]`, or a dict containing only `[]` values and `None`/`"null"`.

```python
def _is_empty_container_dict(d):
    if not isinstance(d, dict):
        return False
    for v in d.values():
        if isinstance(v, list) and len(v) == 0:
            continue
        if isinstance(v, dict):
            if not _is_empty_container_dict(v):
                return False
        elif v not in (None, "null"):
            return False
    return True
```

Benign reason: `"empty repeat/list omitted by format2 export"`

### 3. Connection-only section dropped
`MISSING_IN_ROUNDTRIP` where original value is a dict with every leaf a `ConnectedValue`/`RuntimeValue` marker or `None`.

```python
def _is_connection_only_dict(d):
    if not isinstance(d, dict):
        return False
    for v in d.values():
        if isinstance(v, dict):
            if _is_connection_marker(v):
                continue
            if not _is_connection_only_dict(v):
                return False
        elif v not in (None, "null"):
            return False
    return True
```

Benign reason: `"connection-only section omitted by format2 export (connections preserved in 'in' block)"`

Everything else: `severity=ERROR`.

## Changes to Comparison Functions

All comparison functions return `list[StepDiff]` instead of `list[str]`:

- `compare_tool_state(orig, after, path, step_path)` → `list[StepDiff]`
- `_compare_list_state(orig, after, path, step_path)` → `list[StepDiff]`
- `_compare_step_visual(orig, after, step_path)` → `list[StepDiff]`
- `compare_connections(orig, after, step_path)` → `list[StepDiff]`
- `_compare_connections_with_id_mapping(orig, after, id_mapping, step_path)` → `list[StepDiff]`
- `compare_comments(orig, after, path)` → `list[StepDiff]`
- `compare_steps(orig, after, step_path)` → `list[StepDiff]`
- `_compare_steps_with_id_mapping(orig, after, id_mapping, step_path)` → `list[StepDiff]`
- `compare_workflow_steps(orig, after, path)` → `list[StepDiff]`

The `step_path` parameter threads through from `compare_workflow_steps` so each `StepDiff` has its full path at construction.

## Changes to RoundTripValidationResult

```python
@dataclass
class RoundTripValidationResult:
    ...
    diffs: Optional[list[StepDiff]] = None

    @property
    def error_diffs(self) -> list[StepDiff]:
        return [d for d in (self.diffs or []) if d.severity == DiffSeverity.ERROR]

    @property
    def benign_diffs(self) -> list[StepDiff]:
        return [d for d in (self.diffs or []) if d.severity == DiffSeverity.BENIGN]

    @property
    def ok(self) -> bool:
        if self.error:
            return False
        if self.conversion_result and not self.conversion_result.success:
            return False
        if self.diffs is None:
            return False
        return len(self.error_diffs) == 0

    @property
    def status(self) -> str:
        if self.error:
            return "error"
        if self.conversion_result and not self.conversion_result.success:
            return "conversion_fail"
        if self.diffs is None:
            return "error"
        if len(self.error_diffs) > 0:
            return "roundtrip_mismatch"
        return "ok"

    @property
    def summary_line(self) -> str:
        status = self.status
        name = os.path.basename(self.workflow_path)
        n_steps = len(self.conversion_result.step_results) if self.conversion_result else 0
        if status == "ok":
            benign = len(self.benign_diffs)
            if benign:
                return f"{name}: OK ({n_steps} steps, {benign} benign diff(s))"
            return f"{name}: OK ({n_steps} steps)"
        elif status == "conversion_fail":
            ...  # unchanged
        elif status == "roundtrip_mismatch":
            errors = len(self.error_diffs)
            benign = len(self.benign_diffs)
            parts = f"{errors} error(s)"
            if benign:
                parts += f", {benign} benign"
            return f"{name}: MISMATCH ({parts})"
        else:
            ...  # unchanged
```

## CLI Changes

### `--strict` flag

Add `strict: bool = False` to `RoundTripValidateOptions`. When strict:
- `ok` treats benign diffs as errors (all diffs are errors)
- Summary counts benign diffs as failures

Implementation: add a `strict` param to `RoundTripValidationResult.ok` or check in the CLI when computing exit code.

Simpler approach — keep the model severity-aware, handle strict in the CLI/runner:

```python
def _is_passing(result: RoundTripValidationResult, strict: bool) -> bool:
    if strict:
        return result.diffs is not None and len(result.diffs) == 0
    return result.ok
```

### Text output (`format_validation_text`)

Verbose mode shows all diffs with severity tag:

```
chipseq-sr.ga: OK (13 steps, 1 benign diff(s))
  [benign] step 6: single_paired.global_trimming_options — all-None section omitted by format2 export

gromacs-dctmd.ga: OK (13 steps, 2 benign diff(s))
  [benign] step 28: inps — connection-only section omitted (connections in 'in' block)
  [benign] step 34: inps — connection-only section omitted (connections in 'in' block)
```

Non-verbose: benign diffs counted but not listed. Error diffs always listed.

### JSON output

Each `StepDiff` serialized:
```json
{
  "step_path": "step 6",
  "key_path": "single_paired.global_trimming_options",
  "diff_type": "missing_in_roundtrip",
  "severity": "benign",
  "description": "present in original ({'trim_front1': None, ...}), missing in roundtripped",
  "original_value": {"trim_front1": null, "trim_tail1": null},
  "roundtrip_value": null,
  "benign_reason": "all-None section omitted by format2 export"
}
```

### Summary line

```
Summary: 71 OK (30 clean, 41 with benign diffs), 41 FAIL (total 112 workflows)
```

With `--strict`:
```
Summary: 30 OK, 82 FAIL (total 112 workflows)
```

## Implementation Order

1. Add `DiffType`, `DiffSeverity`, `StepDiff` to roundtrip.py
2. Add `_is_all_none_dict`, `_is_empty_container_dict`, `_is_connection_only_dict` classifiers
3. Refactor `compare_tool_state` → return `list[StepDiff]`, classify at construction
4. Refactor visual/connection/comment comparison functions similarly
5. Refactor `compare_workflow_steps` to thread `step_path` through
6. Update `RoundTripValidationResult` properties
7. Update `format_validation_text` for severity-aware output
8. Add `--strict` flag to CLI
9. Run IWC suite — expect ~41 current MISMATCH to become OK with benign diffs
10. Tests — verify benign classification for each artifact type

## Unresolved Questions

None.
