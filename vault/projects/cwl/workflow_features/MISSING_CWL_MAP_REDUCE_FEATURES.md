# Missing CWL Workflow Mapping/Scatter Features in Galaxy

Summary of failing CWL conformance tests related to scatter, cross product,
merge, and multi-input mapping features that Galaxy has not yet implemented.

---

## Overview

Galaxy currently supports **only `dotproduct` scatter** for multi-input cases.
The `flat_crossproduct` and `nested_crossproduct` scatter methods are explicitly
unimplemented. Merge operations are partially implemented. Scatter + conditional
combinations also fail. All tests below are marked RED (known failing).

### Two Distinct Scatter Code Paths

Galaxy has two separate code paths for scatter execution, which produce different
failure modes:

1. **CWL tool steps** use `find_cwl_scatter_collections()` (`modules.py:412-481`).
   This function has **no assertion** on scatter type — it silently treats all
   scatter methods as dotproduct, producing **wrong results** (`CompareFail`).

2. **Subworkflow steps** use `_find_collections_to_match()` via
   `compute_collection_info()` (`modules.py:818→843`). This path has a **hard
   assertion** that blocks flat/nested crossproduct:
   ```python
   assert scatter_type in ["dotproduct", "disabled"], f"Unimplemented scatter type [{scatter_type}]"
   ```
   This produces **`Final state - failed`** (assertion propagates as unexpected failure).

The v1.0/v1.1 crossproduct tests scatter on CommandLineTool steps (path 1),
while the v1.2 nested-scatter tests scatter on subworkflow steps (path 2).

---

## Feature Gap 1: `flat_crossproduct` Scatter Method (NOT IMPLEMENTED)

CWL spec: Given `scatter: [A, B]` with `scatterMethod: flat_crossproduct`, the
runner should create N×M jobs (cartesian product) and return a flat array of results.

### Failing Tests

| Test ID | CWL Versions | Error |
|---------|-------------|-------|
| `wf_scatter_two_flat_crossproduct` | v1.0, v1.1, v1.2 | CompareFail — silently runs as dotproduct (CWL tool step path) |
| `wf_scatter_flat_crossproduct_oneempty` | v1.0, v1.1, v1.2 | CompareFail — silently runs as dotproduct |
| `wf_scatter_twoparam_flat_crossproduct_valuefrom` | v1.0, v1.1, v1.2 | CompareFail — silently runs as dotproduct |
| `flat_crossproduct_simple_scatter` | v1.2 | `Final state - failed` — assertion error via subworkflow path |
| `flat_crossproduct_flat_crossproduct_scatter` | v1.2 | `Final state - failed` — assertion error via subworkflow path |
| `simple_flat_crossproduct_scatter` | v1.2 | `CompareFail` — expected 4 arrays of 16 elements (cross product), got flat 4-element array (dot product behavior) |

### Impact
- 3 tests fail across **all three** CWL versions (v1.0, v1.1, v1.2)
- 3 additional tests fail in v1.2 only (subworkflow scatter combinations)

---

## Feature Gap 2: `nested_crossproduct` Scatter Method (NOT IMPLEMENTED)

CWL spec: Given `scatter: [A, B]` with `scatterMethod: nested_crossproduct`, the
runner should create N×M jobs and return a nested array-of-arrays structure.

Same two failure modes as flat_crossproduct: silent dotproduct fallback for tool
steps, assertion error for subworkflow steps.

### Failing Tests

| Test ID | CWL Versions | Error |
|---------|-------------|-------|
| `wf_scatter_two_nested_crossproduct` | v1.0, v1.1, v1.2 | CompareFail — silently runs as dotproduct |
| `wf_scatter_nested_crossproduct_firstempty` | v1.0, v1.1, v1.2 | CompareFail — silently runs as dotproduct |
| `wf_scatter_nested_crossproduct_secondempty` | v1.0, v1.1, v1.2 | CompareFail — silently runs as dotproduct |
| `wf_scatter_twoparam_nested_crossproduct_valuefrom` | v1.0, v1.1, v1.2 | CompareFail — silently runs as dotproduct |
| `nested_crossproduct_simple_scatter` | v1.2 | `Final state - failed` — assertion error via subworkflow path |
| `nested_crossproduct_nested_crossproduct_scatter` | v1.2 | `Final state - failed` — assertion error via subworkflow path |
| `simple_nested_crossproduct_scatter` | v1.2 | `CompareFail` — expected deeply nested 4×4×4 array, got flat 4-element array (dot product) |

### Impact
- 4 tests fail across **all three** CWL versions
- 3 additional tests fail in v1.2 only

---

## Feature Gap 3: `dotproduct` + `valueFrom` (BROKEN)

Dotproduct scatter combined with `valueFrom` expressions on step inputs fails.

### Failing Tests

| Test ID | CWL Versions | Error |
|---------|-------------|-------|
| `wf_scatter_twoparam_dotproduct_valuefrom` | v1.0, v1.1, v1.2 | Scatter with valueFrom on two params produces wrong results |

Note: `valuefrom_wf_step` (also in RED_TESTS for all versions) is NOT scatter-related —
it tests `valueFrom` on a non-scattered step input and fails for different reasons.

---

## Feature Gap 4: Scatter into Subworkflows (BROKEN)

Scatter into subworkflow steps fails even with basic dotproduct scatter. Galaxy's
`SubWorkflowModule` passes the entire HDCA collection reference to the subworkflow
instead of scattering individual elements.

### Failing Tests

| Test ID | CWL Versions | Error |
|---------|-------------|-------|
| `simple_simple_scatter` | v1.2 | Pydantic error: `letter - Input should be a valid string` got `{'src': 'hdca', 'id': ...}`. Collection passed as whole instead of scattered elements. |
| `dotproduct_simple_scatter` | v1.2 | Same pydantic error — collection ref instead of individual elements. |
| `dotproduct_dotproduct_scatter` | v1.2 | `CompareFail` — expected 4×4 nested array, got flat 4-element array. |
| `simple_dotproduct_scatter` | v1.2 | `CompareFail` — expected 4×4 nested array (outer simple × inner dotproduct), got flat 4-element array. |
| `scatter_embedded_subworkflow` | v1.1, v1.2 | Scatter over embedded subworkflow fails |
| `scatter_multi_input_embedded_subworkflow` | v1.1, v1.2 | Multi-input scatter over embedded subworkflow fails |

### Root Cause
`SubWorkflowModule._find_collections_to_match()` via `compute_collection_info()`
doesn't properly decompose collections for scatter into subworkflow steps. The
assertion at `modules.py:843` also blocks non-dotproduct methods entirely.

---

## Feature Gap 5: Scatter + Conditional (`when`) Interactions (BROKEN)

**Plan**: Folded into `CWL_CONDITIONALS_PICK_VALUE_FRAMEWORK_SUPPORT.md` (pickValue
plan covers all 9 tests). The int[] defaults fix is Phase 0; scatter null filtering
is Pattern B (Phase 6). `conditionals_nested_cross_scatter` also requires GAP2.

CWL v1.2 added `when` clauses to workflow steps. When combined with scatter,
the spec says null results from skipped (condition=false) scatter elements should
be **removed** from the output array. Galaxy retains nulls or fails entirely.

### Failing Tests — JavaScript Variants

| Test ID | Error |
|---------|-------|
| `condifional_scatter_on_nonscattered_false` (sic) | `CompareFail` — expected `[]` (empty), got `[null, null, null, null, null, null]`. Galaxy doesn't strip nulls from conditional scatter output. |
| `scatter_on_scattered_conditional` | `CompareFail` — expected `["foo 4", "foo 5", "foo 6"]`, got `[null, null, null, "foo 4", "foo 5", "foo 6"]`. Nulls retained for filtered elements. |
| `conditionals_nested_cross_scatter` | `Final state - failed` — `'Cannot match collection types.'` Combines unimplemented nested_crossproduct + when clause. |
| `conditionals_multi_scatter` | `CompareFail` — expected flat filtered list, got nested arrays with nulls interleaved. |

### Failing Tests — No-JavaScript Variants
These use `pickValue` instead of JS `when` expressions. They fail at invocation
time with HTTP 400 because Galaxy treats the workflow inputs as non-optional:

| Test ID | Error |
|---------|-------|
| `condifional_scatter_on_nonscattered_false_nojs` (sic) | 400: `input step 'N' (data) is not optional and no input provided` |
| `condifional_scatter_on_nonscattered_true_nojs` (sic) | 400: same optional input error |
| `scatter_on_scattered_conditional_nojs` | 400: `input step 'N' (val) is not optional and no input provided` |
| `conditionals_nested_cross_scatter_nojs` | 400: same optional input error |
| `conditionals_multi_scatter_nojs` | 400: same optional input error |

Note: "condifional" (sic) is the actual test ID spelling in the CWL conformance suite.

### Root Causes
1. Galaxy doesn't filter null values from scatter output when `when` condition skips elements
2. No-JS conditional workflows fail because Galaxy doesn't recognize conditional inputs as optional
3. `nested_crossproduct` + conditionals combines two unimplemented features

---

## Feature Gap 6: `merge_nested` for Non-Collection Inputs (PARTIAL)

CWL's `linkMerge: merge_nested` wraps multiple step inputs into a nested list.
Galaxy implements this for list→list:list promotion but raises `NotImplementedError`
when merging individual datasets.

**Evidence** — `lib/galaxy/workflow/run.py:515-517`:
```python
if input_collection_type is None:
    if merge_type == "merge_nested":
        raise NotImplementedError()
```

Note: `merge_flattened` has a similar gap — `run.py:550-551` raises
`NotImplementedError` for non-list collection types, though no current RED_TESTS
exercise this path.

### Failing Tests

| Test ID | CWL Versions | Error |
|---------|-------------|-------|
| `wf_wc_nomultiple_merge_nested` | v1.2 | `Final state - failed`. Pydantic validation error: `file1.list[...] Input should be a valid list` — Galaxy sends single HDA dict where a list was expected. |

---

## Complete Test List (30 unique scatter/map/reduce failures)

### Cross-version failures (appear in v1.0, v1.1, and v1.2):
1. `wf_scatter_two_flat_crossproduct`
2. `wf_scatter_flat_crossproduct_oneempty`
3. `wf_scatter_twoparam_flat_crossproduct_valuefrom`
4. `wf_scatter_two_nested_crossproduct`
5. `wf_scatter_nested_crossproduct_firstempty`
6. `wf_scatter_nested_crossproduct_secondempty`
7. `wf_scatter_twoparam_nested_crossproduct_valuefrom`
8. `wf_scatter_twoparam_dotproduct_valuefrom`

### v1.1 + v1.2 failures:
9. `scatter_embedded_subworkflow`
10. `scatter_multi_input_embedded_subworkflow`

### v1.2-only failures:
11. `condifional_scatter_on_nonscattered_false` (sic)
12. `condifional_scatter_on_nonscattered_false_nojs` (sic)
13. `condifional_scatter_on_nonscattered_true_nojs` (sic)
14. `conditionals_multi_scatter`
15. `conditionals_multi_scatter_nojs`
16. `conditionals_nested_cross_scatter`
17. `conditionals_nested_cross_scatter_nojs`
18. `dotproduct_dotproduct_scatter`
19. `dotproduct_simple_scatter`
20. `flat_crossproduct_flat_crossproduct_scatter`
21. `flat_crossproduct_simple_scatter`
22. `nested_crossproduct_nested_crossproduct_scatter`
23. `nested_crossproduct_simple_scatter`
24. `scatter_on_scattered_conditional`
25. `scatter_on_scattered_conditional_nojs`
26. `simple_dotproduct_scatter`
27. `simple_flat_crossproduct_scatter`
28. `simple_nested_crossproduct_scatter`
29. `simple_simple_scatter`
30. `wf_wc_nomultiple_merge_nested`

Note: tests 1-8 are the same logical tests re-run against each CWL spec version
(the conformance suite reuses test IDs across v1.0/v1.1/v1.2). They also appear
in the v1.2 RED_TESTS list.

---

## Key Source Files

| File | Relevance |
|------|-----------|
| `lib/galaxy/workflow/modules.py:843` | Assertion blocking flat/nested crossproduct (subworkflow path only) |
| `lib/galaxy/workflow/modules.py:412-481` | `find_cwl_scatter_collections()` — CWL tool step scatter (silently degrades crossproduct to dotproduct) |
| `lib/galaxy/workflow/modules.py:2749-2762` | CWL tool step execution entry point calling `find_cwl_scatter_collections()` |
| `lib/galaxy/workflow/run.py:510-556` | Merge operation implementation (merge_nested/merge_flattened NotImplementedError gaps) |
| `lib/galaxy/tool_util/cwl/parser.py:1192-1214` | CWL scatter/merge type parsing from CWL step definitions |
| `scripts/cwl_conformance_to_test_cases.py:36-206` | RED_TESTS dict (all versions) |

---

## Summary of Implementation Gaps

| Feature | Status | Tests Affected |
|---------|--------|---------------|
| `flat_crossproduct` scatter | Not implemented (silent dotproduct fallback or assertion) | 6 |
| `nested_crossproduct` scatter | Not implemented (silent dotproduct fallback or assertion) | 7 |
| `dotproduct` + `valueFrom` | Broken | 1 (cross-version) |
| Scatter into subworkflows | Broken (collection not decomposed) | 6 |
| Scatter + conditional null filtering | Not implemented (nulls retained) | 9 |
| `merge_nested` for individual datasets | Not implemented (raises NotImplementedError) | 1 |
| **Total unique tests** | | **30** |
