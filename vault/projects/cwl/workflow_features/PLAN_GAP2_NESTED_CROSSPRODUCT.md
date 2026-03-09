# Plan: Implement `nested_crossproduct` Scatter Method

## Summary

CWL `nested_crossproduct` with `scatter: [A, B]` where A has N elements and B has M
creates N*M jobs, returning a nested array-of-arrays: N outer elements each containing
M inner elements. First scatter param = outer, second = inner.

## Approach: Unlinked Collection Matching

Galaxy already has cross product infrastructure via `linked=False` in
`CollectionsToMatch`/`MatchingCollections`. The `multiply` function in `structure.py`
computes cross product structures. The plan is to use this existing mechanism with
modifications for cross-product slicing.

## Code Changes

### 1. Add `slice_collections_crossproduct()` to `MatchingCollections`

**File**: `lib/galaxy/model/dataset_collections/matching.py`

Currently unlinked collections (line 128-130) store only the `structure` but lose the
HDCA reference. Need to also store the collection.

```python
class MatchingCollections:
    def __init__(self):
        self.linked_structure = None
        self.unlinked_structures = []
        self.unlinked_collections = OrderedDict()  # NEW
        self.collections = {}

    def slice_collections_crossproduct(self):
        """Yield cartesian product of unlinked collection elements."""
        ordered_inputs = list(self.unlinked_collections.items())
        yield from self._cross_product_iter(ordered_inputs, 0, {}, None)

    def _cross_product_iter(self, ordered_inputs, idx, base_elements, when_value):
        if idx >= len(ordered_inputs):
            yield base_elements, when_value
            return
        input_name, hdca = ordered_inputs[idx]
        collection = hdca.collection if hasattr(hdca, 'collection') else hdca.child_collection
        for element in collection.elements:
            new_elements = dict(base_elements)
            new_elements[input_name] = element
            yield from self._cross_product_iter(
                ordered_inputs, idx + 1, new_elements, when_value)
```

The iteration order matters: first param = outer loop, second = inner loop.
Output structure is `list:list` (from `multiply`).

### 2. Modify `find_cwl_scatter_collections()` (CWL tool step path)

**File**: `lib/galaxy/workflow/modules.py` (~line 412-481)

Currently line 468 adds all scatter inputs as `linked=True`. For nested_crossproduct,
add as `linked=False` instead:

```python
scatter_method = _get_cwl_scatter_method(step)
is_linked = scatter_method not in ("nested_crossproduct", "flat_crossproduct")
collections_to_match.add(name, hdca, subcollection_type=subcollection_type, linked=is_linked)
```

### 3. Modify CWL tool execution to use cross-product slicing

**File**: `lib/galaxy/workflow/modules.py` (~line 2769-2810)

After `collection_info = match_collections(collections_to_match)`, detect scatter method:

```python
if collection_info:
    scatter_method = _get_cwl_scatter_method(step)
    if scatter_method in ("nested_crossproduct", "flat_crossproduct"):
        iteration_elements_iter = collection_info.slice_collections_crossproduct()
    else:
        iteration_elements_iter = collection_info.slice_collections()
```

### 4. Remove assertion in `_find_collections_to_match()` (subworkflow path)

**File**: `lib/galaxy/workflow/modules.py` (line 843)

Expand to accept `"nested_crossproduct"` and `"flat_crossproduct"`. Add collections
as `linked=False` when scatter method is crossproduct.

### 5. Helper function for scatter method detection

**File**: `lib/galaxy/workflow/modules.py`

```python
def _get_cwl_scatter_method(step) -> str:
    """Return CWL scatterMethod for a step, default 'dotproduct'."""
    for si in step.inputs:
        if si.scatter_type and si.scatter_type not in ("disabled", "dotproduct"):
            return si.scatter_type
    return "dotproduct"
```

All scatter inputs on a CWL step share the same `scatterMethod` (step-level property).

### 6. Remove from RED_TESTS

**File**: `scripts/cwl_conformance_to_test_cases.py`

Remove from v1.0, v1.1, v1.2:
- `wf_scatter_two_nested_crossproduct`
- `wf_scatter_nested_crossproduct_firstempty`
- `wf_scatter_nested_crossproduct_secondempty`
- `wf_scatter_twoparam_nested_crossproduct_valuefrom`

Remove from v1.2 only:
- `nested_crossproduct_simple_scatter`
- `nested_crossproduct_nested_crossproduct_scatter`
- `simple_nested_crossproduct_scatter`

## Relationship to flat_crossproduct

Both methods share:
- `linked=False` collection matching
- `slice_collections_crossproduct()` iteration (identical job/param generation)
- Detection logic in both scatter code paths

They differ only in output collection structure:
- `nested_crossproduct`: `list:list` (natural from `multiply`)
- `flat_crossproduct`: `list` (flattened)

**Recommendation**: Implement nested_crossproduct first — it maps naturally to Galaxy's
existing `multiply` structure. flat_crossproduct needs additional flattening logic.
An alternative for flat_crossproduct is the synthetic-HDCA approach from PLAN_GAP1.

## Testing Strategy (Red-to-Green)

1. `wf_scatter_two_nested_crossproduct` (v1.0) — simplest: two string arrays, CommandLineTool
   Expected: `[[foo one three, foo one four], [foo two three, foo two four]]`
2. `wf_scatter_nested_crossproduct_secondempty` (v1.0) — empty second input
   Expected: `[[], []]`
3. `wf_scatter_nested_crossproduct_firstempty` (v1.0) — empty first input
   Expected: `[]`
4. `wf_scatter_twoparam_nested_crossproduct_valuefrom` (v1.0) — with valueFrom
5. `nested_crossproduct_simple_scatter` (v1.2) — subworkflow path
6. `simple_nested_crossproduct_scatter` (v1.2) — subworkflow path
7. `nested_crossproduct_nested_crossproduct_scatter` (v1.2) — both levels nested

## Critical Files

| File | Change |
|------|--------|
| `lib/galaxy/model/dataset_collections/matching.py` | Add unlinked tracking + `slice_collections_crossproduct()` |
| `lib/galaxy/workflow/modules.py` | Modify both scatter paths, add helper, update execution loop |
| `lib/galaxy/model/dataset_collections/structure.py` | Reference: `multiply`/`walk_collections` |
| `lib/galaxy/tool_util/cwl/parser.py` | Reference: scatter_type parsing, verify ordering |
| `scripts/cwl_conformance_to_test_cases.py` | Remove 7 tests from RED_TESTS |

## Unresolved Questions

1. Is scatter input ordering (first=outer, second=inner) preserved through the CWL
   parser into `step.inputs`? The parser creates `InputProxy` from `self._step.tool["inputs"]`
   — need to verify scatter list order matches step_input insertion order.
2. `for_collections` with `linked=False` loses HDCA ref (line 128-130). Need separate
   `self.unlinked_collections` dict — does storing both linked and unlinked cause conflicts?
3. For subworkflow tests, does `subworkflow_collection_info` propagation handle the
   `list:list` structure correctly? Inner workflow sees nested structure — need to verify.
4. Empty collections: does Galaxy's implicit collection creation handle `list:list` with
   0 outer elements? Existing empty dotproduct tests pass, but list:list may differ.
5. Should flat_crossproduct reuse the same `slice_collections_crossproduct()` with a
   post-flatten step, or use the synthetic-HDCA approach from PLAN_GAP1 instead?
