---
type: research
subtype: dependency
tags:
  - research/dependency
  - galaxy/workflows
  - galaxy/testing
status: draft
created: 2026-02-21
revised: 2026-02-21
revision: 1
ai_generated: true
---

# Workflow Test Collection Inputs: Full Code Path Trace

## 1. Test Format Syntax (from `docs/test_format.rst`)

### Three Syntaxes for Collection Inputs

**A) CWL-style list (implicit collection from YAML list):**
```yaml
job:
  input1:
    - class: File
      path: hello.txt
```
Creates a `list` collection with auto-generated numeric identifiers (`0`, `1`, ...).

**B) Explicit `class: Collection` (Galaxy extension to CWL job format):**
```yaml
job:
  input1:
    class: Collection
    collection_type: list
    elements:
      - identifier: el1
        class: File
        path: hello.txt
```
Allows specifying `collection_type` and explicit `identifier` on each element.

**C) Nested collections (e.g. `list:paired`):**
```yaml
job:
  input1:
    class: Collection
    collection_type: 'list:paired'
    elements:
      - class: Collection
        type: paired
        identifier: el1
        elements:
          - identifier: forward
            class: File
            path: hello.txt
          - identifier: reverse
            class: File
            path: hello.txt
```
Nested elements use `class: Collection` with a `type` field (not `collection_type`) at the sub-element level, plus their own `elements` list.

**D) Tagged elements:**
```yaml
elements:
  - identifier: el1
    class: File
    path: hello.txt
    tags: ['group:which:moo']
```

### Source files for doc examples:
- `/Users/jxc755/projects/repositories/planemo/docs/test_example_collection_input.yml`
- `/Users/jxc755/projects/repositories/planemo/docs/test_example_nested_collection_input.yml`
- `/Users/jxc755/projects/repositories/planemo/docs/test_example_tagged_input.yml`

---

## 2. Planemo Code Path: Test YAML -> Galaxy API

### 2a. Test Case Loading

**Entry:** `planemo test <workflow.ga>` invokes `planemo/engine/test.py:test_runnables()` (line 7)

1. `engine.test(runnables)` calls `planemo/engine/interface.py:BaseEngine.test()` (line 76)
2. `test()` calls `cases(runnable)` from `planemo/runnable.py` (line 79)
3. `planemo/runnable.py:cases()` (line 251) calls `definition_to_test_case()` (line 271)
4. `definition_to_test_case()` (line 271-312):
   - Opens the `-tests.yml` / `-test.yml` YAML file
   - Parses each test def, extracts `job` (dict or path), `outputs`
   - Creates `TestCase` objects with `job` (the raw dict) or `job_path`

Key: The test YAML `job` dict is stored **as-is** on the `TestCase`. No collection-specific processing happens at this stage. The raw YAML dict with `class: Collection`, `collection_type`, `elements`, etc. is passed through unchanged.

### 2b. Test Execution

5. `BaseEngine._run_test_cases()` (line 97 in `planemo/engine/interface.py`):
   - If `test_case.job_path` is None (inline job), dumps `test_case.job` to a temp JSON file
   - Calls `self._run(runnables, job_paths)`
6. `GalaxyEngine._run()` (line 53 in `planemo/engine/galaxy.py`):
   - Calls `execute(ctx, config, runnable, job_path)` from `planemo/galaxy/activity.py`

### 2c. Staging: Where Collections Get Created

7. `planemo/galaxy/activity.py:_execute()` (line 261):
   - Calls `stage_in()` (line 270) to upload inputs and create collections
   - Then calls `user_gi.workflows.invoke_workflow()` with the resulting `job_dict` (line 313)

8. `planemo/galaxy/activity.py:stage_in()` (line 417-447):
   ```python
   psi = PlanemoStagingInterface(ctx, runnable, user_gi, ...)
   job_dict, datasets = psi.stage(
       tool_or_workflow,
       history_id=history_id,
       job_path=job_path,
       use_path_paste=config.use_path_paste,
       to_posix_lines=to_posix_lines,
   )
   ```

9. `PlanemoStagingInterface` (line 121) extends `StagingInterface` from galaxy-tool-util. It overrides `_post()` to use bioblend's `make_post_request()`, and `_handle_job()` to track upload jobs.

### 2d. The `StagingInterface.stage()` Method (Galaxy code, used by Planemo)

**File:** `/Users/jxc755/workspace/galaxy/lib/galaxy/tool_util/client/staging.py`, line 80

`stage()` does:
1. Reads the job YAML from `job_path` (line 262-266)
2. Defines `upload_func_fetch` (line 91) - handles `FileUploadTarget`, `FileLiteralTarget`, `DirectoryUploadTarget`, `ObjectUploadTarget` by POSTing to `tools/fetch` API
3. Defines `create_collection_func` (line 248-260):
   ```python
   def create_collection_func(element_identifiers, collection_type, rows=None):
       payload = {
           "name": "dataset collection",
           "instance_type": "history",
           "history_id": history_id,
           "element_identifiers": element_identifiers,
           "collection_type": collection_type,
           "fields": None if collection_type != "record" else "auto",
           "rows": rows,
       }
       return self._post("dataset_collections", payload)
   ```
4. Calls `galactic_job_json(job, job_dir, upload_func, create_collection_func, tool_or_workflow)` (line 275)

---

## 3. The Core: `galactic_job_json()` in Galaxy

**File:** `/Users/jxc755/workspace/galaxy/lib/galaxy/tool_util/cwl/util.py`, line 146

This function iterates over job keys, calling `replacement_item(value)` for each (line 387-390).

### Collection Dispatch Logic (`replacement_item`, line 207):

```python
def replacement_item(value, force_to_file=False):
    is_dict = isinstance(value, dict)
    item_class = None if not is_dict else value.get("class", None)
    is_collection = item_class == "Collection"  # Galaxy extension

    if isinstance(value, list):
        return replacement_list(value)    # CWL-style list -> Galaxy list collection
    elif is_collection:
        return replacement_collection(value)  # Explicit Collection
```

### Path A: CWL-style List (`replacement_list`, line 314):

```python
def replacement_list(value):
    collection_element_identifiers = []
    for i, item in enumerate(value):
        dataset = replacement_item(item, force_to_file=True)
        collection_element = dataset.copy()
        collection_element["name"] = str(i)  # numeric identifiers: "0", "1", ...
        collection_element_identifiers.append(collection_element)
    collection = collection_create_func(collection_element_identifiers, "list")
    dataset_collections.append(collection)
    return {"src": "hdca", "id": collection["id"]}
```

- Each list item gets uploaded as a file via `replacement_item(item, force_to_file=True)`
- Elements get numeric names: `"0"`, `"1"`, etc.
- Always creates a `"list"` type collection
- Returns `{"src": "hdca", "id": hdca_id}` for workflow invocation

### Path B: Explicit Collection (`replacement_collection`, line 354):

```python
def replacement_collection(value):
    if value.get("galaxy_id"):
        return {"src": "hdca", "id": str(value["galaxy_id"])}
    assert "collection_type" in value
    collection_type = value["collection_type"]
    elements = to_elements(value, collection_type)
    kwds = {}
    if collection_type.startswith("sample_sheet"):
        kwds["rows"] = value["rows"]
    collection = collection_create_func(elements, collection_type, **kwds)
    dataset_collections.append(collection)
    return {"src": "hdca", "id": collection["id"]}
```

### The `to_elements` Function (line 328) -- handles flat and nested collections:

```python
def to_elements(value, rank_collection_type):
    collection_element_identifiers = []
    elements = value["elements"]
    is_nested_collection = ":" in rank_collection_type

    for element in elements:
        if not is_nested_collection:
            # Flat collection (list, paired)
            dataset = replacement_item(element, force_to_file=True)
            collection_element = dataset.copy()
            collection_element["name"] = element["identifier"]
            collection_element_identifiers.append(collection_element)
        else:
            # Nested collection (list:paired, list:list, etc.)
            sub_collection_type = rank_collection_type[rank_collection_type.find(":") + 1:]
            collection_element = {
                "name": element["identifier"],
                "src": "new_collection",
                "collection_type": sub_collection_type,
                "element_identifiers": to_elements(element, sub_collection_type),
            }
            collection_element_identifiers.append(collection_element)

    return collection_element_identifiers
```

**How nesting works:**
- For `list:paired`, `rank_collection_type = "list:paired"`, `is_nested_collection = True`
- For each top-level element: `sub_collection_type = "paired"`
- Recursively calls `to_elements(element, "paired")` for inner elements
- Since `"paired"` has no `:`, inner elements are flat -- files get uploaded and referenced as `{"src": "hda", "id": ...}`
- The outer element becomes `{"src": "new_collection", "collection_type": "paired", "element_identifiers": [...]}`

### File Upload (`replacement_file`, line 238):

Each leaf element with `class: File` goes through `replacement_file()`:
- Reads `path` or `location`
- Handles `filetype`/`format`, `tags`, `dbkey`, `decompress`, `hashes`, `composite_data`
- Calls `upload_file()` which creates a `FileUploadTarget` and uploads via the fetch API
- Returns `{"src": "hda", "id": dataset_id}`

---

## 4. Galaxy Server Side: Collection Creation

### 4a. API Endpoint

**File:** `/Users/jxc755/workspace/galaxy/lib/galaxy/webapps/galaxy/api/dataset_collections.py`, line 84-93

`POST /api/dataset_collections` receives `CreateNewCollectionPayload` with:
- `collection_type`: e.g. `"list"`, `"paired"`, `"list:paired"`
- `element_identifiers`: list of dicts, each with `name`, `src` (`hda`, `hdca`, `new_collection`), and `id` or nested `element_identifiers`
- `history_id`
- `instance_type`: `"history"`

### 4b. Payload Validation

**File:** `/Users/jxc755/workspace/galaxy/lib/galaxy/managers/collections_util.py`

`api_payload_to_create_params()` (line 26): requires `collection_type` and `element_identifiers`.

`validate_input_element_identifiers()` (line 52): validates structure recursively:
- Each element needs a `name`
- `src` must be one of: `hda`, `hdca`, `ldda`, `new_collection`
- For `src: new_collection`: must have `element_identifiers` and `collection_type` (line 76-82)
- Recursively validates nested `element_identifiers`

### 4c. Collection Manager

**File:** `/Users/jxc755/workspace/galaxy/lib/galaxy/managers/collections.py`

`DatasetCollectionManager.create()` (line 180):
1. Validates element identifiers (line 210-211)
2. Calls `create_dataset_collection()` (line 217)

`create_dataset_collection()` (line 309):
1. Gets collection type description
2. Checks `has_subcollections` (based on `:` in collection_type)
3. Calls `_element_identifiers_to_elements()` (line 337)

`_element_identifiers_to_elements()` (line 403):
- If has subcollections: calls `__recursively_create_collections_for_identifiers()` (line 414)
- Then calls `__load_elements()` to resolve HDA/HDCA references from DB

`__recursively_create_collections_for_identifiers()` (line 579):
- For each element with `src: new_collection`:
  - Extracts `collection_type` (e.g. `"paired"` for inner collection of `list:paired`)
  - Recursively calls `create_dataset_collection()` with the inner element identifiers
  - Stores the created `DatasetCollection` on the element as `__object__`
- This is how nested structures like `list:paired` are built bottom-up

### 4d. Workflow Invocation with Collection Inputs

**File:** `/Users/jxc755/workspace/galaxy/lib/galaxy/workflow/run_request.py`

After collections are created and staged in the history, `planemo/galaxy/activity.py:_execute()` calls:
```python
invocation = user_gi.workflows.invoke_workflow(
    workflow_id,
    inputs=job_dict,    # contains {"input_name": {"src": "hdca", "id": "..."}}
    history_id=history_id,
    allow_tool_state_corrections=True,
    inputs_by="name",
)
```

In Galaxy's `build_workflow_run_configs()` (line 310):
1. `_normalize_inputs()` (line 120) maps input names to step IDs
2. For `data_collection_input` steps: `inputs_by="name"` matches the label
3. The input dict `{"src": "hdca", "id": "..."}` gets validated via `DataOrCollectionRequestAdapter` (line 401)
4. For `src: hdca`: fetches the `HistoryDatasetCollectionAssociation` via `dataset_collection_manager.get_dataset_collection_instance()` (line 429-431)
5. The HDCA is stored as the input content for that step

---

## 5. How `collection_type` Is Determined and Used

### In the test YAML:
- Explicit: `collection_type: list`, `collection_type: paired`, `collection_type: 'list:paired'`
- Implicit (CWL-style list): always `"list"`, determined by `replacement_list()` in `galactic_job_json()`

### In `galactic_job_json()`:
- `replacement_collection()` reads `value["collection_type"]` directly
- Passed to `to_elements()` which uses it to determine nesting strategy via `":" in rank_collection_type`
- Passed to `collection_create_func()` which sends it as `collection_type` in the API payload

### In Galaxy server:
- `collection_type_descriptions.for_collection_type()` parses the type string
- `has_subcollections()` checks for `:` separator
- Each level of nesting corresponds to a rank in the type hierarchy
- E.g. `list:paired` = rank 0 is `list`, rank 1 is `paired`

### For nested elements in test YAML:
- Sub-elements use `type:` not `collection_type:` at the element level (e.g. `type: paired`)
- The `to_elements()` function doesn't read `type` from elements -- it derives sub-collection type by splitting `rank_collection_type` on `:`
- The `type` field in the YAML is informational / for clarity but the actual type is determined by splitting the parent's `collection_type`

---

## 6. Nested Collection Types

### `list:paired`
```
list:paired
  +-- element "sample1" (src: new_collection, collection_type: paired)
  |     +-- "forward" (src: hda)
  |     +-- "reverse" (src: hda)
  +-- element "sample2" (src: new_collection, collection_type: paired)
        +-- "forward" (src: hda)
        +-- "reverse" (src: hda)
```

### `list:list`
```
list:list
  +-- element "group1" (src: new_collection, collection_type: list)
  |     +-- "item1" (src: hda)
  |     +-- "item2" (src: hda)
  +-- element "group2" (src: new_collection, collection_type: list)
        +-- "item1" (src: hda)
```

### Deeper nesting (e.g. `list:list:paired`)
Recursion in `to_elements()` handles arbitrary depth:
- `list:list:paired` -> outer elements are `new_collection` with type `list:paired`
- Their elements are `new_collection` with type `paired`
- Leaf elements are `hda` references

---

## 7. Recent Changes

### Planemo: `8c40caf7` (Jan 2026) - "Parse collection_type and create appropriate sample entries"
**Files changed:**
- `planemo/commands/cmd_workflow_job_init.py` - Added `_build_commented_yaml()` with collection_type in comments
- `planemo/galaxy/workflows.py` - Added `_collection_elements_for_type()` (line 332-375) and `job_template_with_metadata()` (line 378-439)
  - `_collection_elements_for_type()` generates appropriate sample elements:
    - `paired` -> forward/reverse elements
    - `list:paired` -> nested paired collection
    - default (list) -> single element
  - `job_template_with_metadata()` now reads `collection_type` from workflow inputs and generates type-appropriate templates
- `tests/data/wf_collection_types.gxwf.yml` - Test workflow with list, paired, list:paired inputs
- `tests/test_cmd_workflow_job_init.py` - Tests for collection type handling

### Galaxy: `1c09592356f` (May 2020) - "Enable nested collections as inputs to workflow tests"
- Created `staging.py` with `StagingInterface` abstraction
- Extended `galactic_job_json()` to handle nested collections via `to_elements()` recursion
- This was the foundational commit that made planemo workflow test collection inputs work

### Galaxy: `d26605517e0` (Jul 2025) - "Implement sample sheets"
- Added `sample_sheet` collection type support
- Extended `galactic_job_json()` with `rows` parameter for sample sheets (line 361-362)
- Extended `create_collection_func` with `rows` parameter (line 249)

---

## 8. Complete Data Flow Summary

```
Test YAML (e.g. wf5-collection-input.gxwf-test.yml)
  |
  | yaml.safe_load()
  v
planemo/runnable.py:definition_to_test_case() -- creates TestCase with raw job dict
  |
  | json.dump to temp file
  v
planemo/engine/interface.py:_run_test_cases() -- passes job_path to _run()
  |
  v
planemo/galaxy/activity.py:_execute() -> stage_in()
  |
  v
planemo/galaxy/activity.py:PlanemoStagingInterface.stage()
  |                (extends galaxy StagingInterface)
  |
  | reads job YAML, picks upload_func (fetch API) + create_collection_func
  v
galaxy/tool_util/cwl/util.py:galactic_job_json()
  |
  | For each job key, calls replacement_item(value):
  |
  |-- list value -> replacement_list():
  |     uploads each file, creates collection via POST /api/dataset_collections
  |     returns {"src": "hdca", "id": ...}
  |
  |-- class: Collection -> replacement_collection():
  |     calls to_elements() which:
  |       - flat (no ":"): uploads files, returns [{"src":"hda","id":...,"name":"identifier"}]
  |       - nested (has ":"): recursively builds {"src":"new_collection","collection_type":sub,...}
  |     calls create_collection_func -> POST /api/dataset_collections
  |     returns {"src": "hdca", "id": ...}
  |
  |-- class: File -> replacement_file():
  |     uploads via POST /api/tools/fetch
  |     returns {"src": "hda", "id": ...}
  |
  v
job_dict = {"input1": {"src": "hdca", "id": "abc123"}, ...}
  |
  v
bioblend: user_gi.workflows.invoke_workflow(workflow_id, inputs=job_dict, inputs_by="name")
  |
  v
Galaxy API: POST /api/workflows/{id}/invocations
  |
  v
galaxy/workflow/run_request.py:build_workflow_run_configs()
  |  _normalize_inputs() maps input name -> step_id
  |  For hdca inputs: fetches HistoryDatasetCollectionAssociation
  v
WorkflowRunConfig(inputs={step_id: hdca_instance})
  |
  v
Workflow scheduling and execution with collection mapped to input step
```

---

## 9. Key File References

### Planemo
| File | Key Lines | Purpose |
|------|-----------|---------|
| `planemo/runnable.py` | 251-312 | Loads test YAML, creates TestCase with raw job dict |
| `planemo/engine/interface.py` | 76-127 | Orchestrates test execution, dumps job to temp file |
| `planemo/engine/galaxy.py` | 53-70 | Calls execute() for each runnable |
| `planemo/galaxy/activity.py` | 261-361 | `_execute()`: stages inputs, invokes workflow |
| `planemo/galaxy/activity.py` | 417-447 | `stage_in()`: creates PlanemoStagingInterface, calls .stage() |
| `planemo/galaxy/activity.py` | 121-258 | `PlanemoStagingInterface`: bioblend-based StagingInterface |
| `planemo/galaxy/workflows.py` | 332-375 | `_collection_elements_for_type()`: generates sample elements for job init |
| `planemo/galaxy/workflows.py` | 378-439 | `job_template_with_metadata()`: generates job template with collection_type |
| `planemo/galaxy/workflows.py` | 477-524 | `_elements_to_test_def()`: converts invocation elements back to test def format |

### Galaxy (tool-util, shared with planemo)
| File | Key Lines | Purpose |
|------|-----------|---------|
| `galaxy/tool_util/client/staging.py` | 49-282 | `StagingInterface.stage()`: orchestrates upload + collection creation |
| `galaxy/tool_util/client/staging.py` | 248-260 | `create_collection_func`: POSTs to /api/dataset_collections |
| `galaxy/tool_util/cwl/util.py` | 146-391 | `galactic_job_json()`: core parsing of job dict to Galaxy API calls |
| `galaxy/tool_util/cwl/util.py` | 207-236 | `replacement_item()`: dispatches by class (File/Collection/list) |
| `galaxy/tool_util/cwl/util.py` | 314-326 | `replacement_list()`: CWL-style list -> Galaxy list collection |
| `galaxy/tool_util/cwl/util.py` | 328-352 | `to_elements()`: handles flat vs nested collection element building |
| `galaxy/tool_util/cwl/util.py` | 354-366 | `replacement_collection()`: explicit Collection -> Galaxy collection |
| `galaxy/tool_util/cwl/util.py` | 238-296 | `replacement_file()`: file upload with tags/dbkey/composite support |

### Galaxy (server-side)
| File | Key Lines | Purpose |
|------|-----------|---------|
| `galaxy/webapps/galaxy/api/dataset_collections.py` | 84-93 | POST /api/dataset_collections endpoint |
| `galaxy/managers/collections_util.py` | 26-49 | `api_payload_to_create_params()`: validates and extracts params |
| `galaxy/managers/collections_util.py` | 52-82 | `validate_input_element_identifiers()`: recursive validation |
| `galaxy/managers/collections.py` | 180-248 | `DatasetCollectionManager.create()` |
| `galaxy/managers/collections.py` | 309-365 | `create_dataset_collection()`: creates DB objects |
| `galaxy/managers/collections.py` | 403-436 | `_element_identifiers_to_elements()`: resolves identifiers |
| `galaxy/managers/collections.py` | 579-603 | `__recursively_create_collections_for_identifiers()`: nested creation |
| `galaxy/workflow/run_request.py` | 310-533 | `build_workflow_run_configs()`: maps inputs to workflow steps |
| `galaxy/workflow/run_request.py` | 120-163 | `_normalize_inputs()`: maps input names/indices to step IDs |
| `galaxy/workflow/run_request.py` | 398-464 | Input resolution: fetches HDA/HDCA from DB by src+id |
