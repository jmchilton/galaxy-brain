# CWL Workflow Features — Plan Index

## Plan Files

| File | Summary |
|------|---------|
| `MISSING_CWL_MAP_REDUCE_FEATURES.md` | Status/reference doc cataloging all 30 failing scatter/merge/conditional tests across 6 feature gaps. Not a plan. |
| `CWL_REPLACE_EPHEMERAL_COLLECTIONS_PLAN.md` | Replace `EphemeralCollection` with `CollectionAdapter` subclasses (MergeDatasets, MergeListsFlattened, MergeListsNested, MergeNestedDatasets) with proper Pydantic serialization, recovery, and job recording. |
| `PLAN_GAP1_FLAT_CROSSPRODUCT.md` | Implement `flat_crossproduct` scatter by building synthetic flat HDCAs (cartesian product in row-major order) then matching as dotproduct. 6 RED tests. |
| `PLAN_GAP2_NESTED_CROSSPRODUCT.md` | Implement `nested_crossproduct` scatter via `linked=False` collection matching and `slice_collections_crossproduct()`. 7 RED tests. |
| `PLAN_GAP3_DOTPRODUCT_VALUEFROM.md` | Fix parser bug: `scatterMethod` presence causes ALL step inputs to get scatter_type instead of just scattered ones. 1 RED test. |
| `PLAN_GAP4_SCATTER_INTO_SUBWORKFLOWS.md` | Fix scatter decomposition into subworkflow steps — Galaxy passes whole HDCA instead of individual elements. 6 RED tests. |
| `PLAN_GAP6_MERGE_NESTED.md` | Fix `merge_nested` for non-collection inputs: single-connection ignores merge_type, multi-connection raises NotImplementedError. 1 RED test. |
| `CWL_CONDITIONALS_PICK_VALUE_FRAMEWORK_SUPPORT.md` | Add `pick_value` column to `WorkflowOutput`, multi-source outputSource support, null detection, scatter+conditional filtering. Subsumes former GAP5. 27 RED tests (v1.2 conditionals). |
| `COLLECTION_DEFAULTS.md` | Fix `data_collection_input` default handling for CWL array inputs with defaults (nojs workflows). Store optional/default in tool_state, materialize list defaults as HDCAs at runtime. |

## Dependency DAG

```
                   EPHEMERAL SWAP
                  (CWL_REPLACE_EPHEMERAL_COLLECTIONS_PLAN)
                  /          |           \
                 v           v            v
              GAP1        GAP4         GAP6
        (flat_cross)  (scatter→subwf) (merge_nested)
                 \          |
                  \         v
                   \   [v1.2 subwf scatter tests]
                    \
                     v
              [crossproduct+valuefrom tests need GAP3 too]

         GAP2                    GAP3
   (nested_cross)          (dotproduct+valueFrom)
         |                       |
         |    PICK_VALUE         |
         |   (Phase 0: int[] defaults — independent)
         |   (Phases 1-6: multi-source pickValue, null detection)
         |         |             |
         v         v             |
  conditionals_nested_cross_scatter    |
  (needs GAP2 + pickValue Phases 4-6)  |
                                       v
                        crossproduct+valuefrom tests
                        (need GAP1 or GAP2 + GAP3)
```

### Dependency Details

| Plan                                | Depends On                                    | Evidence                                                                                                                                                                                   |
| ----------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **GAP1** (flat_cross)               | Ephemeral Swap                                | Opens with "Assumes: EphemeralCollection replaced with CollectionAdapters". Uses `_persist_adapter_as_hdca()` and direct HDCA creation patterns from the swap.                             |
| **GAP2** (nested_cross)             | Nothing                                       | Self-contained. Uses existing `linked=False` matching infrastructure. No mention of ephemeral swap.                                                                                        |
| **GAP3** (dotproduct+valueFrom)     | Nothing                                       | Parser-only fix. Orthogonal to all runtime changes.                                                                                                                                        |
| **GAP4** (scatter→subwf)            | Ephemeral Swap                                | Opens with "Assumes: EphemeralCollection replaced with CollectionAdapters". References adapter materialization in `build_cwl_input_dict()` and direct HDCA wrapping from swap Step 5b-iii. |
| **GAP6** (merge_nested)             | Ephemeral Swap                                | Uses `MergeNestedDatasetsAdapter` and `TransientCollectionAdapterSubListElement` defined in the ephemeral plan (Steps 1e, 1f). References `_persist_adapter_as_hdca()`.                    |
| **pickValue Phase 0**               | Nothing                                       | Fixes int[] default handling in parser. Independent.                                                                                                                                       |
| **pickValue Phases 1-6**            | Scatter fixes (for scatter+conditional tests) | Test table: `conditionals_nested_cross_scatter` needs GAP2; scatter+conditional tests need null filtering which runs after scatter execution.                                              |
| `conditionals_nested_cross_scatter` | GAP2 + pickValue Phases 4-6                   | Explicitly stated in pickValue plan's test table and in MISSING_CWL_MAP_REDUCE_FEATURES Gap 5 notes.                                                                                       |
| `crossproduct+valuefrom` tests      | GAP1 or GAP2 + GAP3                           | GAP3 fixes the parser bug; crossproduct implementation needed separately. GAP1 Q3 asks whether its valuefrom test also needs GAP3.                                                         |

## Linear Implementation Order

1. ~~**GAP3 — dotproduct+valueFrom**~~ **DONE** — Parser fix: scatter_type only assigned to scattered inputs, not all inputs. Commit `e0e42cc77f`.

2. ~~**GAP2 — nested_crossproduct**~~ **DONE** — Added `slice_collections_crossproduct()` to matching infrastructure. Commit `473e3a5ace`.

3. ~~**pickValue Phases 1-6 — full pickValue support**~~ **DONE** — Implemented ahead of schedule since GAP2 was done. Synthesize `pick_value` module steps during CWL import for both Pattern A (multi-source) and Pattern B (scatter). Handles multi-scatter with `linkMerge: merge_flattened` and nested cross-product passthrough. 28 of 46 conditional tests GREEN across 4 commits:
   - `3145315a49` — all_non_null empty result fix + parameter default unwrap (upstream)
   - `a1a15dbe72` — Synthesize pick_value steps for multi-source pickValue outputs
   - `89e0f28e59` — Handle pickValue on scatter outputs (Pattern B)
   - `3300d662dc` — Multi-scatter linkMerge + nested cross-product passthrough

4. **Collection Defaults** (`COLLECTION_DEFAULTS.md`) — Fix `data_collection_input` default handling for CWL array inputs. Unblocks nojs variants: `conditionals_multi_scatter_nojs`, `conditionals_nested_cross_scatter_nojs`.

5. **cond-with-defaults** — Complex defaults + linkMerge + pickValue + File[] outputs. 2 RED tests. Not yet planned.

6. **Ephemeral Swap** — Foundational runtime change. No new tests green on its own, but unblocks GAP1/GAP4/GAP6. Large but well-scoped.

7. **GAP6 — merge_nested** — Small, uses adapters defined in ephemeral swap. 1 test green. Good first validation that the swap works.

8. **GAP4 — scatter into subworkflows** — Uses ephemeral swap patterns. 6 tests green. Validates scatter decomposition post-swap.

9. **GAP1 — flat_crossproduct** — Uses ephemeral swap patterns. 6 tests green. Could swap order with GAP4.
