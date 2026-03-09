# Plan: Fix `dotproduct` + `valueFrom` Scatter

## Summary

Multi-parameter dotproduct scatter combined with `valueFrom` fails because the CWL
parser assigns `scatter_type` to ALL step inputs when `scatterMethod` is present,
not just the inputs actually listed in `scatter`.

## Root Cause

**File**: `lib/galaxy/tool_util/cwl/parser.py`, lines 1205-1208

In `InputProxy.to_dict()`:
```python
if "scatterMethod" in self.step_proxy._step.tool:
    as_dict["scatter_type"] = self.step_proxy._step.tool.get("scatterMethod", "dotproduct")
else:
    as_dict["scatter_type"] = "dotproduct" if self.scatter else "disabled"
```

The `self.scatter` boolean correctly identifies whether this input is in the scatter
list, but it's only consulted in the `else` branch — when `scatterMethod` is absent.
Multi-parameter scatter always specifies `scatterMethod`, so non-scattered inputs
incorrectly get `scatter_type = "dotproduct"`.

**Downstream effect**: In `find_cwl_scatter_collections()`, the non-scattered input
(e.g., `first` which receives the full array for `$(self[0].instr)`) gets added to
`collections_to_match` and scattered per-element. The `valueFrom` expression then
receives a single record instead of the full array.

Single-parameter scatter never specifies `scatterMethod`, so those tests pass.

## Code Changes

### 1. Fix the parser

**File**: `lib/galaxy/tool_util/cwl/parser.py`, lines 1205-1208

Replace:
```python
if "scatterMethod" in self.step_proxy._step.tool:
    as_dict["scatter_type"] = self.step_proxy._step.tool.get("scatterMethod", "dotproduct")
else:
    as_dict["scatter_type"] = "dotproduct" if self.scatter else "disabled"
```

With:
```python
if self.scatter:
    if "scatterMethod" in self.step_proxy._step.tool:
        as_dict["scatter_type"] = self.step_proxy._step.tool.get("scatterMethod", "dotproduct")
    else:
        as_dict["scatter_type"] = "dotproduct"
else:
    as_dict["scatter_type"] = "disabled"
```

Non-scattered inputs always get `"disabled"` regardless of `scatterMethod` presence.

### 2. Add unit test

**File**: `test/unit/tool_util/test_cwl.py`

Add test parsing `scatter-valuefrom-wf4.cwl` (the dotproduct + valueFrom workflow):
- Assert `echo_in1` has `scatter_type = "dotproduct"` and `value_from` set
- Assert `echo_in2` has `scatter_type = "dotproduct"` and no `value_from`
- Assert `first` has `scatter_type = "disabled"` and `value_from` set

Follow pattern of existing `test_workflow_scatter()` at line 240.

### 3. Remove from RED_TESTS

**File**: `scripts/cwl_conformance_to_test_cases.py`

Remove `wf_scatter_twoparam_dotproduct_valuefrom` from RED_TESTS for v1.0, v1.1, v1.2.

Do NOT remove crossproduct+valueFrom variants — crossproduct itself isn't implemented.

## Testing Strategy

1. Write unit test asserting `first` gets `scatter_type = "disabled"` — RED
2. Apply parser fix — unit test GREEN
3. Run existing `test_workflow_scatter` — verify no regression
4. Run conformance test `wf_scatter_twoparam_dotproduct_valuefrom` (v1.2) — verify GREEN

## Risk Assessment

The fix is narrow and correct: non-scattered inputs should never have a scatter type
other than `"disabled"`. Only inputs NOT in the `scatter` list on steps with
`scatterMethod` are affected. No passing test relies on the incorrect behavior.

## Critical Files

| File | Change |
|------|--------|
| `lib/galaxy/tool_util/cwl/parser.py` | Fix scatter_type assignment (lines 1205-1208) |
| `test/unit/tool_util/test_cwl.py` | Add unit test |
| `scripts/cwl_conformance_to_test_cases.py` | Remove 1 test from RED_TESTS (all 3 versions) |

## Unresolved Questions

1. The crossproduct+valuefrom tests also have this bug, but fixing it alone won't make
   them pass (crossproduct isn't implemented). Should we verify they fail with a
   different/better error after this fix?
2. Need to regenerate CWL conformance test cases after modifying RED_TESTS?
   (`make generate-cwl-conformance-tests`)
3. Is there a CI target that runs the CWL conformance suite, or only local `run_tests.sh`?
   (Answer: `.github/workflows/cwl_conformance.yaml`)
