---
type: research
subtype: component
tags:
  - research/component
  - galaxy/collections
  - galaxy/api
  - galaxy/models
  - galaxy/tools/collections
  - galaxy/workflows
  - galaxy/testing
status: draft
created: 2026-02-09
revised: 2026-02-09
revision: 1
ai_generated: true
galaxy_areas:
  - collections
  - api
  - models
  - tools
  - workflows
  - testing
related_notes:
  - "[[Component - Collection Models]]"
  - "[[Component - Collection API]]"
  - "[[Component - Collections - Paired or Unpaired]]"
  - "[[PR 19305 - Implement Sample Sheets]]"
---

# Sample Sheet Collection Types: Backend Implementation

A comprehensive technical reference for the backend implementation of sample sheet collection types in Galaxy.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Data Model](#2-data-model)
3. [Type Plugin System](#3-type-plugin-system)
4. [Type System and Matching](#4-type-system-and-matching)
5. [Tool Declaration and Execution](#5-tool-declaration-and-execution)
6. [API and Collection Creation](#6-api-and-collection-creation)
7. [Workflow Integration](#7-workflow-integration)
8. [Collection Semantics Specification](#8-collection-semantics-specification)
9. [Testing Coverage](#9-testing-coverage)
10. [Implementation Details](#10-implementation-details)
11. [Relationship to Other Collection Types](#11-relationship-to-other-collection-types)
12. [Limitations and Future Work](#12-limitations-and-future-work)

---

## 1. Introduction

### The Problem

Bioinformatics workflows frequently require per-sample metadata that goes beyond what Galaxy's existing collection types can express. Consider a ChIP-seq experiment: each sample has associated metadata such as "condition" (treatment vs. control), "replicate number", and a reference to its "control sample". Before sample sheets, users had two unsatisfying options:

1. Upload a tabular metadata file alongside a list collection, losing the structural connection between datasets and their metadata.
2. Encode metadata in file naming conventions, which is fragile and limited.

Neither approach allows Galaxy to understand the relationship between datasets and their metadata, which means tools cannot leverage that metadata during execution without manual intervention.

### What Sample Sheets Solve

Sample sheets introduce a new collection type that attaches typed, validated, columnar metadata to each element of a dataset collection. Each element in a sample sheet carries a `row` of values corresponding to a schema of `column_definitions`. This gives Galaxy structured knowledge of per-sample metadata at the model level.

### How They Differ from Lists and Records

| Property | `list` | `record` | `sample_sheet` |
|----------|--------|----------|-----------------|
| Element count | Arbitrary | Fixed by schema | Arbitrary |
| Element identifiers | User-defined | Schema-defined field names | User-defined |
| Per-element metadata | None | None | Typed column values (`columns`) |
| Schema stored on collection | None | `fields` (JSON) | `column_definitions` (JSON) |
| Allow implicit mapping | Yes | **No** | Yes |
| Nestable as inner type | Yes | Yes | **No** (always outermost) |
| Composable variants | `list:paired`, `list:list`, etc. | `record` (flat only) | `sample_sheet:paired`, `sample_sheet:record`, `sample_sheet:paired_or_unpaired` |

A sample sheet is structurally similar to a `list` -- it holds an arbitrary number of elements with user-defined identifiers. The key difference is that each `DatasetCollectionElement` in a sample sheet carries a `columns` JSON field containing a row of metadata values, and the parent `DatasetCollection` carries a `column_definitions` JSON field describing the column schema.

### Historical Context

Sample sheets were introduced in PR #19305 (merged 2025-07-30), implementing issue #19085. The PR changed 113 files with +6504/-235 lines. The database migration revision is `3af58c192752`.

---

## 2. Data Model

### Database Schema Changes

The migration (`lib/galaxy/model/migrations/alembic/versions_gxy/3af58c192752_implement_sample_sheets.py`) adds two nullable JSON columns:

```python
# upgrade()
add_column("dataset_collection", Column("column_definitions", JSONType(), default=None))
add_column("dataset_collection_element", Column("columns", JSONType(), default=None))
```

Both columns default to `None`, so existing collections are completely unaffected.

### DatasetCollection: `column_definitions`

**File**: `lib/galaxy/model/__init__.py:6989-6990`

```python
# if collection_type is 'sample_sheet' (collection of rows that datasets with extra column metadata)
column_definitions: Mapped[Optional[SampleSheetColumnDefinitions]] = mapped_column(JSONType)
```

The `column_definitions` field stores the schema for the sample sheet's metadata columns. It is a JSON list of `SampleSheetColumnDefinition` typed dicts (defined in `lib/galaxy/schema/schema.py:384-405`):

```python
SampleSheetColumnType = Literal["string", "int", "float", "boolean", "element_identifier"]
SampleSheetColumnValueT = Union[int, float, bool, str, NoneType]

class SampleSheetColumnDefinition(TypedDict, closed=True):
    name: str
    description: NotRequired[Optional[str]]
    type: SampleSheetColumnType
    optional: bool
    default_value: NotRequired[Optional[SampleSheetColumnValueT]]
    validators: NotRequired[Optional[list[dict[str, Any]]]]
    restrictions: NotRequired[Optional[list[SampleSheetColumnValueT]]]
    suggestions: NotRequired[Optional[list[SampleSheetColumnValueT]]]
```

**Column Types**:
- `"string"` -- text values, validated against special character restrictions
- `"int"` -- integer values
- `"float"` -- numeric values (accepts int or float)
- `"boolean"` -- true/false values
- `"element_identifier"` -- a string that must match another element's identifier in the same collection; enables cross-referencing (e.g., specifying which sample is the "control" for another)

**Type Aliases** (`lib/galaxy/schema/schema.py:403-405`):

```python
SampleSheetColumnDefinitions = list[SampleSheetColumnDefinition]
SampleSheetRow = list[SampleSheetColumnValueT]
SampleSheetRows = dict[str, SampleSheetRow]
```

### DatasetCollectionElement: `columns`

**File**: `lib/galaxy/model/__init__.py:8006`

```python
columns: Mapped[Optional[SampleSheetRow]] = mapped_column(JSONType)
```

Each element stores its row of metadata as a JSON list of values, positionally corresponding to the parent collection's `column_definitions`. For example, if `column_definitions` is `[{name: "condition", type: "string"}, {name: "replicate", type: "int"}]`, then an element's `columns` might be `["treatment", 3]`.

The `columns` field is accepted in the `DatasetCollectionElement.__init__()` constructor (`lib/galaxy/model/__init__.py:8038,8057`):

```python
def __init__(self, ..., columns: Optional[SampleSheetRow] = None):
    ...
    self.columns = columns
```

It is also exposed via the API through `dict_element_visible_keys` (`lib/galaxy/model/__init__.py:8027`):

```python
dict_element_visible_keys = ["id", "element_type", "element_index", "element_identifier", "columns"]
```

### Serialization

The `column_definitions` are serialized alongside the collection in `DatasetCollection._serialize()` (`lib/galaxy/model/__init__.py:7472`):

```python
column_definitions=self.column_definitions,
```

And propagated through `_base_to_dict()` (`lib/galaxy/model/__init__.py:7501`):

```python
column_definitions=self.collection.column_definitions,
```

Element `columns` are serialized by virtue of being in `dict_element_visible_keys`, and also handled during model store import/export at `lib/galaxy/model/store/__init__.py:862`:

```python
columns=element_attrs.get("columns"),
```

### Storage Layout Example

A `sample_sheet` collection with two elements and one metadata column ("replicate", int):

```
DatasetCollection
  id: 100
  collection_type: "sample_sheet"
  column_definitions: [{"name": "replicate", "type": "int", "optional": false}]

  DatasetCollectionElement
    element_identifier: "sample1"
    element_index: 0
    hda_id: 501
    columns: [42]

  DatasetCollectionElement
    element_identifier: "sample2"
    element_index: 1
    hda_id: 502
    columns: [45]
```

A `sample_sheet:paired` collection nests paired subcollections. The `columns` are on the outer elements (each of which points to a `child_collection` of type `paired`):

```
DatasetCollection
  id: 200
  collection_type: "sample_sheet:paired"
  column_definitions: [{"name": "replicate", "type": "int", "optional": false}]

  DatasetCollectionElement
    element_identifier: "sample1"
    element_index: 0
    child_collection_id: 201   -> DatasetCollection(collection_type="paired")
    columns: [42]                   forward=hda_503, reverse=hda_504
```

### Relationship to the `fields` Column

The `DatasetCollection` model has two JSON schema columns:
- `fields` -- used by `record` type collections for CWL-style field definitions
- `column_definitions` -- used by `sample_sheet` type collections for column metadata schema

These are independent and serve different purposes. `fields` describes the structure of a record (what named slots exist), while `column_definitions` describes per-element metadata columns. A `sample_sheet:record` would use `column_definitions` at the outer sample_sheet level and `fields` at the inner record level.

---

## 3. Type Plugin System

### Plugin Registration

**File**: `lib/galaxy/model/dataset_collections/registry.py`

The `SampleSheetDatasetCollectionType` is registered alongside the other collection type plugins:

```python
PLUGIN_CLASSES = [
    ListDatasetCollectionType,
    PairedDatasetCollectionType,
    RecordDatasetCollectionType,
    PairedOrUnpairedDatasetCollectionType,
    SampleSheetDatasetCollectionType,
]
```

### SampleSheetDatasetCollectionType

**File**: `lib/galaxy/model/dataset_collections/types/sample_sheet.py`

```python
class SampleSheetDatasetCollectionType(BaseDatasetCollectionType):
    """A flat list of named elements starting rows with column metadata."""

    collection_type = "sample_sheet"

    def generate_elements(self, dataset_instances, **kwds):
        rows = cast(OptionalSampleSheetRows, kwds.get("rows", None))
        column_definitions = kwds.get("column_definitions", None)
        if rows is None:
            raise RequestParameterMissingException(
                "Missing or null parameter 'rows' required for 'sample_sheet' collection types."
            )
        if len(dataset_instances) != len(rows):
            self._validation_failed("Supplied element do not match 'rows'.")

        all_element_identifiers = list(dataset_instances.keys())
        for identifier, element in dataset_instances.items():
            columns = rows[identifier]
            validate_row(columns, column_definitions, all_element_identifiers)
            association = DatasetCollectionElement(
                element=element,
                element_identifier=identifier,
                columns=columns,
            )
            yield association
```

Key behaviors:
1. **Requires `rows`**: Raises `RequestParameterMissingException` if `rows` kwarg is missing.
2. **Length validation**: The number of rows must match the number of dataset instances.
3. **Per-row validation**: Each row is validated against `column_definitions` via `validate_row()`.
4. **`columns` stored on element**: Each `DatasetCollectionElement` is created with its `columns` set.

### Variants

Sample sheets compose with inner collection types to form four valid variants:

| Variant | Outer Type | Inner Elements | Use Case |
|---------|-----------|----------------|----------|
| `sample_sheet` | sample_sheet | Flat datasets | Simple per-sample metadata |
| `sample_sheet:paired` | sample_sheet | Paired collections | Per-sample metadata for paired reads |
| `sample_sheet:paired_or_unpaired` | sample_sheet | Paired or single | Mixed single/paired with metadata |
| `sample_sheet:record` | sample_sheet | Record collections | Metadata on heterogeneous records |

For composite types like `sample_sheet:paired`, the outer rank plugin is `SampleSheetDatasetCollectionType` and the inner rank is `PairedDatasetCollectionType`. The builder system handles the nesting: outer elements get `columns` from the `rows` kwarg, and inner elements are built by the inner type's plugin.

### No `prototype_elements`

Unlike `PairedDatasetCollectionType` and `RecordDatasetCollectionType`, the `SampleSheetDatasetCollectionType` does **not** implement `prototype_elements()`. This means the registry's `prototype()` method will raise an exception for sample_sheet types. Sample sheet structure cannot be determined before actual data exists because element count is arbitrary.

---

## 4. Type System and Matching

### Type Validation Regex

**File**: `lib/galaxy/model/dataset_collections/type_description.py:15-17`

```python
COLLECTION_TYPE_REGEX = re.compile(
    r"^((list|paired|paired_or_unpaired|record)(:(list|paired|paired_or_unpaired|record))*"
    r"|sample_sheet|sample_sheet:paired|sample_sheet:record|sample_sheet:paired_or_unpaired)$"
)
```

The regex enforces that:
- Standard types (`list`, `paired`, `paired_or_unpaired`, `record`) can be composed arbitrarily with `:` separators.
- `sample_sheet` is handled separately and can only appear as the outermost type.
- Only four `sample_sheet` variants are valid: `sample_sheet`, `sample_sheet:paired`, `sample_sheet:record`, `sample_sheet:paired_or_unpaired`.
- Deep nesting like `sample_sheet:list:paired` or `list:sample_sheet` is **invalid**.

The `CollectionTypeDescription.validate()` method checks against this regex:

```python
def validate(self):
    if COLLECTION_TYPE_REGEX.match(self.collection_type) is None:
        raise RequestParameterInvalidException(f"Invalid collection type: [{self.collection_type}]")
```

### `rank_collection_type()` for Sample Sheets

For `sample_sheet:paired`, `rank_collection_type()` returns `"sample_sheet"` (the part before the first `:`). This means the registry resolves to `SampleSheetDatasetCollectionType` as the rank plugin.

### `has_subcollections_of_type()`

The method (`type_description.py:76-99`) determines if a collection type contains subcollections of another type. For sample sheets:

- `sample_sheet:paired` has subcollections of type `paired` -- returns `True` because `"sample_sheet:paired".endswith("paired")`.
- `sample_sheet` has no subcollections of `list` or `paired` -- `"sample_sheet"` does not end with either.
- `sample_sheet:paired` has subcollections of `paired_or_unpaired` -- returns `True` via the special `paired_or_unpaired` rule (collection_type != "paired").

### `can_match_type()`

The method (`type_description.py:106-124`) determines if two collection types are compatible for linked matching. For sample sheets:

- `sample_sheet` can match `sample_sheet` -- identity match.
- `sample_sheet:paired` can match `sample_sheet:paired` -- identity match.
- There is no special casing for sample_sheet in `can_match_type`. Sample sheets do not match non-sample-sheet types.

### `allow_implicit_mapping`

**File**: `lib/galaxy/model/__init__.py:7228-7230`

```python
@property
def allow_implicit_mapping(self):
    return self.collection_type != "record"
```

Sample sheets **allow implicit mapping** because the check only excludes `"record"`. This means a sample sheet can be mapped over tool inputs, creating implicit output collections. This is a critical design decision: sample sheets behave like lists for mapping purposes, unlike records which cannot be mapped over.

### `effective_collection_type()`

For `sample_sheet:paired` with subcollection type `paired`:
```python
effective = "sample_sheet:paired"[:-(len("paired") + 1)]  # = "sample_sheet"
```

This correctly computes that mapping a `sample_sheet:paired` over a `paired` input produces a `sample_sheet`-shaped output.

### Mapping Rules Summary

Sample sheets follow the same mapping rules as lists:

- A `sample_sheet` of datasets can be mapped over a single-dataset tool input, producing a `sample_sheet` implicit output.
- A `sample_sheet:paired` can be mapped over a `paired` collection input, producing a `sample_sheet` implicit output.
- A `sample_sheet:paired` can be mapped over a `paired_or_unpaired` input (same as `list:paired` over `paired_or_unpaired`).
- Multiple sample sheets with identical structure can be linked for dot-product mapping.

---

## 5. Tool Declaration and Execution

### Tool Input Declaration

Tools declare sample sheet inputs using the `data_collection` parameter type with `collection_type` specifying one or more sample sheet variants.

**Example** -- the `__SAMPLE_SHEET_TO_TABULAR__` tool (`lib/galaxy/tools/sample_sheet_to_tabular.xml:21`):

```xml
<param type="data_collection"
       collection_type="sample_sheet,sample_sheet:paired,sample_sheet:paired_or_unpaired,sample_sheet:record"
       name="input"
       label="Sample sheet to convert" />
```

This tool accepts any sample sheet variant. Tools can also declare a specific variant (e.g., only `sample_sheet:paired`).

### DataCollectionToolParameter

**File**: `lib/galaxy/tools/parameters/basic.py:2506`

The `DataCollectionToolParameter` class reads `column_definitions` from the input source:

```python
self._column_definitions = input_source.get("column_definitions", None)
```

And serializes it in `to_dict()`:

```python
d["column_definitions"] = self._column_definitions
```

This enables the workflow editor to understand what column schema a sample sheet input expects, so it can render the column definition forms.

### Runtime Wrappers

**File**: `lib/galaxy/tools/wrappers.py:643-707`

The `DatasetCollectionWrapper.__init__()` (starting at line 643) builds a `rows` dict from the collection elements (lines 682-704):

```python
rows: dict[str, Optional[SampleSheetRow]] = {}
for dataset_collection_element in elements:
    element_identifier = dataset_collection_element.element_identifier
    row = dataset_collection_element.columns
    rows[element_identifier] = row
```

It exposes a `sample_sheet_row()` method:

```python
def sample_sheet_row(self, element_identifier: str) -> Optional[SampleSheetRow]:
    return self.__rows[element_identifier]
```

This is how tools access sample sheet metadata at runtime. The `__SAMPLE_SHEET_TO_TABULAR__` tool uses this in its Cheetah template:

```cheetah
#for $key in $input.keys()
#set $row = $input.sample_sheet_row($key)
#set $row_as_string = '\t'.join(map(lambda x: ..., $row))
$key$tab$row_as_string
#end for
```

### The `__SAMPLE_SHEET_TO_TABULAR__` Tool

**File**: `lib/galaxy/tools/sample_sheet_to_tabular.xml`

This built-in tool converts sample sheet metadata to tabular format. It:
1. Accepts any sample sheet variant as input
2. Iterates over elements via `$input.keys()`
3. For each element, retrieves the row via `$input.sample_sheet_row($key)`
4. Produces a tab-separated line with the element identifier followed by column values
5. Handles `None`, empty string, and boolean replacements via configurable parameters

The tool uses a `configfile` template that generates the output inline, then copies it:

```xml
<command>cp '$out_config' '$output'</command>
```

---

## 6. API and Collection Creation

### Direct Collection Creation API

**Endpoint**: `POST /api/dataset_collections`

The `CreateNewCollectionPayload` schema (`lib/galaxy/schema/schema.py:1795-1804`) accepts:

```python
column_definitions: Optional[SampleSheetColumnDefinitions] = Field(
    default=None,
    description="Specify definitions for row data if collection_type is sample_sheet",
)
rows: Optional[SampleSheetRows] = Field(
    default=None,
    description="Specify rows of metadata data corresponding to an identifier if collection_type is sample_sheet",
)
```

The `rows` field is a dict mapping element identifiers to their column value lists.

**Flow** (`lib/galaxy/managers/collections_util.py:36-48`):

1. `api_payload_to_create_params()` extracts `column_definitions` and `rows`
2. Calls `validate_column_definitions()` on the definitions
3. Passes them through to `DatasetCollectionManager.create()`

**Manager** (`lib/galaxy/managers/collections.py:172-220`):

```python
def create(self, ..., column_definitions=None, rows=None):
    ...
    dataset_collection = self.create_dataset_collection(...,
        column_definitions=column_definitions, rows=rows)
```

**Builder** (`lib/galaxy/model/dataset_collections/builder.py:27-46`):

```python
def build_collection(type, dataset_instances, ..., column_definitions=None, rows=None):
    dataset_collection = collection or DatasetCollection(
        fields=fields, column_definitions=column_definitions
    )
    set_collection_elements(dataset_collection, type, dataset_instances, ..., rows=rows)
    return dataset_collection
```

### Fetch API Path

**Endpoint**: `POST /api/tools/fetch`

For creating sample sheets from remote URIs, the fetch API carries metadata at two levels:

1. **Target level**: `column_definitions` on `BaseCollectionTarget` (`lib/galaxy/schema/fetch_data.py:97`)
2. **Element level**: `row` on each element

The fetch tool (`lib/galaxy/tools/data_fetch.py:133-134,153-154`) propagates both:

```python
if "column_definitions" in target:
    fetched_target["column_definitions"] = target["column_definitions"]
...
if row := src_item.get("row", None):
    target_metadata["row"] = row
```

During discovery (`lib/galaxy/model/store/discover.py:433-444`), row data flows through the builder:

```python
element_datasets["rows"].append(discovered_file.match.row)
...
current_builder.get_level(element_identifier, row=row)
current_builder.add_dataset(element_identifiers[-1], dataset, row=row)
```

### Workbook API Endpoints

Four new endpoints support Excel/CSV/TSV workbook generation and parsing:

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/sample_sheet_workbook` | Generate XLSX workbook for a column schema |
| POST | `/api/sample_sheet_workbook/parse` | Parse uploaded workbook against schema |
| POST | `/api/dataset_collections/{hdca_id}/sample_sheet_workbook` | Generate workbook pre-seeded with collection element names |
| POST | `/api/dataset_collections/{hdca_id}/sample_sheet_workbook/parse` | Parse workbook against a specific collection |

**File**: `lib/galaxy/webapps/galaxy/api/dataset_collections.py:96-141`

The workbook system (`lib/galaxy/model/dataset_collections/types/sample_sheet_workbook.py`) uses `openpyxl` to generate XLSX files with:
- Column headers from prefix columns (URIs for creation, element identifiers for existing collections) plus user-defined columns
- Data validation (dropdowns for restrictions, type validation)
- Cell protection on non-editable columns
- An instructions sheet
- A help sheet for Galaxy-recognized columns (dbkey, file_type, etc.)

Parsing supports three formats:
- **XLSX**: detected by ZIP magic bytes (`PK\x03\x04`)
- **CSV**: detected by `csv.Sniffer`
- **TSV**: detected by `csv.Sniffer` with tab delimiter

The `ReadOnlyWorkbook` protocol abstracts across all formats.

---

## 7. Workflow Integration

### Workflow Input Module

**File**: `lib/galaxy/workflow/modules.py`

The `InputCollectionModule` handles sample sheet collection types in several methods:

**Validation** (`modules.py:1170-1172`):

```python
column_definitions = state.get("column_definitions")
if column_definitions:
    validate_column_definitions(column_definitions)
```

**Runtime input generation** (`modules.py:1188-1189`):

```python
if "column_definitions" in parameter_def:
    collection_param_source["column_definitions"] = parameter_def["column_definitions"]
```

**State parsing** (`modules.py:1222-1232`):

```python
if "column_definitions" in inputs:
    column_definitions = inputs["column_definitions"]
else:
    column_definitions = None
state_as_dict["column_definitions"] = column_definitions
```

This means workflow authors can define `sample_sheet` inputs with column definitions in the workflow editor, and those definitions flow through to the runtime form and the collection creation wizard.

### Workflow YAML Format

Sample sheet inputs are declared in Galaxy workflow YAML format like:

```yaml
inputs:
  chipseq_data:
    type: collection
    collection_type: sample_sheet:paired
    column_definitions:
    - type: string
      name: condition
      default_value: treatment
      optional: false
    - type: int
      name: replicate
      optional: false
    - type: element_identifier
      name: control_sample
      optional: true
```

### Workflow Editor (Client-Side)

The workflow editor provides forms for defining column definitions:
- `FormColumnDefinitions.vue` -- repeatable form for managing the list
- `FormColumnDefinition.vue` -- individual column definition form (name, type, description, restrictions, optional flag, default)
- `FormColumnDefinitionType.vue` -- type selector dropdown
- `FormCollectionType.vue` -- extended to include sample_sheet variants

### Workflow Run

When running a workflow with a sample sheet input, the client detects the sample_sheet type and routes to:
1. `SampleSheetCollectionCreator.vue` -- thin wrapper
2. `SampleSheetWizard.vue` -- multi-step wizard with source selection, auto-pairing, workbook upload, and AG Grid metadata editing

---

## 8. Collection Semantics Specification

The formal collection semantics YAML file (`lib/galaxy/model/dataset_collections/types/collection_semantics.yml`) does not currently contain sample_sheet-specific entries. However, the behavior of sample sheets can be derived from the existing specification because sample sheets follow the same mapping and reduction rules as lists.

### Applicable Rules

Since `allow_implicit_mapping` returns `True` for sample sheets (only `record` returns `False`), the following list-like rules apply:

**Mapping over data inputs**: A `sample_sheet` with n elements mapped over a `(i: dataset) => {o: dataset}` tool produces n jobs and an implicit output collection of the same shape.

**Subcollection mapping**: A `sample_sheet:paired` can be mapped over a `collection<paired>` input, producing a `sample_sheet` implicit output (one job per element).

**Reduction via multiple data input**: A `sample_sheet` can be consumed by a `dataset<multiple=true>` input (all elements passed as a list), reducing it to a single output.

**Linked mapping**: Two sample sheets with identical structure can be linked for dot-product execution across multiple inputs.

### Rules That Do Not Apply

- `sample_sheet:paired` cannot be reduced by a `multiple` data input (same as `list:paired`).
- `paired` inputs cannot consume `sample_sheet:paired_or_unpaired` elements.

### Formal Notation (Derived)

Using the notation from the collection semantics specification:

**SAMPLE_SHEET_MAPPING**:

Assuming $d_1,...,d_n$ are datasets with rows $r_1,...,r_n$, tool is $(i: \text{dataset}) \Rightarrow \{o: \text{dataset}\}$, and $C$ is $\text{CollectionInstance<sample\_sheet, \{i1=d_1,...,in=d_n\}, column\_definitions, rows\{i1=r_1,...,in=r_n\}>}$

$$tool(i=\text{mapOver}(C)) \mapsto \{o: collection<sample\_sheet, \{i1=tool(i=d_1)[o],...,in=tool(i=d_n)[o]\}>\}$$

Note: The implicit output collection does not carry the `column_definitions` or `columns` from the input. Metadata is on the input, not propagated to mapped-over outputs.

---

## 9. Testing Coverage

### Unit Tests

**`test/unit/data/dataset_collections/test_sample_sheet_util.py`** (205 lines):
- Validation skipped on empty definitions
- Number of columns mismatch detection
- Type validation: int, float, string, boolean, element_identifier
- String special character restrictions (tab, quotes disallowed; spaces allowed)
- element_identifier validation (must exist in collection, must be string)
- Restriction enforcement
- Validator enforcement: `length` (min/max), `in_range` (min/max)
- Column definition validation: valid defs pass, invalid `length` validator detected, unsafe validators (`expression`) rejected, special characters in column names rejected

**`test/unit/data/dataset_collections/test_sample_sheet_workbook.py`**:
- XLSX workbook generation and parsing roundtrips for: simple sample sheet, paired, paired_or_unpaired, from-collection
- TSV parsing
- dbkey column handling

**`test/unit/data/dataset_collections/test_type_descriptions.py`**:
- Validates the `COLLECTION_TYPE_REGEX` accepts all valid types and rejects invalid ones

### API Integration Tests

**`lib/galaxy_test/api/test_dataset_collections.py`**:
- `test_sample_sheet_column_definition_problems` -- rejects invalid column definitions
- `test_sample_sheet_element_identifier_column_type` -- validates element_identifier references
- `test_sample_sheet_of_pairs_creation` -- creates `sample_sheet:paired` with metadata
- `test_sample_sheet_validating_against_column_definition` -- validates row values against definitions (type mismatch, out of range)
- `test_sample_sheet_requires_columns` -- verifies columns are stored and returned
- `test_workbook_download` -- downloads a workbook for `sample_sheet` type
- `test_workbook_parse` -- parses a workbook against a schema
- `test_workbook_parse_for_collection` -- parses a workbook against a specific collection
- `test_upload_flat_sample_sheet` -- creates sample sheet via fetch API
- `test_upload_sample_sheet_paired` -- creates `sample_sheet:paired` via fetch API

**`lib/galaxy_test/api/test_tools.py`**:
- `test_apply_rules_nested_list_from_sample_sheet` -- converts sample sheet to nested list via rules
- `test_apply_rules_nested_list_of_pairs_from_sample_sheet` -- converts `sample_sheet:paired` to `list:list:paired` via rules

**`lib/galaxy_test/api/test_workflows.py`**:
- `test_invalid_sample_sheet_definitions_rejected` -- rejects workflows with invalid column definitions (invalid type, unsafe validators)

### Selenium Tests

**`lib/galaxy_test/selenium/test_workflow_editor.py`**:
- `test_collection_input_sample_sheet_chipseq_example` -- enters column definitions in workflow editor

**`lib/galaxy_test/selenium/test_workflow_run.py`**:
- `test_collection_input_sample_sheet_chipseq_example_from_uris` -- full end-to-end: paste URIs, auto-pair, fill AG Grid, submit, verify tabular output
- `test_collection_input_sample_sheet_chipseq_example_from_list_pairs` -- create from existing `list:paired` collection, fill metadata, submit

### Rules DSL Tests

**`lib/galaxy/util/rules_dsl_spec.yml`**:
- Test cases for `add_column_from_sample_sheet_index` rule

**`lib/galaxy_test/base/rules_test_data.py`**:
- `EXAMPLE_SAMPLE_SHEET_SIMPLE_TO_NESTED_LIST` -- converts flat `sample_sheet` with treatment metadata to `list:list` grouped by treatment
- `EXAMPLE_SAMPLE_SHEET_SIMPLE_TO_NESTED_LIST_OF_PAIRS` -- converts `sample_sheet:paired` to `list:list:paired`

---

## 10. Implementation Details

### Key Code Paths

#### Collection Creation (Direct API)

1. `lib/galaxy/webapps/galaxy/api/dataset_collections.py` -- API endpoint receives payload
2. `lib/galaxy/managers/collections_util.py:36-48` -- `api_payload_to_create_params()` extracts `column_definitions`, `rows`, calls `validate_column_definitions()`
3. `lib/galaxy/managers/collections.py:172-220` -- `DatasetCollectionManager.create()` passes through to `create_dataset_collection()`
4. `lib/galaxy/managers/collections.py:301-357` -- `create_dataset_collection()` resolves elements, calls `builder.build_collection()`
5. `lib/galaxy/model/dataset_collections/builder.py:27-46` -- `build_collection()` creates `DatasetCollection` with `column_definitions`, calls `set_collection_elements()`
6. `lib/galaxy/model/dataset_collections/builder.py:49-78` -- `set_collection_elements()` invokes `type.generate_elements()` with `rows` and `column_definitions` kwargs
7. `lib/galaxy/model/dataset_collections/types/sample_sheet.py:17-36` -- `SampleSheetDatasetCollectionType.generate_elements()` validates and yields elements with `columns`

#### Collection Creation (Fetch API)

1. `lib/galaxy/tools/data_fetch.py:130-154` -- Propagates `column_definitions` to target, `row` to element metadata
2. `lib/galaxy/model/store/discover.py:430-444` -- During discovery, builds collection via `CollectionBuilder.get_level(row=)` and `add_dataset(row=)`
3. `lib/galaxy/model/dataset_collections/builder.py:143-155` -- `get_level()` stores row in `_current_row_data`
4. `lib/galaxy/model/dataset_collections/builder.py:157-161` -- `add_dataset()` stores row in `_current_row_data`
5. `lib/galaxy/model/dataset_collections/builder.py:175-180` -- `build_elements_and_rows()` returns both elements and row data
6. `lib/galaxy/model/dataset_collections/builder.py:182-190` -- `build()` passes `rows` to `build_collection()`

#### Validation

1. `lib/galaxy/model/dataset_collections/types/sample_sheet_util.py:78-93` -- `validate_column_definitions()` validates each definition via Pydantic model
2. `lib/galaxy/model/dataset_collections/types/sample_sheet_util.py:30-62` -- `SampleSheetColumnDefinitionModel` with validators for default value types, column name characters
3. `lib/galaxy/model/dataset_collections/types/sample_sheet_util.py:96-107` -- `validate_row()` checks column count matches, validates each value
4. `lib/galaxy/model/dataset_collections/types/sample_sheet_util.py:125-167` -- `validate_column_value()` type-checks, validates restrictions, runs safe validators

#### Tool Execution with Sample Sheets

1. `lib/galaxy/tools/wrappers.py:643-707` -- `DatasetCollectionWrapper.__init__()` builds `__rows` dict (rows logic at 682-704)
2. `lib/galaxy/tools/wrappers.py:706-707` -- `sample_sheet_row()` returns row for an element
3. `lib/galaxy/tools/sample_sheet_to_tabular.xml` -- Cheetah template iterates elements and rows

#### Rule Builder Integration

1. `lib/galaxy/managers/collections.py:823-858` -- `__init_rule_data()` extracts `columns` from sample_sheet elements into `sources`
2. `lib/galaxy/util/rules_dsl.py:278-298` -- `AddColumnFromSampleSheetByIndex` rule extracts column values from `source["columns"]`

### Validation Security

**File**: `lib/galaxy/tool_util_models/parameter_validators.py:469-476`

Only three "safe" validator types are allowed in column definitions:

```python
AnySafeValidatorModel = Annotated[
    Union[
        RegexParameterValidatorModel,
        InRangeParameterValidatorModel,
        LengthParameterValidatorModel,
    ],
    Field(discriminator="type"),
]
```

This explicitly excludes dangerous validators like `expression` (arbitrary Python evaluation). The `SampleSheetColumnDefinitionModel` uses `AnySafeValidatorModel` for its `validators` field, and `validate_column_definitions()` catches validation errors, converting them to `RequestParameterInvalidException`.

### Special Character Restrictions

**File**: `lib/galaxy/model/dataset_collections/types/sample_sheet_util.py:109-122`

Column names and string values are validated against:

```python
def has_special_characters(str_value: str) -> bool:
    if not re.match(r"^[\w\-_ \?]*$", str_value):
        return True
    return False
```

This allows: word characters (`\w` = letters, digits, underscore), hyphens, spaces, and question marks. It disallows: tabs, newlines, quotes, and other special characters that could interfere with CSV/TSV serialization or cause injection issues.

---

## 11. Relationship to Other Collection Types

### Comparison Matrix

| Feature | `list` | `paired` | `paired_or_unpaired` | `record` | `sample_sheet` |
|---------|--------|----------|---------------------|----------|----------------|
| Plugin file | `types/list.py` | `types/paired.py` | `types/paired_or_unpaired.py` | `types/record.py` | `types/sample_sheet.py` |
| Element count | Arbitrary | Exactly 2 | 1 or 2 | Fixed by fields | Arbitrary |
| Fixed identifiers | No | `forward`/`reverse` | `unpaired` or `forward`/`reverse` | Field names | No |
| Schema column | None | None | None | `fields` | `column_definitions` |
| Per-element metadata | None | None | None | None | `columns` |
| `allow_implicit_mapping` | `True` | `True` | `True` | **`False`** | `True` |
| `prototype_elements()` | No | Yes | No | Yes | No |
| Can be inner type | Yes | Yes | Yes | Yes | **No** |
| Can be outermost | Yes | Yes | Yes | Yes | Yes (always) |
| Composable with | Everything | Everything | Everything | Everything | `paired`, `record`, `paired_or_unpaired` |

### Relationship to `record`

Records and sample sheets both add schema metadata to collections, but serve different purposes:

- **Records** define structural heterogeneity: each element can be a different type (different file formats). The `fields` schema describes what named slots exist. Records are for CWL-style structured data.
- **Sample sheets** define columnar metadata: each element is homogeneous (same type), but carries per-row metadata. The `column_definitions` schema describes the metadata columns.

Records disallow implicit mapping (`allow_implicit_mapping = False`) because their heterogeneous nature makes mapping semantically unclear. Sample sheets allow mapping because elements are homogeneous (like lists).

### Relationship to `list`

A `sample_sheet` is essentially a `list` with metadata. The key differences:

1. `sample_sheet` requires `rows` and `column_definitions` at creation time.
2. `sample_sheet` elements have `columns` populated.
3. `sample_sheet` cannot be used as an inner type in composition (always outermost).
4. `sample_sheet` uses a separate regex branch for type validation.

For tool execution and mapping, sample sheets behave identically to lists.

### Relationship to `paired`

A `sample_sheet:paired` is analogous to `list:paired` -- a list-like outer structure containing paired inner collections. The outer elements carry metadata via `columns`. The `sample_sheet` rank plugin validates and attaches the metadata, while the inner `paired` plugin handles the forward/reverse structure.

---

## 12. Limitations and Future Work

### Current Limitations

1. **No deep nesting**: Sample sheets can only be the outermost rank. `list:sample_sheet` or `sample_sheet:list` are invalid. This is enforced by the regex.

2. **Metadata not propagated through mapping**: When a sample sheet is mapped over a tool, the implicit output collection does not carry the input's `column_definitions` or `columns`. The metadata lives only on the input.

3. **No `prototype_elements`**: Sample sheets cannot be pre-created with placeholder structure because element count is unknown. This limits certain implicit collection pre-creation patterns.

4. **Limited validator types**: Only `regex`, `in_range`, and `length` validators are allowed. More complex validation (e.g., cross-column constraints) is not supported.

5. **Column value restrictions**: String values cannot contain tabs, newlines, quotes, or most special characters. This is necessary for safe CSV/TSV serialization but may be overly restrictive for some use cases.

6. **No column-level metadata propagation to outputs**: There is no mechanism for a tool to declare that it produces a sample sheet output with specific columns derived from its input.

7. **`element_identifier` column type is limited to within-collection references**: It validates that the value exists as an element identifier in the same collection but does not support cross-collection references.

### Areas for Improvement

1. **Richer column types**: Supporting composite types (lists within cells), or types that reference external datasets.

2. **Column metadata propagation**: Allowing tools to declare output columns that flow from input sample sheet columns.

3. **Cross-collection references**: Extending `element_identifier` to reference elements in other collections within the same history.

4. **Workflow-level metadata operations**: Built-in workflow steps for filtering, joining, or transforming sample sheet metadata.

5. **Collection semantics YAML entries**: The formal specification (`collection_semantics.yml`) does not yet have entries for sample_sheet types. Adding these would improve documentation and enable automated test generation.

6. **Deeper nesting**: Supporting `list:sample_sheet` for grouped sample sheets, or `sample_sheet:list` for per-sample multi-file collections with metadata.
