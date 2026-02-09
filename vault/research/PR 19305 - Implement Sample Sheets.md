---
type: research
subtype: pr
tags:
  - research/pr
  - galaxy/collections
  - galaxy/api
  - galaxy/client
  - galaxy/models
  - galaxy/tools
  - galaxy/workflows
  - galaxy/testing
status: draft
created: 2026-02-09
revised: 2026-02-09
revision: 1
ai_generated: true
github_pr: 19305
github_repo: galaxyproject/galaxy
galaxy_areas:
  - collections
  - api
  - client
  - models
  - tools
  - workflows
  - testing
---

# Research: Galaxy PR #19305 - Implement Sample Sheets

**PR**: https://github.com/galaxyproject/galaxy/pull/19305
**Branch**: `sample_sheets` -> `dev`
**Merged**: 2025-07-30
**Stats**: 113 files changed, +6504 / -235
**Implements**: Issue #19085

---

## Overview

### Problem

Bioinformatics workflows (e.g. ChIP-seq) require complex "sample sheets" that encode per-sample metadata not captured by Galaxy's existing simple list/paired collection types. Without this, users had to either:
- Upload tabular files alongside lists, losing the structural connection between datasets and their metadata
- Manually encode metadata in file naming conventions

### Solution

This PR introduces a new `sample_sheet` collection type that attaches typed, validated, columnar metadata to each element of a dataset collection. Sample sheets extend the existing collection system with:

1. **`column_definitions`** on `DatasetCollection` -- a JSON column defining the schema (column name, type, validators, restrictions, default values)
2. **`columns`** on `DatasetCollectionElement` -- a JSON column storing each element's row of metadata values
3. **New collection types**: `sample_sheet`, `sample_sheet:paired`, `sample_sheet:paired_or_unpaired`, `sample_sheet:record`
4. **Workbook (XLSX/CSV/TSV) generation and parsing** -- users can download spreadsheets, fill them in externally, and upload them back
5. **Workflow editor UI** for defining column schemas on collection inputs
6. **Wizard-based collection creator** for interactively building sample sheets from URIs, pasted data, existing collections, or uploaded workbooks
7. **AG Grid-based spreadsheet UI** for in-browser editing of sample sheet metadata
8. **Rule Builder integration** -- new `add_column_from_sample_sheet_index` rule for using sample sheet metadata in the Apply Rules tool
9. **`__SAMPLE_SHEET_TO_TABULAR__` tool** -- converts sample sheet metadata to a tabular dataset for downstream use

---

## Database Migration

**File**: `lib/galaxy/model/migrations/alembic/versions_gxy/3af58c192752_implement_sample_sheets.py`
**Revision**: `3af58c192752`, depends on `338d0e5deb03`

Adds two JSON columns:
- `dataset_collection.column_definitions` -- stores `SampleSheetColumnDefinitions` (list of column definition dicts)
- `dataset_collection_element.columns` -- stores `SampleSheetRow` (list of column values for that element)

Both are nullable with default `None`, so existing collections are unaffected.

**Status in codebase**: EXISTS, unchanged.

---

## Architecture

### Data Model Flow

```
Workflow Input Definition
  -> collection_type = "sample_sheet:paired"
  -> column_definitions = [{name, type, optional, description, validators, restrictions, suggestions, default_value}, ...]

Collection Creation (API or fetch)
  -> DatasetCollection.column_definitions = column_definitions
  -> DatasetCollectionElement.columns = [value1, value2, ...] (one per element)

Downstream tool usage
  -> DatasetCollectionWrapper.sample_sheet_row(element_identifier) returns the row
  -> Rule Builder: add_column_from_sample_sheet_index extracts metadata columns for rule-based operations
```

### API Flow

1. **Workflow author** defines `sample_sheet:paired` input with column definitions in workflow editor
2. **User running workflow** sees a wizard UI that lets them:
   - Select a source (remote files, paste URIs, upload workbook, select existing collection)
   - Auto-pair files if needed (for paired sample sheets)
   - Fill in metadata in an AG Grid spreadsheet
   - Download a pre-seeded workbook to fill in externally
3. **Submission** either:
   - Creates via fetch API (for URI-based imports): POST `/api/tools/fetch` with `column_definitions` on the target and `row` on each element
   - Creates via collection API (for existing datasets): POST `/api/dataset_collections` with `column_definitions` and `rows` on the payload

### Client Flow

```
FormDataWorkflowRunTabs.vue  (detects sample_sheet type)
  -> SampleSheetCollectionCreator.vue
    -> SampleSheetWizard.vue (multi-step wizard)
      Step 1: Select source (SourceFromRemoteFiles, SourceFromPastedData, SourceFromWorkbook, SourceFromCollection, etc.)
      Step 2: Source-specific input (folder selection, paste area, dataset selection, etc.)
      Step 3: Auto-pairing (for paired types)
      Step 4: Upload workbook (if workbook source)
      Step 5: SampleSheetGrid.vue (AG Grid spreadsheet for editing metadata)
        -> Submit: either fetch API or collection create API
```

---

## File Inventory

### Backend Model Layer

| File | Change | Exists |
|------|--------|--------|
| `lib/galaxy/model/__init__.py` | Added `column_definitions` (Mapped JSON) to `DatasetCollection`, `columns` (Mapped JSON) to `DatasetCollectionElement`. Updated `__init__`, `_base_to_dict`, `_serialize`, `dict_element_visible_keys`. | YES |
| `lib/galaxy/model/dataset_collections/types/sample_sheet.py` | **NEW**. `SampleSheetDatasetCollectionType` -- flat list of named elements with column metadata. `generate_elements()` validates rows against column_definitions. | YES |
| `lib/galaxy/model/dataset_collections/types/sample_sheet_util.py` | **NEW**. Core validation logic: `SampleSheetColumnDefinitionModel` (Pydantic), `validate_column_definitions()`, `validate_row()`, `validate_column_value()`. Validates types (int/float/string/boolean/element_identifier), restrictions, and safe validators. | YES |
| `lib/galaxy/model/dataset_collections/types/sample_sheet_workbook.py` | **NEW** (614 lines). Workbook generation and parsing for sample sheets. Key classes: `CreateWorkbookRequest`, `ParseWorkbook`, `ParsedWorkbook`, `CreateWorkbookForCollection`, `ParseWorkbookForCollection`. Functions: `generate_workbook_from_request()`, `generate_workbook_from_request_for_collection()`, `parse_workbook()`, `parse_workbook_for_collection()`. Generates XLSX with data validation, instructions sheet, column help. Parses XLSX/CSV/TSV back into structured data. | YES |
| `lib/galaxy/model/dataset_collections/workbook_util.py` | Extended with CSV/TSV support. Added `ReadOnlyWorkbook` protocol, `ExcelReadOnlyWorkbook`, `CsvReaderReadOnlyWorkbook`, `CsvDialect`, `ContentTypeMessage`, `CsvDialectInferenceMessage`, `parse_format_messages()`. `load_workbook_from_base64()` now detects file format (xlsx vs CSV/TSV via magic bytes). | YES |
| `lib/galaxy/model/dataset_collections/builder.py` | `build_collection()` and `set_collection_elements()` now accept `column_definitions` and `rows`. `CollectionBuilder` tracks `_current_row_data`, `get_level()` and `add_dataset()` accept `row` param. New `build_elements_and_rows()`. `BoundCollectionBuilder.populate_partial()` passes rows. | YES |
| `lib/galaxy/model/dataset_collections/registry.py` | Added `sample_sheet` module import and `SampleSheetDatasetCollectionType` to `PLUGIN_CLASSES`. | YES |
| `lib/galaxy/model/dataset_collections/rule_target_columns.py` | `column_titles_to_headers()` now returns `Tuple[List[HeaderColumn], List[InferredColumnMapping]]` (added inference logging). New `InferredColumnMapping` model. Accepts `column_offset` param. | YES |
| `lib/galaxy/model/dataset_collections/type_description.py` | Added `COLLECTION_TYPE_REGEX` validating all valid collection type strings including `sample_sheet*`. New `validate()` method on `CollectionTypeDescription`. | YES |
| `lib/galaxy/model/dataset_collections/adapters.py` | Added `columns` property (returns `None`) to adapter class for compatibility. | YES |
| `lib/galaxy/model/store/__init__.py` | `materialize_elements()` now passes `columns=element_attrs.get("columns")` to `DatasetCollectionElement`. | YES |
| `lib/galaxy/model/store/discover.py` | `_populate_elements()` tracks `rows` list, passes `row` to `get_level()` and `add_dataset()`. `persist_elements_to_hdca()` uses `BoundCollectionBuilder` with row support. `JsonCollectedDatasetMatch` gets `row` property. | YES |

### Backend Schema Layer

| File | Change | Exists |
|------|--------|--------|
| `lib/galaxy/schema/schema.py` | Added `SampleSheetColumnType` literal, `SampleSheetColumnValueT` union, `SampleSheetColumnDefinition` TypedDict, `SampleSheetColumnDefinitions`, `SampleSheetRow`, `SampleSheetRows` types. Added `columns` to `DCESummary`, `column_definitions` to `HDCADetailed`, `column_definitions`/`rows` to `CreateNewCollectionPayload`. | YES |
| `lib/galaxy/schema/fetch_data.py` | `BaseCollectionTarget` gets `column_definitions`. `BaseDataElement` gets `row`. | YES |

### Backend API / Services

| File | Change | Exists |
|------|--------|--------|
| `lib/galaxy/webapps/galaxy/api/dataset_collections.py` | **4 new endpoints**: `POST /api/sample_sheet_workbook` (create workbook), `POST /api/sample_sheet_workbook/parse` (parse workbook), `POST /api/dataset_collections/{hdca_id}/sample_sheet_workbook` (create workbook for collection), `POST /api/dataset_collections/{hdca_id}/sample_sheet_workbook/parse` (parse workbook for collection). Query params for base64 column definitions, prefix values, filename. | YES |
| `lib/galaxy/webapps/galaxy/services/dataset_collections.py` | New service methods: `create_workbook()`, `create_workbook_for_collection()`, `parse_workbook()`, `parse_workbook_for_collection()`. New models: `CreateWorkbookForCollectionApi`, `ParseWorkbookForCollectionApi`, `ParsedWorkbookHda`, `ParsedWorkbookCollection`, `ParsedWorkbookElement`, `ParsedWorkbookForCollection`. Helper: `_attach_elements_to_parsed_workbook()`. | YES |

### Backend Manager Layer

| File | Change | Exists |
|------|--------|--------|
| `lib/galaxy/managers/collections.py` | `create()` and `create_dataset_collection()` accept `column_definitions` and `rows`, pass to `builder.build_collection()`. `__init_rule_data()` accepts `parent_columns`, propagates `element.columns` into sources for rule builder. | YES |
| `lib/galaxy/managers/collections_util.py` | `api_payload_to_create_params()` extracts `column_definitions` and `rows`, calls `validate_column_definitions()`. | YES |

### Backend Workflow Layer

| File | Change | Exists |
|------|--------|--------|
| `lib/galaxy/workflow/modules.py` | `InputCollectionModule.validate_state()` validates collection_type using `COLLECTION_TYPE_DESCRIPTION_FACTORY`. `get_runtime_inputs()` passes `column_definitions` and `fields` to `DataCollectionToolParameter`. `_parse_state_into_dict()` extracts `column_definitions`. | YES |

### Backend Tools

| File | Change | Exists |
|------|--------|--------|
| `lib/galaxy/tools/sample_sheet_to_tabular.xml` | **NEW**. Tool `__SAMPLE_SHEET_TO_TABULAR__` -- converts sample sheet collection metadata to tabular. Uses Cheetah configfile template iterating `$input.keys()` and `$input.sample_sheet_row($key)`. Handles None, empty string, boolean replacements. | YES |
| `lib/galaxy/tools/wrappers.py` | `DatasetCollectionWrapper.__init__()` builds `self.__rows` dict mapping element_identifier to `columns`. New `sample_sheet_row()` method. | YES |
| `lib/galaxy/tools/data_fetch.py` | Passes `column_definitions` through to fetched target. Copies `row` from src_item to target_metadata. | YES |
| `lib/galaxy/tools/fetch/workbooks.py` | Updated to use `ReadOnlyWorkbook` protocol, `parse_format_messages()`, new `column_titles_to_headers()` return type. `_load_row_data()` uses workbook's `iter_rows()`. `FetchParseLog` type. | YES |
| `lib/galaxy/tools/parameters/basic.py` | `DataCollectionToolParameter.__init__()` reads `fields` and `column_definitions` from input_source. `to_dict()` includes them. | YES |

### Backend Utility Layer

| File | Change | Exists |
|------|--------|--------|
| `lib/galaxy/util/rules_dsl.py` | **NEW rule**: `AddColumnFromSampleSheetByIndex` -- extracts a column from `source["columns"]` by index and appends to row data. Registered in `RULES`. | YES |
| `lib/galaxy/util/rules_dsl_spec.yml` | Added test cases for `add_column_from_sample_sheet_index` rule (single and multiple columns). | YES |

### Backend Tool Util / CWL

| File | Change | Exists |
|------|--------|--------|
| `lib/galaxy/tool_util/client/staging.py` | `create_collection_func()` accepts optional `rows` param, passes to API payload. | YES |
| `lib/galaxy/tool_util/cwl/util.py` | New `CollectionCreateFunc` protocol with `rows` kwarg. `replacement_collection()` passes `rows` for sample_sheet types. | YES |
| `lib/galaxy/tool_util/parser/parameter_validators.py` | New `UnsafeValidatorConfiguredInUntrustedContext` exception (replaces bare assert). | YES |
| `lib/galaxy/tool_util_models/parameter_validators.py` | New `AnySafeValidatorModel` (union of Regex, InRange, Length validators only) and `DiscriminatedAnySafeValidatorModel` TypeAdapter. Used to restrict which validators sample sheet column definitions can use. | YES |

### Backend Config / Job Execution

| File | Change | Exists |
|------|--------|--------|
| `lib/galaxy/config/sample/tool_conf.xml.sample` | Added `<tool file="sample_sheet_to_tabular.xml" />` to sample tool conf. | YES |
| `lib/galaxy/job_execution/output_collect.py` | Minor change (passes through sample sheet context during output collection). | YES |

### Client API Layer

| File | Change | Exists |
|------|--------|--------|
| `client/src/api/datasetCollections.ts` | New types: `SampleSheetCollectionType`, `SampleSheetColumnValueT`, `CreateWorkbookForCollectionPayload`, `CreateWorkbookPayload`. New functions: `createWorkbook()`, `createWorkbookForCollection()`. | YES |
| `client/src/api/index.ts` | Exports `SampleSheetColumnDefinition`, `SampleSheetColumnDefinitionType`, `SampleSheetColumnDefinitions` from schema. | YES |
| `client/src/api/jobs.ts` | New exported constants: `NON_TERMINAL_STATES`, `ERROR_STATES`, `TERMINAL_STATES`. | YES |
| `client/src/api/tools.ts` | Extended fetch data types and fetch function to support sample sheet payloads. | YES |
| `client/src/api/schema/schema.ts` | Auto-generated schema updates for all new API types. | YES |

### Client Components -- Collection Creation

| File | Change | Exists |
|------|--------|--------|
| `client/src/components/Collections/SampleSheetCollectionCreator.vue` | **NEW**. Thin wrapper loading config then rendering `SampleSheetWizard`. Props: `collectionType`, `extendedCollectionType`, `extensions`. | YES |
| `client/src/components/Collections/SampleSheetWizard.vue` | **NEW** (499 lines). Multi-step wizard component orchestrating sample sheet creation. Uses `useWizard` composable. Steps: select-source, select-remote-files-folder, paste-data, select-dataset, select-collection, auto-pairing, upload-workbook, fill-grid. Manages source state, auto-pairing, workbook parsing, fetch job monitoring, and collection creation. | YES |
| `client/src/components/Collections/sheet/SampleSheetGrid.vue` | **NEW** (663 lines). AG Grid-based spreadsheet for editing sample sheet metadata. Generates dynamic column definitions from schema. Handles two modes: `uris` (creating from URIs) and `model_objects` (from existing collections). Builds fetch targets or collection create payloads. Supports drag-and-drop workbook upload. Includes extension/dbKey selectors and collection name input. | YES |
| `client/src/components/Collections/sheet/workbooks.ts` | **NEW** (114 lines). Client-side workbook utilities: `downloadWorkbook()`, `downloadWorkbookForCollection()`, `parseWorkbook()`, `withAutoListIdentifiers()`, `initialValue()`. | YES |
| `client/src/components/Collections/sheet/DownloadWorkbookButton.vue` | **NEW**. Small button component for downloading workbooks. | YES |
| `client/src/components/Collections/CollectionCreatorIndex.vue` | Modified to route sample_sheet collection types to `SampleSheetCollectionCreator`. | YES |

### Client Components -- Wizard Sources

| File | Change | Exists |
|------|--------|--------|
| `client/src/components/Collections/wizard/SourceFromRemoteFiles.vue` | **NEW**. Card for selecting remote files as source. | YES |
| `client/src/components/Collections/wizard/SourceFromPastedData.vue` | **NEW**. Card for pasting URI data. | YES |
| `client/src/components/Collections/wizard/SourceFromDatasetAsTable.vue` | **NEW**. Card for selecting a tabular dataset as source. | YES |
| `client/src/components/Collections/wizard/SourceFromWorkbook.vue` | **NEW**. Card for uploading a workbook file. | YES |
| `client/src/components/Collections/wizard/SourceFromCollection.vue` | **NEW**. Card for selecting an existing collection. | YES |
| `client/src/components/Collections/wizard/SelectCollection.vue` | **NEW**. Collection selection dialog for sample sheet wizard. | YES |
| `client/src/components/Collections/wizard/SelectDataset.vue` | **NEW**. Dataset selection for tabular source. | YES |
| `client/src/components/Collections/wizard/UploadSampleSheet.vue` | **NEW**. Upload interface for sample sheet workbooks. | YES |
| `client/src/components/Collections/wizard/CardDownloadWorkbook.vue` | **NEW**. Card with download workbook action. | YES |
| `client/src/components/Collections/wizard/fetchWorkbooks.ts` | **NEW**. Client-side workbook column title to target type mapping (`columnTitleToTargetType()`). | YES |
| `client/src/components/Collections/wizard/fetchWorkbooks.test.ts` | **NEW**. Tests for `columnTitleToTargetType`. | YES |
| `client/src/components/Collections/wizard/types.ts` | **NEW**. Type definitions: `InitialElements`, `PrefixColumnsType`, `RulesSourceFrom`, `ParsedFetchWorkbookColumn`, `AnyParsedSampleSheetWorkbook`. | YES |
| `client/src/components/Collections/wizard/rule_target_column_specification.yml` | **NEW**. YAML spec for rule target column titles. | YES |

### Client Components -- Pairing

| File | Change | Exists |
|------|--------|--------|
| `client/src/components/Collections/common/AutoPairing.vue` | Extended to support generic `HasName` type (not just `HistoryItemSummary`). | YES |
| `client/src/components/Collections/common/usePairingSummary.ts` | New composable for pairing summary text. | YES |
| `client/src/components/Collections/usePairing.ts` | Generic auto-pairing composable used by wizard. | YES |

### Client Components -- Workflow Editor

| File | Change | Exists |
|------|--------|--------|
| `client/src/components/Workflow/Editor/Forms/FormCollectionType.vue` | Added sample_sheet collection type options. Validates collection type string before emitting. | YES |
| `client/src/components/Workflow/Editor/Forms/FormColumnDefinition.vue` | **NEW** (269 lines). Form for editing a single column definition: name, type, description, restrictions/suggestions, optional flag, default value. Validates column names against reserved Galaxy column titles. | YES |
| `client/src/components/Workflow/Editor/Forms/FormColumnDefinitions.vue` | **NEW** (161 lines). Repeatable form for managing list of column definitions. Add/remove/reorder columns. Download example workbook button. | YES |
| `client/src/components/Workflow/Editor/Forms/FormColumnDefinitionType.vue` | **NEW** (53 lines). Select dropdown for column type (Text, Integer, Float, Boolean, Element Identifier). | YES |
| `client/src/components/Workflow/Editor/Forms/FormInputCollection.vue` | Extended to show `FormColumnDefinitions` when collection_type starts with `sample_sheet`. | YES |
| `client/src/components/Workflow/Editor/modules/collectionTypeDescription.ts` | Updated to handle sample_sheet collection types. | YES |
| `client/src/components/Workflow/Editor/modules/inputs.ts` | Updated input module to handle sample_sheet collection type metadata. | YES |

### Client Components -- Form Data / Workflow Run

| File | Change | Exists |
|------|--------|--------|
| `client/src/components/Form/Elements/FormData/FormData.vue` | Updated to detect sample_sheet collection types and route to sample sheet creator. | YES |
| `client/src/components/Form/Elements/FormData/FormDataWorkflowRunTabs.vue` | Tabs component updated for sample sheet collection type handling. | YES |
| `client/src/components/Form/Elements/FormData/collections.ts` | Collection type utilities updated for sample_sheet types. | YES |
| `client/src/components/Form/Elements/FormData/types.ts` | New `ExtendedCollectionType` type with `columnDefinitions` field. | YES |
| `client/src/components/Form/FormElement.vue` | Minor updates for sample sheet support. | YES |

### Client Components -- Rule Builder

| File | Change | Exists |
|------|--------|--------|
| `client/src/components/RuleCollectionBuilder.vue` | Added `add_column_from_sample_sheet_index` rule type to UI. Added `sampleSheetMetadataAvailable` computed property. Updated `populateElementsFromCollectionDescription()` to propagate `columns` from sample sheet elements. Updated metadata options to recognize sample_sheet types. Modernized fetch call to use typed API. | YES |
| `client/src/components/RuleBuilder/rule-definitions.js` | Added rule definition for `add_column_from_sample_sheet_index`. | YES |

### Client Components -- History / Other

| File | Change | Exists |
|------|--------|--------|
| `client/src/components/History/Content/Collection/CollectionDescription.vue` | Updated to display sample_sheet collection type descriptions. | YES |
| `client/src/components/History/CurrentHistory/HistoryOperations/SelectionOperations.vue` | Updated selection operations for sample sheet support. | YES |
| `client/src/components/History/adapters/buildCollectionModal.ts` | Updated modal building to support `extendedCollectionType`. | YES |
| `client/src/components/JobInformation/JobInformation.vue` | Minor updates for compatibility. | YES |
| `client/src/components/JobStates/wait.js` | Minor updates. | YES |
| `client/src/components/Libraries/LibraryFolder/TopToolbar/FolderTopBar.vue` | Added `extended-collection-type` prop to `CollectionCreatorIndex`. | YES |
| `client/src/components/Upload/DefaultBox.vue` | Added `extended-collection-type` prop to `CollectionCreatorIndex`. | YES |
| `client/src/components/WorkflowInvocationState/util.ts` | State constants moved (NON_TERMINAL_STATES, ERROR_STATES now in `api/jobs.ts`). | YES |
| `client/src/components/admin/JobsList.vue` | Minor updates. | YES |
| `client/src/components/providers/utils.js` | Minor updates. | YES |

### Client Composables / Stores / Utils

| File | Change | Exists |
|------|--------|--------|
| `client/src/composables/fetch.ts` | **NEW** (107 lines). `useJobWatcher()` -- watches a job by ID using resource watcher. `useFetchJobMonitor()` -- submits fetch API call, monitors the resulting job until terminal state. | YES |
| `client/src/composables/resourceWatcher.ts` | Added `startWatchingResourceIfNeeded()` and `stopWatchingResourceIfNeeded()` exports. | YES |
| `client/src/stores/workflowStepStore.ts` | Updated to handle sample sheet collection type in workflow step store. | YES |
| `client/src/utils/navigation/navigation.yml` | Added navigation selectors for sample sheet UI elements (grid cells, wizard buttons, paste textarea, etc.). | YES |
| `client/src/utils/utils.ts` | Minor utility updates. | YES |

### Selenium Navigation / Test Infrastructure

| File | Change | Exists |
|------|--------|--------|
| `lib/galaxy/selenium/navigates_galaxy.py` | Added `ColumnDefinition` dataclass. New methods: `workflow_editor_enter_column_definitions()`, `workflow_editor_connect()`, `workflow_editor_source_sink_terminal_ids()`, `workflow_index_open_with_name()`. Uses `seletools.drag_and_drop`. | YES |
| `client/src/utils/navigation/navigation.yml` | Extensive additions for sample sheet testing: `sample_sheet` section under `workflow_run.input` with selectors for grid cells, wizard navigation, paste data, collection selection, etc. | YES |
| `packages/navigation/setup.cfg` | Added `seletools` dependency. | YES |

### Test Files

| File | Change | Exists |
|------|--------|--------|
| `test/unit/data/dataset_collections/test_sample_sheet_util.py` | **NEW** (205 lines). Tests for validation: column types, restrictions, optional columns, validators (regex, in_range, length), element_identifier type, special characters. | YES |
| `test/unit/data/dataset_collections/test_sample_sheet_workbook.py` | **NEW** (~200 lines). Tests for workbook generation and parsing: simple sample sheet, paired, paired_or_unpaired, from collection, TSV parsing, dbkey columns. | YES |
| `test/unit/data/dataset_collections/test_type_descriptions.py` | Added tests for sample_sheet collection type validation. | YES |
| `test/unit/data/dataset_collections/test_workbook_util.py` | Added tests for CSV/TSV workbook parsing utilities. | YES |
| `test/unit/data/model/test_model_discovery.py` | Tests for model discovery with sample sheet row data propagation. | YES |
| `test/unit/app/tools/test_fetch_workbooks.py` | Extended with CSV/TSV parsing tests. Updated `column_titles_to_headers()` calls for new return type. | YES |
| `lib/galaxy_test/api/test_dataset_collections.py` | ~240 lines of new API tests: `test_sample_sheet_column_definition_problems`, `test_sample_sheet_element_identifier_column_type`, `test_sample_sheet_of_pairs_creation`, `test_sample_sheet_validating_against_column_definition`, `test_sample_sheet_requires_columns`, workbook download/parse roundtrip, workbook for collection, sample sheet via fetch API, paired via fetch API, plus additional tests. | YES |
| `lib/galaxy_test/api/test_tools.py` | Extended with sample sheet tool test coverage. | YES |
| `lib/galaxy_test/api/test_workflows.py` | Extended with sample sheet workflow integration tests. | YES |
| `lib/galaxy_test/base/populators.py` | New methods: `download_workbook()`, `download_workbook_for_collection()`, `parse_workbook()`, `parse_workflow_for_collection()`. | YES |
| `lib/galaxy_test/base/rules_test_data.py` | New test data: `EXAMPLE_SAMPLE_SHEET_SIMPLE_TO_NESTED_LIST`, `EXAMPLE_SAMPLE_SHEET_SIMPLE_TO_NESTED_LIST_OF_PAIRS`. Tests converting sample sheets to nested lists via rules. | YES |
| `lib/galaxy_test/selenium/test_workflow_editor.py` | New: `CHIPSEQ_COLUMNS` test fixture, `test_collection_input_sample_sheet_chipseq_example` selenium test for workflow editor column definition entry. Refactored helper methods. | YES |
| `lib/galaxy_test/selenium/test_workflow_run.py` | ~250 lines of new selenium tests: `test_collection_input_sample_sheet_chipseq_example_from_uris` (full end-to-end: paste URIs -> auto-pair -> fill grid -> submit -> verify tabular output), `test_collection_input_sample_sheet_chipseq_example_from_list_pairs` (create from existing list:paired collection). | YES |
| `test/functional/tools/sample_tool_conf.xml` | Added `sample_sheet_to_tabular.xml` to tool conf. | YES |

### Test Fixtures

| File | Exists |
|------|--------|
| `lib/galaxy/model/unittest_utils/filled_in_workbook_1.tsv` | YES |
| `lib/galaxy/model/unittest_utils/filled_in_workbook_1.xlsx` | YES |
| `lib/galaxy/model/unittest_utils/filled_in_workbook_1_with_dbkey.xlsx` | YES |
| `lib/galaxy/model/unittest_utils/filled_in_workbook_from_collection.xlsx` | YES |
| `lib/galaxy/model/unittest_utils/filled_in_workbook_paired.xlsx` | YES |
| `lib/galaxy/model/unittest_utils/filled_in_workbook_paired_or_unpaired.xlsx` | YES |
| `lib/galaxy/app_unittest_utils/fetch_workbook.csv` | YES |
| `lib/galaxy/app_unittest_utils/fetch_workbook.tsv` | YES |

---

## Key Implementation Details

### Collection Type System

Sample sheets introduce a new top-level rank type `sample_sheet` that can be composed:
- `sample_sheet` -- flat list of datasets, each with columnar metadata
- `sample_sheet:paired` -- each element is a paired collection, with metadata per pair
- `sample_sheet:paired_or_unpaired` -- each element is either paired or unpaired
- `sample_sheet:record` -- each element is a record (heterogeneous collection)

The regex for valid collection types:
```
^((list|paired|paired_or_unpaired|record)(:(list|paired|paired_or_unpaired|record))*|sample_sheet|sample_sheet:paired|sample_sheet:record|sample_sheet:paired_or_unpaired)$
```

Key difference from `list`: sample sheets cannot be nested further. A `sample_sheet` is always the outermost rank. This is enforced by the regex.

### Column Definition Schema

```python
class SampleSheetColumnDefinition(TypedDict):
    name: str                    # column name (no special characters)
    type: SampleSheetColumnType  # "string" | "int" | "float" | "boolean" | "element_identifier"
    optional: bool
    description: NotRequired[Optional[str]]
    default_value: NotRequired[Optional[SampleSheetColumnValueT]]
    validators: NotRequired[Optional[List[Dict[str, Any]]]]  # only safe validators: regex, in_range, length
    restrictions: NotRequired[Optional[List[SampleSheetColumnValueT]]]
    suggestions: NotRequired[Optional[List[SampleSheetColumnValueT]]]
```

### Workbook Generation

Uses `openpyxl` to generate XLSX files with:
- Column headers derived from prefix columns (URI columns for sample_sheet, URI 1/URI 2 for paired) + user-defined columns
- Data validation (dropdown lists for restrictions, type validation)
- Cell protection on non-editable columns
- Instructions sheet
- Extra column help sheet (for Galaxy-recognized columns like dbkey, file_type, etc.)

### Workbook Parsing

Supports three formats:
1. **XLSX** -- detected by ZIP magic bytes (`PK\x03\x04`), parsed with openpyxl
2. **CSV** -- detected by csv.Sniffer, parsed with csv module
3. **TSV** -- detected by csv.Sniffer (delimiter=`\t`)

The `ReadOnlyWorkbook` protocol abstracts over both formats.

### Rule Builder Integration

New rule `add_column_from_sample_sheet_index`:
- Extracts a value from `source["columns"]` at a given index
- Appends it as a new column to the row data
- Enables deriving collections (e.g., nested lists grouped by treatment) from sample sheet metadata

The `__init_rule_data()` in the collections manager propagates `element.columns` into the `sources` dict so rules can access them.

### Tool Wrapper Integration

`DatasetCollectionWrapper` exposes `sample_sheet_row(element_identifier)` which returns the `columns` list for an element. This is used by the `__SAMPLE_SHEET_TO_TABULAR__` tool's Cheetah template to iterate over rows and produce tabular output.

### Fetch API Path

When creating sample sheets from URIs, the fetch API path is used:
1. Each element in the fetch payload has a `row` field containing its column values
2. The target has `column_definitions` describing the schema
3. `data_fetch.py` passes `row` through to discovered file metadata
4. `discover.py` propagates rows through `CollectionBuilder.add_dataset(row=row)` and `get_level(row=row)`
5. Builder stores rows and passes them to `build_collection()` which sets `DatasetCollectionElement.columns`

---

## API Changes Summary

### New Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sample_sheet_workbook` | Generate XLSX workbook for sample sheet definition |
| POST | `/api/sample_sheet_workbook/parse` | Parse uploaded workbook against sample sheet definition |
| POST | `/api/dataset_collections/{hdca_id}/sample_sheet_workbook` | Generate workbook pre-seeded with collection elements |
| POST | `/api/dataset_collections/{hdca_id}/sample_sheet_workbook/parse` | Parse workbook against collection's elements |

### Modified Endpoints

| Method | Path | Change |
|--------|------|--------|
| POST | `/api/dataset_collections` | Accepts `column_definitions` and `rows` in payload |
| POST | `/api/tools/fetch` | Targets accept `column_definitions`, elements accept `row` |

### New Schema Types

- `SampleSheetColumnDefinitionModel`
- `CreateWorkbookRequest`
- `ParseWorkbook` / `ParsedWorkbook`
- `CreateWorkbookForCollectionApi`
- `ParseWorkbookForCollectionApi` / `ParsedWorkbookForCollection`

---

## Cross-Reference Notes

All 113 files from the PR exist at their original paths in the current codebase. The `collection_specification` branch HEAD (`2a5538b103`) matches the `dev` branch merge base -- no additional commits have been made on top of the sample_sheets merge. The codebase is in the exact state left by the PR merge.

---

## Test Coverage Summary

### Unit Tests
- **Validation**: 205 lines in `test_sample_sheet_util.py` covering all column types, restrictions, optional fields, validators (regex, in_range, length), element_identifier validation, special character rejection
- **Workbook generation/parsing**: `test_sample_sheet_workbook.py` covers XLSX and TSV roundtrips for simple, paired, paired_or_unpaired, from-collection scenarios
- **Type descriptions**: `test_type_descriptions.py` validates the collection type regex
- **Workbook utilities**: `test_workbook_util.py` tests CSV/TSV parsing
- **Fetch workbooks**: `test_fetch_workbooks.py` adds CSV/TSV parsing, updates existing tests for new return types
- **Model discovery**: `test_model_discovery.py` tests row propagation during collection population

### API Integration Tests
- Collection creation with sample_sheet type (simple, paired, element_identifier columns)
- Column definition validation (bad types, missing fields, unsafe validators)
- Row validation against column definitions (type mismatches, out-of-range)
- Workbook download/parse roundtrip via API
- Workbook for collection via API
- Fetch-based sample sheet creation
- Paired fetch-based sample sheet creation

### Selenium Tests
- Workflow editor: defining sample_sheet:paired input with ChIP-seq-like column definitions
- Workflow run from URIs: paste URLs -> auto-pair -> fill grid -> submit -> verify tabular output
- Workflow run from existing collection: select list:paired -> fill metadata grid -> submit -> verify

### Rules DSL Tests
- `rules_dsl_spec.yml` test cases for `add_column_from_sample_sheet_index`
- `rules_test_data.py` integration test data: sample_sheet -> nested list, sample_sheet:paired -> nested list:paired
