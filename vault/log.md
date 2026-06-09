# Vault Log

Append-only chronological record of vault operations. Append new entries at the bottom.

Entry types: `ingest`, `query`, `lint`, `manual`.

Excluded from frontmatter validator and Astro site; Obsidian-visible.

## 2026-04-22 ingest — Component - Tool Shed Search and Indexing
- **source**: vault/projects/workflow_state/COMPONENT_TOOL_SHED_SEARCHING.md (removed after import)
- **created**: [[Component - Tool Shed Search and Indexing]]
- **updated**:
  - [[PR 18524 - Add Tool-Centric APIs to Tool Shed 2.0]] — cross-ref added

## 2026-04-28 ingest — PR 21828 - YAML Tool Hardening and Tool State
- **source**: https://github.com/galaxyproject/galaxy/pull/21828
- **created**: [[PR 21828 - YAML Tool Hardening and Tool State]]
- **updated**:
  - [[Component - YAML Tool Runtime]] — added cross-ref; PR lands runtimeify path
  - [[Component - Tool State Specification]] — added cross-ref; PR adds job_runtime/test_case_json reps
  - [[Component - Tool State Dynamic Models]] — added cross-ref; PR extends dynamic factory to recursive collection types
  - [[Component - Collection Models]] — added cross-ref; typed Pydantic runtime layer over DatasetCollection
  - [[Component - Collection Tool Execution Semantics]] — added cross-ref; runtime-state pipeline change
  - [[Component - Collections in Tool XML Tests]] — added cross-ref; new test_case_json validation
  - [[Component - Tool Testing Infrastructure]] — added cross-ref; YAML tool test framework hardening
  - [[Dependency - Pydantic Dynamic Models]] — added cross-ref; build_collection_model_for_type factory
  - [[Dependency - Pydantic Discriminated Unions]] — added cross-ref; CollectionRuntimeDiscriminated union
  - [[PR 18641 - Parameter Model Improvements Research]] — added cross-ref; same #17393 lineage
  - [[PR 18758 - Tool Execution Typing and Decomposition]] — added cross-ref; continues tool state typing
  - [[PR 19377 - Collection Types and Wizard UI]] — added cross-ref; runtime models for paired_or_unpaired/sample_sheet/record
  - [[PR 19434 - User Defined Tools]] — added cross-ref; collection input support for YAML tools
  - [[PR 20935 - Tool Request API]] — added cross-ref; runtime-side counterpart to request-side typing

## 2026-04-28 ingest — PR 21842 - Tool Execution Migrated to api jobs
- **source**: https://github.com/galaxyproject/galaxy/pull/21842
- **created**: [[PR 21842 - Tool Execution Migrated to api jobs]]
- **updated**:
  - [[PR 20935 - Tool Request API]] — added cross-ref; client cutover to its endpoint
  - [[PR 21828 - YAML Tool Hardening and Tool State]] — added cross-ref; client side of same typing pipeline
  - [[Component - Tool State Specification]] — added cross-ref; UI now sends RequestToolState
  - [[Component - Tool State Dynamic Models]] — added cross-ref; flat-to-nested client transform
  - [[Component - YAML Tool Runtime]] — added cross-ref; full request lifecycle now typed end-to-end
  - [[PR 18641 - Parameter Model Improvements Research]] — added cross-ref; same parameter model lineage
  - [[PR 18758 - Tool Execution Typing and Decomposition]] — added cross-ref; tool state typing
  - [[PR 19434 - User Defined Tools]] — added cross-ref; YAML tool submission now via /api/jobs

## 2026-04-29 ingest — PR 21942 - Shared Agent Operations and MCP Server
- **source**: https://github.com/galaxyproject/galaxy/pull/21942
- **created**: [[PR 21942 - Shared Agent Operations and MCP Server]]
- **updated**:
  - [[PR 21434 - AI Agent Framework and ChatGXY]] — added cross-ref; this PR refactors that framework
  - [[PR 21692 - Standardize Agent API Schemas]] — added cross-ref; ops manager bypasses these schemas
  - [[PR 21706 - Data Analysis Agent Integration]] — added cross-ref; sibling agent addition
  - [[PR 21463 - Jupyternaut Adapter for JupyterLite]] — added cross-ref; comparable external AI mounting pattern
  - [[Component - Agents Backend]] — added cross-ref; needs revision for ops manager + HistoryAgent
  - [[Component - Agents UX]] — added cross-ref; MCP is a new external surface
  - [[COMPONENT_AGENTS_CHATGXY_PERSISTENCE]] — added cross-ref; MCP is the non-persistent peer entry point

## 2026-05-07 manual — Component - User-Defined Tools
- **source**: external agent draft (no upstream URL)
- **created**: [[Component - User-Defined Tools]]
- **created**: [[Component - User-Defined Tool Source Validation]]
- **note**: agent wrote both files directly as `Whitepaper - *.md` with subtype=whitepaper; renamed to `Design - *.md`, retyped as `design-spec`, dropped invalid tags (research/whitepaper, galaxy/agents, galaxy/agents/mcp, galaxy/tools/validation), added sources, trimmed editorial framing
- **updated**:
  - [[PR 19434 - User Defined Tools]] — backlink to both designs
  - [[PR 21828 - YAML Tool Hardening and Tool State]] — backlink to both designs
  - [[Component - YAML Tool Runtime]] — backlink to both designs
  - [[Component - Tool State Specification]] — backlink to both designs
  - [[Problem - YAML Tool Post-Hoc State Divergence]] — backlink to UDT design

## 2026-05-09 manual — Component - Collections - Records
- **source**: external agent draft (no upstream URL)
- **created**: [[Component - Collections - Records]]
- **note**: agent wrote file directly without /ingest; frontmatter already valid, no schema fixes needed
- **updated**:
  - [[Component - Collection Models]] — backlink
  - [[Component - Collection API]] — backlink
  - [[Component - Collections - Sample Sheets Backend]] — backlink
  - [[Component - Collections - Paired or Unpaired]] — backlink

## 2026-05-13 ingest — PR 21932 - History Graph API
- **source**: https://github.com/galaxyproject/galaxy/pull/21932
- **created**: [[PR 21932 - History Graph API]]
- **updated**:
  - [[PR 20935 - Tool Request API]] — backlink
  - [[PR 21842 - Tool Execution Migrated to api jobs]] — backlink
  - [[PR 21828 - YAML Tool Hardening and Tool State]] — backlink
  - [[PR 17413 - Invocation Graph View]] — backlink
  - [[PR 20390 - Workflow Graph Search]] — backlink
  - [[PR 18758 - Tool Execution Typing and Decomposition]] — backlink
  - [[Component - Workflow Extraction]] — backlink
  - [[Component - Workflow Extraction Models]] — backlink
  - [[Component - Collection Tool Execution Semantics]] — backlink
  - [[Component - Collection Models]] — backlink
  - [[Component - Invocation Graph View]] — backlink
  - [[Component - Workflow Editor Terminals]] — backlink
  - [[Issue 17506 - Convert Workflow Extraction Interface to Vue]] — backlink

## 2026-05-16 ingest — PR 22706 - Workflow Extraction by IDs
- **source**: https://github.com/galaxyproject/galaxy/pull/22706
- **created**: [[PR 22706 - Workflow Extraction by IDs]]
- **updated**:
  - [[Component - Workflow Extraction]] — backlink
  - [[Component - Workflow Extraction Models]] — backlink
  - [[Workflow Extraction Multiple Histories]] — backlink
  - [[Workflow Extraction Issues]] — backlink
  - [[Issue 17506 - Convert Workflow Extraction Interface to Vue]] — backlink
  - [[Component - Collection Models]] — backlink
  - [[Component - Collection Tool Execution Semantics]] — backlink
  - [[PR 20935 - Tool Request API]] — backlink
  - [[PR 21828 - YAML Tool Hardening and Tool State]] — backlink
  - [[PR 21842 - Tool Execution Migrated to api jobs]] — backlink
  - [[PR 18758 - Tool Execution Typing and Decomposition]] — backlink
  - [[Component - Workflow Editor Terminals]] — backlink
  - [[Component - Workflow API]] — backlink

## 2026-05-16 ingest — PR 21935 - Workflow Extraction Vue Conversion
- **source**: https://github.com/galaxyproject/galaxy/pull/21935
- **created**: [[PR 21935 - Workflow Extraction Vue Conversion]]
- **updated**:
  - [[Issue 17506 - Convert Workflow Extraction Interface to Vue]] — backlink (parent issue)
  - [[PR 22706 - Workflow Extraction by IDs]] — backlink (direct ID-native follow-up)
  - [[Component - Workflow Extraction]] — backlink
  - [[Component - Workflow Extraction Models]] — backlink
  - [[Workflow Extraction Multiple Histories]] — backlink
  - [[Workflow Extraction Issues]] — backlink
  - [[Component - Workflow API]] — backlink
  - [[Component - Workflow Editor Terminals]] — backlink
  - [[Component - Collection Models]] — backlink
  - [[Component - Collection Tool Execution Semantics]] — backlink

## 2026-05-21 ingest — Problem - basic.py Parameter Hierarchy
- **source**: lib/galaxy/tools/parameters/basic.py (synthesized dossier from 4 parallel subagent reports on branch refactor-data-options-builder)
- **created**: [[Problem - basic.py Parameter Hierarchy]]
- **updated**:
  - [[Component - Tool State Specification]] — backlink
  - [[Component - Tool State Dynamic Models]] — backlink
  - [[Component - YAML Tool Runtime]] — backlink
  - [[Component - User-Defined Tools]] — backlink
  - [[Problem - YAML Tool Post-Hoc State Divergence]] — backlink
  - [[Workflow Extraction Issues]] — backlink
  - [[PR 21828 - YAML Tool Hardening and Tool State]] — backlink
  - [[PR 20935 - Tool Request API]] — backlink
  - [[PR 21842 - Tool Execution Migrated to api jobs]] — backlink

## 2026-05-21 rename — COMPONENT_* → Component - * convention
- **source**: filename hygiene
- **updated**:
  - [[Component - Agents ChatGXY Persistence]] — renamed from COMPONENT_AGENTS_CHATGXY_PERSISTENCE.md
  - [[Component - UI Error Handling]] — renamed from COMPONENT_UI_ERROR_HANDLING.md; added missing `research/component` tag
  - [[Component - Agents UX]] — wiki-link updates
  - [[Component - Agents Backend]] — wiki-link updates
  - [[PR 21434 - AI Agent Framework and ChatGXY]] — wiki-link updates
  - [[PR 21692 - Standardize Agent API Schemas]] — wiki-link updates
  - [[PR 21942 - Shared Agent Operations and MCP Server]] — wiki-link updates

## 2026-05-21 ingest — PR 22070 - Static YAML Agent Backend for Deterministic Testing
- **source**: https://github.com/galaxyproject/galaxy/pull/22070
- **created**: [[PR 22070 - Static YAML Agent Backend for Deterministic Testing]]
- **updated**:
  - [[PR 21434 - AI Agent Framework and ChatGXY]] — backlink to PR 22070 (alternate registry impl)
  - [[PR 21692 - Standardize Agent API Schemas]] — backlink to PR 22070 (static backend emits these shapes)
  - [[PR 21942 - Shared Agent Operations and MCP Server]] — backlink to PR 22070 (sibling agent-stack PR)
  - [[PR 21706 - Data Analysis Agent Integration]] — backlink to PR 22070 (deterministic test regression guard)
  - [[PR 21463 - Jupyternaut Adapter for JupyterLite]] — backlink to PR 22070 (shares inference_services surface)
  - [[Component - Agents Backend]] — backlink to PR 22070 (alternate AgentRegistry impl)
  - [[Component - Agents UX]] — backlink to PR 22070 (Selenium coverage for ChatGXY/Wizard)
  - [[Component - Agents ChatGXY Persistence]] — backlink to PR 22070 (surface now rebranded GalaxyAI post-merge)
  - [[Component - E2E Tests - Writing]] — backlink to PR 22070 (new data-description selector tests)

## 2026-05-21 ingest — Plan - ChatGXY Notebook Convergence
- **source**: vault/plans/CHATGXY_NOTEBOOK_CONVERGE_PLAN.md (renamed)
- **created**: [[Plan - ChatGXY Notebook Convergence]]
- **updated**:
  - meta_tags.yml — added `galaxy/agents` tag (covers chat/agent surfaces)
  - [[Component - Agents Backend]] — added `galaxy/agents` tag
  - [[Component - Agents UX]] — added `galaxy/agents` tag; revision bump
  - [[Component - Agents ChatGXY Persistence]] — added `galaxy/agents` tag; revision bump
  - [[PR 21434 - AI Agent Framework and ChatGXY]] — added `galaxy/agents` tag; revision bump
  - [[PR 21463 - Jupyternaut Adapter for JupyterLite]] — added `galaxy/agents` tag; revision bump
  - [[PR 21692 - Standardize Agent API Schemas]] — added `galaxy/agents` tag
  - [[PR 21706 - Data Analysis Agent Integration]] — added `galaxy/agents` tag
  - [[PR 21942 - Shared Agent Operations and MCP Server]] — added `galaxy/agents` tag; revision bump
  - [[PR 22070 - Static YAML Agent Backend for Deterministic Testing]] — added `galaxy/agents` tag; revision bump
  - vault/plans/TOOL_FORM_POPULATE_REFACTOR.md — added missing `title`; dropped non-registered `galaxy/refactor` tag; revision bump

## 2026-05-21 ingest — Plan - Chat Context and Docked Panel Tests
- **source**: vault/plans/TEST_CHAT_CONTEXT.md (renamed)
- **created**: [[Plan - Chat Context and Docked Panel Tests]]
- **updated**: none

## 2026-05-22 ingest — PR 22615 - UserToolSource Pydantic Semantic Validation
- **source**: https://github.com/galaxyproject/galaxy/pull/22615
- **created**: [[PR 22615 - UserToolSource Pydantic Semantic Validation]]
- **updated**:
  - [[Component - User-Defined Tool Source Validation]] — added PR 22615 to related_prs/notes; direct extension of this surface
  - [[Component - User-Defined Tools]] — added PR 22615 to related_prs/notes; hardening step in the initiative
  - [[PR 19434 - User Defined Tools]] — backlink to PR 22615
  - [[PR 21434 - AI Agent Framework and ChatGXY]] — backlink to PR 22615; CustomToolAgent error path changed
  - [[Component - Agents Backend]] — backlink to PR 22615; validation flow into producer reflection loop
  - [[Dependency - Pydantic Dynamic Models]] — backlink to PR 22615; field_validator/model_validator usage

## 2026-06-03 ingest — PR 22692 - LLM Eval Harness for Agents
- **source**: https://github.com/galaxyproject/galaxy/pull/22692
- **created**: [[PR 22692 - LLM Eval Harness for Agents]]
- **updated**:
  - [[PR 21942 - Shared Agent Operations and MCP Server]] — backlink; this PR adds file-source methods + MCP tools on top
  - [[PR 22070 - Static YAML Agent Backend for Deterministic Testing]] — backlink; static-backend deterministic counterpart to this real-LLM harness
  - [[PR 21434 - AI Agent Framework and ChatGXY]] — backlink; defines the agent fleet under evaluation
  - [[PR 21692 - Standardize Agent API Schemas]] — backlink; AgentResponse shape the eval tasks read
  - [[Component - Agents Backend]] — backlink; system under eval
  - [[Component - Agents UX]] — backlink; routing decisions scored here drive these surfaces
