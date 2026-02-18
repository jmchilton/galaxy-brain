---
type: research
subtype: component
tags:
  - research/component
  - galaxy/collections
  - galaxy/api
status: draft
created: 2026-02-18
revised: 2026-02-18
revision: 1
ai_generated: true
---

# Dataset Collection Creation API - Deep Dive

## Overview

Dataset collections are containers that group related datasets together. Galaxy supports several collection types (list, paired, record, sample_sheet, paired_or_unpaired) and nested compositions of these (e.g. `list:paired`).

There are **two creation paths**:
1. **Direct creation** — `POST /api/dataset_collections` — creates a collection from *existing* datasets already in a history
2. **Fetch-based creation** — `POST /api/tools/fetch` — uploads new data *and* creates the collection in one step

Both produce the same result: a `HistoryDatasetCollectionAssociation` (HDCA) in a history.

---

## 1. API Endpoint

**File:** `lib/galaxy/webapps/galaxy/api/dataset_collections.py`

```
POST /api/dataset_collections
```

- **Request body:** `CreateNewCollectionPayload`
- **Response:** `HDCADetailed`

The endpoint delegates to `DatasetCollectionsService.create()`.

---

## 2. Request Schema — `CreateNewCollectionPayload`

**File:** `lib/galaxy/schema/schema.py:1769`

| Field | Type | Default | Description |
|---|---|---|---|
| `collection_type` | `CollectionType` (str) | `None` | e.g. `"list"`, `"paired"`, `"list:paired"`, `"record"`, `"sample_sheet"`, `"sample_sheet:paired"`, `"paired_or_unpaired"` |
| `element_identifiers` | `list[CollectionElementIdentifier]` | `None` | Elements to include |
| `name` | `str` | `None` | Display name |
| `instance_type` | `"history"` \| `"library"` | `"history"` | Where to create the collection |
| `history_id` | `DecodedDatabaseIdField` | `None` | Required when `instance_type="history"` |
| `folder_id` | `LibraryFolderDatabaseIdField` | `None` | Required when `instance_type="library"` |
| `hide_source_items` | `bool` | `False` | Hide original HDAs after collection creation |
| `copy_elements` | `bool` | `True` | Copy source HDAs vs reference them |
| `fields` | `str \| list[FieldDict]` | `[]` | For `record` type: field definitions. `"auto"` to guess from identifiers |
| `column_definitions` | `SampleSheetColumnDefinitions` | `None` | For `sample_sheet` type: column schema |
| `rows` | `SampleSheetRows` (dict) | `None` | For `sample_sheet` type: `{element_name: [col_values...]}` |

### `CollectionElementIdentifier`

**File:** `lib/galaxy/schema/schema.py:1740`

| Field | Type | Description |
|---|---|---|
| `name` | `str` | Element identifier name (e.g. `"forward"`, `"data1"`, `"sample1"`) |
| `src` | `CollectionSourceType` | Source: `"hda"`, `"ldda"`, `"hdca"`, `"new_collection"` |
| `id` | `DecodedDatabaseIdField` | ID of existing dataset/collection (for `hda`/`ldda`/`hdca`) |
| `collection_type` | `CollectionType` | For `src="new_collection"`: the sub-collection type |
| `element_identifiers` | `list[CollectionElementIdentifier]` | For `src="new_collection"`: nested elements |
| `tags` | `list[str]` | Tags for this element |

### `CollectionSourceType` enum

```
hda             — existing HistoryDatasetAssociation
ldda            — existing LibraryDatasetDatasetAssociation
hdca            — existing HistoryDatasetCollectionAssociation (nesting existing collections)
new_collection  — inline sub-collection definition (with nested element_identifiers)
```

---

## 3. Response Schema — `HDCADetailed`

**File:** `lib/galaxy/schema/schema.py:1249`

Extends `HDCASummary` which extends `HDCACommon`.

Key fields: `id`, `name`, `collection_type`, `elements` (list of `DCESummary`), `element_count`, `populated`, `populated_state`, `contents_url`, `collection_id`, `column_definitions`, `implicit_collection_jobs_id`, `tags`, `elements_datatypes`, `elements_states`.

Each element (`DCESummary`) contains: `element_identifier`, `element_index`, `element_type`, `object` (the HDA or nested DC), `columns` (for sample sheets), `model_class`.

---

## 4. Collection Types

### Type Registry

**File:** `lib/galaxy/model/dataset_collections/registry.py`

```python
PLUGIN_CLASSES = [
    ListDatasetCollectionType,
    PairedDatasetCollectionType,
    RecordDatasetCollectionType,
    PairedOrUnpairedDatasetCollectionType,
    SampleSheetDatasetCollectionType,
]
```

A singleton `DatasetCollectionTypesRegistry` maps `collection_type` strings to plugin instances. All plugins extend `BaseDatasetCollectionType` and implement `generate_elements()`.

### 4a. `list`

**File:** `lib/galaxy/model/dataset_collections/types/list.py`

Flat list of arbitrarily-named elements. Simply yields each element with its name.

```json
{
  "collection_type": "list",
  "instance_type": "history",
  "history_id": "<id>",
  "element_identifiers": [
    {"name": "data1", "src": "hda", "id": "<id>"},
    {"name": "data2", "src": "hda", "id": "<id>"},
    {"name": "data3", "src": "hda", "id": "<id>"}
  ]
}
```

### 4b. `paired`

**File:** `lib/galaxy/model/dataset_collections/types/paired.py`

Exactly two elements named `"forward"` and `"reverse"`.

```json
{
  "collection_type": "paired",
  "instance_type": "history",
  "history_id": "<id>",
  "element_identifiers": [
    {"name": "forward", "src": "hda", "id": "<id>"},
    {"name": "reverse", "src": "hda", "id": "<id>"}
  ]
}
```

### 4c. `record`

**File:** `lib/galaxy/model/dataset_collections/types/record.py`

CWL-style record with named fields. Requires a `fields` parameter defining field names/types, or `fields="auto"` to guess from identifiers.

```json
{
  "collection_type": "record",
  "instance_type": "history",
  "history_id": "<id>",
  "name": "a record",
  "fields": [
    {"name": "condition", "type": "File"},
    {"name": "control1", "type": "File"},
    {"name": "control2", "type": "File"}
  ],
  "element_identifiers": [
    {"name": "condition", "src": "hda", "id": "<id>"},
    {"name": "control1", "src": "hda", "id": "<id>"},
    {"name": "control2", "src": "hda", "id": "<id>"}
  ]
}
```

Validation: field count must match element count, field names must match element identifiers.

### 4d. `paired_or_unpaired`

**File:** `lib/galaxy/model/dataset_collections/types/paired_or_unpaired.py`

Either 1 element (unpaired) or 2 (paired with forward/reverse).

```json
{
  "collection_type": "paired_or_unpaired",
  "instance_type": "history",
  "history_id": "<id>",
  "element_identifiers": [
    {"name": "unpaired", "src": "hda", "id": "<id>"}
  ]
}
```

### 4e. `sample_sheet`

**File:** `lib/galaxy/model/dataset_collections/types/sample_sheet.py`

A list with per-element metadata columns. Requires `column_definitions` and `rows`.

```json
{
  "collection_type": "sample_sheet",
  "instance_type": "history",
  "history_id": "<id>",
  "name": "my sample sheet",
  "column_definitions": [
    {"type": "int", "name": "replicate", "optional": false},
    {"type": "string", "name": "condition", "optional": false}
  ],
  "rows": {
    "sample1": [1, "control"],
    "sample2": [2, "treatment"]
  },
  "element_identifiers": [
    {"name": "sample1", "src": "hda", "id": "<id>"},
    {"name": "sample2", "src": "hda", "id": "<id>"}
  ]
}
```

Column types: `int`, `string`, `boolean`, `element_identifier` (cross-references another element).

### 4f. Nested types (colon notation)

Types can be composed: `"list:paired"`, `"list:list"`, `"sample_sheet:paired"`, etc. The string is split on `:` — the first segment is the "rank" (outer) type, the rest describe the inner structure.

**Example: `list:paired`** — use `src="new_collection"` for inner collections:

```json
{
  "collection_type": "list:paired",
  "instance_type": "history",
  "history_id": "<id>",
  "name": "a nested collection",
  "element_identifiers": [
    {
      "name": "test_level_1",
      "src": "new_collection",
      "collection_type": "paired",
      "element_identifiers": [
        {"name": "forward", "src": "hda", "id": "<id>"},
        {"name": "reverse", "src": "hda", "id": "<id>"}
      ]
    }
  ]
}
```

**Example: `sample_sheet:paired`** — sample sheet wrapping paired collections:

```json
{
  "collection_type": "sample_sheet:paired",
  "instance_type": "history",
  "history_id": "<id>",
  "column_definitions": [{"type": "int", "name": "replicate", "optional": false}],
  "rows": {"sample1": [42]},
  "element_identifiers": [
    {
      "name": "sample1",
      "src": "new_collection",
      "collection_type": "paired",
      "element_identifiers": [
        {"name": "forward", "src": "hda", "id": "<id>"},
        {"name": "reverse", "src": "hda", "id": "<id>"}
      ]
    }
  ]
}
```

**Nested type regex** (from `type_description.py`):
```
^((list|paired|paired_or_unpaired|record)(:(list|paired|paired_or_unpaired|record))*
  |sample_sheet|sample_sheet:paired|sample_sheet:record|sample_sheet:paired_or_unpaired)$
```

---

## 5. Plumbing — The Creation Call Chain

```
API endpoint (dataset_collections.py)
  └─ DatasetCollectionsService.create()                    [services/dataset_collections.py]
       ├─ api_payload_to_create_params()                   [managers/collections_util.py]
       │    ├─ validates required params (collection_type, element_identifiers)
       │    └─ validate_column_definitions()               [types/sample_sheet_util.py]
       │
       └─ DatasetCollectionManager.create()                [managers/collections.py:180]
            ├─ validate_input_element_identifiers()        [managers/collections_util.py:52]
            │    ├─ no __object__ injection
            │    ├─ all elements have names
            │    ├─ no duplicate names
            │    ├─ src in {hda, hdca, ldda, new_collection}
            │    └─ new_collection requires element_identifiers
            │
            ├─ create_dataset_collection()                 [managers/collections.py:309]
            │    ├─ CollectionTypeDescriptionFactory.for_collection_type()
            │    │    → CollectionTypeDescription wrapping the type string
            │    │
            │    ├─ _element_identifiers_to_elements()     [managers/collections.py:403]
            │    │    ├─ for nested types: __recursively_create_collections_for_identifiers()
            │    │    └─ __load_elements() — resolves src/id → actual model objects
            │    │
            │    ├─ rank_type_plugin()
            │    │    → looks up type string in DatasetCollectionTypesRegistry
            │    │
            │    └─ builder.build_collection(type_plugin, elements, ...)
            │         └─ set_collection_elements()
            │              └─ type_plugin.generate_elements()
            │                   → yields DatasetCollectionElement objects
            │
            └─ _create_instance_for_collection()           [managers/collections.py:250]
                 ├─ creates HistoryDatasetCollectionAssociation (or LDCA)
                 ├─ wires up implicit inputs/outputs (for workflow-generated collections)
                 ├─ applies tags
                 └─ persists to database
```

### Key function: `_element_identifiers_to_elements()`

**File:** `lib/galaxy/managers/collections.py:403`

Resolves identifier dicts into actual model objects:
- For nested types, recursively builds inner DatasetCollections first
- Resolves `src="hda"` → loads HDA by ID, `src="hdca"` → loads collection
- Returns an ordered dict of `{name: model_object}`

### Key function: `builder.build_collection()`

**File:** `lib/galaxy/model/dataset_collections/builder.py:27`

Creates a `DatasetCollection` model, then calls `set_collection_elements()` which delegates to the type plugin's `generate_elements()` to produce `DatasetCollectionElement` objects with proper indices.

---

## 6. The Fetch Path (Alternative Creation)

**Endpoint:** `POST /api/tools/fetch`

Instead of creating datasets first then referencing them, the fetch API uploads data and creates collections atomically. The payload uses a `targets` array:

```json
{
  "history_id": "<id>",
  "targets": [
    {
      "destination": {"type": "hdca"},
      "elements": [
        {"src": "pasted", "paste_content": "data...", "name": "data1"},
        {"src": "url", "url": "https://...", "name": "data2"},
        {"src": "files", "dbkey": "hg19", "info": "..."}
      ],
      "collection_type": "list",
      "name": "My Collection",
      "tags": ["name:mytag"]
    }
  ]
}
```

Element `src` values for fetch: `"pasted"`, `"url"`, `"files"` (multipart upload).

For nested fetch collections:
```json
{
  "targets": [{
    "destination": {"type": "hdca"},
    "collection_type": "list:list",
    "elements": [
      {
        "name": "samp1",
        "elements": [
          {"src": "files", "dbkey": "hg19"}
        ]
      }
    ]
  }]
}
```

For sample_sheet fetch:
```json
{
  "targets": [{
    "destination": {"type": "hdca"},
    "collection_type": "sample_sheet",
    "column_definitions": [{"type": "int", "name": "replicate", "optional": false}],
    "elements": [
      {"src": "url", "url": "...", "name": "sample1", "row": [42]}
    ]
  }]
}
```

Note: `row` on each element (fetch path) vs `rows` dict on the payload (direct path).

---

## 7. Testing

**File:** `lib/galaxy_test/api/test_dataset_collections.py`

### Test Matrix

| Test | Collection Type | Creation Path | What's Tested |
|---|---|---|---|
| `test_create_pair_from_history` | `paired` | fetch | Basic pair creation, 2 elements |
| `test_create_list_from_history` | `list` | direct | Basic list creation, 3 elements |
| `test_create_list_of_existing_pairs` | `list` (of `hdca`) | direct | Nesting existing collections via `src="hdca"` |
| `test_create_list_of_new_pairs` | `list:paired` | direct | Nested creation via `src="new_collection"` |
| `test_create_paried_or_unpaired` | `paired_or_unpaired` | direct | Single-element unpaired |
| `test_create_record` | `record` | direct | Record with explicit fields |
| `test_record_requires_fields` | `record` | direct | 400 when fields missing |
| `test_record_auto_fields` | `record` | direct | `fields="auto"` |
| `test_record_field_validation` | `record` | direct | Wrong count / wrong names → 400 |
| `test_sample_sheet_requires_columns` | `sample_sheet` | direct | Columns on response elements |
| `test_sample_sheet_column_definition_problems` | `sample_sheet` | direct | Invalid column defs → 400 |
| `test_sample_sheet_element_identifier_column_type` | `sample_sheet` | direct | `element_identifier` column type |
| `test_sample_sheet_validating_against_column_definition` | `sample_sheet` | direct | Type mismatch + validator failure |
| `test_sample_sheet_of_pairs_creation` | `sample_sheet:paired` | direct | Nested sample sheet |
| `test_sample_sheet_map_over_preserves_columns` | `sample_sheet` | direct | Columns survive tool mapping |
| `test_copy_sample_sheet_collection` | `sample_sheet` | direct | Columns survive copy |
| `test_upload_collection` | `list` | fetch | File upload with tags |
| `test_upload_nested` | `list:list` | fetch | Nested fetch upload |
| `test_upload_collection_from_url` | `list` | fetch | URL-based upload |
| `test_upload_collection_deferred` | `list` | fetch | Deferred (lazy) upload |
| `test_upload_flat_sample_sheet` | `sample_sheet` | fetch | Sample sheet via fetch |
| `test_upload_sample_sheet_paired` | `sample_sheet:paired` | fetch | Nested sample sheet via fetch |
| `test_enforces_unique_names` | `list` | direct | Duplicate names → 400 |
| `test_hda_security` | `paired` | direct | Cannot use another user's HDA → 403 |

### Test Helper: `_check_create_response`

Handles both direct and fetch responses:
```python
def _check_create_response(self, create_response):
    self._assert_status_code_is(create_response, 200)
    dataset_collection = create_response.json()
    if "output_collections" in dataset_collection:
        # fetch response — follow up with GET
        dataset_collection = dataset_collection["output_collections"][0]
        dataset_collection = self._get(f"dataset_collections/{dataset_collection['id']}").json()
    self._assert_has_keys(dataset_collection, "elements", "url", "name", "collection_type", "element_count")
    return dataset_collection
```

### Standalone helpers

```python
def assert_one_collection_created_in_history(dataset_populator, history_id):
    # Lists history contents, asserts exactly 1 collection, returns full details
```

```python
def upload_flat_sample_sheet(dataset_populator):
    # Creates a sample_sheet via fetch and validates columns
```

---

## 8. Test Populator Helpers

**File:** `lib/galaxy_test/base/populators.py`

### `DatasetCollectionPopulator`

Central test helper class. Key methods:

#### Identifier builders

| Method | Returns | Description |
|---|---|---|
| `list_identifiers(history_id, contents)` | `[{name, src, id}...]` | Creates N HDAs, returns element identifiers for a list |
| `pair_identifiers(history_id, contents)` | `[{name:"forward",...}, {name:"reverse",...}]` | Creates 2 HDAs, returns forward/reverse identifiers |
| `nested_collection_identifiers(history_id, collection_type)` | nested identifier tree | Recursively builds identifiers for `list:paired` etc. |

#### Payload builders

| Method | Description |
|---|---|
| `create_list_payload(history_id, **kwds)` | Builds payload for list creation (delegates to fetch or direct based on `direct_upload` kwarg) |
| `create_pair_payload(history_id, **kwds)` | Builds payload for pair creation |

Both call `__create_payload()` which dispatches:
- `direct_upload=True` (default) → `__create_payload_fetch()` → builds a `targets`-based fetch payload
- `direct_upload=False` → `__create_payload_collection()` → builds an `element_identifiers`-based direct payload

#### Collection creators

| Method | Description |
|---|---|
| `create_list_in_history(history_id)` | Creates a list in history |
| `create_pair_in_history(history_id)` | Creates a pair in history |
| `create_list_of_pairs_in_history(history_id)` | Creates `list:paired` via `upload_collection()` |
| `create_list_of_list_in_history(history_id)` | Creates `list:list` (or deeper) by chaining — first creates an inner list, then wraps it via `create_nested_collection()` |
| `upload_collection(history_id, collection_type, elements)` | Generic fetch-based upload |
| `create_nested_collection(history_id, collection_type, collection)` | Creates nested collection from existing HDCA IDs via `src="hdca"` |
| `copy_collection(history_id, hdca_id)` | Copies a collection via `POST histories/{id}/contents/dataset_collections` |

#### Dispatch logic — `__create(payload)`

```python
def __create(self, payload, wait=False):
    if "targets" not in payload:
        return self._create_collection(payload)   # POST /api/dataset_collections
    else:
        return self.dataset_populator.fetch(payload)  # POST /api/tools/fetch
```

#### Sample sheet helpers

| Method | Description |
|---|---|
| `download_workbook(collection_type, column_definitions)` | Downloads XLSX workbook template |
| `download_workbook_for_collection(hdca_id, column_definitions)` | Downloads workbook for existing collection |
| `parse_workbook(xlsx_content, collection_type, column_definitions)` | Parses uploaded XLSX into rows |
| `parse_workflow_for_collection(hdca_id, xlsx_content, column_definitions)` | Parses XLSX against existing collection |

---

## 9. Validation Summary

Validation happens at multiple layers:

1. **Schema level** (`CreateNewCollectionPayload`) — Pydantic type validation
2. **`api_payload_to_create_params()`** — requires `collection_type` + `element_identifiers`
3. **`validate_column_definitions()`** — validates sample sheet column defs against `SampleSheetColumnDefinitionModel`
4. **`validate_input_element_identifiers()`** — no `__object__` injection, names required, no duplicates, valid `src`
5. **Type plugin `generate_elements()`** — type-specific validation:
   - `record`: field count/names must match elements
   - `paired`: expects forward/reverse
   - `paired_or_unpaired`: 1 or 2 elements only
   - `sample_sheet`: validates row data types against column definitions
6. **Security** — user must own/have access to referenced HDAs; 403 otherwise

---

## 10. Key Files

| File | Purpose |
|---|---|
| `lib/galaxy/webapps/galaxy/api/dataset_collections.py` | FastAPI endpoint |
| `lib/galaxy/webapps/galaxy/services/dataset_collections.py` | Service layer |
| `lib/galaxy/managers/collections.py` | Core manager with `create()`, `create_dataset_collection()` |
| `lib/galaxy/managers/collections_util.py` | Payload parsing, element identifier validation |
| `lib/galaxy/model/dataset_collections/registry.py` | Type plugin registry |
| `lib/galaxy/model/dataset_collections/type_description.py` | `CollectionTypeDescription` — nested type parsing |
| `lib/galaxy/model/dataset_collections/builder.py` | `build_collection()`, `set_collection_elements()` |
| `lib/galaxy/model/dataset_collections/types/__init__.py` | `BaseDatasetCollectionType` abstract base |
| `lib/galaxy/model/dataset_collections/types/list.py` | List type plugin |
| `lib/galaxy/model/dataset_collections/types/paired.py` | Paired type plugin |
| `lib/galaxy/model/dataset_collections/types/record.py` | Record type plugin |
| `lib/galaxy/model/dataset_collections/types/paired_or_unpaired.py` | PairedOrUnpaired type plugin |
| `lib/galaxy/model/dataset_collections/types/sample_sheet.py` | SampleSheet type plugin |
| `lib/galaxy/model/dataset_collections/types/sample_sheet_util.py` | Column definition & row validation |
| `lib/galaxy/schema/schema.py` | Pydantic models (`CreateNewCollectionPayload`, `CollectionElementIdentifier`, `HDCADetailed`) |
| `lib/galaxy_test/api/test_dataset_collections.py` | API tests |
| `lib/galaxy_test/base/populators.py` | `DatasetCollectionPopulator` test helper |
