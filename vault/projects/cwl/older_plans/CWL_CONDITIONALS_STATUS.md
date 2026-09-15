# CWL Conditional Workflow Support in Galaxy

## CWL v1.2 Conditional Features

CWL v1.2 introduced three key conditional features:

1. **`when`** — Step-level boolean expression; if false, step is skipped and outputs are null
2. **`pickValue`** — Workflow output/step input directive for merging multiple sources:
   - `first_non_null` — return first non-null from source list
   - `the_only_non_null` — validate exactly one non-null, return it
   - `all_non_null` — return array of all non-null values
3. **`MultipleInputFeatureRequirement`** — Required when `outputSource` or step input `source` is a list

## What's Implemented

### Multiple input connections — WORKING

Galaxy already supports multiple connections to step inputs. 7 non-conditional `multiple_input` tests pass across v1.1/v1.2 (e.g. `wf_multiplesources_multipletypes`, `wf_wc_scatter_multiple_merge`, `valuefrom_wf_step_multiple`). The plumbing:

- `input_connections_by_step()` at `parser.py:668` calls `split_step_references()` with default `multiple=True`, building lists of connections per input name
- `linkMerge` is parsed at `parser.py:1028-1029` and stored as `merge_type`
- `MultipleInputFeatureRequirement` listed in `SUPPORTED_TOOL_REQUIREMENTS` (not enforced, but not rejected)

This confirms Galaxy's workflow model handles multi-source connections — the gap is specifically in how workflow **outputs** (not inputs) reference multiple sources.

### `when` expressions — WORKING

Galaxy has full support for step-level `when` expressions:

**Parsing (CWL→Galaxy workflow):**
- `parser.py:1115` — `ToolStepProxy.to_dict()` extracts `when` from CWL step

**Runtime evaluation:**
- `modules.py:474-526` — `evaluate_value_from_expressions()` evaluates `when` via `do_eval()` (CWL JS engine)
- `modules.py:1137-1161` — Subworkflow module propagates `when_values` through `slice_collections()`
- `modules.py:2765-2771` — CWL tool module evaluates `when` per scatter slice
- `run.py:403-418` — `WorkflowProgress` tracks `when_values` list
- `modules.py:3024` — Steps with `when_values == [False]` have outputs hidden

**Bug:** `SubworkflowStepProxy.to_dict()` at `parser.py:1137-1154` does NOT extract the `when` expression (only `ToolStepProxy` does). Conditional subworkflow steps lose their `when` condition during import.

## What's NOT Implemented

### Multiple `outputSource` — NOT SUPPORTED

The crash point for `all_non_null_all_null` and all `pickValue` tests:

```
parser.py:607  get_outputs_for_label()
  → calls split_step_references(output["outputSource"], multiple=False, ...)
parser.py:982  split_step_references()
  → assert len(split_references) == 1  ← CRASH
```

`get_outputs_for_label()` hardcodes `multiple=False`, but the list `outputSource` pattern (e.g. `outputSource: [step1/out1, step2/out1]`) is exclusively a CWL v1.2 conditional feature — no non-conditional tests exercise this path. All the existing `multiple_input` tests that pass use multiple sources on step *inputs*, not workflow *outputs*.

### `pickValue` — NOT IMPLEMENTED

No parsing, serialization, or runtime logic for `pickValue` exists anywhere in Galaxy source.

## Test Status (v1.2 conditional tests)

### GREEN (passing) — 13 tests

Simple `when` + single `outputSource` (no `pickValue` needed):
- `direct_optional_null_result` / `_nojs` / `direct_required` / `_nojs` — single step, `when`=false, output=null
- `direct_optional_nonnull_result` / `_nojs` — single step, `when`=true
- `condifional_scatter_on_nonscattered_true` — scatter with single source

`should_fail` validation tests (pass because workflow import crashes on multiple `outputSource`):
- `first_non_null_all_null` / `_nojs` — all sources null with `first_non_null`
- `pass_through_required_fail` / `_nojs` — multiple non-null with `the_only_non_null`
- `all_non_null_multi_with_non_array_output` / `_nojs` — `all_non_null` on non-array type
- `the_only_non_null_multi_true` / `_nojs` — multiple non-null with `the_only_non_null`
- `conditionals_non_boolean_fail` / `_nojs` — non-boolean `when` result

### RED (failing) — 27 tests

All tests requiring `pickValue` or multiple `outputSource` at the workflow output level:

**`pickValue: first_non_null`** (crash on multiple outputSource):
- `pass_through_required_false_when` / `_nojs` / `_true_when` / `_nojs`
- `first_non_null_first_non_null` / `_nojs` / `_second_non_null` / `_nojs`

**`pickValue: the_only_non_null`** (crash on multiple outputSource):
- `pass_through_required_the_only_non_null` / `_nojs`
- `the_only_non_null_single_true` / `_nojs`

**`pickValue: all_non_null`** (crash on multiple outputSource):
- `all_non_null_all_null` / `_nojs` / `_one_non_null` / `_nojs` / `_multi_non_null` / `_nojs`

**Scatter + conditional** (various failures):
- `condifional_scatter_on_nonscattered_false` / `_nojs`
- `scatter_on_scattered_conditional` / `_nojs`
- `conditionals_nested_cross_scatter` / `_nojs`
- `conditionals_multi_scatter` / `_nojs`

**Complex conditional + defaults**:
- `cond-with-defaults-1` / `cond-with-defaults-2`

## Architecture Gaps

To implement `pickValue`, Galaxy would need:

1. **Parser changes** (`parser.py`):
   - `get_outputs_for_label()` must handle list `outputSource` (pass `multiple=True`)
   - Store `pickValue` directive on workflow output metadata
   - Multiple input connections already work, so the underlying model supports this

2. **Runtime changes** (`modules.py` / `run.py`):
   - Apply pickValue semantics when collecting workflow outputs
   - Handle null-filtering (`first_non_null`, `all_non_null`) and validation (`the_only_non_null`)

3. **Scatter + conditional combination**:
   - Some scatter tests produce null elements that need filtering
   - `condifional_scatter_on_nonscattered_false` expects `out1: []` — all scatter elements skipped

## Unresolved Questions

- Should `pickValue` be a Galaxy-level workflow feature or only CWL?
- How should null outputs from skipped steps interact with Galaxy's collection model?
