---
type: research
subtype: pr
tags: [research/pr, galaxy/tools, galaxy/tools/yaml, galaxy/api]
status: draft
created: 2026-03-02
revised: 2026-04-22
revision: 2
ai_generated: true
github_pr: 18524
github_repo: galaxyproject/galaxy
related_notes:
  - "[[Component - Tool Shed Search and Indexing]]"
summary: "Tool Shed 2.0 APIs expose parsed tool metadata and parameter schemas for external tooling without Galaxy internals"
---

# PR #18524 Research Summary: Add Tool-Centric APIs to the Tool Shed 2.0

## Metadata

| Field         | Value |
|---------------|-------|
| **Title**     | Add Tool-Centric APIs to the Tool Shed 2.0 |
| **Author**    | John Chilton (@jmchilton) |
| **Status**    | MERGED |
| **Created**   | 2024-07-10 |
| **Merged**    | 2024-07-15 |
| **Milestone** | 24.2 |
| **Labels**    | kind/enhancement, area/toolshed, area/tools |
| **Branch**    | `structured_tool_state_models` -> `dev` |
| **Stats**     | 96 files changed, +6287 / -151 |
| **Merge Commit** | `f7427844ae641812f20f75db08135f557b8403fe` |
| **URL**       | https://github.com/galaxyproject/galaxy/pull/18524 |

## High-Level Description

This PR is a foundational piece of the "structured tool state" initiative. It brings Pydantic-based models for describing tool inputs, outputs, and metadata from `galaxy-tool-util` into a form that can be served via new Tool Shed 2.0 APIs, enabling external tooling (IDE plugins, workflow validators, etc.) to reason about Galaxy tools **without depending on Galaxy's internal `Tool` classes**.

### Three Core Backend Enhancements to `galaxy-tool-util`:

1. **Input parameter model layer** -- Pydantic models describing every type of Galaxy and CWL tool input parameter (text, integer, float, boolean, select, conditional, repeat, section, data, data_collection, color, hidden, rules, CWL types). Each model can generate a dynamic Pydantic model at runtime for validating tool state in different representations (request, request_internal, job_internal, test_case).

2. **Citation handling refactor** -- Citations parsing was decoupled from XML and moved into `galaxy.tool_util.parser` using a `Citation` Pydantic model, so it can be reused in library contexts without Galaxy app dependencies.

3. **Tool output Pydantic models** -- New `output_models.py` with `ToolOutput` discriminated union (data, collection, text, integer, float, boolean) that mirrors output metadata from `ToolSource`.

### Two New Tool Shed 2.0 API Endpoints:

1. **`GET /api/tools/{trs_tool_id}/version/{version}`** -- Returns a `ParsedTool` Pydantic model containing parsed tool metadata (id, version, name, description, inputs, outputs, citations, license, profile, EDAM operations/topics, xrefs, help).

2. **`GET /api/tools/{trs_tool_id}/version/{version}/parameter_request_schema`** -- Returns a JSON schema for validating tool inputs according to the structured tool state API (from PR #17393).

This was described as an improvement over the earlier attempt (#18470), with repeat min/max, sections, richer API (inputs + outputs together), caching rework, and stock tool support.

## Detailed File-by-File Breakdown

### New Core Files (Introduced by PR)

#### `lib/galaxy/tool_util/parameters/models.py` (+931 lines)
The heart of the PR. Defines Pydantic models for every Galaxy tool parameter type:
- `TextParameterModel`, `IntegerParameterModel`, `FloatParameterModel`, `BooleanParameterModel`
- `ColorParameterModel`, `HiddenParameterModel`, `RulesParameterModel`
- `SelectParameterModel` with `LabelValue` options
- `DataParameterModel`, `DataCollectionParameterModel`
- `ConditionalParameterModel` with `ConditionalWhen` for when-blocks
- `RepeatParameterModel` with min/max instance counts
- `SectionParameterModel`
- CWL types: `CwlIntegerParameterModel`, `CwlFloatParameterModel`, `CwlStringParameterModel`, `CwlBooleanParameterModel`, `CwlFileParameterModel`, `CwlDirectoryParameterModel`, `CwlNullParameterModel`, `CwlUnionParameterModel`

Each model implements `pydantic_template(state_representation)` returning `DynamicModelInformation` used to build runtime Pydantic models for different state representations (request vs request_internal vs job_internal vs test_case).

**Current state:** This file no longer exists at `lib/galaxy/tool_util/parameters/models.py`. It has been refactored into `lib/galaxy/tool_util_models/parameters.py` (now 2229 lines -- more than double the original 931 lines). The architecture is preserved but significantly expanded with additional parameter types (drill_down, data_column, group_tag, baseurl, genomebuild, directory_uri, sample_sheet), many more state representations (relaxed_request, workflow_step, workflow_step_linked, landing_request, landing_request_internal, test_case_json, job_runtime), and validators.

#### `lib/galaxy/tool_util/parameters/factory.py` (+294 lines)
Factory functions to build parameter models from `InputSource`/`ToolSource` abstractions:
- `from_input_source()` -- routes to Galaxy or CWL parameter model construction
- `input_models_for_tool_source()` -- builds full parameter bundle from tool source
- `input_models_for_pages()` / `input_models_for_page()` -- iterates page sources
- `get_color_value()` -- helper for color parameter default

**Current state:** Still exists at same path, expanded to 481 lines. Now handles many more parameter types (drill_down, data_column, group_tag, baseurl, genomebuild, directory_uri) and validators. The `_from_input_source_galaxy` function grew substantially.

#### `lib/galaxy/tool_util/parameters/__init__.py` (+101 lines)
Package init that re-exports all parameter models and utilities.

**Current state:** Still exists, expanded to 189 lines with many more exports (validation functions, additional state types, visitor functions, case functions, convert functions).

#### `lib/galaxy/tool_util/parameters/state.py` (+98 lines)
Defines `ToolState` base class and subclasses:
- `RequestToolState` (state_representation="request")
- `RequestInternalToolState` (state_representation="request_internal")
- `JobInternalToolState` (state_representation="job_internal")
- `TestCaseToolState` (state_representation="test_case")

Each has a `_to_base_model()` method that builds a dynamic Pydantic model for validation.

**Current state:** Still exists, expanded significantly with additional state types: `RelaxedRequestToolState`, `WorkflowStepToolState`, `WorkflowStepLinkedToolState`, `LandingRequestToolState`, `LandingRequestInternalToolState`, `RequestInternalDereferencedToolState`, `TestCaseJsonToolState`, `JobRuntimeToolState`, and a `HasToolParameters` protocol.

#### `lib/galaxy/tool_util/parameters/_types.py` (+43 lines)
Type utility functions: `optional_if_needed`, `is_optional`, `union_type`, `list_type`, `cast_as_type`.

**Current state:** This file no longer exists at `lib/galaxy/tool_util/parameters/_types.py`. Moved to `lib/galaxy/tool_util_models/_types.py`.

#### `lib/galaxy/tool_util/parameters/visitor.py` (+56 lines)
`visit_input_values()` function for traversing parameter model trees (handles conditionals, repeats, sections).

**Current state:** Still exists at same path, expanded with `flat_state_path`, `keys_starting_with`, `repeat_inputs_to_array`, `validate_explicit_conditional_test_value`, `VISITOR_NO_REPLACEMENT`.

#### `lib/galaxy/tool_util/parameters/convert.py` (+73 lines)
`decode()` function for converting `RequestToolState` to `RequestInternalToolState` (decodes encoded IDs to internal integers).

**Current state:** Still exists, expanded with `encode`, `encode_test`, `fill_static_defaults`, `landing_decode`, `landing_encode`, `dereference`, `strictify`.

#### `lib/galaxy/tool_util/parameters/json.py` (+27 lines)
`to_json_schema_string()` -- converts tool parameter bundle to JSON schema string.

**Current state:** Still exists at same path.

#### `lib/galaxy/tool_util/models.py` (+74 lines)
Defines `ParsedTool` Pydantic model and `parse_tool()` factory function.

**Current state:** No longer exists at this path. Refactored into `lib/galaxy/tool_util_models/__init__.py` which now contains `ParsedTool`, `ToolSourceBase`, `UserToolSource`, `AdminToolSource`, plus test-related models (`TestJob`, `Tests`, etc.). The `parse_tool()` function moved to `lib/galaxy/tool_util/model_factory.py` as `parse_tool()` and `parse_tool_custom()`.

#### `lib/galaxy/tool_util/parser/output_models.py` (+115 lines)
Pydantic models for tool outputs: `ToolOutputDataset`, `ToolOutputCollection`, `ToolOutputText`, `ToolOutputInteger`, `ToolOutputFloat`, `ToolOutputBoolean`, plus `DatasetCollectionDescription` hierarchy and `from_tool_source()`.

**Current state:** No longer exists at this path. Moved to `lib/galaxy/tool_util_models/tool_outputs.py` with the same model structure but enhanced with Generic types for incoming vs strict output models, and the `from_tool_source()` function moved to `lib/galaxy/tool_util/parser/output_objects.py`.

#### `lib/galaxy/tool_util/unittest_utils/parameters.py` (+46 lines)
Test utility for loading tool sources from the test parameters directory.

**Current state:** Still exists at same path.

#### `lib/galaxy/tools/stock.py` (+33 lines)
Functions to iterate stock Galaxy tool paths and tool sources: `stock_tool_paths()`, `stock_tool_sources()`.

**Current state:** Still exists at same path, largely unchanged.

#### `lib/tool_shed/managers/model_cache.py` (+64 lines)
`ModelCache` class for caching parsed tool models on disk, keyed by model schema hash + tool_id + tool_version. Gracefully handles model schema changes by using MD5 of the JSON schema as a cache key prefix.

**Current state:** Still exists at same path, largely unchanged.

#### `lib/tool_shed/managers/tools.py` (+128 lines)
Core tool shed tool management: `parsed_tool_model_cached_for()`, `parsed_tool_model_for()`, `tool_source_for()`, stock tool source lookup.

**Current state:** Still exists, expanded. Now imports `parse_tool_custom` from `galaxy.tool_util.model_factory`, uses `ShedParsedTool` (a subclass of `ParsedTool` with `repository_revision`).

### Modified Existing Files

#### `lib/galaxy/managers/citations.py` (+30/-18)
Refactored to use `Citation` Pydantic model from `galaxy.tool_util.parser.interface` instead of parsing XML elements directly. `parse_citation()` now takes a `Citation` model. `BibtexCitation` and `DoiCitation` constructors take `Citation` model.

**Current state:** Uses `Citation` from `galaxy.tool_util_models.tool_source` (refactored path). The pattern is preserved.

#### `lib/galaxy/tool_util/parser/interface.py` (+25/-7)
Added `Citation` Pydantic model (type + content), `XrefDict` TypedDict, abstract methods `parse_citations()`, `parse_edam_operations()`, `parse_edam_topics()`, `parse_xrefs()`, `parse_license()`, `parse_help()`.

**Current state:** Still exists. `Citation` and `XrefDict` moved to `lib/galaxy/tool_util_models/tool_source.py`. The abstract methods are still on `ToolSource`. `parse_help()` now returns `Optional[HelpContent]` (a structured model with format + content) instead of `Optional[str]`.

#### `lib/galaxy/tool_util/parser/xml.py` (+43/-10)
Implemented `parse_citations()`, `parse_edam_operations()`, `parse_edam_topics()`, `parse_xrefs()`, `parse_license()`, `parse_help()` on `XmlToolSource`.

**Current state:** Still exists with these methods, plus many additional parsing methods added since.

#### `lib/galaxy/tool_util/parser/yaml.py` (+17/-12)
Implemented citation/metadata parsing methods for YAML tool sources.

**Current state:** Still exists with expanded parsing.

#### `lib/galaxy/tool_util/parser/cwl.py` (+25/-2)
Added CWL-specific implementations of the new parsing methods (mostly returning empty defaults).

**Current state:** Still exists.

#### `lib/galaxy/tool_util/parser/output_collection_def.py` (+62/-15)
Added `dataset_collector_descriptions_from_output_dict()` and Pydantic model conversion methods.

**Current state:** Still exists with these methods preserved and expanded.

#### `lib/galaxy/tool_util/parser/output_objects.py` (+86/-8)
Added `to_model()` methods on `ToolOutput` and `ToolOutputCollection` to convert to Pydantic output models.

**Current state:** Still exists. Now includes `from_tool_source()` function (moved from the deleted `output_models.py`).

#### `lib/galaxy/tool_shed/metadata/metadata_generator.py` (+20/-2)
Added `RepositoryMetadataToolDict` TypedDict and a refactored method for reuse.

**Current state:** Still exists with the `RepositoryMetadataToolDict` type.

#### `lib/galaxy/tools/__init__.py` (+14/-20)
Citation handling refactored to use the new `Citation` model pattern instead of parsing XML directly.

**Current state:** Still uses citation parsing through the model pattern.

#### `lib/galaxy/tools/parameters/basic.py` (+1/-1)
Bug fix in color parameter parsing -- `get_color_value()` fix.

**Current state:** Still exists.

#### `lib/galaxy/util/__init__.py` (+12/-4)
Added `listify` improvements and `galaxy_directory()` function.

**Current state:** Still exists with these additions.

#### `lib/galaxy/tool_util/ontologies/ontology_data.py` (+5/-2)
Small improvements to EDAM ontology data handling.

**Current state:** Still exists.

#### `lib/tool_shed/webapp/api2/tools.py` (+49/-1)
Added the two new API endpoints (`show_tool` and `tool_state_request`).

**Current state:** Still exists with the endpoints preserved and expanded. Now also includes `parameter_landing_request_schema`, `parameter_test_case_xml_schema`, and `tool_source` endpoints.

#### `lib/tool_shed/webapp/app.py` (+2/-0)
Added `model_cache` initialization.

**Current state:** Still exists.

#### `lib/tool_shed/structured_app.py` (+2/-0)
Added `model_cache` to the structured app interface.

**Current state:** Still exists.

#### `lib/tool_shed/webapp/model/__init__.py` (+2/-0)
Minor model additions.

**Current state:** Still exists.

#### `lib/tool_shed/managers/trs.py` (+8/-6)
Small refactoring for TRS ID handling.

**Current state:** Still exists.

#### `lib/tool_shed/webapp/frontend/src/schema/schema.ts` (+1099/-0)
Auto-generated TypeScript schema for the tool shed frontend reflecting new API types.

**Current state:** Still exists, continuously regenerated.

### Test Files

#### `test/unit/tool_util/test_parameter_specification.py` (+226 lines)
Core test framework for parameter model validation. Tests each parameter type against valid/invalid request states, request_internal states, job_internal states, and test_case states, driven by `parameter_specification.yml`.

**Current state:** Still exists, expanded to handle many more state representations and test scenarios.

#### `test/unit/tool_util/parameter_specification.yml` (+681 lines)
YAML test data defining expected valid/invalid states for each parameter type across different state representations.

**Current state:** Still exists, expanded from 681 to 4199 lines -- dramatically more test coverage.

#### `test/unit/tool_util/test_parsing.py` (+124/-38)
Tests for tool source parsing, added tests for citation, output, EDAM, and help parsing.

**Current state:** Still exists with expanded test coverage.

#### `test/unit/tool_shed/test_model_cache.py` (+53 lines)
Tests for the `ModelCache` class.

**Current state:** Still exists.

#### `test/unit/tool_shed/test_tool_source.py` (+38 lines)
Tests for tool source retrieval in the tool shed context.

**Current state:** Still exists.

#### `test/unit/app/tools/test_citations.py` (+5/-1)
Updated citation tests for the new model pattern.

**Current state:** Still exists.

#### `test/unit/app/tools/test_stock.py` (+16 lines)
Tests for stock tool iteration.

**Current state:** Still exists.

#### `test/functional/tools/parameters/*.xml` and `*.cwl` (36 new files)
Test tool XML and CWL files covering every parameter type: boolean, color, conditional, data, data_collection, float, hidden, int, repeat, section, select, text, and CWL equivalents.

**Current state:** All still exist. Many more parameter test tools have been added since (drill_down, data_column, genomebuild, group_tag, directory_uri, sample_sheet, etc.).

### Documentation Files

#### `doc/source/dev/` PlantUML files and diagrams
- `tool_state_api.plantuml.txt` / `.svg` -- Sequence diagram showing API request flow through RequestToolState validation
- `tool_state_state_classes.plantuml.txt` / `.svg` -- Class diagram of ToolState hierarchy (RequestToolState -> RequestInternalToolState -> JobInternalToolState)
- `image.Makefile`, `plantuml_options.txt`, `plantuml_style.txt` -- Build infrastructure for diagrams

**Current state:** All still exist.

## Key Architectural Decisions and Patterns

### 1. Discriminated Union Pattern for Parameter Types
All parameter types are modeled as a discriminated union (`ToolParameterT`) using Pydantic's `Discriminator` based on `parameter_type` field. This enables clean serialization/deserialization and JSON schema generation.

### 2. State Representation Architecture
The `ToolState` class hierarchy models different representations of tool state:
- **RequestToolState** -- External API state with encoded IDs and mapping/batch constructs
- **RequestInternalToolState** -- Decoded IDs, still supports mapping
- **JobInternalToolState** -- Expanded (no mapping), defaults filled
- **TestCaseToolState** -- For tool test XML validation

Each generates a dynamic Pydantic model from the parameter definitions for that specific representation.

### 3. Dynamic Model Generation
`pydantic_template()` on each parameter model returns `DynamicModelInformation` (name, type definition, validators). These are assembled via `pydantic.create_model()` into a runtime validation model. This is a key pattern that enables JSON schema generation for arbitrary tools.

### 4. Model-Based Caching
The `ModelCache` uses MD5 of the Pydantic model's JSON schema as a cache key prefix. When models evolve (fields added/removed), the hash changes and old cache entries are naturally invalidated. Clever approach to avoid versioning issues.

### 5. Citation Decoupling
Citations moved from XML-parsing in `galaxy.tools` to a clean `Citation(type, content)` Pydantic model in the parser layer, enabling reuse without Galaxy app dependencies.

### 6. Stock Tool Support
The PR added the ability to serve built-in Galaxy tools through the same Tool Shed API, not just repository-hosted tools.

## Cross-Reference: Current Codebase vs PR

### Major Refactoring Since the PR

The most significant change since this PR merged is the extraction of `galaxy.tool_util_models` as a separate package:

| PR Location | Current Location | Notes |
|---|---|---|
| `lib/galaxy/tool_util/parameters/models.py` | `lib/galaxy/tool_util_models/parameters.py` | Grew from 931 to 2229 lines |
| `lib/galaxy/tool_util/parameters/_types.py` | `lib/galaxy/tool_util_models/_types.py` | Moved to models package |
| `lib/galaxy/tool_util/models.py` | `lib/galaxy/tool_util_models/__init__.py` | Expanded with UserToolSource, AdminToolSource, test models |
| `lib/galaxy/tool_util/parser/output_models.py` | `lib/galaxy/tool_util_models/tool_outputs.py` | Enhanced with Generic types |
| (new) | `lib/galaxy/tool_util_models/_base.py` | New base model |
| (new) | `lib/galaxy/tool_util_models/tool_source.py` | Citation, XrefDict, HelpContent, etc. |
| (new) | `lib/galaxy/tool_util_models/parameter_validators.py` | Validator models |
| (new) | `lib/galaxy/tool_util_models/sample_sheet.py` | Sample sheet models |
| (new) | `lib/galaxy/tool_util_models/assertions.py` | Assertion models |
| (new) | `lib/galaxy/tool_util/model_factory.py` | parse_tool/parse_tool_custom extracted |
| (new) | `lib/galaxy/tool_util/parameters/case.py` | Test case state handling |
| (new) | `lib/galaxy/tool_util/parameters/model_validation.py` | Validation entry points |

### Files That Still Exist Unchanged or Minimally Changed
- `lib/tool_shed/managers/model_cache.py` -- Largely unchanged
- `lib/galaxy/tools/stock.py` -- Largely unchanged
- `lib/galaxy/tool_util/unittest_utils/parameters.py` -- Largely unchanged
- All doc/source/dev PlantUML files -- Unchanged
- All test parameter tool XML/CWL files -- Still present (many more added)

### State Representations Growth
The PR introduced 4 state representations. The current codebase has expanded to 12+:
- `request`, `relaxed_request`, `request_internal`, `request_internal_dereferenced`
- `job_internal`, `job_runtime`
- `test_case`, `test_case_json`
- `workflow_step`, `workflow_step_linked`
- `landing_request`, `landing_request_internal`

### Parameter Types Growth
The PR introduced core Galaxy types + CWL types. Since then, many more have been added:
- `drill_down`, `data_column`, `group_tag`, `baseurl`, `genomebuild`, `directory_uri`
- Sample sheet support
- Parameter validators (in_range, length, regex, expression, empty_field, no_options)

## Review Discussion Summary

### Reviewer: @mvdbeek
- Overall very positive: "Looks great, can't wait to play with this" and "Looks great, let's deploy it"
- **APPROVED** on 2024-07-15

### Key Discussion Points:

1. **`typing_extensions` usage** (on `_types.py`): mvdbeek suggested using `typing_extensions` for `get_args`/`get_origin` for Python 3.7 compatibility. jmchilton initially concerned about dropping 3.7, then agreed after seeing it works.

2. **`case.py` WIP code** (on `parameters/case.py`): mvdbeek raised concerns about unqualified input references and nested input handling. jmchilton clarified this was WIP code that would move to the full structured tool state branch (#17393).

3. **Default values in factory** (on `factory.py`): mvdbeek asked if providing defaults in the factory was the right layer vs producing optional types. Also suggested eventually consuming parameter models in `basic.py` to avoid drift. jmchilton agreed as a goal but deferred, creating issue #18537 to track.

4. **Empty tool_state.md**: mvdbeek noted the file was empty. jmchilton removed it, keeping only the PlantUML diagrams.

5. **TODO comment cleanup**: mvdbeek pointed out a done TODO that should be removed.

### Community Comments:
- **@hexylena**: "Fantastic to see, it'll let me throw away a repository where I collect this data from live servers" -- highlighted community need for this metadata API.
- **@mvdbeek** (post-merge): "This is so awesome... This will enable so many cool things for a long time to come!"

### Post-Deployment Issues (Sentry):
After deployment, Sentry reported 5 issues:
1. `ValueError: too many values to unpack (expected 3)` on `/api/tools/{tool_id}/versions/{tool_version}`
2. `AttributeError: 'NoneType' object has no attribute 'installable_revisions'`
3. `AttributeError: 'object' object has no attribute 'app'`
4. `ValidationError: 1 validation error for Citation`
5. `AssertionError` on display_tool

These were presumably addressed in follow-up PRs.

## Related PRs
- **#17393** -- Full structured tool state PR (the larger initiative this feeds into)
- **#18470** -- Previous attempt at these APIs (superseded by this PR)
- **#18537** -- Issue tracking consuming parameter models in basic.py to avoid drift
