---
type: research
subtype: component
tags:
  - research/component
  - galaxy/models
  - galaxy/datasets
  - galaxy/tools
  - galaxy/api
  - galaxy/lib
status: draft
created: 2026-02-05
revised: 2026-02-05
revision: 1
ai_generated: true
component: Implicit Dataset Conversion
galaxy_areas:
  - models
  - datasets
  - tools
  - api
  - lib
---

# Galaxy Implicit Dataset Conversion - Research Findings

## Executive Summary

Galaxy's "implicit dataset conversion" is a transparent mechanism allowing users to pass a History Dataset Association (HDA) of one datatype to a tool accepting a different datatype, provided a converter exists. The key insight: **implicitly converted datasets are full HDAs with their own database IDs, linked to parent datasets through the `ImplicitlyConvertedDatasetAssociation` table, but marked invisible (`visible=False`) in history views.**

## 1. Core Data Structure: ImplicitlyConvertedDatasetAssociation

**Location**: `lib/galaxy/model/__init__.py:6877-6930`

```python
class ImplicitlyConvertedDatasetAssociation(Base, Serializable):
    __tablename__ = "implicitly_converted_dataset_association"

    id = Column(Integer, primary_key=True)
    create_time = Column(DateTime, default=now)
    update_time = Column(DateTime, default=now, onupdate=now)
    hda_id = Column(Integer, ForeignKey("history_dataset_association.id"), index=True, nullable=True)
    hda_parent_id = Column(Integer, ForeignKey("history_dataset_association.id"), index=True, nullable=True)
    ldda_id = Column(Integer, ForeignKey("library_dataset_dataset_association.id"), index=True, nullable=True)
    ldda_parent_id = Column(Integer, ForeignKey("library_dataset_dataset_association.id"), index=True, nullable=True)
    type = Column(TrimmedString(255))  # Target extension (e.g., "tabular", "gff")
    metadata_safe = Column(Boolean)
    deleted = Column(Boolean, default=False)
```

**Key Fields**:
- `hda_id`/`ldda_id`: The converted dataset
- `hda_parent_id`/`ldda_parent_id`: The original dataset
- `type`: Target extension (e.g., "tabular", "gff", "bigwig")

**Navigation** via bidirectional relationships on DatasetInstance:
- `hda.implicitly_converted_datasets` → datasets converted FROM this one
- `hda.implicitly_converted_parent_datasets` → parent datasets this was converted FROM

## 2. Datatype Converter System

### 2.1 Converter Registration

**Location**: `lib/galaxy/datatypes/registry.py:665-687`

Converters are registered in `datatypes_conf.xml` with `<converter>` elements:
```xml
<converter file="fasta_to_tabular_converter.xml" target_datatype="tabular"/>
```

Registry loads converters into:
- `registry.converter_tools`: Set of all converter tools
- `registry.datatype_converters`: Dict mapping `source_ext -> {target_ext: converter_tool}`
- `registry.converter_deps`: Dict tracking multi-step conversion dependencies

### 2.2 Converter Discovery

**Key Methods** in `lib/galaxy/datatypes/registry.py`:
- `get_converters_by_datatype(ext)` (line 875): Returns dict of all conversions FROM an extension
- `get_converter_by_target_type(source_ext, target_ext)` (line 890): Returns specific converter tool
- `find_conversion_destination_for_dataset_by_extensions()` (line 897-956): Core logic to find if conversion is needed/available

### 2.3 Converter Tools

~100 converter tools in `lib/galaxy/datatypes/converters/` directory. Examples:
- `fasta_to_tabular_converter.xml`
- `bed_to_gff_converter.xml`
- `bam_to_bigwig_converter.xml`

Converters are normal Galaxy tools with single input, single output.

## 3. Conversion Trigger Point

**Location**: `lib/galaxy/tools/actions/__init__.py:164-184`

When tool inputs are collected via `process_dataset()`:

```python
def process_dataset(data, formats=None):
    direct_match, target_ext, converted_dataset = data.find_conversion_destination(formats)
    if not direct_match and target_ext:
        if converted_dataset:
            data = converted_dataset  # Use existing conversion
        else:
            data = data.get_converted_dataset(
                trans,
                target_ext,
                target_context=parent,
                history=history,
                use_cached_job=param_values.get("__use_cached_job__", False),
            )
    return data
```

**Flow**:
1. For each dataset parameter, calls `find_conversion_destination(accepted_formats)`
2. Returns `(direct_match, target_ext, existing_converted_dataset)`
3. If conversion needed and exists → use existing
4. If conversion needed but doesn't exist → call `get_converted_dataset()`

## 4. Conversion Execution Flow

### 4.1 DatasetInstance.get_converted_dataset()

**Location**: `lib/galaxy/model/__init__.py:5476-5531`

1. Check if converter exists; raise `NoConverterException` if not
2. Check metadata-based conversions (e.g., BAM index via `get_metadata_dataset()`)
3. Check existing conversions via `get_converted_files_by_type()`
4. Resolve dependencies recursively via `get_converted_dataset_deps()`
5. Execute converter via `datatype.convert_dataset()`

### 4.2 Data.convert_dataset()

**Location**: `lib/galaxy/datatypes/data.py:829-880`

```python
def convert_dataset(self, trans, original_dataset, target_type, ...):
    converter = trans.app.datatypes_registry.get_converter_by_target_type(
        original_dataset.extension, target_type
    )
    params = {"input1": original_dataset, "__target_datatype__": target_type}

    # Check for cached job if requested
    if use_cached_job:
        completed_jobs = converter.completed_jobs(trans, params)
        if completed_jobs:
            return completed_jobs[0].get_output(converter.outputs.keys()[0])

    # Execute converter
    converted_dataset = converter.execute(trans, params, history=history)
    original_dataset.attach_implicitly_converted_dataset(session, converted_dataset, target_type)
    return converted_dataset
```

### 4.3 Attaching Converted Dataset

**Location**: `lib/galaxy/model/__init__.py:5533-5540`

```python
def attach_implicitly_converted_dataset(self, session, new_dataset, target_ext: str):
    new_dataset.name = self.name
    self.copy_attributes(new_dataset)
    assoc = ImplicitlyConvertedDatasetAssociation(
        parent=self, file_type=target_ext, dataset=new_dataset, metadata_safe=False
    )
    session.add(new_dataset)
    session.add(assoc)
```

## 5. Checking for Existing Conversions

**Location**: `lib/galaxy/model/__init__.py:5452-5463`

```python
def get_converted_files_by_type(self, file_type, include_errored=False):
    for assoc in self.implicitly_converted_datasets:
        if not assoc.deleted and assoc.type == file_type:
            item = assoc.dataset or assoc.dataset_ldda
            valid_states = (
                (Dataset.states.ERROR, *Dataset.valid_input_states)
                if include_errored
                else Dataset.valid_input_states
            )
            if not item.deleted and item.state in valid_states:
                return item
    return None
```

This prevents redundant conversions by checking if the conversion was already performed.

## 6. Dataset Matcher System

**Location**: `lib/galaxy/tools/parameters/dataset_matcher.py`

### 6.1 Match Classes

```python
class HdaDirectMatch:
    implicit_conversion = False

class HdaImplicitMatch:
    implicit_conversion = True
    target_ext: str           # Format to convert to
    original_hda: HDA         # Parent before conversion
    hda: HDA                  # Converted HDA (or original if not yet converted)
```

### 6.2 Matching Logic

**DatasetMatcher.valid_hda_match()** (line 113-136):

```python
def valid_hda_match(self, hda, check_implicit_conversions=True):
    direct_match, target_ext, converted_dataset = hda.find_conversion_destination(formats)
    if direct_match:
        return HdaDirectMatch(hda)
    else:
        if not check_implicit_conversions:
            return False
        if target_ext:
            original_hda = hda
            if converted_dataset:
                hda = converted_dataset
            return HdaImplicitMatch(hda, target_ext, original_hda)
        else:
            return False
```

## 7. API Endpoint

**Location**: `lib/galaxy/webapps/galaxy/api/tools.py:802-849`

```
POST /api/tools/{tool_id}/conversion
```

Payload:
```json
{
    "id": "<dataset_id>",
    "src": "hda",
    "source_type": "fasta",
    "target_type": "tabular",
    "history_id": "<optional>"
}
```

Executes converter and returns result.

## 8. UI Display

**Location**: `lib/galaxy/tools/parameters/basic.py:2350-2480`

The tool parameter building groups HDAs by HID and shows conversion info:

```python
matches_by_hid: dict[int, list] = {}
for hda in history.active_visible_datasets_and_roles:
    match = dataset_matcher.hda_match(hda)
    if match:
        matches_by_hid[match.hda.hid].append(match)

for matches in matches_by_hid.values():
    match = matches[0]
    # Prefer original HDA over already-converted
    if len(matches) > 1:
        match = next((m for m in matches
                     if len(m.hda.implicitly_converted_parent_datasets) == 0), match)

    # Display name shows "(as format)" for implicit conversions
    m_name = (
        f"{match.original_hda.name} (as {match.target_ext})"
        if match.implicit_conversion
        else match.hda.name
    )
```

## 9. HID and Visibility Mechanism

**Critical Design Points**:

1. **Converted HDA is a NEW HDA** with its own database ID
2. **Created with `visible=False`** → hidden from history UI by default
3. **Same HID as parent**: The converted dataset shares the parent's HID
4. **User experience**: User sees original dataset at HID, tool receives converted version transparently

The HID sharing means:
- Query by HID returns multiple HDAs (original + conversions)
- UI groups by HID and prefers showing the original
- `ImplicitlyConvertedDatasetAssociation` table enables discovery of relationships

## 10. Caching & Job Reuse

**Location**: `lib/galaxy/datatypes/data.py:850-860`

```python
if use_cached_job:
    completed_jobs = converter.completed_jobs(trans, params)
    if completed_jobs:
        return completed_jobs[0].get_output(...)
```

- Checks for previous identical conversions via `converter.completed_jobs()`
- If found and `use_cached_job=True`, reuses result
- Avoids re-execution of expensive conversions

## 11. Special Cases

### 11.1 Metadata Conversions

**Location**: `lib/galaxy/model/__init__.py:5547-5560`

Some "conversions" are actually metadata files (e.g., BAM index):
```python
def get_metadata_dataset(self, dataset, name):
    # Returns metadata file as fake HDA
    # No actual conversion needed
```

### 11.2 Multi-Step Conversions

`converter_deps` dictionary tracks dependencies:
- Example: fasta → bed might require fasta → gff → bed
- `get_converted_dataset_deps()` recursively resolves chain

### 11.3 Library Datasets (LDDA)

Parallel FK fields support library datasets:
- `ldda_id` / `ldda_parent_id`
- Same association table, different dataset type

## 12. Tests

### 12.1 Unit Tests

**`test/unit/app/tools/test_data_parameters.py:71-142`**:
- `test_field_implicit_conversion_new`: Tests "(as tabular)" display when not yet converted
- `test_field_implicit_conversion_existing`: Tests using existing converted HDA

**`test/unit/app/tools/test_dataset_matcher.py:46-75`**:
- `test_valid_hda_implicit_convered`: Tests matching already-converted dataset
- `test_hda_match_implicit_can_convert`: Tests matching when conversion needed
- `test_hda_match_properly_skips_conversion`: Tests `check_implicit_conversions=False`

### 12.2 Integration Tests

**`test/integration/test_extended_metadata.py`**: Integration tests for conversion + metadata

## 13. Data Flow Diagram

```
Tool Execution Request
        │
        ▼
For Each Data Input Parameter
        │
        ▼
process_dataset(hda)
        │
        ▼
hda.find_conversion_destination(required_formats)
        │
        ├──► Direct Match?
        │    YES → Use HDA as-is
        │    NO  → Check if conversion possible
        │
        ▼
Conversion Possible?
        │
        ├──► YES → Check if Already Converted
        │    │     │
        │    │     ├──► Already Converted? (via ImplicitlyConvertedDatasetAssociation)
        │    │     │    YES → Use Converted Dataset
        │    │     │    NO  → get_converted_dataset()
        │    │
        │    NO → Error or Fallback
        │
        ▼
get_converted_dataset(trans, target_ext)
        │
        ▼
Execute Converter Tool (via job queue)
        │
        ▼
original_hda.attach_implicitly_converted_dataset(converted_hda)
        │
        ▼
Create ImplicitlyConvertedDatasetAssociation Link
        │
        ▼
Return converted_hda (visible=False, shares parent HID)
```

## 14. Key Files Summary

| File | Lines | Purpose |
|------|-------|---------|
| `lib/galaxy/model/__init__.py` | 5452-5560, 6877-6930 | Model definitions, conversion methods |
| `lib/galaxy/datatypes/data.py` | 829-880 | `convert_dataset()` implementation |
| `lib/galaxy/datatypes/registry.py` | 665-687, 875-956 | Converter registration and discovery |
| `lib/galaxy/tools/actions/__init__.py` | 164-184 | Conversion trigger in tool execution |
| `lib/galaxy/tools/parameters/basic.py` | 2350-2480 | UI parameter building with conversion display |
| `lib/galaxy/tools/parameters/dataset_matcher.py` | 90-186 | Dataset matching logic |
| `lib/galaxy/webapps/galaxy/api/tools.py` | 802-849 | API endpoint for explicit conversion |
| `test/unit/app/tools/test_data_parameters.py` | 71-142 | Unit tests |
| `test/unit/app/tools/test_dataset_matcher.py` | 46-75 | Matcher unit tests |

## 15. Open Questions

1. **Purging strategy**: When are implicitly converted datasets purged vs kept?
2. **Collection conversions**: How do implicit conversions work with dataset collections?
3. **Security model**: Are implicit conversions subject to same permission checks?
4. **Workflow extraction**: How does current extraction handle implicit conversions when HID has multiple datasets?
5. **Performance**: What's the overhead of conversion discovery for large histories?
