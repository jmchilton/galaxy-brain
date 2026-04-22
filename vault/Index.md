# Galaxy Brain Index

*83 notes. Auto-generated — run `make index` to refresh.*

## Plans

- [[Plan - Workflow Extraction Vue Conversion]] — Convert the last non-data-display Mako template (workflow extraction) to Vue + FastAPI; tracks issue #17506.
- [[Plan - Workflow Extraction Vue Conversion - API]] — API design spec for replacing the legacy Mako workflow extraction UI with a typed FastAPI endpoint and Vue frontend.

## Projects

- [[collection_semantics]] — Project formalizing Galaxy collection semantics and their documentation.
- [[cwl]] — Project tracking CWL implementation in Galaxy: conformance tests, conditionals, packing, tool loading.
- [[history_markdown]] — Project implementing history-attached markdown pages in Galaxy's client and API.
- [[wf_refactor_persistence]] — Persisted undo/redo and workflow CHANGELOG by bridging frontend actions to the backend refactor API (#9166, #21113).
- [[workflow_state]] — Workflow validation infrastructure: pre-execution parameter typing, format2 usability, VS Code tooling, tool search overhaul.

## Research

### Components

- [[Component - Auto Pairing]] — Automatic forward/reverse read pairing: parallel frontend/backend implementations validated against shared YAML spec
- [[COMPONENT_AGENTS_CHATGXY_PERSISTENCE]] — ChatGXY persistence model, API flow, and frontend state management for chat conversations
- [[Component - Collection Tool Execution Semantics]] — Collection types (list, paired, record), mapping semantics, linked vs cross-product multiple inputs, element identifier flow
- [[Component - Tool XML Collection Commands]] — DatasetCollectionWrapper objects in Cheetah command templates, paired/list iteration access
- [[Component - Collections in Tool XML Tests]] — Test syntax for collections: nested <collection> tags with type, elements, fields for records and paired variants
- [[Component - Invocation Graph View]] — Visual DAG rendering of workflow invocation with real-time job state, readonly editor canvas
- [[Component - API Tests Tools]] — Tool API testing split: ~3500 lines legacy unittest tests + ~775 lines modern fluent pytest with input parametrization
- [[Component - Collection Adapters]] — Ephemeral wrappers promoting datasets/pairs to collections at tool runtime (PromoteDatasetToCollection family)
- [[Component - CWL Ephemeral Collections]] — Lightweight non-persisted collections created during CWL execution for MultipleInputFeatureRequirement merge strategies
- [[Component - CWL Workflow State]] — CWL workflow import to persistence to execution: parsed via WorkflowProxy, state encoded/decoded, tool_inputs dict
- [[Component - Collection Creation API]] — Two-path collection creation: direct POST with element identifiers or fetch API uploading new data atomically
- [[Component - Agents Backend]] — Multi-agent AI framework with pydantic-ai, five specialized agents, registry pattern, and async execution
- [[Component - Agents UX]] — Four agent UX surfaces: ChatGXY full-page chat, GalaxyWizard error widget, tool generator, Jupyternaut proxy
- [[Component - Backend Dependency Management]] — Python deps via uv: pyproject.toml, uv.lock, pinned-*.txt files, conditional dependency resolver, weekly updates
- [[Component - Backend Logging Architecture]] — Python logging with custom TRACE level, dictConfig defaults, app stack filters, Sentry/Fluentd, Gravity support
- [[Component - Data Fetch]] — Import pipeline from URLs/paste/files/FTP via /api/tools/fetch wrapping __DATA_FETCH__ tool producing HDAs or HDCAs
- [[Component - Collection API]] — Full collection API surface: POST/GET/PUT/DELETE endpoints, DatasetCollectionsService, fuzzy drill-down, export
- [[Component - Collection Models]] — Core model classes: DatasetCollection, DatasetCollectionElement, HDCA/LDCA instances, implicit collections from mapping
- [[COMPONENT_UI_ERROR_HANDLING]] — Backend MessageException serialization to JSON and frontend parsing via simple-error.ts
- [[Component - Implicit Dataset Conversion]] — Transparent datatype conversion mechanism via ImplicitlyConvertedDatasetAssociation, invisible HDAs
- [[Component - Markdown Visualizations]] — Five fenced block types for galaxy directives, Vega charts, visualizations, Vitessce dashboards
- [[Component - Workflow Extraction Models]] — ORM model relationships for reconstructing workflows from history via dataset ancestry
- [[Component - E2E Tests Smart Components]] — Component system: navigation.yml, Component tree, SmartComponent/SmartTarget wrappers, parameterized selectors
- [[Component - Tool State Dynamic Models]] — Pydantic dynamic models for validating tool parameter state across 12 representations
- [[Component - Tool Testing Infrastructure]] — Framework for parsing, loading, executing tests in XML/YAML tool files via planemo
- [[Component - Window Manager]] — Floating window system using WinBox.js, intercepting router.push to render iframe overlays
- [[Component - Workflow API]] — REST API for workflow CRUD, execution, invocation monitoring via FastAPI controllers
- [[Component - Galaxy Workflow Expression Context]] — CWL-based workflow expressions evaluated as JavaScript with $job, $self, $runtime variables
- [[Component - Workflow Format Differences]] — Native .ga vs Format2 .gxwf.yml serialization, machine vs human-authored designs and structural trade-offs
- [[Component - Workflow Import]] — HTTP to database stack for workflow import spanning API controller, manager, and service layers
- [[Component - Workflow Format (.ga)]] — Galaxy JSON workflow format, steps/connections/comments/metadata, canonical serialization
- [[Component - Workflow Refactoring API]] — PUT endpoint for refactoring workflows, routes through service layer with validation
- [[Component - Workflow Testing]] — YAML declarative and Python procedural testing frameworks for workflow execution validation
- [[Component - Worktree Bootstrapping]] — Backend Python and frontend Node.js dependency setup, configuration, and dev server bootstrap
- [[Component - Format2 Workflows (gxformat2)]] — YAML format2 workflow parsing, detection via class=GalaxyWorkflow, conversion pipeline to native JSON
- [[Component - gxformat2 Parsing and Syntax]] — Format2 YAML detection, conversion pipeline to Galaxy JSON before import processing
- [[Component - Post Job Actions]] — Declarative post-processing operations on job outputs, transformations without explicit tools
- [[Component - Collections - Sample Sheets Backend]] — Tabular metadata per collection element: column_definitions, columns row on elements, typed validation, cross-refs
- [[Component - Collections - Paired or Unpaired]] — Discriminated union type of 1 or 2 elements with asymmetric subtyping where paired IS-A paired_or_unpaired
- [[Component - Workflow Comments]] — Visual annotation system for workflows, text/markdown/frames/freehand without execution impact
- [[Component - Workflow Editor Terminal Tests]] — Unit tests for editor terminal connection rules, datatype/collection compatibility validation
- [[Component - Workflow Editor Terminals]] — Terminal connection logic, compatibility checking, map-over propagation, plain class instances
- [[Component - Workflow Extraction]] — Extract history to workflow via Mako UI, traces jobs/datasets back to reconstruct graph
- [[Component - Invocation Report to Pages]] — Pipeline for converting invocation reports to Pages with encoded ID transformation and markdown
- [[Component - E2E Tests - Writing]] — Layered test infrastructure: SeleniumTestCase, NavigatesGalaxy helpers, smart component system, Selenium/Playwright
- [[Component - API Tests]] — API test plumbing: ApiTestCase base class, populators, fixtures, decorators, assertions, user context switching
- [[Component - YAML Tool Runtime]] — YAML tool runtime converts tool state to CWL-style inputs with validated JobInternalToolState

### Pull Requests

- [[PR 16612 - Workflow Comments]] — Workflow Comments feature supports text, markdown, frames, and freehand drawing annotations
- [[PR 17413 - Invocation Graph View]] — Invocation graph view reuses workflow editor DAG in read-only mode overlaying job states
- [[PR 18524 - Add Tool-Centric APIs to Tool Shed 2.0]] — Tool Shed 2.0 APIs expose parsed tool metadata and parameter schemas for external tooling without Galaxy internals
- [[PR 18641 - Parameter Model Improvements Research]] — Extended parameter models with drill_down, data_column, conditional_select types and improved validation
- [[PR 18758 - Tool Execution Typing and Decomposition]] — Adds type aliases documenting tool state lifecycle through execution from request to job completion
- [[PR 19377 - Collection Types and Wizard UI]] — Paired_or_unpaired and record collection types plus collection adapters enable flexible tool input matching
- [[PR 20390 - Workflow Graph Search]] — Workflow editor search panel finds steps, inputs, outputs, comments with fuzzy matching and canvas highlight
- [[PR 20936 - Resource Requirements via TPV]] — Tool resource requirements forwarded to TPV for job destination routing and scheduling decisions
- [[PR 21434 - AI Agent Framework and ChatGXY]] — Pydantic-ai multi-agent framework with router, error analysis, custom tool, orchestrator agents
- [[PR 21463 - Jupyternaut Adapter for JupyterLite]] — OpenAI Chat Completions endpoint supports Jupyternaut AI assistant in JupyterLite visualizations
- [[PR 21692 - Standardize Agent API Schemas]] — Standardizes agent response metadata, typing, validates suggestions, removes deprecated endpoints
- [[PR 21706 - Data Analysis Agent Integration]] — Integrates data analysis agent with DSPy generating Python code executed in browser via Pyodide
- [[PR 4830 - Workflow Resource Parameters]] — Administrators define workflow-level resource parameters users set when invoking workflows for scheduling
- [[PR 5378 - Tool Resource Requirements]] — Tools declare resource requirements like cores and memory modeled after CWL ResourceRequirement
- [[PR 19305 - Implement Sample Sheets]] — Sample sheets attach typed columnar metadata to dataset collection elements for bioinformatics workflows
- [[PR 20935 - Tool Request API]] — Asynchronous job submission via POST /api/jobs with Pydantic-validated state transformations
- [[PR 19434 - User Defined Tools]] — Users create YAML tools via UI with sandboxed JavaScript expressions and required containerization

### Issues

- [[Issue 17506 - Convert Workflow Extraction Interface to Vue]] — Convert build_from_current_history mako to FastAPI and Vue, extract directly to editor

### Dependencies

- [[Dependency - CWL Conformance Tests]] — CWL conformance test suite infrastructure for spec compliance validation across v1.0, v1.1, v1.2
- [[Dependency - cwl-utils]] — CWL document parser and transformer with autogenerated dataclasses for v1.0, v1.1, v1.2
- [[Dependency - Collection Graphviz]] — Graphviz diagram generator for Galaxy dataset collection hierarchies with nested box layout
- [[Dependency - gxformat2]] — Bidirectional conversion between native .ga and Format2 YAML with linting and visualization
- [[Dependency - Pydantic Discriminated Unions]] — Pydantic 2.x discriminated unions route validation by field tags instead of sequential checks
- [[Dependency - Pydantic Dynamic Models]] — Pydantic create_model API dynamically builds BaseModel subclasses with field definitions
- [[Dependency - Planemo - Workflow Tests - Collection Inputs]] — Workflow test collection inputs using CWL list, explicit class, and nested collection syntaxes

### Design Problems

- [[Workflow Extraction Multiple Histories]] — ID-based extraction removes single-history limitation, fixes cross-history copied dataset problems
- [[Problem - Workflow Test Collection Inputs]] — Framework test collections populated via fetch API dispatches on type, supports nested structures

### Design Specs

- [[Component - Tool State Specification]] — YAML-driven test suite validating 12 tool state representations, each form context-specific

### Issue Roundups

- [[Workflow Extraction Issues]] — Workflow extraction has open issues with copied datasets, connection loss, interface needs Vue conversion
