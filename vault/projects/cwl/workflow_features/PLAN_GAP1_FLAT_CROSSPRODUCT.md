# Plan: Implement `flat_crossproduct` Scatter Method

**Assumes**: EphemeralCollection replaced with CollectionAdapters per
CWL_REPLACE_EPHEMERAL_COLLECTIONS_PLAN.md

## Summary

CWL `flat_crossproduct` with `scatter: [A, B]` where A has N elements and B has M
elements produces N*M jobs with a flat output array. Galaxy doesn't implement this.

## Approach: Synthetic Flat HDCAs

Build synthetic flat HDCAs before entering the existing iteration/matching machinery.
For each scatter input, create a new flat HDCA with N*M elements representing the
cartesian product in row-major order. All synthetic HDCAs are then matched as
`linked=True` (dotproduct), reusing all existing iteration and output-collection logic.

This is NOT a merge operation and NOT a CollectionAdapter. It creates genuinely new
collection structures. The adapter pattern handles lazy representation of existing
data; crossproduct creates new arrangements. They are orthogonal.

Example with A=[a1,a2] and B=[b1,b2,b3]:
- Synthetic A: [a1, a1, a1, a2, a2, a2] (6 elements)
- Synthetic B: [b1, b2, b3, b1, b2, b3] (6 elements)
- Matched as dotproduct -> 6 jobs: (a1,b1), (a1,b2), (a1,b3), (a2,b1), (a2,b2), (a2,b3)
- Output: flat list of 6 elements

## Post-Ephemeral-Swap Context

- `EphemeralCollection` no longer exists
- CWL scatter paths use real HDCAs (from upstream steps or materialized from
  CollectionAdapters via `_persist_adapter_as_hdca()` in `build_cwl_input_dict()`)
- Scatter iteration loop wraps bare `DatasetCollection` subcollections directly into
  `HistoryDatasetCollectionAssociation` objects (Step 5b-iii of ephemeral plan)
- Synthetic crossproduct HDCAs follow the same pattern: direct HDCA creation

## Code Changes

### 1. New helper: `_build_flat_crossproduct_hdcas()`

**File**: `lib/galaxy/workflow/modules.py`

```python
from itertools import product

def _build_flat_crossproduct_hdcas(
    scatter_inputs: dict[str, model.HistoryDatasetCollectionAssociation],
    history: model.History,
    sa_session,
) -> dict[str, model.HistoryDatasetCollectionAssociation]:
    """Build synthetic flat HDCAs for flat_crossproduct scatter.

    For each scatter input, creates a new flat HDCA with N*M elements
    representing the cartesian product in row-major order.
    """
    names = list(scatter_inputs.keys())
    element_lists = [list(scatter_inputs[n].collection.elements) for n in names]
    cross = list(product(*element_lists))

    result = {}
    for i, name in enumerate(names):
        dc = model.DatasetCollection(collection_type="list")
        for j, combo in enumerate(cross):
            model.DatasetCollectionElement(
                collection=dc,
                element=combo[i].element_object,
                element_identifier=str(j),
                element_index=j,
            )
        hdca = model.HistoryDatasetCollectionAssociation(
            collection=dc,
            history=history,
        )
        sa_session.add(hdca)
        sa_session.flush()
        result[name] = hdca
    return result
```

Returns real `HistoryDatasetCollectionAssociation` objects — same pattern as
ephemeral plan Step 5b-iii. Each synthetic element references the same underlying
HDA as the original — no copies.

### 2. Modify `find_cwl_scatter_collections()` (CWL tool step path)

**File**: `lib/galaxy/workflow/modules.py` (~line 412-481)

Currently line 453 treats all scatter methods as dotproduct. Changes:
1. After loop identifying scatter inputs, detect if any has `scatter_type == "flat_crossproduct"`
2. Collect those scatter input HDCAs into a dict
3. Call `_build_flat_crossproduct_hdcas()` to build synthetic flat HDCAs
4. Replace original refs in `cwl_input_dict` with synthetic HDCA refs (mutate in-place;
   function already receives `cwl_input_dict` as mutable dict)
5. Add synthetic HDCAs to `collections_to_match` as `linked=True`

```python
# After existing loop, before return:
flat_cross_inputs = {}
for name, ref in cwl_input_dict.items():
    step_input = step_inputs_by_name.get(name)
    if step_input and step_input.scatter_type == "flat_crossproduct":
        hdca = trans.sa_session.get(model.HistoryDatasetCollectionAssociation, ref["id"])
        flat_cross_inputs[name] = hdca

if flat_cross_inputs:
    history = step.workflow_invocation.history
    synthetic = _build_flat_crossproduct_hdcas(flat_cross_inputs, history, trans.sa_session)
    for name, hdca in synthetic.items():
        cwl_input_dict[name] = {"src": "hdca", "id": hdca.id}
        collections_to_match.add(name, hdca, subcollection_type=None, linked=True)
```

### 3. Modify `_find_collections_to_match()` (subworkflow step path)

**File**: `lib/galaxy/workflow/modules.py` (~line 843)

1. Expand assertion to accept `"flat_crossproduct"`:
   ```python
   assert scatter_type in ["dotproduct", "disabled", "flat_crossproduct"], ...
   ```
2. When `scatter_type == "flat_crossproduct"`, collect scatter inputs (real HDCAs
   post-ephemeral-swap) and call `_build_flat_crossproduct_hdcas()`
3. Add synthetic HDCAs as `linked=True`

### 4. Handle empty scatter inputs

When any scatter input is empty, `itertools.product(*element_lists)` yields empty.
All synthetic HDCAs will have 0 elements -> 0 jobs, empty output list. Works
naturally with existing machinery.

### 5. Remove from RED_TESTS

**File**: `scripts/cwl_conformance_to_test_cases.py`

Remove from v1.0, v1.1, v1.2:
- `wf_scatter_two_flat_crossproduct`
- `wf_scatter_flat_crossproduct_oneempty`
- `wf_scatter_twoparam_flat_crossproduct_valuefrom`

Remove from v1.2 only:
- `flat_crossproduct_simple_scatter`
- `flat_crossproduct_flat_crossproduct_scatter`
- `simple_flat_crossproduct_scatter`

## Interaction with Ephemeral Swap

**No conflict.** Flat_crossproduct creates new collection structures; adapters handle
lazy merge representation. They operate at different phases:

1. `build_cwl_input_dict()` materializes adapters → real HDCAs (ephemeral Step 5b-i)
2. `find_cwl_scatter_collections()` loads those HDCAs, detects crossproduct, builds
   synthetic HDCAs (this plan)
3. Scatter iteration loop wraps subcollections → real HDCAs (ephemeral Step 5b-iii)

If a flat_crossproduct input is a nested collection (e.g., `list:list`), each element
in the synthetic flat HDCA is a subcollection. During iteration, these subcollections
hit the Step 5b-iii wrapping path — correct behavior, no special handling needed.

## Testing Strategy (Red-to-Green)

**Phase 1 — CWL tool step path:**
1. `wf_scatter_two_flat_crossproduct` (v1.0) — basic two-input flat cross product
2. `wf_scatter_flat_crossproduct_oneempty` (v1.0) — empty input edge case
3. `wf_scatter_twoparam_flat_crossproduct_valuefrom` (v1.0) — flat cross product + valueFrom

**Phase 2 — Subworkflow path:**
4. `flat_crossproduct_simple_scatter` (v1.2)
5. `flat_crossproduct_flat_crossproduct_scatter` (v1.2)
6. `simple_flat_crossproduct_scatter` (v1.2)

## Critical Files

| File | Change |
|------|--------|
| `lib/galaxy/workflow/modules.py` | Core: new `_build_flat_crossproduct_hdcas()`, modify both scatter paths |
| `lib/galaxy/model/dataset_collections/matching.py` | Reference: `CollectionsToMatch.add()`, `linked` parameter |
| `lib/galaxy/model/dataset_collections/structure.py` | Reference: `multiply`, `walk_collections` |
| `scripts/cwl_conformance_to_test_cases.py` | Remove 6 tests from RED_TESTS |

## Unresolved Questions

1. Do `DatasetCollectionElement` objects in synthetic collections need special handling
   for subcollection types (e.g., when scatter input is itself `list:list`)?
2. Should synthetic HDCAs be marked hidden? Follow same convention as ephemeral plan
   Step 5b-iii scatter subcollection wrapping (currently not hidden).
3. Does `wf_scatter_twoparam_flat_crossproduct_valuefrom` also require the valueFrom
   parser fix from PLAN_GAP3? The `slice_dict` construction at line 2792 replaces each
   scatter input with its element_object before valueFrom evaluation — needs verification.
4. `find_cwl_scatter_collections` needs the history object. Derive from
   `step.workflow_invocation.history` (cleanest, no signature change needed).
5. Should `nested_crossproduct` be implemented simultaneously using the same synthetic
   approach (just different grouping)? Or use the unlinked-matching approach from
   PLAN_GAP2?
