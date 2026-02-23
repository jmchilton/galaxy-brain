# Plan: Accept HDCAs for CWL Array and Record Parameters

## Context

CWL array and record inputs are staged as Galaxy HDCAs by the test harness (`galactic_job_json()` in `util.py`). The Pydantic request model rejects these `{src: "hdca", id: "..."}` values because `CwlArrayParameterModel` expects `list[T]` and `CwlRecordParameterModel` expects a nested dict.

**Failing test**: `test_conformance_v1_2_cl_basic_generation` — bwa-mem-tool.cwl with:
- `reads`: array of File → staged as HDCA → rejected
- `min_std_max_min`: array of int → staged as HDCA → rejected

**Goal**: Accept HDCAs in request, convert to CWL native lists/dicts at runtime.

## Data Flow

```
Request:     {reads: {src: "hdca", id: "abc"}, min_std_max_min: {src: "hdca", id: "def"}}
  ↓ decode
Internal:    {reads: {src: "hdca", id: 123}, min_std_max_min: {src: "hdca", id: 456}}
  ↓ job creation (_collect_cwl_inputs finds top-level HDCA refs ✓)
  ↓ job execution
  ↓ runtimeify (NEW: expand HDCA → native CWL)
Runtime:     {reads: [{class: File, path: ...}, ...], min_std_max_min: [1, 2, 3, 4]}
```

## Step 1: Request Model — Accept HDCA for Arrays/Records

**File**: `lib/galaxy/tool_util_models/parameters.py`

### CwlArrayParameterModel (~line 2311)
For `"request"` state: accept `Union[list[item_type], DataRequestHdca]`
For `"request_internal"` / `"job_internal"` states: accept `Union[list[item_type], DataCollectionRequestInternal]`
For `"job_runtime"` state: keep as `list[item_type]` (HDCAs expanded before runtime)

### CwlRecordParameterModel (~line 2360)
Same pattern: accept HDCA alternative for request/internal states, not runtime.

### py_type_for_state
Both classes need updated `py_type_for_state()` to match the pydantic_template changes.

## Step 2: Decode — Handle HDCA Refs

**File**: `lib/galaxy/tool_util/parameters/convert.py` (~line 613)

In `decode_callback`, for `CwlArrayParameterModel` and `CwlRecordParameterModel`:
- Check if value is a dict with `src` key (HDCA ref)
- If so, decode the ID via `decode_src_dict(value)` (same as DataCollectionParameterModel)
- If not, fall through to existing list/record decode logic

```python
elif isinstance(parameter, CwlArrayParameterModel):
    if _is_collection_ref(value):  # {src: "hdca", id: "..."}
        return decode_src_dict(value)
    # existing list decode logic...
```

Same for CwlRecordParameterModel.

## Step 3: Runtimeify — Expand HDCA to Native CWL

**File**: `lib/galaxy/tool_util/parameters/convert.py` (~line 763)

### New callback type
```python
CwlCollectionToNativeJson = Callable[
    [DataCollectionRequestInternal, "CwlParameterT"],
    Any  # returns list for arrays, dict for records
]
```

### Modified runtimeify signature
Add optional `adapt_cwl_collection` parameter:
```python
def runtimeify(
    internal_state,
    input_models,
    adapt_dataset,
    adapt_collection,
    adapt_cwl_collection: Optional[CwlCollectionToNativeJson] = None,
):
```

### Modified to_runtime_callback
For `CwlArrayParameterModel` and `CwlRecordParameterModel`:
- Check if value is HDCA ref (`{src: "hdca", id: N}`)
- If not, fall through to existing logic
- If so, call `adapt_cwl_collection(DataCollectionRequestInternal(**value), parameter)`

## Step 4: Implement adapt_cwl_collection Callback

**File**: `lib/galaxy/tools/cwl_runtime.py`

New function returned by `setup_for_cwl_runtimeify()`:

```python
def adapt_cwl_collection_to_native(ref, param):
    hdca = hdcas_by_id[ref.id]
    collection = hdca.collection
    if isinstance(param, CwlArrayParameterModel):
        return _collection_elements_to_cwl_list(collection, param.item_type, adapt_dataset)
    elif isinstance(param, CwlRecordParameterModel):
        return _collection_elements_to_cwl_record(collection, param.fields, adapt_dataset)
```

### For arrays
Walk sorted elements. For each element:
- **File/Dir item type**: call `adapt_dataset(DataRequestInternalHda(src="hda", id=hda.id))` → CWL File dict (with secondary files, EDAM enrichment)
- **Scalar item type**: read HDA file content (`json.load(open(hda.get_file_name()))`) → scalar value

### For records
Walk named elements. Same per-element logic keyed by `element_identifier`.

### Return tuple change
`setup_for_cwl_runtimeify()` currently returns `(hda_references, adapt_dataset, adapt_collection)`.
Change to return `(hda_references, adapt_dataset, adapt_collection, adapt_cwl_collection)`.

## Step 5: Wire Up in Evaluation

**File**: `lib/galaxy/tools/evaluation.py` (~line 1145)

Update `build_param_dict()` to pass 4th callback:
```python
hda_references, adapt_datasets, adapt_collections, adapt_cwl_collections = self._setup_for_runtimeify(...)
job_runtime_state = runtimeify(validated_tool_state, self.tool, adapt_datasets, adapt_collections, adapt_cwl_collections)
```

Base `UserToolEvaluator._setup_for_runtimeify()` returns `(refs, adapt_ds, adapt_coll, None)`.
`CwlToolEvaluator._setup_for_runtimeify()` returns `(refs, adapt_ds, adapt_coll, adapt_cwl_coll)`.

## Step 6: Fix _collect_cwl_inputs format (if needed)

**File**: `lib/galaxy/tools/actions/__init__.py` (~line 467)

Currently stores `[(hdca, False)]`. `setup_for_runtimeify` expects bare HDCA objects via `isinstance(value, HistoryDatasetCollectionAssociation)` check. Need to verify the job DB round-trip normalizes this — the `input_dataset_collections` at job execution time comes from `self.job.input_dataset_collections`, not from `_collect_cwl_inputs` directly.

At line 1138-1143 in evaluation.py:
```python
input_dataset_collections = {assoc.name: assoc.dataset_collection for assoc in self.job.input_dataset_collections}
```
This produces `{name: HDCA}` — bare objects. So `setup_for_runtimeify` receives the right format. ✓

No change needed here.

## Files Modified

| File | Change |
|------|--------|
| `lib/galaxy/tool_util_models/parameters.py` | Accept HDCA in request models for CwlArray/CwlRecord |
| `lib/galaxy/tool_util/parameters/convert.py` | Decode HDCA refs, runtimeify HDCA expansion |
| `lib/galaxy/tools/cwl_runtime.py` | New `adapt_cwl_collection_to_native` callback |
| `lib/galaxy/tools/evaluation.py` | Wire up 4th callback |
| `lib/galaxy/tools/runtime.py` | Return type change (add None for 4th element) |

## Verification

```bash
# Immediate target test
GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES="true" \
GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS="true" \
GALAXY_SKIP_CLIENT_BUILD=1 \
GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false \
GALAXY_TEST_TOOL_CONF="test/functional/tools/sample_tool_conf.xml" \
pytest -v lib/galaxy_test/api/cwl/test_cwl_conformance_v1_2.py::TestCwlConformance::test_conformance_v1_2_cl_basic_generation

# Verify existing passing test still passes
pytest -v ...::test_conformance_v1_2_expression_any_string

# Broader CWL conformance
pytest -v lib/galaxy_test/api/cwl/test_cwl_conformance_v1_2.py -k "green"
```

## Unresolved Questions

- Scalar HDCA elements: the staging code (`upload_object`) creates HDA from ObjectUploadTarget. What extension/datatype is the resulting HDA? Need to verify `hda.get_file_name()` points to a JSON file we can `json.load()`.
- For nested arrays (array of array) or records containing arrays: the HDCA would be a nested collection. `_collection_elements_to_cwl_list` may need to recurse.  Current plan handles only 1 level.
- Should `adapt_cwl_collection` also handle CwlUnionParameterModel and CwlAnyParameterModel when they receive HDCA refs?
