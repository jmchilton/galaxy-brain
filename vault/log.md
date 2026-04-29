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
