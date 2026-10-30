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
revised: 2026-10-30
revision: 4
ai_generated: true
component: Implicit Dataset Conversion
galaxy_areas:
  - models
  - datasets
  - tools
  - api
  - lib
summary: "Transparent datatype conversion via ImplicitlyConvertedDatasetAssociation, target-history resolution, and every caller"
related_notes:
  - "[[Component - Dataset Display]]"
  - "[[Component - Dataset and Collection Access Checks]]"
  - "[[PR 21842 - Tool Execution Migrated to api jobs]]"
---

# Galaxy Implicit Dataset Conversion - Research Findings

Verified against Galaxy `origin/dev` @ `65e6daff2334c8cfd4971682eecfb87f38a224be` (revision 4). Line numbers below are at that SHA.

## Executive Summary

Galaxy's "implicit dataset conversion" is a transparent mechanism allowing users to pass a History Dataset Association (HDA) of one datatype to a tool accepting a different datatype, provided a converter exists. The key insight: **implicitly converted datasets are full HDAs with their own database IDs, linked to parent datasets through the `ImplicitlyConvertedDatasetAssociation` table, but marked invisible (`visible=False`) in history views.**

A conversion is a real converter job, and every job needs a target history. The tool-input path always passes one. Most other callers of `get_converted_dataset` don't, and fall back to the request's current history (section 4.4). That fallback is `None` for API-key requests, so those callers fail with a bare `AssertionError` (HTTP 500) whenever a new conversion has to be started. Section 15 lists every caller and whether it is safe without a current history.

## 1. Core Data Structure: ImplicitlyConvertedDatasetAssociation

**Location**: `lib/galaxy/model/__init__.py:7363` (class through `:7459`)

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

Converters are declared in `datatypes_conf.xml` with `<converter>` elements (`depends_on=` populates `converter_deps`, `lib/galaxy/datatypes/registry.py:318-319`):
```xml
<converter file="fasta_to_tabular_converter.xml" target_datatype="tabular"/>
```

`Registry.load_datatype_converters()` (`registry.py:702-722`) loads each converter tool into the toolbox and registers it. The registry keeps:
- `registry.converter_tools`: Set of all converter tools
- `registry.datatype_converters`: Dict mapping `source_ext -> {target_ext: converter_tool}`
- `registry.converter_deps`: Dict tracking multi-step conversion dependencies

### 2.2 Converter Discovery

**Key Methods** in `lib/galaxy/datatypes/registry.py`:
- `get_converters_by_datatype(ext)` (`:943`): all conversions FROM an extension, including those inherited from datatype superclasses (cached per extension)
- `get_converter_by_target_type(source_ext, target_ext)` (`:958`): specific converter tool
- `find_conversion_destination_for_dataset_by_extensions(dataset_or_ext, accepted_formats, converter_safe=True)` (`:965-1023`): returns `(direct_match, target_ext, existing_converted_dataset)`. Given a dataset (not just an extension) it calls `dataset.get_converted_files_by_type(convert_ext)` (`:1016`) to report an existing conversion. Uncompressed targets are tried first.

### 2.3 Converter Tools

74 converter tool XMLs in `lib/galaxy/datatypes/converters/`. Examples:
- `fasta_to_tabular_converter.xml`
- `bed_to_gff_converter.xml`
- `bam_to_bigwig_converter.xml`

Converters are normal Galaxy tools with single input, single output.

## 3. Conversion Trigger Point (tool inputs)

**Location**: `lib/galaxy/tools/actions/__init__.py:199-247` (`process_dataset`, inside `_collect_input_datasets`)

```python
def process_dataset(data, formats=None):
    ...
    direct_match, target_ext, converted_dataset = data.find_conversion_destination(formats)
    if not direct_match and target_ext:
        if converted_dataset:
            data = converted_dataset  # Use existing conversion
        else:
            data = data.get_converted_dataset(
                trans,
                target_ext,
                target_context=param_values,
                history=history,
                use_cached_job=param_values.get("__use_cached_job__", False),
            )
    # then: access check on data.dataset (see section 16)
```

**Flow**:
1. For each dataset parameter, calls `find_conversion_destination(accepted_formats)` (`model/__init__.py:6020`)
2. Returns `(direct_match, target_ext, existing_converted_dataset)`
3. If conversion needed and exists → use existing
4. If conversion needed but doesn't exist → call `get_converted_dataset()` **with the job's own target `history`**

## 4. Conversion Execution Flow

### 4.1 DatasetInstance.get_converted_dataset()

**Location**: `lib/galaxy/model/__init__.py:5917-5980`

Signature: `get_converted_dataset(self, trans, target_ext, target_context=None, history=None, include_errored=False, use_cached_job=False)`.

1. If `target_ext` isn't in `get_converter_types()`, raise `NoConverterException` (`:5930-5931`; class at `:401`).
2. Return a metadata-backed "conversion" if present: `get_metadata_dataset()` (`:5933-5935`, BAM index only).
3. Return an existing conversion: `get_converted_files_by_type(target_ext, include_errored=...)` (`:5937-5939`).
4. Resolve dependencies from `converter_deps` recursively, passing `target_context` and `history` through (`:5946-5963`). A dependency in `ERROR` raises `ConverterDependencyException`; pending dependencies are fine.
5. Run the converter via `self.datatype.convert_dataset(trans, self, target_ext, return_output=True, visible=False, deps=..., target_context=..., history=history, use_cached_job=...)` and return its single output (`:5966-5980`).

`get_converted_dataset_deps(trans, target_ext, use_cached_job=False)` (`:5906-5915`) is a separate helper that returns `{dep_ext: converted}` for a target's dependencies. It has **no `history` parameter**.

### 4.2 Data.convert_dataset()

**Location**: `lib/galaxy/datatypes/data.py:893-947`

```python
def convert_dataset(self, trans, original_dataset, target_type, return_output=False,
                    visible=True, deps=None, target_context=None, history=None, use_cached_job=False):
    converter = trans.app.datatypes_registry.get_converter_by_target_type(original_dataset.ext, target_type)
    ...
    params[input_name] = original_dataset
    params["__target_datatype__"] = target_type
    completed_jobs = converter.completed_jobs(trans, all_params=[params], use_cached_job=use_cached_job)
    completed_job = completed_jobs[0] if completed_jobs else None
    job, converted_datasets, *_ = converter.execute(
        trans, incoming=params, set_output_hid=visible, history=history,
        flush_job=False, completed_job=completed_job,
    )
    for converted_dataset in converted_datasets.values():
        ...
        original_dataset.attach_implicitly_converted_dataset(trans.sa_session, converted_dataset, target_type)
    trans.app.job_manager.enqueue(job, tool=converter)
    ...
```

`history` is forwarded unchanged to `converter.execute` (`Tool.execute`, `lib/galaxy/tools/__init__.py:2593-2619`). Nothing here falls back to the original dataset's own history.

### 4.3 Attaching Converted Dataset

**Location**: `lib/galaxy/model/__init__.py:5982-5989`

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

`HistoryDatasetAssociation.copy_attributes` (`:6393-6395`) copies the parent's `hid` onto the converted HDA when it has none. The base `DatasetInstance.copy_attributes` (`:5991`) does nothing, so LDDA parents don't pass a HID along.

### 4.4 Target history resolution when `history=None`

When a caller omits `history=`, the converter job's history is resolved inside the tool action:

1. `DefaultToolAction.execute()` (`lib/galaxy/tools/actions/__init__.py:496`) calls `_collect_inputs(...)`.
2. `_collect_inputs` (`:447-455`): `if not history: history = tool.get_default_history_by_trans(trans, create=True)`.
3. `Tool.get_default_history_by_trans` (`lib/galaxy/tools/__init__.py:3278-3279`) is `trans.get_history(create=create)`. (`DataManagerTool` overrides it at `:3787` with a per-user "Data Manager History"; converters are plain tools.)
4. `execute` then does `assert history` (`actions/__init__.py:536`).

What `trans.get_history(create=True)` returns depends on the transaction type:

| Transaction | Where history comes from | API-key request, no session | Result |
|---|---|---|---|
| FastAPI `SessionRequestContext` (`get_trans`, `lib/galaxy/webapps/galaxy/api/__init__.py:385-405`) | `galaxy_session.current_history` captured at request start (`:370-373`); `WorkRequestContext.get_history` ignores `create` (`lib/galaxy/work/context.py:67-68`) | `galaxy_session` is `None` (`get_session`, `api/__init__.py:152-161`) so history is `None` | `assert history` → `AssertionError` → HTTP 500 |
| Legacy WSGI `GalaxyWebTransaction` (`lib/galaxy/webapps/base/webapp.py:934-952`) | session's current history; with `create`, `get_or_create_default_history()` (`:964-992`) | API-key auth leaves `galaxy_session = None` (`webapp.py:551-592`) and `get_or_create_default_history` starts with `assert self.galaxy_session` | `AssertionError` → HTTP 500 |
| Browser session (either) | session's current history | n/a | converted HDA lands in the **user's current history**, not the original dataset's history |
| `WorkRequestContext` built for tool requests (`JobManager._context`, `lib/galaxy/managers/jobs.py:2381-2392`) and workflow scheduling | the request's target history passed to the constructor | n/a | history set; safe |

Consequences:
- The fallback never uses the original dataset's own history. Even in the browser, a conversion of a dataset in history A, triggered while history B is current, puts the hidden converted HDA (and its job) in B.
- Because `copy_attributes` copies the parent's HID, that converted HDA in history B carries a HID from history A. See `vault/agents/gx_research/research_issues/implicit-conversion-copies-foreign-hid.md`.
- The assertion only fires when a **new** converter job has to start. If an existing conversion (or the BAM-index metadata file) satisfies the request, `get_converted_dataset` returns before reaching `convert_dataset`.
- The bare `AssertionError` isn't a Galaxy `MessageException`. Callers that catch only `NoConverterException` let it surface as an unhandled 500.

Issue [#24529](https://github.com/galaxyproject/galaxy/issues/24529) (open at this SHA, no fix merged) is this failure for `PUT /api/users/{user_id}/custom_builds/{key}` with `len|type=fasta`. Its proposed fix is labelled as proposed in section 15.3.

## 5. Checking for Existing Conversions

**Location**: `lib/galaxy/model/__init__.py:5880-5891`

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
            if not item.deleted and item.state in valid_states and not item._blocked_on_failed_input():
                return item
    return None
```

`_blocked_on_failed_input()` (`:5893-5904`) skips a pending conversion whose creating job waits on an errored or discarded input (recursively). This prevents redundant conversions and stops reuse of conversions that can never finish. The method returns the first match; it doesn't consult the requesting user.

## 6. Dataset Matcher System

**Location**: `lib/galaxy/tools/parameters/dataset_matcher.py`

### 6.1 Match Classes

```python
class HdaDirectMatch:        # :168
    implicit_conversion = False

class HdaImplicitMatch:      # :181
    implicit_conversion = True
    target_ext: str           # Format to convert to
    original_hda: HDA         # Parent before conversion
    hda: HDA                  # Converted HDA (or original if not yet converted)
```

### 6.2 Matching Logic

**DatasetMatcher.valid_hda_match()** (`:120-143`):

```python
def valid_hda_match(self, hda, check_implicit_conversions=True):
    direct_match, target_ext, converted_dataset = hda.find_conversion_destination(formats)
    if direct_match:
        rval = HdaDirectMatch(hda)
    else:
        if not check_implicit_conversions:
            return False
        if target_ext:
            original_hda = hda
            if converted_dataset:
                hda = converted_dataset
            rval = HdaImplicitMatch(hda, target_ext, original_hda)
        else:
            return False
    if self.filter(hda):
        return False
    return rval
```

The collection-side matcher also calls `find_conversion_destination_for_dataset_by_extensions` on element extensions (`:234`).

## 7. API Endpoints

### 7.1 Explicit conversion: `POST /api/tools/{tool_id}/convert`

Route: `lib/galaxy/webapps/galaxy/buildapp.py:281` → legacy `ToolsController.conversion` (`lib/galaxy/webapps/galaxy/api/tools.py:924-974`). (Earlier revisions of this note called it `/conversion`; the route is `/convert`.)

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

History resolution is explicit and owner-checked. `history_id` uses `history_manager.get_owned`. Otherwise it uses the input HDCA's history, or the input HDA's history after `error_unless_owner`, then `error_unless_mutable`. It runs `converter.handle_input(trans, params, history=target_history)` as an ordinary tool run (`src: hdca` batches over the collection). It doesn't go through `get_converted_dataset`, so it never reaches the `history=None` fallback.

### 7.2 Dataset conversion endpoints

- `GET /api/datasets/{dataset_id}/converted/{ext}` (`lib/galaxy/webapps/galaxy/api/datasets.py:217-238`) → `DatasetsService.converted_ext` (`services/datasets.py:882-897`) → `_get_or_create_converted` (`:982-993`). It creates the conversion if it's missing, so it goes through the `history=None` fallback (section 15).
- `GET /api/datasets/{dataset_id}/converted` (`api/datasets.py:240-252`) → `DatasetsService.converted` (`services/datasets.py:899-909`) → `serialize_converted_datasets` (`lib/galaxy/managers/datasets.py:797-810`). This is read-only: it returns `{type: encoded id}` for non-deleted associations whose `dataset` (HDA) is set.

## 8. UI Display

**Location**: `lib/galaxy/tools/parameters/basic.py:2895-2945` (data parameter options)

Matches are grouped by HID. When a HID has several matches, the original (no `implicitly_converted_parent_datasets`) is preferred. Implicit matches are labelled `"<name> (as <ext>)"` (`:2915`, `:2940`):

```python
matches_by_hid: dict[int, list] = {}
for match in page_matches:
    m = match.hda
    original = getattr(match, "original_hda", m)
    ...
    matches_by_hid.setdefault(m.hid, []).append(match)
for matches in matches_by_hid.values():
    match = matches[0]
    if len(matches) > 1:
        match = next((m for m in matches if len(m.hda.implicitly_converted_parent_datasets) == 0), match)
    m_name = f"{match.original_hda.name} (as {match.target_ext})" if match.implicit_conversion else match.hda.name
```

## 9. HID and Visibility Mechanism

**Critical Design Points**:

1. **Converted HDA is a NEW HDA** with its own database ID
2. **Created with `visible=False`** → hidden from history UI by default (`data.py:939-941`)
3. **Same HID as parent**: `convert_dataset` passes `set_output_hid=visible` (False), so the history doesn't allocate a HID. `attach_implicitly_converted_dataset` → `copy_attributes` then copies the parent's HID (`model/__init__.py:6393-6395`).
4. **User experience**: User sees original dataset at HID, tool receives converted version transparently

The HID sharing means:
- Query by HID returns multiple HDAs (original + conversions)
- UI groups by HID and prefers showing the original
- `ImplicitlyConvertedDatasetAssociation` table enables discovery of relationships
- The "same HID" invariant only holds when the conversion lands in the parent's own history. A conversion created in a different history (section 4.4) borrows a HID that history never allocated.

## 10. Caching & Job Reuse

**Location**: `lib/galaxy/datatypes/data.py:919-929`

```python
completed_jobs = converter.completed_jobs(trans, all_params=[params], use_cached_job=use_cached_job)
completed_job = completed_jobs[0] if completed_jobs else None
job, converted_datasets, *_ = converter.execute(..., completed_job=completed_job)
```

- `converter.completed_jobs()` is always called. `use_cached_job` decides whether it may return a matching earlier job.
- A found job is handed to `execute(completed_job=...)`, which copies outputs from it instead of running the converter again. A new job is still created (marked `copied_from_job_id`, `actions/__init__.py:821-822`) and enqueued, and the outputs are still attached as implicit conversions.
- The tool-input path forwards the request's `__use_cached_job__` (section 3). Other callers use the default `False`.

## 11. Special Cases

### 11.1 Metadata Conversions

**Location**: `lib/galaxy/model/__init__.py:5996-6009`

Some "conversions" are actually metadata files. Only BAM index → `bai` is handled:
```python
def get_metadata_dataset(self, dataset_ext):
    # Returns metadata file as fake HDA (no history, no DB row)
```

### 11.2 Multi-Step Conversions

`converter_deps` dictionary tracks dependencies:
- Example: a converter declaring `depends_on="bed,fai"` makes those conversions run first
- `get_converted_dataset()` resolves the chain recursively and forwards `history`. `get_converted_dataset_deps()` doesn't take `history`.

### 11.3 Library Datasets (LDDA)

Parallel FK fields support library datasets:
- `ldda_id` / `ldda_parent_id`
- Same association table, different dataset type
- `get_converted_files_by_type` returns `assoc.dataset or assoc.dataset_ldda`. The `/converted` serializer only lists HDA conversions.
- Converting an LDDA still needs a target history (the converter job's). The tool-input path converts library inputs to HDAs before job creation (`actions/__init__.py:551-553`).

### 11.4 Clearing conversions

`clear_associated_files(metadata_safe=False, purge=False)` (HDA `:6467-6474`, LDDA `:7138`) clears associations in both directions. `Data.after_setting_metadata` (`data.py:952`) calls it, so changing a dataset's metadata drops its conversions and the next request starts a new converter job.

## 12. Tests

### 12.1 Unit Tests

**`test/unit/app/tools/test_data_parameters.py`**:
- `test_field_implicit_conversion_new` (`:93`): Tests "(as tabular)" display when not yet converted
- `test_field_implicit_conversion_existing` (`:103`): Tests using existing converted HDA

**`test/unit/app/tools/test_dataset_matcher.py`**:
- `test_valid_hda_implicit_convered` (`:46`): Tests matching already-converted dataset
- `test_hda_match_implicit_can_convert` (`:59`): Tests matching when conversion needed
- `test_hda_match_properly_skips_conversion` (`:71`): Tests `check_implicit_conversions=False`

### 12.2 API / Integration Tests

- `lib/galaxy_test/api/test_users.py:616-630` `test_custom_build_from_unconvertible_dataset` covers the `NoConverterException` → 400 path of custom builds only. There's no API test for the successful FASTA custom build (it 500s with an API key; #24529 includes the red test).
- No API test exercises `GET /api/datasets/{id}/converted/{ext}`. The API test suite authenticates with API keys, so such a test would hit the section 4.4 assertion for any conversion that doesn't exist yet.
- Implicit conversion as a tool input is covered in tool-execution API tests (`lib/galaxy_test/api/test_tools.py`, `test_tool_execute.py`).
- `lib/galaxy_test/selenium/test_custom_builds.py` covers the FASTA custom build through the browser, which has a current history.

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
        │    │     │    NO  → get_converted_dataset(history=job history)
        │    │
        │    NO → Error or Fallback
        │
        ▼
get_converted_dataset(trans, target_ext, history=?)
        │
        ▼
converter.execute(history=?) ── history None ──► trans.get_history(create=True)
        │                                         (None for API-key → assert fails)
        ▼
original_hda.attach_implicitly_converted_dataset(converted_hda)
        │
        ▼
Create ImplicitlyConvertedDatasetAssociation Link
        │
        ▼
Return converted_hda (visible=False, parent's HID copied)
```

## 14. Key Files Summary

| File | Lines | Purpose |
|------|-------|---------|
| `lib/galaxy/model/__init__.py` | 5880-6020, 6135-6185, 6393, 7363-7459 | Conversion methods, datasources, association model |
| `lib/galaxy/datatypes/data.py` | 893-947 | `convert_dataset()` implementation |
| `lib/galaxy/datatypes/registry.py` | 318-319, 702-722, 943-1023 | Converter registration and discovery |
| `lib/galaxy/tools/actions/__init__.py` | 199-247, 447-455, 496-536 | Conversion trigger, history fallback, `assert history` |
| `lib/galaxy/tools/__init__.py` | 2593-2619, 3278-3279 | `Tool.execute`, `get_default_history_by_trans` |
| `lib/galaxy/work/context.py` | 67-68 | `WorkRequestContext.get_history` (ignores `create`) |
| `lib/galaxy/webapps/base/webapp.py` | 934-992 | Legacy `get_history` / `get_or_create_default_history` |
| `lib/galaxy/tools/parameters/basic.py` | 2895-2945 | UI parameter building with conversion display |
| `lib/galaxy/tools/parameters/dataset_matcher.py` | 120-186, 234 | Dataset matching logic |
| `lib/galaxy/webapps/galaxy/api/tools.py` | 924-974 | Explicit conversion endpoint |
| `lib/galaxy/webapps/galaxy/services/datasets.py` | 882-993, 1048-1069 | `/converted` endpoints, features search |
| `test/unit/app/tools/test_data_parameters.py` | 93-110 | Unit tests |
| `test/unit/app/tools/test_dataset_matcher.py` | 46-80 | Matcher unit tests |

## 15. Caller Catalogue

### 15.1 `get_converted_dataset` callers

"No-history safe" means safe when the request has no current history (API-key request, or a session without one) **and** the conversion doesn't exist yet. Every caller is safe while an existing conversion satisfies the request.

| Caller | Passes `history=`? | Reached from | No-history safe? |
|---|---|---|---|
| `tools/actions/__init__.py:213` `process_dataset` | yes, the job's target history | every tool run with an implicitly converted input | **Yes** |
| `model/__init__.py:5950` (recursive deps in `get_converted_dataset`) | forwards caller's value | any caller | inherits |
| `model/__init__.py:5915` `get_converted_dataset_deps` | no (no parameter) | `visualization/data_providers/registry.py:114` | **No** |
| `model/__init__.py:6173` `DatasetInstance.convert_dataset` (via `get_datasources`, `:6135-6160`) | no | `GET /api/datasets/{id}?data_type=converted_datasets_state` (`services/datasets.py:1010-1046`); legacy `_get_genome_data` (`webapps/base/controller.py:560`) | **No** |
| `webapps/galaxy/api/users.py:580-581` `add_custom_builds` (FASTA → `len` → `linecount`) | no | `PUT /api/users/{user_id}/custom_builds/{key}` with `len|type=fasta` | **No**. #24529 (open); catches only `NoConverterException` |
| `managers/dbkeys.py:143` `GenomeBuilds.get_chrom_info` (custom build's FASTA → `len`) | no | `ToolExecutionCache.get_chrom_info` (`tools/execution_helpers.py:28-42`) from `DefaultToolAction.execute` (`actions/__init__.py:566`) when an input's dbkey is a FASTA-defined custom build | **No** on legacy `POST /api/tools` with an API key (trans has no history even though the job does). Safe for `POST /api/jobs` tool requests and workflow scheduling (`WorkRequestContext` carries the target history). Only fires when the build's `len` conversion is missing, e.g. after metadata changes cleared it (section 11.4) |
| `visualization/genomes.py:322-323` `Genomes.chroms` (FASTA → `len`, `twobit`) | no | `GET /api/genomes/{id}` (`managers/genomes.py:45-55`); legacy `_get_genome_data` | **No** |
| `visualization/genomes.py:398,402` `Genomes.reference` (`convert_dataset` then `get_converted_dataset` → `twobit`) | no | `GET /api/genomes/{id}?reference=true`, `GET /api/genomes/{id}/sequences`; `_data` for SAM/BAM (`services/datasets.py:1156`) | **No** |
| `visualization/data_providers/registry.py:113` `get_data_provider(name=...)` | no | `GET /api/datasets/{id}?data_type=data` / `raw_data` / `converted_datasets_state` with a chrom (`services/datasets.py:1039,1141,1198,1210,1218`) | **No** |
| `webapps/galaxy/services/datasets.py:984` `_get_or_create_converted` | no | `GET /api/datasets/{id}/converted/{ext}` | **No** |
| `webapps/galaxy/services/datasets.py:1063` `_search_features` (→ `fli`) | no | `GET /api/datasets/{id}?data_type=features` | **No** |

Related callers that run a converter without `get_converted_dataset`:
- `datatypes/display_applications/parameters.py:174-182` (`DisplayApplicationDataParameter.prepare`) calls `datatype.convert_dataset(..., history=data.history)`. That is the dataset's own history, so it's **safe** without a current history. External display sites hit it without a session.
- `webapps/galaxy/controllers/dataset.py:403` (legacy edit-attributes "conversion" operation) calls `datatype.convert_dataset(trans, data, target_type)` with no history, so the converted dataset goes to the session's current history. It's browser-session only in practice.
- `POST /api/tools/{tool_id}/convert` resolves an explicit owned history (section 7.1). It's **safe**.

### 15.2 Read-only lookups (`get_converted_files_by_type`, `implicitly_converted_datasets`, destination finder)

These never start a job, so history doesn't matter:
- `registry.find_conversion_destination_for_dataset_by_extensions` (`registry.py:1016`). Called from `Data.find_conversion_destination` (`data.py:889`), `dataset_matcher.py:234` and `basic.py:2259` (extension-only, no dataset), and `display_applications/parameters.py:152,175`.
- `display_applications/parameters.py:128-135` walks `data.implicitly_converted_datasets` looking for a metadata file. `:149` calls `get_converted_files_by_type(ext)`.
- `managers/datasets.py:797-810` `serialize_converted_datasets` (`/converted` map, and the `converted` serializer key at `:699`).
- `services/datasets.py:985` re-reads with `get_converted_files_by_type` after creating.
- `datatypes/sequence.py:809` FASTQ `split` looks for an `fqtoc` conversion, walking back through `copied_from_library_dataset_dataset_association`.
- `model/__init__.py:6467-6474` `clear_associated_files`.

### 15.3 Proposed fix for the custom-build caller (not merged)

#24529 proposes passing an explicit `history=` to both `users.py` calls: the FASTA's own history when the requesting user owns it, otherwise `trans.history` or the user's most recent history. `add_custom_builds` checks the FASTA only with `hda_manager.get_accessible`, so a FASTA in someone else's shared history must not receive the conversion job. This is **proposed** at this SHA. The other "No" rows in 15.1 have the same latent shape and no tracking issue. See `vault/agents/gx_research/research_issues/implicit-conversion-no-history-callers.md`.

## 16. Which object is access-checked

- **Tool-input path**: `process_dataset` swaps in the converted HDA (existing or new) and then runs `can_access_dataset(current_user_roles, data.dataset)` on it (`actions/__init__.py:237-242`). Admins bypass. `DataToolParameter.from_json` has no separate check. Converted HDAs get their own `Dataset` and permissions from the converter job's inputs when they are created.
- **Non-tool callers** check the **original** dataset with the manager before converting: `hda_manager.get_accessible` in `add_custom_builds`, `converted_ext` and `converted`; `dataset_manager.get_accessible` in `DatasetsService.show`. They then return or read the existing or new conversion without checking it separately.
- `get_converted_files_by_type` itself has no user context; it returns the first valid association.
- `Genomes.chroms` / `reference` and `GenomeBuilds.get_chrom_info` load the custom build's FASTA by id from user preferences.

For choosing a helper for a related dataset reached through a relationship, see [[Component - Dataset and Collection Access Checks]].

## 17. Open Questions

1. **Purging strategy**: When are implicitly converted datasets purged vs kept?
2. **Collection conversions**: How do implicit conversions work with dataset collections?
3. **Security model**: Partly answered in section 16 (which object each caller gates) and in [[Component - Dataset and Collection Access Checks]].
4. **Workflow extraction**: How does current extraction handle implicit conversions when HID has multiple datasets, and when a conversion borrowed a foreign HID (section 9)?
5. **Performance**: What's the overhead of conversion discovery for large histories?
