---
type: research
subtype: pr
tags:
  - research/pr
  - galaxy/api
  - galaxy/lib
  - galaxy/admin
github_pr: 21942
github_repo: galaxyproject/galaxy
status: draft
created: 2026-04-29
revised: 2026-04-29
revision: 1
ai_generated: true
summary: "Shared AgentOperationsManager wraps Galaxy services for HistoryAgent and an in-process FastMCP server mounted at /api/mcp"
sources:
  - "https://github.com/galaxyproject/galaxy/pull/21942"
related_notes:
  - "[[PR 21434 - AI Agent Framework and ChatGXY]]"
  - "[[PR 21692 - Standardize Agent API Schemas]]"
  - "[[PR 21706 - Data Analysis Agent Integration]]"
  - "[[PR 21463 - Jupyternaut Adapter for JupyterLite]]"
  - "[[Component - Agents Backend]]"
  - "[[Component - Agents UX]]"
  - "[[COMPONENT_AGENTS_CHATGXY_PERSISTENCE]]"
---

# PR #21942 Research: Shared Operations Layer for Internal and External AI Agents

## PR Overview

| Field | Value |
|-------|-------|
| Author | dannon |
| State | MERGED |
| Created | 2026-02-26 |
| Merged | 2026-04-03 |
| Merge SHA | `c8e1732a5a` |
| Branch | `agents` |
| Verified against `origin/dev` | `7765fae934` |
| Labels | area/API, area/admin, area/dependencies, area/documentation, area/testing, area/testing/api, area/testing/integration |

Builds on [[PR 21434 - AI Agent Framework and ChatGXY]].

## Summary

Adds `AgentOperationsManager` (`lib/galaxy/agents/operations.py`, ~875 lines) — a single layer wrapping Galaxy service-layer calls (tools, histories, jobs, datasets, workflows, invocations) for AI consumers — and exposes it externally via an in-process FastMCP server mounted on Galaxy's FastAPI app at `/api/mcp` (configurable). Auth is API-key based via `UserManager.by_api_key`, with the key passed as a parameter on every MCP tool call rather than via transport headers. Internally, only the new `HistoryAgent` consumes the manager directly; other agents (router, error_analysis, custom_tool, orchestrator, tools) were slimmed but still reach Galaxy through `GalaxyAgentDependencies`. Enable via `enable_mcp_server: true` in `galaxy.yml`.

## Architecture

### `AgentOperationsManager` — `lib/galaxy/agents/operations.py` (NEW)

- `class AgentOperationsManager(app: MinimalManagerApp, trans: ProvidesUserContext)` — line 50.
- Lazy service properties (lines 89–149) resolve `tools_service`, `histories_service`, `jobs_service`, `datasets_service`, `workflows_service`, `invocations_service`, `hda_manager`, `dataset_collections_service` via `self.app[ServiceClass]`.
- ID encoding helpers `_encode_id` / `_encode_ids_in_response` (lines 65–87) walk dicts/lists and rewrite numeric values for keys in `ID_FIELDS` (line 35: `id`, `history_id`, `dataset_id`, `job_id`, `workflow_id`, `invocation_id`, `user_id`, `hda_id`, `hdca_id`, `collection_id`, `creating_job`).
- Operation methods (line numbers in `operations.py`): `connect` 151, `search_tools` 172, `get_tool_details` 194, `list_histories` 233, `run_tool` 260, `get_job_status` 270, `create_history` 281, `get_history_details` 293, `get_history_contents` 308, `get_dataset_details` 358, `get_collection_details` 374, `upload_file_from_url` 395, `list_workflows` 424, `get_workflow_details` 460, `invoke_workflow` 476, `get_invocations` 504, `get_invocation_details` 547, `cancel_workflow_invocation` 562, `get_tool_panel` 578, `get_tool_run_examples` 586, `get_tool_citations` 622, `search_tools_by_keywords` 650, `list_history_ids` 695, `get_job_details` 717, `get_job_errors` 745, `peek_dataset_content` 780, `download_dataset` 815, `get_server_info` 842, `get_user` 861.

### MCP endpoint — `lib/galaxy/webapps/galaxy/api/mcp.py` (NEW, 436 lines)

- `get_mcp_app(gx_app)` (line 87) sets `fastmcp_settings.stateless_http = True` (line 89) — required for multi-worker Gunicorn — instantiates `FastMCP("Galaxy")` (line 91), and registers ~28 `@mcp.tool()` callables.
- `get_operations_manager(api_key, ctx)` (line 96): `UserManager.by_api_key` → on success builds `WorkRequestContext(app=gx_app, user=user, url_builder=url_builder)` → returns `AgentOperationsManager`. Invalid/missing key raises `ValueError`.
- `get_mcp_url_builder(fallback_base_url)` (line 29) reads fastmcp's private `_current_http_request` ContextVar to get the live request and produce a real `UrlBuilder`; falls back to a hand-written `MCPUrlBuilder` (line 40) with hardcoded shapes for `history`, `history_contents`, `dataset` and a generic `/api/{name}` fallback.
- `_mcp_error_handler(operation)` (line 76) — context manager mapping `ValueError` to operation-named errors.
- Exposed MCP tools: `connect`, `search_tools`, `get_tool_details`, `list_histories`, `run_tool`, `get_job_status`, `create_history`, `get_history_details`, `get_history_contents`, `get_dataset_details`, `get_collection_details`, `upload_file_from_url`, `list_workflows`, `get_workflow_details`, `invoke_workflow`, `get_invocations`, `get_invocation_details`, `cancel_workflow_invocation`, `get_tool_panel`, `get_tool_run_examples`, `get_tool_citations`, `search_tools_by_keywords`, `list_history_ids`, `get_job_details`, `download_dataset`, `get_server_info`, `get_user`. Note: `peek_dataset_content` is on the manager but **not** exposed via MCP — only used by the internal `HistoryAgent`.

### FastAPI integration — `lib/galaxy/webapps/galaxy/fast_app.py`

- `get_mcp_lifespan(gx_app)` (line 264) early-returns `(None, None)` when `enable_mcp_server` is falsy. On success returns `(mcp_app, mcp_app.lifespan)`. Catches `ImportError` (fastmcp missing) and generic `Exception` (line 277) so a broken MCP doesn't crash startup.
- `include_mcp(app, gx_app, mcp_app)` (line 282): `app.mount(gx_app.config.mcp_server_path, mcp_app)`.
- `initialize_fast_app` (line 295) wires MCP into a `combined_lifespan` async context manager (lines 302–305) so FastMCP runs alongside Galaxy's lifespan, then calls `include_mcp` (line 325) after `include_all_package_routers` and before the WSGI mount at `/`.

### Internal agents

- `lib/galaxy/agents/base.py` (refactor +56/−257; current 628 lines): `AgentType` constants (line 145, including new `HISTORY = "history"` at line 153), `AgentResponse` (157), `GalaxyAgentDependencies` dataclass (180) carrying `trans`, `user`, `config`, `get_agent` callback, optional managers (`job_manager`, `dataset_manager`, `workflow_manager`, `tool_cache`, `toolbox`, `model_factory`). `BaseGalaxyAgent` ABC at 197 with `_create_agent`, `get_system_prompt`, `_validate_query` (prompt-injection patterns at 229–237), `_run_with_retry` exponential backoff. Helpers: `extract_result_content` 86, `extract_usage_info` 95, `extract_structured_output` 110, `normalize_llm_text` 137.
- `lib/galaxy/agents/history.py` (NEW, 142 lines) — `HistoryAgent` (line 27) is the **only** internal consumer of `AgentOperationsManager`. `__init__` (line 32) builds `self.ops = AgentOperationsManager(app=deps.trans.app, trans=deps.trans)`. pydantic-ai `@agent.tool` callbacks wrap ops methods: `list_user_histories → ops.list_histories`, `get_history_info → ops.get_history_details`, `list_datasets → ops.get_history_contents` (limit=500, order="hid-asc"), `get_dataset_info → ops.get_dataset_details`, `get_job_for_dataset → ops.get_job_details`, `get_job_errors → ops.get_job_errors`, `get_tool_citations → ops.get_tool_citations`, `get_tool_info → ops.get_tool_details`, `peek_dataset_content → ops.peek_dataset_content`. `MalformedId` is caught and converted to `{"error": ...}` for the LLM.
- `lib/galaxy/agents/router.py` (+136/−171): `QueryRouterAgent` (line 37), pydantic-ai output-functions design with a deepseek branch (line 45) for models without structured output. Does **not** use `AgentOperationsManager`.
- `lib/galaxy/agents/orchestrator.py` (+88/−71): `WorkflowOrchestratorAgent` (line 47), `AgentPlan` BaseModel (39), sequential (189) and parallel (226) execution paths via `deps.get_agent`. Calls sub-agents, not the ops manager.
- `lib/galaxy/agents/error_analysis.py` (+32/−154): `ErrorAnalysisResult` (line 35), `ErrorAnalysisAgent` (47) — structured-output vs text-fallback branches.
- `lib/galaxy/agents/tools.py` (+13/−74): `ToolRecommendationAgent` (line 48), reaches the toolbox via `deps`.
- `lib/galaxy/agents/custom_tool.py` (+13/−30): `CustomToolAgent` (line 35), structured output required (`_requires_structured_output` line 45).
- `lib/galaxy/agents/registry.py` (+4/−38): `AgentRegistry` (line 18). `build_default_registry(config=None)` (88) registers `HistoryAgent` (131); other agents gated by `_is_enabled` (108) reading config keys.

### Config & dependency

- `lib/galaxy/config/schemas/config_schema.yml` lines 4309–4331: `enable_mcp_server` (bool, default `false`, line 4309) and `mcp_server_path` (str, default `/api/mcp`, line 4323).
- `lib/galaxy/config/sample/galaxy.yml.sample` lines 3152–3159: commented examples for both keys.
- `lib/galaxy/dependencies/conditional-requirements.txt` line 19: `fastmcp>=2.13.0` (note: PR body imprecisely references "mcp" — the dependency is `fastmcp`, not the lower-level `mcp` package).
- `lib/galaxy/dependencies/__init__.py` lines 313–314: `check_fastmcp(self): return asbool(self.config.get("enable_mcp_server", False))`.

## Tests

- `test/unit/app/managers/test_AgentOperationsManager.py` (NEW, 318 lines): `TestAgentOperationsManagerBasic` (line 9) covers `connect`, `connect_requires_user`, `get_user`, `get_server_info`. `TestAgentOperationsManagerWithMockedServices` (49) covers create/list_histories (with name filter), `get_collection_details` element truncation @ 500, `get_workflow_details` with version, `invoke_workflow` with history-name + history-required validation, `get_history_contents` filters, `get_tool_run_examples` with version, `search_tools`, `get_tool_details` (incl. not-found), `run_tool`, `get_job_status` — all against mocked services.
- `test/integration/test_agents.py` (+263 lines, current 404): pre-existing `TestAgentsApi` (47) and `TestAgentsApiLiveLLM` (73, gated on live LLM env). New `TestAgentOperationsManagerEncoding` (175) asserts ID encoding (nested ints, preserves non-ID fields, idempotent on already-encoded IDs). New `TestMCPServerSmoke` (274) sets `enable_mcp_server: True` (284) and `test_mcp_server_initializes` (305) confirms the FastMCP instance exists when enabled.
- `test/unit/app/test_agents.py` (+70/−23, 651 lines): config fallback chain, custom_tool structured output, registry build/disabled-agent behavior, error_analysis admin suggestions, router/orchestrator with `TestModel`, prompt-injection rejection, sequential/parallel orchestration. No MCP cases.

## Cross-checks vs PR body

- **Endpoint at `/api/mcp`**: VERIFIED. Default `mcp_server_path` `/api/mcp` (config_schema.yml:4325); mount at `fast_app.py:288`.
- **`enable_mcp_server` / `mcp_server_path` config keys**: VERIFIED.
- **"Shared layer used by both internal and external agents"**: PARTIALLY TRUE. Used by `api/mcp.py` and `agents/history.py`. Router, orchestrator, error_analysis, custom_tool, and tool_recommendation were slimmed but **continue to access Galaxy via `GalaxyAgentDependencies`**, not `AgentOperationsManager`. PR body reads broader than reality.
- **Conditional dep is `mcp` package**: FALSE. Added line is `fastmcp>=2.13.0` — `fastmcp` (a higher-level wrapper), not the lower-level `mcp` package.
- **Stateless HTTP for multi-worker**: VERIFIED at `mcp.py:89`.
- **MCP "inherits Galaxy auth/CORS/rate-limiting"**: PARTIALLY VERIFIED. Auth is API-key only (passed as a *tool parameter*, not transport header). CORS inheritance via `app.mount` is plausible. **Rate limiting (slowapi `Limiter`) hooks routes by name and is unlikely to apply to mounted sub-app endpoints** — claim should be treated skeptically; not asserted by tests.

## Unresolved questions

- Why does the PR title promise a shared layer "for internal and external" while only `HistoryAgent` actually adopts `AgentOperationsManager`? Are router/error_analysis/orchestrator scheduled to migrate, or is the manager intentionally external-facing?
- `peek_dataset_content` is on the ops manager but not exposed via MCP — intentional content-leak guard, or oversight?
- `MCPUrlBuilder` fallback only handles `history`, `history_contents`, `dataset`; everything else collapses to `/api/{name}`. What breaks when ops methods need other route names off-request (background tasks)?
- Reliance on `fastmcp.server.http._current_http_request` (private API; `mcp.py:32` comment acknowledges) — maintenance risk on fastmcp >2.13?
- API-key-as-parameter on every MCP tool call vs header auth — most MCP clients pass auth via transport. Rationale?
- `fastmcp_settings.stateless_http = True` is a **module-level** flag — does this leak into other potential MCP integrations or shared-process tests?
- Rate-limiting/CORS coverage of the mounted MCP sub-app is unverified by tests; smoke test only checks server initialization.
- `fastmcp>=2.13.0` floor is recent — documented compatibility window?
- Local file upload doesn't translate (per PR body); is `upload_file_from_url` the only intended ingest path, or is there a tracking issue?

## Changes since merge

`git log c8e1732a5a..origin/dev -- lib/galaxy/agents/ lib/galaxy/webapps/galaxy/api/mcp.py` returns one commit:

- `dbfcdb8bc9` — "python packages: convert to pure namespace packages" (mechanical packaging-only; no behavioral or rename impact).

`fast_app.py` and `config_schema.yml` saw subsequent activity (statsd middleware, webdav refactor, aiocop middleware, celery rate-limiting) but none touched the MCP-mount path or the two new config keys.

## Related

- [[PR 21434 - AI Agent Framework and ChatGXY]] — original framework refactored here.
- [[PR 21692 - Standardize Agent API Schemas]] — agent response schemas; ops manager returns dicts that bypass these schemas.
- [[PR 21706 - Data Analysis Agent Integration]] — sibling agent addition (DSPy / Pyodide).
- [[PR 21463 - Jupyternaut Adapter for JupyterLite]] — comparable external AI integration mounting/auth pattern.
- [[Component - Agents Backend]] — backend agent architecture; needs revision for ops manager + HistoryAgent.
- [[Component - Agents UX]] — UX surfaces; MCP is a new external surface alongside ChatGXY/wizard/Jupyternaut.
- [[COMPONENT_AGENTS_CHATGXY_PERSISTENCE]] — ChatGXY persistence; MCP is the non-persistent peer entry point.
