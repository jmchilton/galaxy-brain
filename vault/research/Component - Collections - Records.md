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
created: 2026-05-09
revised: 2026-05-09
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
  - "[[Component - Collections - Sample Sheets Backend]]"
  - "[[Component - Collections - Paired or Unpaired]]"
summary: "Heterogeneous fixed-shape collection: CWL-derived `fields` schema of named typed slots; no implicit mapping"
---

# The `record` Collection Type in Galaxy

A technical reference for the backend implementation of `record` collections and their associated `fields` schema.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Data Model](#2-data-model)
3. [Type Plugin System](#3-type-plugin-system)
4. [Type System and Matching](#4-type-system-and-matching)
5. [Tool Declaration and Execution](#5-tool-declaration-and-execution)
6. [API and Collection Creation](#6-api-and-collection-creation)
7. [Workflow Integration](#7-workflow-integration)
8. [Field Schema Detail](#8-field-schema-detail)
9. [Collection Semantics Specification](#9-collection-semantics-specification)
10. [Testing Coverage](#10-testing-coverage)
11. [Implementation Details](#11-implementation-details)
12. [Relationship to Other Collection Types](#12-relationship-to-other-collection-types)
13. [Limitations and Future Work](#13-limitations-and-future-work)

---

## 1. Introduction

### The Problem

Galaxy's original collection types -- `list`, `paired`, and (later) `paired_or_unpaired` -- describe **homogeneous** structures: every element of a `list` is the same kind of dataset, and a `paired` collection always contains exactly the same two slots (`forward`, `reverse`). This works for the dominant biology pattern of "n samples of the same shape," but it has no way to express a **fixed, named, heterogeneous bundle** of datasets where each slot has a different role.

Concrete cases:

- A trio analysis with `parent`, `mother`, `father` BAMs.
- A reference bundle with `genome`, `gtf`, `index` files of different formats.
- A CWL tool that declares an `InputRecordSchema` with named fields.

Before records, these had to be passed as separate top-level inputs, losing the structural grouping and forcing tools or workflows to maintain the field/dataset correspondence externally.

### What Records Solve

A `record` collection is a **fixed-length, named-slot, heterogeneous** collection: a collection whose shape is described by a schema of `fields`, where each field has a `name` (matching the element identifier) and a `type` (drawn from a CWL subset). The collection's structure -- count and ordering of slots -- is fixed at creation by its `fields` schema.

This gives Galaxy a first-class representation of grouped, role-named datasets that mirrors the CWL `record` pattern.

### How They Differ from Lists and Sample Sheets

| Property | `list` | `record` | `sample_sheet` |
|----------|--------|----------|----------------|
| Element count | Arbitrary | Fixed by schema | Arbitrary |
| Element identifiers | User-defined | Schema-defined field names | User-defined |
| Element homogeneity | Homogeneous | **Heterogeneous** | Homogeneous |
| Schema column on collection | None | `fields` (JSON) | `column_definitions` (JSON) |
| Per-element metadata | None | None | `columns` (per-element row) |
| Allow implicit mapping | Yes | **No** | Yes |
| Composable as inner | Yes | Yes | No |
| Composable as outer | Yes | Yes | Yes (always) |

The defining feature is heterogeneity: a `record`'s elements are not interchangeable. That semantic shift drives the central design decision -- **records do not allow implicit mapping** -- because mapping a single-input tool over heterogeneous slots is not type-safe.

### Historical Context

Records as an in-memory concept have existed since Galaxy's CWL-conformance work (the earliest WIP commits date back several years). They became a **persistable** collection shape only in late 2024, when migration `ec25b23b08e2_implement_fixed_length_collections.py` (2024-12-09) added the `fields` JSON column to `dataset_collection` along with the `adapter` columns on `job_to_input_*` tables (the related "dataset adapters" feature). Sample sheets followed in 2025 (revision `3af58c192752`), adding `column_definitions` alongside the existing `fields` column.

---

## 2. Data Model

### Database Schema Changes

**File**: `lib/galaxy/model/migrations/alembic/versions_gxy/ec25b23b08e2_implement_fixed_length_collections.py:31-37`

```python
def upgrade():
    with transaction():
        add_column(dataset_collection_table, Column("fields", JSONType(), default=None))
        add_column(job_to_input_dataset_table, Column("adapter", JSONType(), default=None))
        add_column(job_to_input_dataset_collection_table, Column("adapter", JSONType(), default=None))
        add_column(job_to_input_dataset_collection_element_table, Column("adapter", JSONType(), default=None))
```

`fields` is nullable; pre-existing collections are unaffected.

### DatasetCollection: `fields`

**File**: `lib/galaxy/model/__init__.py:7113-7116`

```python
# if collection_type is 'record' (heterogenous collection)
fields: Mapped[Optional[DATA_COLLECTION_FIELDS]] = mapped_column(JSONType)
# if collection_type is 'sample_sheet' (collection of rows that datasets with extra column metadata)
column_definitions: Mapped[Optional[SampleSheetColumnDefinitions]] = mapped_column(JSONType)
```

Type alias (`lib/galaxy/model/__init__.py:284`):

```python
DATA_COLLECTION_FIELDS = list[dict[str, Any]]
```

Intentionally weakly typed at the model layer -- the structural schema lives in `lib/galaxy/tool_util_models/tool_source.py`. The constructor accepts `fields` and assigns directly (`__init__.py:7135-7150`).

### DatasetCollectionElement (Unchanged for Records)

Unlike sample sheets, **records do not add a per-element column**. The schema is entirely on the parent `DatasetCollection.fields`. Per-element identity comes from the standard `element_identifier`, with the constraint that:

- The Nth element_identifier must equal `fields[N]["name"]`.
- The collection has exactly `len(fields)` elements.

### FieldDict (Field Schema)

**File**: `lib/galaxy/tool_util_models/tool_source.py:171-183`

```python
# For fields... just implementing a subset of CWL for Galaxy flavors of these objects so far.
CwlType = Literal["File", "null", "boolean", "int", "float", "string"]
FieldType = Union[CwlType, List[CwlType]]

@with_config(ConfigDict(extra="forbid"))
class FieldDict(TypedDict, closed=True):
    name: str
    type: FieldType
    format: NotRequired[Optional[str]]
```

- `type` is a deliberate subset of CWL. In practice, the workflow editor surfaces only `File` and `["File", "null"]` (optional file). The other CWL primitive types (`int`, `float`, `string`, `boolean`) are accepted by the model but not exposed in UI.
- `format` is an optional Galaxy datatype hint, rarely used.
- The `TypedDict` is closed (`extra="forbid"`), so unknown keys are rejected.

### Storage Layout Example

A `record` with `fields = [{"name": "parent", "type": "File"}, {"name": "child", "type": "File"}]`:

```
DatasetCollection
  id: 100
  collection_type: "record"
  fields: [{"name":"parent","type":"File"},{"name":"child","type":"File"}]
  column_definitions: NULL

  DatasetCollectionElement
    element_identifier: "parent"   element_index: 0   hda_id: 501
  DatasetCollectionElement
    element_identifier: "child"    element_index: 1   hda_id: 502
```

A `list:record` collection has the `fields` schema on each inner record collection. The outer list has no schema.

A `sample_sheet:record` carries both schemas: `column_definitions` on the outer sample_sheet and `fields` on each inner record. See [Section 12](#12-relationship-to-other-collection-types).

---

## 3. Type Plugin System

### Plugin Registration

**File**: `lib/galaxy/model/dataset_collections/registry.py:11-17`

```python
PLUGIN_CLASSES: list[type[BaseDatasetCollectionType]] = [
    ListDatasetCollectionType,
    paired.PairedDatasetCollectionType,
    record.RecordDatasetCollectionType,
    paired_or_unpaired.PairedOrUnpairedDatasetCollectionType,
    sample_sheet.SampleSheetDatasetCollectionType,
]
```

### RecordDatasetCollectionType

**File**: `lib/galaxy/model/dataset_collections/types/record.py`

```python
class RecordDatasetCollectionType(BaseDatasetCollectionType):
    """Arbitrary CWL-style record type."""

    collection_type = "record"

    def generate_elements(self, dataset_instances, **kwds):
        fields = kwds.get("fields", None)
        if fields is None:
            raise RequestParameterMissingException(
                "Missing or null parameter 'fields' required for record types.")
        if len(dataset_instances) != len(fields):
            self._validation_failed("Supplied element do not match fields.")
        index = 0
        for identifier, element in dataset_instances.items():
            field = fields[index]
            if field["name"] != identifier:
                self._validation_failed("Supplied element do not match fields.")
            # TODO: validate type and such.
            association = DatasetCollectionElement(
                element=element, element_identifier=identifier)
            yield association
            index += 1

    def prototype_elements(self, fields=None, **kwds):
        if fields is None:
            raise RequestParameterMissingException(
                "Missing or null parameter 'fields' required for record types.")
        for field in fields:
            name = field.get("name", None)
            assert name
            assert field.get("type", "File")  # NS: this assert doesn't make sense as it is
            field_dataset = DatasetCollectionElement(
                element=HistoryDatasetAssociation(),
                element_identifier=name,
            )
            yield field_dataset
```

Key behaviors:

1. **`fields` is mandatory.** Missing → `RequestParameterMissingException`.
2. **Cardinality must match.** `len(dataset_instances) == len(fields)`.
3. **Positional identifier match.** The Nth supplied element identifier must equal `fields[N]["name"]`. Order matters; reordering is rejected.
4. **Type is not validated** at the model layer. The `# TODO: validate type and such.` comment marks unfinished work -- a field declared `type: "int"` will silently accept any HDA.
5. **`prototype_elements`** creates placeholder `DatasetCollectionElement` rows backed by empty `HistoryDatasetAssociation` instances, so an unpopulated record collection can be persisted before its datasets exist (used by workflow scheduling for known-shape outputs). The inline `# NS:` comment flags that the `assert field.get("type", "File")` line is a no-op (the default makes the assertion always truthy).

### "auto" Fields

**File**: `lib/galaxy/model/dataset_collections/builder.py:62-63, 81-89`

```python
if type.collection_type == "record" and fields == "auto":
    fields = guess_fields(dataset_instances)
...
def guess_fields(dataset_instances):
    fields: list[FieldDict] = []
    for identifier, element in dataset_instances.items():
        if isinstance(element, DatasetCollection):
            return []
        else:
            fields.append({"type": "File", "name": identifier})
    return fields
```

Passing the literal string `"auto"` for `fields` synthesizes a flat `[{type: "File", name: <id>}]` schema from the supplied element identifiers. Exercised by `test_record_auto_fields` (`lib/galaxy_test/api/test_dataset_collections.py:228`).

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

Implications for `record`:

- `record` may appear at **any position** in the standard `:`-separated rank chain. Valid: `record`, `list:record`, `record:list`, `list:record:paired`, `sample_sheet:record`.
- Unlike `sample_sheet`, `record` is *not* restricted to the outermost rank.
- `record:record` is regex-permitted but is not exercised in tests or surfaced in the workflow editor UI.

### CollectionTypeDescription Carries `fields`

**File**: `lib/galaxy/model/dataset_collections/type_description.py:26-49`

```python
def for_collection_type(self, collection_type, fields=None):
    return CollectionTypeDescription(collection_type, self, fields=fields)

class CollectionTypeDescription:
    def __init__(self, collection_type, factory, fields=None):
        ...
        self.fields = fields
```

The schema travels with the type description so workflow planning code can introspect record structure when emitting prototype output collections.

### `allow_implicit_mapping` -- The Central Asymmetry

**File**: `lib/galaxy/model/__init__.py:7521-7523`

```python
@property
def allow_implicit_mapping(self):
    return self.collection_type != "record"
```

This single line drives much of the record's distinct behavior. **Records cannot be mapped over.** A tool that consumes a single dataset cannot accept a record on its data input slot to produce an implicit output collection of records, because:

- Record elements are heterogeneous by design (different field roles, possibly different formats).
- There is no semantic guarantee the same tool can be applied to every slot.
- An implicit output keyed by the same field names cannot be guaranteed type-correct.

Records must be consumed **explicitly** by a tool whose input declares `collection_type="record"`, with the tool unpacking fields by name (e.g., `$input.parent`, `$input['child']`).

### Matching

`type_description.py:146-165` does no special-casing for `record`. Record matching is identity-only: `record` matches `record`, `list:record` matches `list:record`. Records do not interconvert with `list`, `paired`, or `sample_sheet` for matching purposes (with one exception in the `sample_sheet:record` case discussed in Section 12).

### Composition Rules (UI-Surfaced)

Although the regex permits broader composition, the workflow editor (`client/src/components/Workflow/Editor/Forms/FormCollectionType.vue:29-38`) surfaces only:

- `record`
- `list:record`
- `sample_sheet:record`

Other regex-valid combinations (`record:list`, `record:paired`) are reachable via API and YAML but are not first-class in the editor.

---

## 5. Tool Declaration and Execution

### Tool Input Declaration (XML)

**File**: `test/functional/tools/collection_record_test_two_files.xml:7`

```xml
<param name="f1" type="data_collection" collection_type="record" label="Input collection" />
```

### Tool Input Declaration (YAML)

**File**: `test/functional/tools/parameters/gx_data_collection_record.yml:10-14`

```yaml
inputs:
  - name: parameter
    type: data_collection
    collection_type: record
    label: Input record collection
```

A union-type-style declaration is supported via comma: `collection_type: "list,record"` (`gx_data_collection_list_or_record.yml:13`) -- accept either a list or a record.

### DataCollectionToolParameter

**File**: `lib/galaxy/tools/parameters/basic.py:2559-2560, 2680-2681`

```python
self._fields = input_source.get("fields", None)
self._column_definitions = input_source.get("column_definitions", None)
...
d["fields"] = self._fields
d["column_definitions"] = self._column_definitions
```

Declared `fields` flow through to the workflow editor as a structural hint: the editor knows what shape of record the tool consumes. Note: there is **no record analogue** of the sample-sheet `column_definitions_compatible` matcher (`basic.py:2585-2589`); record collections are filtered only by `collection_type` matching.

### Runtime Wrapper

`DatasetCollectionWrapper` (`lib/galaxy/tools/wrappers.py:643-707`) provides field access via the standard element-identifier dictionary path:

```xml
<command>
  cat $f1.parent $f1['child'] >> $out1;
  echo 'Collection name: $f1.name'
</command>
```

The wrapper exposes:

- `$f1.<identifier>` (attribute access) and `$f1['<identifier>']` (item access) for each field's dataset
- `$f1.name` for the collection name
- `$f1.keys()` to iterate identifiers

There is no record-specific wrapper method; records reuse the generic identifier-keyed access path. (Compare to sample sheets, which add a dedicated `sample_sheet_row()` method.)

### Built-In Record Tools

There is **no built-in record tool** analogous to `__SAMPLE_SHEET_TO_TABULAR__`. Records are constructed via the generic `POST /api/dataset_collections` endpoint or via workflow inputs; there is no record-specific fetch helper, no record-targeted rule operation, and no record-to-tabular converter.

### Test Tools Using Records

- `test/functional/tools/collection_record_test_two_files.xml` -- XML record consumer
- `test/functional/tools/parameters/gx_data_collection_record.yml` -- YAML record consumer
- `test/functional/tools/parameters/gx_data_collection_list_or_record.yml` -- `list,record` union

---

## 6. API and Collection Creation

### Direct Collection Creation API

**Endpoint**: `POST /api/dataset_collections`

**Schema**: `lib/galaxy/schema/schema.py:1830-1834`

```python
fields_: Optional[Union[str, list[FieldDict]]] = Field(
    default=[],
    description="List of fields to create for this collection. Set to 'auto' to guess fields from identifiers.",
    alias="fields",
)
```

The payload accepts either an explicit `list[FieldDict]` or the literal string `"auto"`.

### Manager Flow

**File**: `lib/galaxy/managers/collections_util.py:36-49`

```python
column_definitions = payload.get("column_definitions", None)
validate_column_definitions(column_definitions)

params = dict(
    collection_type=payload.get("collection_type"),
    element_identifiers=payload.get("element_identifiers"),
    name=payload.get("name", None),
    ...
    fields=payload.get("fields", None),
    column_definitions=column_definitions,
    rows=payload.get("rows", None),
)
```

Note: there is **no `validate_fields()`** analogue to `validate_column_definitions()`. Field shape is enforced only at two points:

1. Pydantic-level coercion against the closed `FieldDict` `TypedDict` when the request lands.
2. Inside `RecordDatasetCollectionType.generate_elements()` -- which checks count and positional name match only.

This is a thinner validation pipeline than sample sheets, and is one of the larger gaps in the record implementation.

**Manager** (`lib/galaxy/managers/collections.py:199, 226, 319, 331, 360`):

```python
def create(self, ..., fields=None, column_definitions=None, rows=None):
    ...
    dataset_collection = self.create_dataset_collection(..., fields=fields, ...)

def create_dataset_collection(self, ..., fields=None, ...):
    collection_type_description = self.collection_type_descriptions.for_collection_type(
        collection_type, fields=fields)
    ...
    builder.build_collection(
        type_plugin, elements, fields=fields,
        column_definitions=column_definitions, rows=rows)
```

### Builder

**File**: `lib/galaxy/model/dataset_collections/builder.py:27-46`

```python
def build_collection(type, dataset_instances, collection=None,
                     associated_identifiers=None,
                     fields=None, column_definitions=None, rows=None):
    dataset_collection = collection or DatasetCollection(
        fields=fields, column_definitions=column_definitions)
    set_collection_elements(dataset_collection, type, dataset_instances,
                            associated_identifiers, fields=fields, rows=rows)
    return dataset_collection
```

`set_collection_elements` (`builder.py:49-78`) handles the `"auto"` sentinel for record only, and forwards `fields` into `type.generate_elements()`.

### Sample Payload

**File**: `lib/galaxy_test/api/test_dataset_collections.py:180-209` (`test_create_record`)

```python
payload = dict(
    name="a record",
    instance_type="history",
    history_id=history_id,
    element_identifiers=record_identifiers,
    collection_type="record",
    fields=[
        {"name": "condition", "type": "File"},
        {"name": "control1", "type": "File"},
        {"name": "control2", "type": "File"},
    ],
)
```

---

## 7. Workflow Integration

### Workflow Input Module

**File**: `lib/galaxy/workflow/modules.py:1180-1260`

`InputCollectionModule` handles `fields` symmetrically with `column_definitions`.

**Validation** (`modules.py:1189-1200`):

```python
def validate_state(self, state):
    collection_type = state.get("collection_type")
    fields = state.get("fields")
    if collection_type:
        collection_type_description = COLLECTION_TYPE_DESCRIPTION_FACTORY.for_collection_type(
            collection_type, fields=fields)
        collection_type_description.validate()
    if column_definitions := state.get("column_definitions"):
        validate_column_definitions(column_definitions)
```

**Runtime input synthesis** (`modules.py:1215-1218`):

```python
if "column_definitions" in parameter_def:
    collection_param_source["column_definitions"] = parameter_def["column_definitions"]
if "fields" in parameter_def:
    collection_param_source["fields"] = parameter_def["fields"]
```

**State parsing** (`modules.py:1253-1259`):

```python
if "fields" in inputs:
    fields = inputs["fields"]
else:
    fields = None
state_as_dict["fields"] = fields
state_as_dict["column_definitions"] = column_definitions
```

### Workflow YAML Format

```yaml
inputs:
  my_record:
    type: collection
    collection_type: record
    fields:
      - name: parent
        type: File
      - name: child
        type: File
```

### Workflow Editor (Client-Side)

- `client/src/components/Workflow/Editor/Forms/FormCollectionType.vue:29-38` -- exposes `record`, `list:record`, `sample_sheet:record` as selectable collection types.
- `client/src/components/Workflow/Editor/Forms/FormInputCollection.vue:81-87, 160` -- when the chosen type is record-bearing, renders `<FormRecordFieldDefinitions>`; clears `fields` when a non-record type is chosen.
- `client/src/components/Workflow/Editor/Forms/FormRecordFieldDefinitions.vue` -- repeatable field list.
- `client/src/components/Workflow/Editor/Forms/FormRecordFieldDefinition.vue` -- a single field row (name + type), composing `FormFieldType`.
- `client/src/components/Workflow/Editor/Forms/FormFieldType.vue:40-43` -- the editor exposes only `File` and `File?` (optional file). Other `CwlType` values from `FieldDict` (`int`, `float`, `string`, `boolean`) are accepted by the model but not user-selectable in UI.

---

## 8. Field Schema Detail

| Property | Type | Notes |
|---|---|---|
| `name` | `str` | Must equal the element_identifier; positional |
| `type` | `CwlType` or `List[CwlType]` | Subset of CWL; `["File","null"]` indicates an optional file |
| `format` | `Optional[str]` | Galaxy datatype hint; rarely used |

**CWL alignment**: deliberately a *subset* of CWL `record` / `InputRecordSchema`. Galaxy implements only the structural shape needed for typed pipelines:

- Single-typed fields per slot; no nested array or record types in the schema column.
- No `doc`, `label`, or `secondaryFiles` exposed in the schema row (secondary files are handled separately at the dataset level).
- File `format` is Galaxy-native, not CWL-native.

The `FieldDict` `TypedDict` is closed (`extra="forbid"` via `with_config`), so unknown keys in the JSON are rejected at the Pydantic boundary.

---

## 9. Collection Semantics Specification

**File**: `lib/galaxy/model/dataset_collections/types/collection_semantics.yml`

Records have **no entries** in the formal mapping/reduction specification. The doc-block on sample sheets explicitly contrasts mapping behavior with lists; records are absent because the central rule (`allow_implicit_mapping = False`) precludes most of the patterns the YAML describes:

- Mapping over data inputs -- not allowed for records.
- Sub-collection mapping -- not exercised for records.
- Reduction by `multiple=true` -- not exercised for records.

Implicit consequences (not codified in the YAML, but enforced by behavior):

- A `record` cannot be mapped over a single-dataset tool input.
- A `list:record` cannot be subcollection-mapped over a `record`-typed input the way `list:paired` maps over `paired`. There is no special-casing in `effective_collection_type` and no test for this pattern.
- Records can only feed tools that explicitly declare `collection_type="record"` (or `"list,record"` etc.).

Adding record entries to `collection_semantics.yml` would clarify these rules and is identified as future work.

---

## 10. Testing Coverage

### API Tests -- `lib/galaxy_test/api/test_dataset_collections.py`

- `test_create_record` (line 180) -- canonical happy path
- `test_record_requires_fields` (211) -- 400 when `fields` is missing
- `test_record_auto_fields` (228) -- `fields="auto"` synthesizes a schema from identifiers
- `test_record_field_validation` (246) -- rejects too-few, too-many, mismatched-name field lists

### Workflow API Tests

There are **no record-specific tests** in `lib/galaxy_test/api/test_workflows.py`. Record behavior in workflows is covered indirectly through shared collection paths.

### Unit Tests

`test/unit/data/dataset_collections/` contains no `test_record*` files. Record behavior is covered indirectly by `test_type_descriptions.py` (regex acceptance) and the API integration tests above. There is no `validate_fields()` unit test because no such validator exists.

### Selenium Tests

**No Selenium tests target the record creator or editor.** Compare to sample sheets, which have dedicated `test_collection_input_sample_sheet_chipseq_example*` end-to-end tests. Records currently lack UI-level test coverage.

### Test Tools

- `test/functional/tools/collection_record_test_two_files.xml` -- in-tool framework test, asserts on output content and stdout
- `test/functional/tools/parameters/gx_data_collection_record.yml` -- parameter-modeling test
- `test/functional/tools/parameters/gx_data_collection_list_or_record.yml` -- `list,record` union test

---

## 11. Implementation Details

### Key Code Paths

#### Collection Creation (Direct API)

1. `lib/galaxy/webapps/galaxy/api/dataset_collections.py` -- API endpoint receives payload
2. `lib/galaxy/managers/collections_util.py:36-49` -- extracts `fields` (no validator pre-pass)
3. `lib/galaxy/managers/collections.py:199-226` -- `DatasetCollectionManager.create()` passes `fields` through
4. `lib/galaxy/managers/collections.py:319, 331, 360` -- `create_dataset_collection()` resolves elements and dispatches to builder
5. `lib/galaxy/model/dataset_collections/builder.py:27-46` -- builds `DatasetCollection(fields=...)` and calls `set_collection_elements()`
6. `lib/galaxy/model/dataset_collections/builder.py:62-63, 81-89` -- handles `"auto"` sentinel for records
7. `lib/galaxy/model/dataset_collections/types/record.py` -- `generate_elements()` validates count and positional name match, yields elements

#### Tool Execution with Records

1. `lib/galaxy/tools/parameters/basic.py:2559-2560, 2680-2681` -- `DataCollectionToolParameter` reads and serializes `fields`
2. `lib/galaxy/tools/wrappers.py:643-707` -- `DatasetCollectionWrapper` exposes elements via attribute and item access (no record-specific method)
3. Tool command templates access fields by identifier: `$input.parent`, `$input['child']`

#### Workflow Input

1. `lib/galaxy/workflow/modules.py:1189-1200` -- `validate_state()` builds a `CollectionTypeDescription` carrying `fields`
2. `lib/galaxy/workflow/modules.py:1215-1218` -- propagates `fields` into the runtime parameter source
3. `lib/galaxy/workflow/modules.py:1253-1259` -- preserves `fields` in serialized state

### Validation Surface

Record validation is **count-and-name only**. The `# TODO: validate type and such.` comment in `record.py` marks the unfinished work of validating that a supplied dataset matches the field's declared `type` (e.g., a `File`-typed field receiving a `File`-shaped element, or `["File","null"]` permitting a missing slot).

There is **no safe-validators allowlist** (records do not accept user-supplied validators). There are **no special-character restrictions** on field names beyond the `TypedDict` shape check. Compare to sample-sheet column definitions, which run through `validate_column_definitions()` with explicit type, validator, and special-character checks.

---

## 12. Relationship to Other Collection Types

### Comparison Matrix

| Feature | `list` | `paired` | `paired_or_unpaired` | `record` | `sample_sheet` |
|---------|--------|----------|---------------------|----------|----------------|
| Plugin file | `types/list.py` | `types/paired.py` | `types/paired_or_unpaired.py` | `types/record.py` | `types/sample_sheet.py` |
| Element count | Arbitrary | Exactly 2 | 1 or 2 | Fixed by fields | Arbitrary |
| Fixed identifiers | No | `forward`/`reverse` | `unpaired` or `forward`/`reverse` | Field names | No |
| Schema column | None | None | None | `fields` | `column_definitions` |
| Per-element metadata | None | None | None | None | `columns` |
| `allow_implicit_mapping` | True | True | True | **False** | True |
| `prototype_elements()` | No | Yes | No | Yes | No |
| `"auto"` builder | No | No | No | Yes | No |
| Can be inner type | Yes | Yes | Yes | Yes | No |
| Can be outermost | Yes | Yes | Yes | Yes | Yes (always) |

### `fields` vs `column_definitions`

| | `fields` | `column_definitions` |
|---|---|---|
| Used by | `record` | `sample_sheet` (and variants) |
| Stored on | `DatasetCollection.fields` | `DatasetCollection.column_definitions` |
| Element-side counterpart | None -- identifier-positional | `DatasetCollectionElement.columns` |
| Schema describes | Named, typed, fixed slots (heterogeneity) | Per-element metadata columns (homogeneity + sidecar) |
| Element count | Fixed by schema length | Arbitrary |
| Validators / restrictions | Not implemented | `validate_column_definitions`, safe-validators allowlist |
| `"auto"` builder | Yes | No |
| Special-char checks | None | Column names + string values |

### `sample_sheet:record` Composition

The two schemas are independent and coexist in a `sample_sheet:record` collection:

- The **outer** `DatasetCollection` (rank `sample_sheet`) carries `column_definitions`. Outer `DatasetCollectionElement` rows carry `columns` (the per-record row of metadata values).
- Each outer element's `child_collection` is a `record` carrying its own `fields` schema.

This is the only "compound metadata" collection in the system. A `column_definitions` change has no effect on `fields` and vice versa. The regex and `effective_collection_type` treat `sample_sheet:record` as a sample_sheet of records (outer rank `sample_sheet`, inner `record`); `_normalize_collection_type` (`type_description.py:216-223`) normalizes `sample_sheet` → `list` for matching purposes, so a `sample_sheet:record` matches `list:record` for input-compatibility checks.

### Implicit Mapping at the Outer Level

`allow_implicit_mapping` checks the **outer** `collection_type` only:

```python
return self.collection_type != "record"
```

So a `sample_sheet:record` *does* allow implicit mapping (its outer collection_type string is `"sample_sheet:record"`, not `"record"`). This is consistent: subcollection-mapping a `sample_sheet:record` over a `record`-typed input is the meaningful case, where each inner record is consumed as a unit. The `effective_collection_type` machinery strips the `:record` suffix, leaving `sample_sheet` as the implicit output shape.

A bare `record` (no outer wrapper), however, has `collection_type == "record"`, and the rule fires: no implicit mapping.

### Relationship to `list`

`list:record` is the canonical "n samples, each a heterogeneous bundle" pattern. The outer `list` is mappable; the inner `record` is consumed as a unit by tools declaring `collection_type="record"`. This is structurally analogous to `list:paired`, with `record` filling the same role as `paired` (a fixed-shape inner unit).

### Relationship to `sample_sheet`

The two schemas solve **different problems** and are not interchangeable:

- **Records** describe structural **heterogeneity**: each slot is a different role with potentially a different format. Element count is fixed. No implicit mapping.
- **Sample sheets** describe per-element **metadata** over **homogeneous** elements. Element count is arbitrary. Implicit mapping allowed.

When you need both -- per-record metadata over heterogeneous bundles -- compose them as `sample_sheet:record`.

---

## 13. Limitations and Future Work

### Current Limitations

1. **No type-level field validation at element creation.** `RecordDatasetCollectionType.generate_elements()` carries a `# TODO: validate type and such.` comment. A field declared `type: "int"` will silently accept a `File`-shaped element. Only count and positional name match are checked.

2. **No `validate_fields()` API-side pre-pass.** Field shape is enforced only at the Pydantic boundary (closed `TypedDict`) and at element-yield time. There is no analogue to `validate_column_definitions()` running through a dedicated validator.

3. **`prototype_elements` field-type assert is a no-op.** The line `assert field.get("type", "File")` always passes because `"File"` is truthy. Source-flagged with `# NS: this assert doesn't make sense as it is`. Either remove the assert or replace it with a real type check.

4. **Order-sensitive identifier match.** The Nth supplied element identifier must equal `fields[N]["name"]`. Reordering produces `_validation_failed`. Sample sheets are order-insensitive on element identifier (they validate via `rows[identifier]` lookup). A dict-style match would be more ergonomic.

5. **Editor exposes only `File` / `File?`.** Although `FieldDict.type` accepts the full CWL primitive subset (`File`, `null`, `boolean`, `int`, `float`, `string`), the workflow editor's `FormFieldType.vue` only offers File and Optional File. Other types are reachable only via API/YAML.

6. **No record-specific built-in tools.** Records have no analogue to `__SAMPLE_SHEET_TO_TABULAR__` -- there is no built-in way to extract records to tabular form, no record-aware fetch helper, and no record-targeted rule operations.

7. **No Selenium coverage.** The record creation UI and record-bearing workflow runs are not exercised end-to-end at the Selenium level. Sample sheets, by contrast, have full Selenium coverage of the wizard and AG Grid editing flow.

8. **No `collection_semantics.yml` entries.** The formal type-system specification is silent on records. Documenting the (mostly negative) rules would clarify the contract for tool authors and enable automated test generation.

9. **No workflow API tests.** `lib/galaxy_test/api/test_workflows.py` has no record-specific tests. Record-bearing workflow inputs are covered only by shared collection paths.

10. **Weak schema column type.** `DATA_COLLECTION_FIELDS = list[dict[str, Any]]` at the model layer trades safety for flexibility. Strengthening to a `list[FieldDict]` Pydantic-validated column would push more checking to the model boundary.

### Areas for Improvement

1. **Field-level type validation at create time** -- close the `# TODO: validate type and such.` gap. Validate that supplied datasets match field-declared types, including optional (`["File","null"]`) handling.

2. **Workflow editor support for richer field types** -- expose the full CWL primitive subset, not just `File`/`File?`, so authors can declare typed parameter records.

3. **`collection_semantics.yml` record entries** -- document the absence of mapping rules explicitly, plus the positive rules (subcollection-consumption inside `list:record`, `sample_sheet:record` outer mapping behavior).

4. **Selenium coverage** -- end-to-end tests for record creation, record-bearing workflow runs, and record consumption.

5. **Record-aware built-in tooling** -- a `__RECORD_TO_TABULAR__` or `__RECORD_FIELD_EXTRACT__` helper analogous to the sample-sheet tabular tool would make records easier to inspect and convert.

6. **Auto-fields for nested cases** -- `guess_fields()` returns `[]` for collections containing inner `DatasetCollection` elements. A richer auto-detection that handles `list:record` or `sample_sheet:record` cases would smooth API ergonomics.

7. **Cross-references and constraint validators** -- analogous to the sample-sheet `element_identifier` column type, records could grow validators for constraints between fields (e.g., "field `index` must reference field `genome`").

8. **Weakening positional-order match** -- accept `dataset_instances` as a dict keyed by identifier and validate against `fields` by name, decoupling supply order from schema order.

### Future Plans

The roadmap for richer per-element metadata and column-typed validation is described in detail in [[Component - Collections - Sample Sheets Backend]]. Several of the directions there -- richer column types, column metadata propagation, cross-collection references, formal collection-semantics entries -- have direct analogues in the record space (typed slots, slot metadata propagation through tool execution, cross-record references, record semantics in `collection_semantics.yml`). Future record work should be planned alongside that effort to keep the two schemas (`fields` and `column_definitions`) evolving coherently.

---

### Cross-References

- `lib/galaxy/model/dataset_collections/types/record.py` -- type plugin
- `lib/galaxy/model/dataset_collections/registry.py:11-17` -- registration
- `lib/galaxy/model/dataset_collections/type_description.py:15-17` -- regex
- `lib/galaxy/model/dataset_collections/builder.py:27-46, 62-63, 81-89` -- builder + auto fields
- `lib/galaxy/model/__init__.py:284, 7113-7150, 7521-7523` -- model column, ctor, mapping flag
- `lib/galaxy/model/migrations/alembic/versions_gxy/ec25b23b08e2_implement_fixed_length_collections.py` -- schema migration
- `lib/galaxy/tool_util_models/tool_source.py:171-183` -- `FieldDict` / `CwlType`
- `lib/galaxy/schema/schema.py:1830-1834` -- API payload schema
- `lib/galaxy/managers/collections.py:199-360`, `collections_util.py:36-49` -- manager
- `lib/galaxy/tools/parameters/basic.py:2559-2560, 2680-2681` -- tool parameter
- `lib/galaxy/tools/wrappers.py:643-707` -- runtime wrapper
- `lib/galaxy/workflow/modules.py:1180-1260` -- workflow input module
- `lib/galaxy_test/api/test_dataset_collections.py:180-278` -- API tests
- `test/functional/tools/collection_record_test_two_files.xml`, `parameters/gx_data_collection_record.yml`, `parameters/gx_data_collection_list_or_record.yml` -- test tools
- `client/src/components/Workflow/Editor/Forms/FormCollectionType.vue`, `FormInputCollection.vue`, `FormRecordFieldDefinitions.vue`, `FormRecordFieldDefinition.vue`, `FormFieldType.vue` -- editor UI
