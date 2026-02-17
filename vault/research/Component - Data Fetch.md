---
type: research
subtype: component
tags: [research/component, galaxy/api, galaxy/client, galaxy/datasets]
status: draft
created: 2026-02-13
revised: 2026-02-13
revision: 1
ai_generated: true
---

# Galaxy Data Fetch API - Deep Dive

Research document covering the data fetch/import API, download mechanisms, modeling, testing, and the landing system.

**Starting point**: [PR #20592 - Implement Data Landing Requests](https://github.com/galaxyproject/galaxy/pull/20592)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [The `__DATA_FETCH__` Tool](#the-__data_fetch__-tool)
3. [Pydantic Schema (`fetch_data.py`)](#pydantic-schema)
4. [Backend Pipeline](#backend-pipeline)
5. [Client API Layer](#client-api-layer)
6. [Client Composables](#client-composables)
7. [Landing System](#landing-system)
8. [Fetch Models (Table ↔ Request Conversion)](#fetch-models)
9. [Workbook Generation](#workbook-generation)
10. [Download / Export (Outbound)](#download--export)
11. [Collections vs Datasets](#collections-vs-datasets)
12. [Testing](#testing)
13. [Key Files Index](#key-files-index)

---

## Architecture Overview

The data fetch system is Galaxy's mechanism for importing data from external sources. It is **not** a traditional REST "fetch" of existing data - it is an **import pipeline** that brings data into Galaxy histories from URLs, pasted content, files, FTP, server directories, and archives.

```
External Source  →  /api/tools/fetch  →  __DATA_FETCH__ tool job  →  HDA(s) or HDCA in history
     (url, paste,     (validation &        (sniffing, hashing,       (datasets or
      file, ftp,       normalization)        decompression,            collections)
      server_dir)                            type detection)
```

Three layers:
- **API Layer** (`api/tools.py`) - HTTP endpoints, content-type routing (JSON vs multipart)
- **Service Layer** (`services/tools.py`) - Validation, normalization, payload construction
- **Tool Backend** (`tools/data_fetch.py`) - Actual file fetching, decompression, type detection

---

## The `__DATA_FETCH__` Tool

The fetch API is a **thin wrapper around a special internal tool** called `__DATA_FETCH__`. This tool:

- Is in the `PROTECTED_TOOLS` list - cannot be called directly via `/api/tools`
- Must be invoked through `/api/tools/fetch` which enforces extra security
- Runs as a Galaxy job (queued, executed, tracked like any tool job)
- Produces outputs that become HDAs or HDCAs in the target history

The key insight: fetch requests are **tool executions**. The service layer (`create_fetch`) constructs a tool payload:

```python
# services/tools.py:create_fetch()
create_payload = {
    "tool_id": "__DATA_FETCH__",
    "history_id": history_id,
    "inputs": {
        "request_version": "1",
        "request_json": request,       # the normalized fetch targets
        "file_count": str(len(files_payload)),
    },
}
```

---

## Pydantic Schema

**File**: `lib/galaxy/schema/fetch_data.py`

### Source Types (`Src` enum)
- `url` - HTTP/HTTPS/FTP URLs (also file:// converted to path by validator)
- `pasted` - Inline text content
- `files` - Multipart file upload
- `path` - Server filesystem path (admin only)
- `composite` - Multi-file composite datasets
- `ftp_import` - User FTP directory
- `server_dir` - Admin-configured server directory

### Destination Types (`DestinationType` enum)
- `hdas` - Individual history datasets
- `hdcas` / `hdca` - History dataset collection
- `library` - Create new library (converted to library_folder internally)
- `library_folder` - Existing library folder

### Data Element Models

`BaseDataElement` carries per-file metadata:
- `name`, `ext` (default "auto"), `dbkey` (default "?")
- `info`, `tags`, `description`
- `space_to_tab`, `to_posix_lines`, `deferred`
- `auto_decompress`
- Hash fields: `MD5`, `SHA1`, `SHA256`, `SHA512`, `hashes[]`
- `extra_files` - companion files for composite types
- `items_from` / `elements_from` - expand from archive/directory/bagit
- `row` - sample sheet row metadata (for collection semantics)

Concrete element types discriminated by `src`:
- `FileDataElement` (src="files")
- `PastedDataElement` (src="pasted", requires `paste_content`)
- `UrlDataElement` (src="url", requires `url`, optional `headers`)
- `PathDataElement` (src="path", requires `path`)
- `ServerDirElement` (src="server_dir")
- `FtpImportElement` (src="ftp_import")
- `CompositeDataElement` (src="composite", has nested elements)
- `NestedElement` - recursive nesting for collection structure

### Target Models

Two axes: destination type × element specification:

| | Inline Elements | Elements From Source |
|---|---|---|
| **HDAs** | `DataElementsTarget` | `DataElementsFromTarget` |
| **HDCA** | `HdcaDataItemsTarget` | `HdcaDataItemsFromTarget` |
| **FTP→HDCA** | - | `FtpImportTarget` |

Collection targets (`BaseCollectionTarget`) additionally carry:
- `collection_type` - e.g. "list", "paired", "list:paired"
- `tags` - collection-level tags
- `name` - collection name
- `column_definitions` - sample sheet column defs
- `rows` - sample sheet row metadata (keyed by element name)

### Top-Level Payloads

```python
class FetchDataPayload(BaseDataPayload):
    targets: Targets          # list of any target type
    history_id: DecodedDatabaseIdField
    landing_uuid: Optional[UUID4]   # links to landing request

class FetchDataFormPayload(BaseDataPayload):
    targets: Union[Json[Targets], Targets]  # allows JSON string in form data
```

---

## Backend Pipeline

### 1. API Endpoint (`api/tools.py`)

Two routes for `POST /api/tools/fetch`:
- **JSON route** (`JsonApiRoute`) - accepts `FetchDataPayload`
- **Form data route** (`FormDataApiRoute`) - accepts `FetchDataFormPayload` + uploaded files

Both delegate to `service.create_fetch()`.

### 2. Validation (`services/_fetch_util.py:validate_and_normalize_targets`)

Walks all `src` entries in the target tree and:
- Converts `file://` URLs → `path` src (requires admin)
- Converts `server_dir` → resolved `path` (validates config)
- Converts `ftp_import` → resolved `path` (walks user FTP dir, checks symlinks)
- Validates URL format for `http://`, `https://`, `ftp://`, `ftps://`
- Validates against `fetch_url_allowlist_ips` for non-local URLs
- Sets `purge_source` and `in_place` flags per Galaxy config
- Validates datatype extensions
- Applies `replace_request_syntax_sugar()` on targets

### 3. Service Processing (`services/tools.py:create_fetch`)

- Pops `history_id` from payload
- Handles multipart files → temp files → `FilesPayload` entries
- Sets `check_content` from config
- Calls `validate_and_normalize_targets()`
- Constructs `__DATA_FETCH__` tool run payload
- Delegates to `_create()` which runs the tool

### 4. Tool Execution (`tools/data_fetch.py:do_fetch`)

Runs as a Galaxy job. The `do_fetch()` function:

1. Reads JSON request from file
2. For each target:
   - Expands `elements_from` (archive → decompress → list files; directory → list; bagit → resolve)
   - Propagates `rows` dict to individual elements as `row` field
   - For each element, `_resolve_item()`:
     - Handles composite datasets (auto_primary_file pattern)
     - For regular items (`_resolve_item_with_primary()`):
       - Resolves src to local path (downloads URLs, resolves FTP, etc.)
       - Validates hash checksums if provided
       - Runs `handle_upload()` - type sniffing, conversion, grooming
       - Manages extra_files (companion files)
       - Sets deferred state if applicable
3. Writes `galaxy.json` with all resolved outputs

Key functions:
- `_has_src_to_path()` - resolves any src type to a local filesystem path
- `_decompress_target()` - extracts archives, respects `fuzzy_root`
- `elements_tree_map()` - applies function across nested element tree
- `_directory_to_items()` - walks directory into element list

---

## Client API Layer

### TypeScript Types (`client/src/api/tools.ts`)

Types re-exported from OpenAPI schema:
```typescript
export type FetchDataPayload = components["schemas"]["FetchDataPayload"];
export type HdcaUploadTarget = components["schemas"]["HdcaDataItemsTarget"];
export type HdasUploadTarget = components["schemas"]["DataElementsTarget"];
export type FileDataElement, PastedDataElement, UrlDataElement, CompositeDataElement, ...
```

Helper constructors:
- `urlDataElement(identifier, uri)` - creates UrlDataElement with defaults
- `nestedElement(identifier, elements)` - creates NestedElement wrapper

API call functions:
- `fetchDatasetsToJobId(payload)` - POST /api/tools/fetch, returns job ID
- `fetchDatasets(payload, callbacks)` - POST /api/tools/fetch with callback pattern

```typescript
// FetchDataResponse - not yet fully modeled in FastAPI
interface FetchDataResponse {
    jobs: { id: string }[];
    outputs?: Record<string, unknown>;
}
```

Note: [Issue #20227](https://github.com/galaxyproject/galaxy/issues/20227) tracks broken TypeScript types around the fetch API.

---

## Client Composables

### `useFetchJobMonitor()` (`client/src/composables/fetch.ts`)

Primary composable for tracking fetch operations:

```typescript
const { fetchAndWatch, fetchComplete, fetchError, waitingOnFetch, job } = useFetchJobMonitor();

// 1. Submit fetch and start watching
await fetchAndWatch(payload);
// 2. Reactively tracks job state via useJobWatcher → useResourceWatcher
// 3. fetchComplete becomes true when job reaches terminal state
// 4. fetchError populated if job fails (extracts stderr messages)
```

Internally uses `useJobWatcher(jobId)` which:
- Polls job status via `useResourceWatcher` (interval-based)
- Stops polling when job reaches terminal state
- Terminal states: `ok`, `empty`, `deferred`, `discarded`, `paused`, `error`, `failed_metadata`
- Error states: `error`, `failed_metadata`

Error message extraction (`fetchJobErrorMessage`):
- Checks stderr for known patterns (e.g. "binary file contains inappropriate content")
- Falls back to generic error for ERROR_STATES without stderr

---

## Landing System

PR #20592 introduced **data landing requests** - pre-configured import forms that can be shared via URL.

### Concept

A "landing" is a pre-populated tool/fetch form. External systems create a landing request with desired parameters, receive a URL, and share it with users. When a user visits the URL, they see a reviewable/editable version of the request and can execute it.

### Landing Types

| Type | Endpoint | Schema |
|---|---|---|
| Tool | `/api/tool_landings` | `CreateToolLandingRequestPayload` |
| Workflow | `/api/workflow_landings` | `CreateWorkflowLandingRequestPayload` |
| Data (fetch) | `/api/data_landings` | `CreateDataLandingPayload` |
| File/Collection | `/api/file_landings` | `CreateFileLandingPayload` |

Data and File landings are both converted internally to `__DATA_FETCH__` tool landing requests:

```python
# data_landing_to_tool_landing:
CreateToolLandingRequestPayload(
    tool_id="__DATA_FETCH__",
    request_state={"request_version": "1", "request_json": {"targets": ...}},
)
```

### Landing Flow

1. **Create**: External system POSTs to `/api/data_landings` with targets
2. **Share**: Gets back UUID, constructs URL: `{galaxy}/tool_landings/{uuid}?secret=...`
3. **Claim**: User visits URL, frontend loads landing state
4. **Review**: `FetchLanding.vue` renders editable table UI via `FetchGrids`
5. **Execute**: User clicks Import, modified targets sent to `/api/tools/fetch`

### Client (`landing.py` script)

Utility for creating landings from YAML catalogs:
```bash
. .venv/bin/activate
PYTHONPATH=lib python lib/galaxy/tool_util/client/landing.py -g http://localhost:8081 upload
```

Reads from `landing_library.catalog.yml` which contains sample landing templates.

### Landing Security

- Optional `client_secret` for verification
- `public` flag for anonymous access
- `origin` field for CORS
- Sensitive headers (Authorization, API-Key) are vault-encrypted

---

## Fetch Models

**File**: `client/src/components/Landing/fetchModels.ts`

Bidirectional conversion between fetch API targets and editable table rows. Used by the landing UI.

### Target → Table (`fetchTargetToTable`)

1. **Column derivation** (`fetchTargetToTableColumns`):
   - Collection type → identifier columns (list_identifiers, paired_identifier, etc.)
   - Element properties → data columns (url, file_type, dbkey, hashes, tags, etc.)
   - Canonical column ordering defined

2. **Row generation** (`fetchTargetToRows`):
   - Flattens nested elements into rows
   - Parent identifiers propagated through nesting levels
   - Each URL element becomes one row

### Table → Target (`tableToRequest`)

Reconstructs nested element structure from flat rows:
- For collections: rebuilds nesting based on collection_type parts and identifier columns
- For datasets: each row becomes a UrlDataElement
- Preserves auto_decompress at target level

### Round-Trip Property

Tests verify that `tableToRequest(fetchTargetToTable(target))` produces equivalent output - this is critical for the landing UI's edit-then-submit flow.

---

## Workbook Generation

Fetch supports Excel workbook-based batch import:

### Endpoints
- `GET /api/tools/fetch/workbook` - Generate template workbook
  - Query params: `type` (datasets|collection), `collection_type` (list|paired|...)
- `POST /api/tools/fetch/workbook/parse` - Parse uploaded workbook

### Implementation
- `lib/galaxy/tools/fetch/workbooks.py` - generation and parsing logic
- `lib/galaxy/model/dataset_collections/workbook_util.py` - workbook byte conversion
- Uses openpyxl for Excel file generation
- Column headers inferred from collection type and workbook type
- Supports sample sheet metadata columns

---

## Download / Export (Outbound)

Separate from the import/fetch system, Galaxy has download/export mechanisms:

### Dataset Download

**Endpoint**: `GET /api/datasets/{id}/display`
- Streams individual files
- Supports `preview`, `raw`, `to_ext` (conversion), chunked reading (`offset`, `ck_size`)
- Returns via datatype's `display_data()` method
- Additional: `/api/datasets/{id}/get_content_as_text`, `/api/datasets/{id}/extra_files/...`

### Collection Download

**Endpoint**: `GET /api/dataset_collections/{hdca_id}/download`
- Streams as ZIP archive via `ZipstreamWrapper`
- Maintains collection directory structure
- Filters non-OK, purged, inaccessible datasets
- **Async variant**: `POST .../prepare_download` → Celery task → short-term storage

### History Export

**Endpoints**:
- `POST /api/histories/{id}/prepare_store_download` - async export to short-term storage
- `POST /api/histories/{id}/write_store` - export to file source (remote storage)
- Formats: `rocrate.zip`, `tar.gz`

### Short-Term Storage Pattern

Client composables for async downloads:
1. `useShortTermStorage()` - initiate preparation
2. `useShortTermStorageMonitor()` - poll readiness (10s interval, 24h expiry)
3. `useDownloadTracker()` / `usePersistentProgressMonitor()` - localStorage-backed progress
4. Download when READY state reached

---

## Collections vs Datasets

### Import Differences

| Aspect | Datasets (hdas) | Collections (hdca) |
|---|---|---|
| Destination | `{"type": "hdas"}` | `{"type": "hdca"}` |
| Elements | Flat list of data elements | Can be nested via `NestedElement` |
| Collection type | N/A | Required: `list`, `paired`, `list:paired`, etc. |
| Naming | Per-element `name` | Collection-level `name` + element identifiers |
| Sample sheets | N/A | `column_definitions`, `rows` |
| Expansion | Per-element `items_from` | Target-level or element-level `elements_from` |
| Target model | `DataElementsTarget` | `HdcaDataItemsTarget` |

### Download Differences

| Aspect | Datasets | Collections |
|---|---|---|
| Endpoint | `/api/datasets/{id}/display` | `/api/dataset_collections/{id}/download` |
| Format | Raw file stream | ZIP archive |
| Async option | N/A | `prepare_download` → short-term storage |
| Conversion | `to_ext` parameter | N/A |
| Chunking | `offset` + `ck_size` | N/A |

### Client Store Differences

| Aspect | Datasets | Collections |
|---|---|---|
| Store | `useDatasetStore()` | `useCollectionElementsStore()` |
| Cache pattern | `useKeyedCache` by dataset ID | Custom pagination-aware store |
| Fetch | Single `fetchDatasetDetails()` | Paginated `fetchCollectionElements()` (limit 50) |
| Detail views | `HDADetailed` | `HDCADetailed` + lazy element loading |

---

## Testing

### Unit Tests

**`test/unit/webapps/api/test_fetch_schema.py`**
- Validates Pydantic schema parsing for various payload shapes
- Pasted content, URL data, file uploads, mixed payloads
- Auto-decompression flag, library destinations
- Form data (stringified JSON targets)

**`test/unit/app/tools/test_fetch_workbooks.py`**
- Workbook generation and parsing round-trips
- Column header inference from collection types
- Sample sheet metadata preservation

**`client/src/components/Landing/fetchModels.test.ts`**
- Target → table → target round-trip for all supported target types
- Column derivation for various element configurations
- Nested paired collection handling
- Error cases (unsupported collection types, missing URLs)
- Hash, tag, and metadata preservation through conversion

### API Tests (Integration)

**`lib/galaxy_test/api/test_tools_upload.py`** (~1162 lines)
- Comprehensive fetch API coverage:
  - All source types (pasted, URL, file, composite, deferred)
  - Upload options (to_posix_lines, space_to_tab, auto_decompress)
  - Type detection and format handling (CSV, TSV, BAM, etc.)
  - Archive extraction (tar, zip, recursive)
  - Hash verification
  - Composite datatypes (velvet, pbed, isa-tab)
  - Metadata (tags, dbkey, info)
  - Base64 encoded URLs
  - Job abort support

**`lib/galaxy_test/api/test_landing.py`** (~813 lines)
- Tool, workflow, data, and file landing create/claim/use flows
- Public vs private access patterns
- CORS handling
- Sample sheet metadata preservation through landing execution
- TRS source metadata tracking
- Encrypted header handling

### Integration Tests

**`test/integration/test_landing_requests.py`**
- Encrypted headers in landing requests
- Vault requirement validation
- Sensitive header detection

### Selenium Tests

**`lib/galaxy_test/selenium/test_uploads.py`**
- UI upload workflow tests (composite datasets, pasted data)
- Limited coverage of fetch-specific UI

---

## Key Files Index

### Backend
| File | Purpose |
|---|---|
| `lib/galaxy/schema/fetch_data.py` | Pydantic models for fetch payloads |
| `lib/galaxy/webapps/galaxy/api/tools.py` | API endpoints (fetch, landing, workbook) |
| `lib/galaxy/webapps/galaxy/services/tools.py` | Service layer (validation, tool invocation) |
| `lib/galaxy/webapps/galaxy/services/_fetch_util.py` | Target validation and normalization |
| `lib/galaxy/tools/data_fetch.py` | Backend processor (downloads, sniffs, resolves) |
| `lib/galaxy/tools/actions/upload.py` | Upload action handlers |
| `lib/galaxy/tools/fetch/workbooks.py` | Workbook generation/parsing |
| `lib/galaxy/managers/landing.py` | Landing request manager |
| `lib/galaxy/managers/hdcas.py` | Collection archive streaming |
| `lib/galaxy/tool_util/client/landing.py` | Landing creation utility script |
| `lib/galaxy/tool_util/client/landing_library.catalog.yml` | Sample landing templates |
| `lib/galaxy/schema/terms.yml` | Help text terms for fetch fields |

### Client
| File | Purpose |
|---|---|
| `client/src/api/tools.ts` | TypeScript types and API functions |
| `client/src/composables/fetch.ts` | `useFetchJobMonitor` composable |
| `client/src/components/Landing/FetchLanding.vue` | Landing import UI |
| `client/src/components/Landing/FetchGrids.vue` | Multi-target grid container |
| `client/src/components/Landing/FetchGrid.vue` | Single target editable table |
| `client/src/components/Landing/fetchModels.ts` | Table ↔ request conversion |
| `client/src/components/Landing/gridHelpers.ts` | Grid utilities |
| `client/src/stores/toolLandingStore.ts` | Landing state management |
| `client/src/stores/jobStore.ts` | Job tracking (includes fetch jobs) |
| `client/src/composables/shortTermStorage.ts` | Async download initiation |
| `client/src/composables/shortTermStorageMonitor.ts` | Download polling |

### Tests
| File | Purpose |
|---|---|
| `test/unit/webapps/api/test_fetch_schema.py` | Schema validation |
| `test/unit/app/tools/test_fetch_workbooks.py` | Workbook round-trips |
| `client/src/components/Landing/fetchModels.test.ts` | Table ↔ request round-trips |
| `lib/galaxy_test/api/test_tools_upload.py` | API integration tests |
| `lib/galaxy_test/api/test_landing.py` | Landing API tests |
| `test/integration/test_landing_requests.py` | Landing + vault integration |
| `test/unit/app/managers/test_landing.py` | Landing manager unit tests |

---

## Unresolved Questions

- `FetchDataResponse` not fully modeled in FastAPI route ([Issue #20227](https://github.com/galaxyproject/galaxy/issues/20227)) - when will this be fixed?
- How does resumable upload interact with the fetch API? (separate `resumable_upload.py` exists)
- What collection types are NOT tabularizable in the landing UI? (PR mentions "esoteric" types)
- How does `link_data_only` interact with file sources that `prefer_links()`?
- Is there a plan to support editing non-URL src types (pasted, files) in the landing table UI?
