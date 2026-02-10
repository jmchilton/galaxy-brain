---
type: research
subtype: component
tags:
  - research/component
  - galaxy/collections
  - galaxy/tools/collections
  - galaxy/workflows
  - galaxy/client
  - galaxy/models
  - galaxy/testing
status: draft
created: 2026-02-09
revised: 2026-02-09
revision: 1
ai_generated: true
galaxy_areas:
  - collections
  - tools
  - workflows
  - client
  - models
  - testing
related_notes:
  - "[[Component - Collection Models]]"
  - "[[Component - Collection API]]"
  - "[[PR 19377 - Collection Types and Wizard UI]]"
---

# The `paired_or_unpaired` Collection Type in Galaxy

A Comprehensive Technical Reference

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Data Model](#2-data-model)
3. [Type System and Subtyping](#3-type-system-and-subtyping)
4. [Tool Execution Semantics](#4-tool-execution-semantics)
5. [Workflow Editor Integration](#5-workflow-editor-integration)
6. [Collection Semantics Specification](#6-collection-semantics-specification)
7. [Testing Coverage](#7-testing-coverage)
8. [Implementation Details](#8-implementation-details)
9. [Edge Cases and Limitations](#9-edge-cases-and-limitations)
10. [Relationship to Other Collection Types](#10-relationship-to-other-collection-types)

---

## 1. Introduction

### The Problem

In genomics workflows, sequencing data comes in two fundamental forms:

- **Paired-end reads**: Two FASTQ files representing forward and reverse reads from the same DNA fragment. Galaxy models these as `paired` collections with elements `forward` and `reverse`.
- **Single-end reads**: A single FASTQ file. Galaxy has no native "single" collection type -- single datasets are just datasets.

Before `paired_or_unpaired`, tools that needed to handle both single-end and paired-end data had no clean mechanism. A tool author had two unpalatable options:

1. Write two separate tools (or two tool modes), one for paired and one for single-end.
2. Accept a `paired` collection and require users to artificially pair single-end data with a dummy reverse read.

Users faced a worse problem at the list level: a batch of samples where *some* are paired-end and *some* are single-end could not be represented in a single collection. A `list:paired` forces every sample to be paired. A `list` of flat datasets loses pairing structure. There was no way to express "a list where each element is either a single dataset or a paired dataset."

### The Solution

The `paired_or_unpaired` collection type is a **discriminated union** (tagged sum type) with two variants:

- **Unpaired variant**: A single element with identifier `unpaired`
- **Paired variant**: Two elements with identifiers `forward` and `reverse`

This enables:
- Tools to declare they accept `paired_or_unpaired` and handle both cases
- `list:paired_or_unpaired` collections that hold a heterogeneous mix of paired and unpaired samples
- A subtyping relationship where `paired` collections can be passed to `paired_or_unpaired` inputs (but not the reverse)

### History

The `paired_or_unpaired` type was introduced in PR #19377 ("Empower Users to Build More Kinds of Collections, More Intelligently") by John Chilton. The earliest implementation commits have messages like "Implement paired_or_unpaired collections, list wizards." The PR was merged into `dev` as commit `c212434dc8`. Key related commits include:

- `337678769c` -- "Bug fix: paired_or_unpaired also endswith paired" (fixing substring matching)
- `a776836dba` -- "Update rule builder to allow list:paired_or_unpaired creation"
- `464ec81509` -- "Fix up test case for sending list to paired_or_unpaired list input"

---

## 2. Data Model

### Type Plugin

The type plugin lives at `lib/galaxy/model/dataset_collections/types/paired_or_unpaired.py`.

```python
SINGLETON_IDENTIFIER = "unpaired"

class PairedOrUnpairedDatasetCollectionType(BaseDatasetCollectionType):
    collection_type = "paired_or_unpaired"

    def generate_elements(self, dataset_instances, **kwds):
        num_datasets = len(dataset_instances)
        if num_datasets > 2 or num_datasets < 1:
            raise RequestParameterInvalidException(
                "Incorrect number of datasets - 1 or 2 datasets is required to create a paired_or_unpaired collection"
            )

        if num_datasets == 2:
            # Paired variant: forward + reverse
            if forward_dataset := dataset_instances.get(FORWARD_IDENTIFIER):
                yield DatasetCollectionElement(element=forward_dataset,
                    element_identifier=FORWARD_IDENTIFIER)
            if reverse_dataset := dataset_instances.get(REVERSE_IDENTIFIER):
                yield DatasetCollectionElement(element=reverse_dataset,
                    element_identifier=REVERSE_IDENTIFIER)
        else:
            # Unpaired variant: single element
            if single_datasets := dataset_instances.get(SINGLETON_IDENTIFIER):
                yield DatasetCollectionElement(element=single_datasets,
                    element_identifier=SINGLETON_IDENTIFIER)
```

The identifiers are imported from the `paired` type: `FORWARD_IDENTIFIER = "forward"` and `REVERSE_IDENTIFIER = "reverse"` (`lib/galaxy/model/dataset_collections/types/paired.py`).

### Element Structure

**Unpaired variant:**
```
DatasetCollection(collection_type="paired_or_unpaired")
  +-- DatasetCollectionElement(element_identifier="unpaired", hda_id=X)
```

**Paired variant:**
```
DatasetCollection(collection_type="paired_or_unpaired")
  +-- DatasetCollectionElement(element_identifier="forward", hda_id=X)
  +-- DatasetCollectionElement(element_identifier="reverse", hda_id=Y)
```

### Nested: `list:paired_or_unpaired`

A heterogeneous list of samples:
```
DatasetCollection(collection_type="list:paired_or_unpaired")
  +-- DCE(identifier="sample_A", child_collection_id=C1)
  |     +-- DatasetCollection(collection_type="paired_or_unpaired")
  |           +-- DCE(identifier="forward", hda_id=1)
  |           +-- DCE(identifier="reverse", hda_id=2)
  +-- DCE(identifier="sample_B", child_collection_id=C2)
        +-- DatasetCollection(collection_type="paired_or_unpaired")
              +-- DCE(identifier="unpaired", hda_id=3)
```

Note: In the `list:paired_or_unpaired` case, Galaxy also accepts flat elements at the outer level. Elements whose `element_object` has `history_content_type == "dataset"` are treated as unpaired, while elements with a child collection are treated as paired. This is how the `SplitPairedAndUnpairedTool` discriminates between the two variants (see `lib/galaxy/tools/__init__.py:4027-4032`).

### Type Validation

The regex at `lib/galaxy/model/dataset_collections/type_description.py:15-17` validates collection type strings:

```python
COLLECTION_TYPE_REGEX = re.compile(r"^((list|paired|paired_or_unpaired|record)(:(list|paired|paired_or_unpaired|record))*|sample_sheet|sample_sheet:paired|sample_sheet:record|sample_sheet:paired_or_unpaired)$")
```

This means `paired_or_unpaired` can appear at any rank within nested types (e.g., `list:paired_or_unpaired`, `list:list:paired_or_unpaired`).

### Runtime Wrapper Properties

At tool execution time, `DatasetCollectionWrapper` (in `lib/galaxy/tools/wrappers.py`) exposes two properties critical for `paired_or_unpaired` handling:

- `has_single_item` (line 801): Returns `True` when the collection has exactly one element (the unpaired case). This is used by tools like `collection_paired_or_unpaired.xml` to branch logic.
- `single_item` (line 805): Returns the single element wrapper.

In Cheetah templates, this pattern appears:
```cheetah
#if $f1.has_single_item:
    cat $f1.single_item >> $out1;
#else
    cat $f1.forward $f1['reverse'] >> $out1;
#end if
```

---

## 3. Type System and Subtyping

### Core Principle: Asymmetric Compatibility

The fundamental rule is:

> **`paired` IS-A `paired_or_unpaired`**, but **`paired_or_unpaired` IS-NOT-A `paired`**.

A `paired` collection always has `forward` and `reverse` elements, which satisfies the `paired_or_unpaired` contract. But a `paired_or_unpaired` collection may have only `unpaired`, which violates the `paired` contract.

This asymmetry is implemented in two key methods on `CollectionTypeDescription` (`lib/galaxy/model/dataset_collections/type_description.py`).

### `can_match_type()` (lines 106-124)

Determines whether a collection type can directly satisfy an input requirement:

```python
def can_match_type(self, other_collection_type) -> bool:
    if other_collection_type == collection_type:
        return True  # Exact match always works

    # paired can match paired_or_unpaired
    elif other_collection_type == "paired" and collection_type == "paired_or_unpaired":
        return True

    # Types ending in :paired_or_unpaired can match the plain list
    # or the paired list variant
    if collection_type.endswith(":paired_or_unpaired"):
        as_plain_list = collection_type[:-len(":paired_or_unpaired")]
        if other_collection_type == as_plain_list:
            return True      # list:paired_or_unpaired matches list
        as_paired_list = f"{as_plain_list}:paired"
        if other_collection_type == as_paired_list:
            return True      # list:paired_or_unpaired matches list:paired
    return False
```

The matching table (where "self" is the input spec, "other" is what is provided):

| Input expects (`self`) | Data provided (`other`) | Match? | Why |
|------------------------|------------------------|--------|-----|
| `paired_or_unpaired` | `paired` | YES | `paired` is a subtype |
| `paired_or_unpaired` | `paired_or_unpaired` | YES | Exact match |
| `paired` | `paired_or_unpaired` | NO | May lack forward/reverse |
| `list:paired_or_unpaired` | `list:paired` | YES | Each element can be treated as paired variant |
| `list:paired_or_unpaired` | `list` | YES | Each element can be treated as unpaired variant |
| `list:paired` | `list:paired_or_unpaired` | NO | Some elements may be unpaired |

### `has_subcollections_of_type()` (lines 76-99)

Controls whether a collection can be "mapped over" a given subcollection type:

```python
def has_subcollections_of_type(self, other_collection_type) -> bool:
    if collection_type == other_collection_type:
        return False  # A type is NOT its own subcollection

    if collection_type.endswith(other_collection_type):
        return True   # Standard nesting (list:paired has paired subcollections)

    if other_collection_type == "paired_or_unpaired":
        # paired_or_unpaired is a subcollection of anything except paired
        # (since paired matches it exactly and wouldn't be a "sub"collection)
        return collection_type != "paired"

    if other_collection_type == "single_datasets":
        # Any collection has individual dataset elements
        return True

    return False
```

This means:
- `list` has subcollections of type `paired_or_unpaired` (via explicit special-case at lines 92-95)
- `list:paired` has subcollections of type `paired_or_unpaired` (the paired elements)
- `paired` does NOT have subcollections of type `paired_or_unpaired` (it matches exactly)
- `list:list:paired` has subcollections of type `paired_or_unpaired` (inner pairs)

### `effective_collection_type()` (lines 64-74)

Computes what remains after consuming a subcollection:

```python
def effective_collection_type(self, subcollection_type):
    if subcollection_type == "single_datasets":
        return self.collection_type  # No rank consumed -- same outer structure

    return self.collection_type[:-(len(subcollection_type) + 1)]
```

Examples:
- `list:paired`.effective(`paired`) = `list` (slices off `:paired`)
- `list:list`.effective(`single_datasets`) = `list:list` (no rank consumed)

Note: `effective_collection_type` uses string slicing (`self.collection_type[:-(len(subcollection_type) + 1)]`), so it only works correctly when the subcollection type is an exact suffix of the collection type. In practice, `paired_or_unpaired` subcollections are resolved to `"paired"` or `"single_datasets"` before this method is called, so `effective_collection_type` never sees `"paired_or_unpaired"` directly.

The `single_datasets` case is special: the collection structure is preserved because individual datasets are promoted to `paired_or_unpaired` via adapters, not consumed as subcollections.

### The `single_datasets` Pseudo-Type

`single_datasets` is not a real collection type (not in the registry, not in the regex). It is a synthetic subcollection type used exclusively to enable mapping flat lists over `paired_or_unpaired` inputs. When a `list` of datasets is mapped over a `paired_or_unpaired` input, each dataset element is individually wrapped via `PromoteCollectionElementToCollectionAdapter` to present as a `paired_or_unpaired` collection with one `unpaired` element.

This is implemented in `lib/galaxy/model/dataset_collections/subcollections.py:44-46`:

```python
for element in dataset_collection.elements:
    if not is_this_collection_nested and collection_type == "single_datasets":
        split_elements.append(PromoteCollectionElementToCollectionAdapter(element))
        continue
```

---

## 4. Tool Execution Semantics

### Declaring a `paired_or_unpaired` Input

A tool declares a `paired_or_unpaired` input in its XML:

```xml
<param name="f1" type="data_collection"
       collection_type="paired_or_unpaired" label="Input" />
```

This input directly accepts:
- A `paired_or_unpaired` collection (either variant)
- A `paired` collection (adapted to the paired variant)

### Direct Consumption (Reduction)

When a `paired_or_unpaired` input receives a matching collection, it is consumed directly -- no mapping, no implicit collection creation.

From the semantics specification (`COLLECTION_INPUT_PAIRED_OR_UNPAIRED`):

$$tool(i: collection\langle paired\_or\_unpaired\rangle) + C: paired\_or\_unpaired \Rightarrow tool(i=C) \rightarrow \{o: dataset\}$$

The same holds for `list:paired_or_unpaired` inputs receiving `list:paired_or_unpaired` collections (`COLLECTION_INPUT_LIST_PAIRED_OR_UNPAIRED`).

### MapOver: `list:paired` over `paired_or_unpaired` input

When a tool expecting `paired_or_unpaired` receives a `list:paired` collection, Galaxy maps over the list. Each `paired` subcollection is adapted to `paired_or_unpaired`:

From `MAPPING_LIST_PAIRED_OVER_PAIRED_OR_UNPAIRED`:

$$tool(i=mapOver(C_{list:paired})) == tool(i=mapOver(C_{list:paired\_or\_unpaired}))$$

The adapter wraps each `paired` element, and the tool sees it as `paired_or_unpaired`. The result is a `list` of output datasets.

### MapOver: `list` over `paired_or_unpaired` input

When a flat `list` is mapped over a `paired_or_unpaired` input, each dataset element is wrapped as an unpaired `paired_or_unpaired` via the `single_datasets` subcollection mapping:

From `MAPPING_LIST_OVER_PAIRED_OR_UNPAIRED`:

$$tool(i=mapOver(C_{list}, 'single\_datasets')) \mapsto \{o: collection\langle list, \{i1=tool(i=C\_AS\_UNPAIRED\_1)[o], ...\}\rangle\}$$

Each element gets a `PromoteCollectionElementToCollectionAdapter` that presents as `paired_or_unpaired` with a single `unpaired` element.

### `paired_or_unpaired` Consumes `paired`

A critical rule (`PAIRED_OR_UNPAIRED_CONSUMES_PAIRED`): when a tool expects `collection<paired_or_unpaired>`, a `paired` collection satisfies this directly. The paired collection is adapted:

$$tool(i=C_{paired}) == tool(i=C_{AS\_MIXED})$$

where $C_{AS\_MIXED}$ is the same data treated as `paired_or_unpaired` with `forward` and `reverse` elements.

### `paired_or_unpaired` NOT Consumed by `paired`

The inverse is invalid (`PAIRED_OR_UNPAIRED_NOT_CONSUMED_BY_PAIRED`):

$$tool(i: collection\langle paired\rangle, C: paired\_or\_unpaired) \Rightarrow \text{invalid}$$

A tool expecting `paired` needs both `forward` and `reverse`, which may not exist.

### Reduction Invalidity

`paired_or_unpaired` collections cannot be reduced by `multiple="true"` data inputs (`PAIRED_OR_UNPAIRED_REDUCTION_INVALID`):

$$tool(i: dataset\langle multiple=true\rangle, C: paired\_or\_unpaired) \Rightarrow \text{invalid}$$

Like `paired`, `paired_or_unpaired` represents structured data, not an arbitrary list. The same holds for `list:paired_or_unpaired` over multiple data inputs (`LIST_PAIRED_OR_UNPAIRED_REDUCTION_INVALID`).

### The `map_over_type` Parameter

When the Galaxy UI or API sends a collection to be mapped over, the `map_over_type` field in the request specifies how subcollection mapping should work. For `paired_or_unpaired` inputs, this resolves to:

- `"paired"` -- when the actual collection ends with `paired`
- `"single_datasets"` -- when the actual collection is a flat list

This resolution happens inline in `lib/galaxy/tools/parameters/basic.py:2668`:

```python
if subcollection_type == "paired_or_unpaired" \
   and not collection_type.endswith("paired_or_unpaired"):
    if collection_type.endswith("paired"):
        subcollection_type = "paired"
    else:
        subcollection_type = "single_datasets"
```

### Adapter System

When a type gap exists between the actual collection and the expected type, Galaxy bridges it with adapters (`lib/galaxy/model/dataset_collections/adapters.py`):

| Adapter | Purpose | `collection_type` |
|---------|---------|-------------------|
| `PromoteCollectionElementToCollectionAdapter` | Wraps a single DCE as `paired_or_unpaired` | `"paired_or_unpaired"` |
| `PromoteDatasetToCollection` | Wraps a single HDA as a collection | `"paired_or_unpaired"` or `"list"` |
| `PromoteDatasetsToCollection` | Wraps multiple HDAs as a collection | `"paired"` or `"paired_or_unpaired"` |

Each adapter implements `to_adapter_model()` for serialization and `elements` for tool evaluation. The serialized form is stored in the `adapter` JSON column on `job_to_input_dataset_collection` tables for provenance.

---

## 5. Workflow Editor Integration

### TypeScript Type Description

The workflow editor mirrors the Python type logic in TypeScript at `client/src/components/Workflow/Editor/modules/collectionTypeDescription.ts`.

The `CollectionTypeDescription` class implements:

**`canMatch(other)` (line 87-108):**
```typescript
canMatch(other: CollectionTypeDescriptor) {
    if (otherCollectionType === "paired" &&
        this.collectionType == "paired_or_unpaired") {
        return true;
    }
    if (this.collectionType.endsWith(":paired_or_unpaired")) {
        const asPlainList = this.collectionType.slice(
            0, -":paired_or_unpaired".length);
        if (otherCollectionType === asPlainList) return true;
        const asPairedList = `${asPlainList}:paired`;
        if (otherCollectionType === asPairedList) return true;
    }
    return otherCollectionType == this.collectionType;
}
```

**`canMapOver(other)` (line 110-145):**
```typescript
canMapOver(other: CollectionTypeDescriptor) {
    if (this.rank <= other.rank) {
        if (other.collectionType == "paired_or_unpaired") {
            return !this.collectionType.endsWith("paired");
        }
        if (other.collectionType.endsWith(":paired_or_unpaired")) {
            return !this.collectionType.endsWith(":paired");
        }
        return false;
    }
    // ... direct suffix matching ...
    if (requiredSuffix == "paired_or_unpaired") {
        return true;  // anything can map over this
    }
    // ... extended matching for :paired_or_unpaired suffixes ...
}
```

**`effectiveMapOver(other)` (line 147-193):** Computes the resulting collection type after mapping. Handles `paired_or_unpaired` specially -- when the data ends in `list`, the structure is preserved because `paired_or_unpaired` consumes individual elements via `single_datasets`.

### Connection Rejection Messages

The editor provides a specific error when connecting `paired_or_unpaired` outputs to `paired` inputs (`client/src/components/Workflow/Editor/modules/terminals.ts:658-663`):

```
"Cannot attach optionally paired outputs to inputs requiring pairing,
 consider using the 'Split Paired and Unpaired' tool to extract just
 the pairs out from this output."
```

This guides users toward the `__SPLIT_PAIRED_AND_UNPAIRED__` tool.

### Direct Match Handling in the UI

The `collections.ts` helper at `client/src/components/Form/Elements/FormData/collections.ts:15-16` defines which collection builder types the UI offers when a user needs to build a collection for a `list:paired_or_unpaired` input:

```typescript
} else if (collectionType == "list:paired_or_unpaired") {
    return ["list", "list:paired", "list:paired_or_unpaired"];
}
```

This allows the UI to show all three matching collection types when filtering history items.

---

## 6. Collection Semantics Specification

The formal specification lives in `lib/galaxy/model/dataset_collections/types/collection_semantics.yml`. All `paired_or_unpaired`-related rules are listed below with their labels and formal semantics.

### Mapping Rules

**`BASIC_MAPPING_PAIRED_OR_UNPAIRED_PAIRED`**: Map over a paired variant.
```
tool(i=mapOver(C)) ~> {o: collection<paired_or_unpaired,
  {forward=tool(i=d_f)[o], reverse=tool(i=d_r)[o]}>}
```
Tests: `test_tool_execute.py::test_map_over_data_with_paired_or_unpaired_paired`

**`BASIC_MAPPING_PAIRED_OR_UNPAIRED_UNPAIRED`**: Map over an unpaired variant.
```
tool(i=mapOver(C)) ~> {o: collection<paired_or_unpaired,
  {unpaired=tool(i=d_u)[o]}>}
```
Tests: `test_tool_execute.py::test_map_over_data_with_paired_or_unpaired_unpaired`

**`BASIC_MAPPING_LIST_PAIRED_OR_UNPAIRED`**: Map over a nested list.
```
tool(i=mapOver(C)) ~> {o: collection<list:paired_or_unpaired,
  {el1={forward=tool(i=d_f)[o],reverse=tool(i=d_r)[o]}}>}
```
Tests: `test_tool_execute.py::test_map_over_data_with_list_paired_or_unpaired`

### Reduction Rules

**`COLLECTION_INPUT_PAIRED_OR_UNPAIRED`**: Direct consumption.
```
tool(i=C) -> {o: dataset}
```
Tests: framework tool `collection_paired_or_unpaired`

**`COLLECTION_INPUT_LIST_PAIRED_OR_UNPAIRED`**: Direct consumption of nested.
```
tool(i=C) -> {o: dataset}
```
Tests: framework tool `collection_list_paired_or_unpaired`

### Subtyping / Consumption Rules

**`PAIRED_OR_UNPAIRED_CONSUMES_PAIRED`**: Paired treated as mixed.
```
tool(i=C_paired) == tool(i=C_AS_MIXED)
```
Tests: framework tool `collection_paired_or_unpaired` test 3

**`PAIRED_OR_UNPAIRED_NOT_CONSUMED_BY_PAIRED`**: Mixed rejected by paired.
```
tool(i: collection<paired>, C: paired_or_unpaired) is invalid
```
Tests: workflow editor rejects `paired_or_unpaired -> paired` connection

### MapOver with Subtyping Rules

**`MAPPING_LIST_PAIRED_OVER_PAIRED_OR_UNPAIRED`**: List of pairs mapped over mixed input.
```
tool(i=mapOver(C_list:paired)) == tool(i=mapOver(C_list:paired_or_unpaired))
```
Tests: workflow editor accepts `list:paired -> paired_or_unpaired` connection

**`MAPPING_LIST_OVER_PAIRED_OR_UNPAIRED`**: Flat list mapped over mixed input.
```
tool(i=mapOver(C_list, 'single_datasets')) ~> {o: collection<list, ...>}
```
Tests: `test_tool_execute.py::test_map_over_paired_or_unpaired_with_list`

**`MAPPING_LIST_LIST_PAIRED_OVER_PAIRED_OR_UNPAIRED`**: Doubly-nested mapping.
```
tool(i=mapOver(C_list:list:paired)) == tool(i=mapOver(C_list:list:paired_or_unpaired))
```
Tests: workflow editor accepts `list:list:paired -> paired_or_unpaired` connection

**`MAPPING_LIST_LIST_OVER_PAIRED_OR_UNPAIRED`**: Nested list over mixed input.
```
tool(i=mapOver(C_list:list, 'single_datasets')) ~> {o: collection<list:list, ...>}
```

**`MAPPING_LIST_LIST_OVER_LIST_PAIRED_OR_UNPAIRED`**: Nested list over nested mixed input.
```
tool(i=mapOver(C_list:list, 'list:paired_or_unpaired')) ~> {o: collection<list, ...>}
```

### Invalidity Rules

**`PAIRED_OR_UNPAIRED_REDUCTION_INVALID`**: Cannot reduce by multiple data input.
```
tool(i: dataset<multiple=true>, C: paired_or_unpaired) is invalid
```

**`LIST_PAIRED_OR_UNPAIRED_REDUCTION_INVALID`**: Cannot map list:mixed over multiple data.
```
tool(i=mapOver(C_list:paired_or_unpaired, 'paired_or_unpaired')) is invalid
```

**`PAIRED_OR_UNPAIRED_NOT_CONSUMED_BY_PAIRED_WHEN_MAPPING`**: Cannot map mixed list over paired.
```
tool(i=mapOver(C_list:paired_or_unpaired)) is invalid  [for tool expecting paired]
```

**`PAIRED_OR_UNPAIRED_NOT_CONSUMED_BY_LIST_WHEN_MAPPING`**: Cannot map mixed list over list.
```
tool(i=mapOver(C_list:paired_or_unpaired)) is invalid  [for tool expecting list]
```

**`COLLECTION_INPUT_LIST_PAIRED_OR_NOT_PAIRED_NOT_CONSUMES_PAIRED_PAIRED`**: Nested paired rejected.
```
tool(i: collection<list:paired_or_unpaired>, C: paired:paired) is invalid
```

---

## 7. Testing Coverage

### API Tests: `test_tool_execute.py`

Located at `lib/galaxy_test/api/test_tool_execute.py`:

| Test Function | What It Tests |
|---------------|---------------|
| `test_map_over_data_with_paired_or_unpaired_unpaired` (line 473) | Map data tool over unpaired variant; output is `paired_or_unpaired` with `unpaired` element |
| `test_map_over_data_with_paired_or_unpaired_paired` (line 483) | Map data tool over paired variant; output is `paired_or_unpaired` with `forward`/`reverse` |
| `test_map_over_data_with_list_paired_or_unpaired` (line 494) | Map data tool over `list:paired_or_unpaired`; output preserves structure |
| `test_map_over_paired_or_unpaired_with_list_paired` (line 505) | Map `list:paired` over `paired_or_unpaired` input; 2 jobs, produces list output |
| `test_map_over_paired_or_unpaired_with_list` (line 517) | Map flat `list` over `paired_or_unpaired` input via `single_datasets`; 1 job |
| `test_map_over_paired_or_unpaired_with_list_of_lists` (line 529) | Map `list:list` over `paired_or_unpaired` input; 3 jobs, `list:list` output |
| `test_adapting_dataset_to_paired_or_unpaired` (line 543) | Direct adapter: single HDA promoted to `paired_or_unpaired` |

### API Tests: `test_dataset_collections.py`

Located at `lib/galaxy_test/api/test_dataset_collections.py`:

| Test Function | What It Tests |
|---------------|---------------|
| `test_create_paried_or_unpaired` (line 136) | Create a `paired_or_unpaired` collection via API with single unpaired element |

### API Tests: `test_tools.py`

Located at `lib/galaxy_test/api/test_tools.py`:

| Test Function | What It Tests |
|---------------|---------------|
| `test_apply_rules_create_paired_or_unpaired_list` (line 958) | Rule-based creation of `list:paired_or_unpaired` collection |

### Framework Tool Tests

**`test/functional/tools/collection_paired_or_unpaired.xml`:**
- Test 1: `paired_or_unpaired` with `forward`/`reverse` elements (paired variant)
- Test 2: `paired_or_unpaired` with `unpaired` element (unpaired variant)
- Test 3: `paired` collection fed to `paired_or_unpaired` input (subtype compatibility)

**`test/functional/tools/collection_list_paired_or_unpaired.xml`:**
- Test 1: `list:paired_or_unpaired` with paired elements
- Test 2: `list:paired` fed to `list:paired_or_unpaired` input (subtype)
- Test 3: `list` fed to `list:paired_or_unpaired` input (unpaired promotion)

**`lib/galaxy/tools/split_paired_and_unpaired.xml`:**
- Test 1: Split `list` -> all unpaired output, empty paired output
- Test 2: Split `list:paired` -> empty unpaired output, all paired output
- Test 3: Split `list:paired_or_unpaired` (mixed) -> both outputs populated

### Workflow Editor Tests

Located at `client/src/components/Workflow/Editor/modules/terminals.test.ts`:

| Test Case | What It Tests |
|-----------|---------------|
| "accepts paired_or_unpaired data -> data connection" (line 224) | Map `paired_or_unpaired` output over data input; mapOver = `paired_or_unpaired` |
| "accepts list:paired_or_unpaired data -> data connection" (line 236) | Map `list:paired_or_unpaired` output over data input; mapOver = `list:paired_or_unpaired` |
| "accepts list:paired_or_unpaired data -> list:paired_or_unpaired connection" (line 248) | Direct match for nested type |
| "accepts paired_or_unpaired data -> paired_or_unpaired connection" (line 255) | Direct match for base type |
| "accepts list:paired -> paired_or_unpaired connection" (line 276) | Subtype + mapOver: `list:paired` maps over `paired_or_unpaired`; mapOver = `list` |
| "accepts list -> paired_or_unpaired connection" (line 285) | `single_datasets` mapping; mapOver = `list` |
| "accepts list:list:paired -> paired_or_unpaired connection" (line 300) | Deep nesting; mapOver = `list:list` |
| "accepts list:list:paired -> list:paired_or_unpaired connection" (line 309) | Deep nesting consumed at inner rank; mapOver = `list` |
| "accepts list:list -> paired_or_unpaired connection" (line 318) | Nested flat lists; mapOver = `list:list` |
| "accepts list:list -> list:paired_or_unpaired connection" (line 327) | Nested consumed at inner rank; mapOver = `list` |
| "accepts paired -> paired_or_unpaired connection" (line 336) | Subtype direct match; no mapOver |
| "rejects paired:paired -> list:paired_or_unpaired connection" (line 381) | Outer rank mismatch |
| "rejects paired_or_unpaired -> paired connection" (line 387) | Reverse subtype rejection with specific error message |
| "rejects list:paired_or_unpaired -> paired connection" (line 396) | Reverse subtype rejection at nested level |
| "rejects list:paired_or_unpaired -> list connection" (line 405) | Cannot reduce mixed to list |
| "rejects paired_or_unpaired input on multi-data input" (line 471) | Cannot reduce to multiple data |
| "rejects list:paired_or_unpaired input on multi-data input" (line 487) | Cannot reduce nested to multiple data |

---

## 8. Implementation Details

### Key Code Paths with File References

#### Type Plugin
- **File:** `lib/galaxy/model/dataset_collections/types/paired_or_unpaired.py`
- **Class:** `PairedOrUnpairedDatasetCollectionType` (line 20)
- **Constant:** `SINGLETON_IDENTIFIER = "unpaired"` (line 17)
- **Validation:** Element count must be 1 or 2 (line 29)

#### Type Description and Matching
- **File:** `lib/galaxy/model/dataset_collections/type_description.py`
- **`can_match_type()`:** lines 106-124 -- paired_or_unpaired matches paired; list:paired_or_unpaired matches list and list:paired
- **`has_subcollections_of_type()`:** lines 76-99 -- paired_or_unpaired is subcollection of anything except paired; single_datasets is subcollection of everything
- **`effective_collection_type()`:** lines 64-74 -- single_datasets returns same type (no rank consumed)

#### Type Registry
- **File:** `lib/galaxy/model/dataset_collections/registry.py`
- `PairedOrUnpairedDatasetCollectionType` is registered in `PLUGIN_CLASSES`

#### Adapters
- **File:** `lib/galaxy/model/dataset_collections/adapters.py`
- `PromoteCollectionElementToCollectionAdapter` (line 122): wraps DCE as `paired_or_unpaired`
- `PromoteDatasetToCollection` (line 138): wraps HDA as `paired_or_unpaired` (line 141, 179-180)
- `PromoteDatasetsToCollection` (line 192): wraps multiple HDAs as `paired_or_unpaired` (line 197)
- `recover_adapter()` (line 288): reconstructs adapter from serialized model

#### Subcollection Splitting
- **File:** `lib/galaxy/model/dataset_collections/subcollections.py`
- `single_datasets` handling (line 45-46): creates `PromoteCollectionElementToCollectionAdapter`
- `_is_a_subcollection_type()` (line 28): `single_datasets` returns True for any parent

#### Structure and Matching
- **File:** `lib/galaxy/model/dataset_collections/structure.py`
- `Tree.can_match()` (line 116): delegates to `can_match_type()`
- `get_structure()` (line 193): handles `leaf_subcollection_type` for effective type computation

#### Tool Parameter Handling
- **File:** `lib/galaxy/tools/parameters/basic.py`
- Inline logic (line 2668): resolves `paired_or_unpaired` to actual `map_over_type` (`"paired"` or `"single_datasets"`)

#### History Query
- **File:** `lib/galaxy/model/dataset_collections/query.py`
- `direct_match()` (line 62): uses `can_match_type()` to check compatibility
- `can_map_over()` (line 73): uses `is_subcollection_of_type()` for map-over detection

#### Tool Execution
- **File:** `lib/galaxy/tools/__init__.py`
- `SplitPairedAndUnpairedTool` (line 3987): separates mixed collections
- `ExtractDatasetCollectionTool` (line 4059): supports `paired_or_unpaired` extraction

#### Workflow Editor (TypeScript)
- **File:** `client/src/components/Workflow/Editor/modules/collectionTypeDescription.ts`
- `canMatch()` (line 87): mirrors Python `can_match_type()`
- `canMapOver()` (line 110): mirrors Python `has_subcollections_of_type()`
- `effectiveMapOver()` (line 147): computes remaining collection type
- **File:** `client/src/components/Workflow/Editor/modules/terminals.ts` (line 658): error message for paired_or_unpaired -> paired rejection

#### UI Data Form
- **File:** `client/src/components/Form/Elements/FormData/collections.ts` (line 15): collection type matching for UI dropdowns

#### Collection Creation UI
- **File:** `client/src/components/Collections/PairedOrUnpairedListCollectionCreator.vue`: Wizard for building `list:paired_or_unpaired` collections
- **File:** `client/src/components/Collections/ListWizard.vue`: Parent wizard component

---

## 9. Edge Cases and Limitations

### Limitation: Only Deepest Rank

The `paired_or_unpaired` subtyping only works when it is the deepest (innermost) collection type. From the semantics documentation:

> While `list:paired` can be consumed by a `list:paired_or_unpaired` input, a `paired:list` cannot be consumed by a `paired_or_unpaired:list` input though it should be able to for consistency. We have focused our time on data structures more likely to be used in actual Galaxy analyses given current and guessed future usage.

This is because the `can_match_type()` implementation only checks `endswith(":paired_or_unpaired")`. A type like `paired_or_unpaired:list` would require prefix matching, which is not implemented.

### Bug Fix: `endswith("paired")` Ambiguity

Commit `337678769c` fixed a subtle bug: `"paired_or_unpaired".endswith("paired")` returns `True` in Python. This caused false matches where `paired_or_unpaired` was incorrectly treated as `paired`. The fix ensures checks explicitly compare for `paired_or_unpaired` before falling through to `paired` matching.

This pattern appears in the `canMapOver()` implementation at `collectionTypeDescription.ts:118`:
```typescript
return !this.collectionType.endsWith("paired");
```
For `paired_or_unpaired`, this correctly returns `False` (blocking map-over-self), because `"paired_or_unpaired".endsWith("paired")` is `true` in JavaScript too.

### Heterogeneous Element Storage

In a `list:paired_or_unpaired` collection, elements may point to either:
- A `child_collection` (DatasetCollection of type `paired_or_unpaired`) for paired elements
- A direct HDA for unpaired elements

The `SplitPairedAndUnpairedTool` discriminates via `history_content_type`:
```python
if getattr(element.element_object, "history_content_type", None) == "dataset":
    _handle_unpaired(element)
else:
    _handle_paired(element)
```

### Adapter Serialization for Provenance

When adapters bridge type gaps, the adapter model is serialized to the `adapter` JSON column on `job_to_input_dataset_collection`. This means the job record captures that an adaptation occurred, but the adapter is not re-materialized during job recovery -- it is only informational for provenance.

### No `prototype_elements()` Support

Unlike `paired` (which provides `prototype_elements()` for pre-creating implicit output structure), `paired_or_unpaired` does NOT provide prototypes. This is because the structure is indeterminate -- the output could be either 1 or 2 elements. Pre-creation of implicit collections for `paired_or_unpaired` outputs uses `UninitializedTree` and defers population until job completion.

### `record` vs `paired_or_unpaired`

While `record` and `paired_or_unpaired` were introduced in the same PR, they serve different purposes. `record` is a heterogeneous tuple with typed fields and does NOT support implicit mapping (`allow_implicit_mapping = False`). `paired_or_unpaired` fully participates in implicit mapping.

---

## 10. Relationship to Other Collection Types

### Subtype Lattice

The collection type subtyping relationships form a directed graph (not a simple hierarchy):

```
paired_or_unpaired  (supertype)
  ^           ^
  |           |
paired    unpaired/single_dataset
```

At the list level:
```
list:paired_or_unpaired  (supertype)
  ^           ^          ^
  |           |          |
list:paired   list    list:paired_or_unpaired (exact)
```

### Compared to `paired`

| Aspect | `paired` | `paired_or_unpaired` |
|--------|----------|---------------------|
| Element count | Always 2 | 1 or 2 |
| Identifiers | `forward`, `reverse` | `unpaired` OR `forward`/`reverse` |
| `prototype_elements()` | Yes | No |
| Can be reduced by `multiple=true` | No | No |
| Consumed by `paired` input | Yes | **No** |
| Consumed by `paired_or_unpaired` input | **Yes** | Yes |
| `allow_implicit_mapping` | Yes (implied) | Yes (implied) |

### Compared to `list`

| Aspect | `list` | `paired_or_unpaired` |
|--------|--------|---------------------|
| Element count | Arbitrary | 1 or 2 |
| Identifiers | User-defined | Fixed: `unpaired` or `forward`/`reverse` |
| Can be reduced by `multiple=true` | Yes | No |
| Consumed by `list` input | Yes | **No** |
| Consumed by `paired_or_unpaired` input | **No** (but `list` can be *mapped over* it) | Yes |

### Compared to `record`

| Aspect | `record` | `paired_or_unpaired` |
|--------|----------|---------------------|
| Element count | Schema-defined | 1 or 2 |
| Fields | Typed, heterogeneous | Untyped, homogeneous |
| `allow_implicit_mapping` | **No** | Yes |
| Subtyping | None | `paired` is subtype |
| `fields` column | Used | Not used |

### Interaction with Nested Types

| Collection Type | Can feed `paired_or_unpaired` input? | Mechanism |
|-----------------|--------------------------------------|-----------|
| `paired` | Yes, direct | Subtype match via `can_match_type()` |
| `paired_or_unpaired` | Yes, direct | Exact match |
| `list` | Yes, mapped | `single_datasets` subcollection mapping |
| `list:paired` | Yes, mapped | Subcollection mapping (each `paired` adapted) |
| `list:paired_or_unpaired` | Yes, mapped | Subcollection mapping (each element used directly) |
| `list:list` | Yes, mapped | `single_datasets` at leaf level, preserves `list:list` structure |
| `list:list:paired` | Yes, mapped | Inner `paired` adapted, produces `list:list` output |

| Collection Type | Can feed `list:paired_or_unpaired` input? | Mechanism |
|-----------------|-------------------------------------------|-----------|
| `list:paired` | Yes, direct | Subtype match |
| `list` | Yes, direct | Subtype match (each element treated as unpaired) |
| `list:paired_or_unpaired` | Yes, direct | Exact match |
| `list:list:paired` | Yes, mapped | Maps outer list, each inner `list:paired` adapted |
| `list:list` | Yes, mapped | Maps outer list, each inner `list` adapted via `single_datasets` |

### The `__SPLIT_PAIRED_AND_UNPAIRED__` Tool

This built-in tool (`lib/galaxy/tools/split_paired_and_unpaired.xml`) bridges the gap from `paired_or_unpaired` back to homogeneous types. It accepts `list:paired`, `list`, or `list:paired_or_unpaired` and produces two outputs:

- `output_unpaired`: A `list` containing all unpaired elements
- `output_paired`: A `list:paired` containing all paired elements

This is essential for workflow design where downstream tools require specifically `paired` or individual datasets. The workflow editor actively suggests this tool when users attempt to connect `paired_or_unpaired` outputs to `paired` inputs.

---

## References

- **PR #19377**: https://github.com/galaxyproject/galaxy/pull/19377
- **Collection Semantics YAML**: `lib/galaxy/model/dataset_collections/types/collection_semantics.yml`
- **Collection Semantics Documentation**: `doc/source/dev/collection_semantics.md`
- **Type Plugin Source**: `lib/galaxy/model/dataset_collections/types/paired_or_unpaired.py`
- **Type Description Source**: `lib/galaxy/model/dataset_collections/type_description.py`
- **Adapter Source**: `lib/galaxy/model/dataset_collections/adapters.py`
- **Workflow Editor Type Logic**: `client/src/components/Workflow/Editor/modules/collectionTypeDescription.ts`
