---
type: research
subtype: pr
tags:
  - research/pr
  - galaxy/api
  - galaxy/client
github_pr: 21434
github_repo: galaxyproject/galaxy
status: draft
created: 2026-02-13
revised: 2026-02-13
revision: 1
ai_generated: true
---

# PR #21434 Research: Add AI Agent Framework and ChatGXY 2.0

## PR Overview

| Field | Value |
|-------|-------|
| Title | Add AI Agent Framework and ChatGXY 2.0 |
| Number | #21434 |
| URL | https://github.com/galaxyproject/galaxy/pull/21434 |
| State | MERGED |
| Merged | 2025-12-23 |
| Merge Commit | eed4223589bdd5be9feafec4b755d8624406dc7d |
| Author | dannon (Dannon) |
| Base Branch | dev |
| Head Branch | agent-based-ai |
| Changed Files | 52 |
| Additions | 6861 |
| Deletions | 233 |

### Summary

Introduces a multi-agent AI framework for Galaxy built on pydantic-ai. The framework provides:
- Base agent classes with structured output, retry logic, and model-agnostic configuration
- A registry pattern for dynamic agent registration
- A service layer (`AgentService`) mediating between API and agents
- Dual API surface: `/api/chat` (conversational) and `/api/ai/agents/*` (programmatic)
- Per-agent model/temperature configuration via `inference_services` config key
- A full-page ChatGXY 2.0 frontend component with conversation history, feedback, and action suggestions
- Five initial agents: Router, Error Analysis, Custom Tool, Orchestrator, Tool Recommendation

---

## Architecture

### Agent Base Class Design (`lib/galaxy/agents/base.py`)

The framework centers on `BaseGalaxyAgent` (ABC). Key design:

```
BaseGalaxyAgent (ABC)
  |-- agent_type: str (class attribute)
  |-- agent: Agent[GalaxyAgentDependencies, Any] (pydantic-ai Agent)
  |-- _create_agent() -> Agent  (abstract)
  |-- get_system_prompt() -> str  (abstract)
  |-- process(query, context) -> AgentResponse  (main entry point)
  |-- _run_with_retry(prompt, max_retries=3)  (exponential backoff)
  |-- _get_model() -> model  (multi-provider: OpenAI, Anthropic, Google)
  |-- _get_agent_config(key, default)  (4-level config cascade)
  |-- _supports_structured_output() -> bool
  |-- _build_response(...) -> AgentResponse  (metadata builder)
  |-- _call_agent_from_tool(...)  (agent-to-agent delegation)

SimpleGalaxyAgent(BaseGalaxyAgent)
  |-- _create_agent() -> Agent[..., str]
  |-- Text-only output, keyword-based confidence extraction
```

**Dependency Injection**: `GalaxyAgentDependencies` is a `@dataclass` carrying:
- `trans` (ProvidesUserContext), `user`, `config`
- Optional: `job_manager`, `dataset_manager`, `workflow_manager`, `tool_cache`, `toolbox`
- `get_agent` callable (for inter-agent calls, avoids circular imports)
- `model_factory` callable (for testing)

**Model Resolution**: `_get_model()` parses model spec prefixes:
- `anthropic:claude-sonnet-4-5` -> AnthropicModel + AnthropicProvider
- `google:gemini-2.5-pro` -> GoogleModel + GoogleProvider
- `openai:gpt-4o` or plain `gpt-4o` -> OpenAIChatModel + OpenAIProvider
- Any model + `api_base_url` -> OpenAI-compatible (vLLM, Ollama, LiteLLM)

**Config Cascade** (`_get_agent_config`):
1. Agent-specific: `inference_services.<agent_type>.<key>`
2. Default: `inference_services.default.<key>`
3. Global: `ai_model`, `ai_api_key`, `ai_api_base_url`
4. Hardcoded default

### Registry Pattern (`lib/galaxy/agents/registry.py`)

Simple dict-based registry mapping `agent_type` string -> `BaseGalaxyAgent` subclass.

```python
class AgentRegistry:
    _agents: dict[str, type[BaseGalaxyAgent]]
    register(agent_type, agent_class, metadata)
    get_agent(agent_type, deps) -> BaseGalaxyAgent  # creates instance
    list_agents() -> list[str]
```

Global singleton instantiated in `lib/galaxy/agents/__init__.py`:
```python
agent_registry = AgentRegistry()
agent_registry.register(AgentType.ROUTER, QueryRouterAgent)
agent_registry.register(AgentType.ERROR_ANALYSIS, ErrorAnalysisAgent)
agent_registry.register(AgentType.CUSTOM_TOOL, CustomToolAgent)
agent_registry.register(AgentType.ORCHESTRATOR, WorkflowOrchestratorAgent)
agent_registry.register(AgentType.TOOL_RECOMMENDATION, ToolRecommendationAgent)
```

### Service Layer (`lib/galaxy/managers/agents.py`)

`AgentService` bridges the API layer and agent framework:
- `create_dependencies(trans, user)` -> `GalaxyAgentDependencies`
- `execute_agent(agent_type, query, trans, user, context)` -> `AgentResponse`
- `route_and_execute(query, ..., agent_type="auto")` -> `AgentResponse`
  - `agent_type="auto"` delegates to router agent
  - Explicit agent_type bypasses router

Falls back to router for unknown agent types. Uses `try/except ImportError` guard so the framework degrades gracefully if pydantic-ai is not installed (`HAS_AGENTS = False`).

### Router Agent (`lib/galaxy/agents/router.py`)

The router is the primary entry point. Uses pydantic-ai **output functions** for specialist handoff:
- `hand_off_to_error_analysis(ctx, task)` -> creates ErrorAnalysisAgent, processes, serializes response as JSON
- `hand_off_to_custom_tool(ctx, request)` -> creates CustomToolAgent
- `hand_off_to_tool_recommendation(ctx, query)` -> creates ToolRecommendationAgent
- Default: returns `str` (direct answer)

The router's `process()` checks if the result is a serialized handoff (JSON with `__handoff__` key) and unwraps it into a proper `AgentResponse` preserving the delegated agent's metadata.

Fallback behavior: keyword-based query classification (error keywords, tool creation keywords, training keywords, citation requests) when the LLM is unreachable.

### Orchestrator Agent (`lib/galaxy/agents/orchestrator.py`)

Multi-agent coordination for complex tasks:
- Uses LLM to produce an `AgentPlan` (list of agents, sequential flag, reasoning)
- Executes agents in parallel (`asyncio.gather`) or sequentially
- Timeout protection per agent (configurable, default 60s)
- Combines responses with markdown section headers

### Error Analysis Agent (`lib/galaxy/agents/error_analysis.py`)

Structured output: `ErrorAnalysisResult` (pydantic model with category, severity, cause, solution steps).
- Can fetch job details via `JobManager`
- Has tool info lookup
- Keyword-based error pattern matching (memory, permission, command not found)
- Dual mode: structured output for capable models, text parsing for others (DeepSeek fallback)

### Custom Tool Agent (`lib/galaxy/agents/custom_tool.py`)

Requires structured output (`_requires_structured_output() = True`).
- Output type: `UserToolSource` (from `galaxy.tool_util_models`)
- Generates YAML tool definitions
- Returns SAVE_TOOL action suggestion with the generated YAML
- Graceful error for models without JSON schema support (vLLM, LiteLLM)

### Tool Recommendation Agent (`lib/galaxy/agents/tools.py`)

**Note**: This file (`tools.py`) was NOT in the original PR. It was added post-merge. The PR had tool_recommendation as a concept referenced in the router but not as a standalone agent file.

Uses pydantic-ai `@agent.tool` decorators for live toolbox search:
- `search_galaxy_tools(query)` -> searches Galaxy's toolbox
- `get_galaxy_tool_details(tool_id)` -> detailed tool info
- `get_galaxy_tool_categories()` -> available categories

Fast path: bypasses LLM for exact tool name matches.
Verifies recommended tools exist in toolbox before suggesting them.

### Configuration System

**`lib/galaxy/config/schemas/config_schema.yml`** adds:
```yaml
inference_services:
  type: any
  required: false
  desc: >
    Per-agent model, temperature, token settings.
    Agents inherit from 'default', which falls back to ai_model/ai_api_key.
```

**`lib/galaxy/config/__init__.py`** adds `_load_agent_config()`:
- Sets default agent configs (router, error_analysis, dataset_analyzer, custom_tool)
- Merges with user-provided config

### API Surface

#### Agent API (`lib/galaxy/webapps/galaxy/api/agents.py`)

All endpoints under `/api/ai/agents/`, all marked `unstable=True`:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ai/agents` | List available agents |
| POST | `/api/ai/agents/query` | Unified query with auto-routing (DEPRECATED - use /api/chat) |
| POST | `/api/ai/agents/error-analysis` | Direct error analysis |
| POST | `/api/ai/agents/custom-tool` | Direct custom tool creation |

#### Chat API (`lib/galaxy/webapps/galaxy/api/chat.py`)

Enhanced `/api/chat` endpoints, all `unstable=True`:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat` | Main ChatGXY endpoint (both job-based and general) |
| GET | `/api/chat/history` | Get user's chat history |
| DELETE | `/api/chat/history` | Clear non-job chat history |
| PUT | `/api/chat/{job_id}/feedback` | Job-based feedback |
| PUT | `/api/chat/exchange/{exchange_id}/feedback` | General exchange feedback |
| GET | `/api/chat/exchange/{exchange_id}/messages` | Get conversation messages |

The chat endpoint supports:
- Backwards compat: `job_id` query param + `ChatPayload` body
- New format: `query` + `agent_type` query params
- Multi-turn: `exchange_id` in payload continues a conversation
- Returns `ChatResponse` with optional `agent_response: AgentResponse`

### Schemas (`lib/galaxy/schema/agents.py`)

Core types:
- `ConfidenceLevel` (enum: low/medium/high)
- `ActionType` (enum: tool_run/save_tool/contact_support/view_external/documentation)
- `ActionSuggestion` (action_type, description, parameters, confidence, priority) - with validators
- `AgentResponse` (content, confidence, agent_type, suggestions, metadata, reasoning)
- `AgentQueryRequest` / `AgentQueryResponse` (DEPRECATED)
- `AvailableAgent` / `AgentListResponse`
- `RoutingDecision`
- `ErrorAnalysisRequest` / `ErrorAnalysisResponse`
- `DatasetAnalysisRequest` / `DatasetAnalysisResponse` (forward-looking, not yet used)
- `WorkflowOptimizationRequest` / `WorkflowOptimizationResponse` (forward-looking)
- `AgentMetrics` / `AgentStatus` / `SystemStatus` (forward-looking)

Also modifies `lib/galaxy/schema/schema.py`:
- `ChatPayload` adds `exchange_id` and `regenerate` fields
- `ChatResponse` adds `agent_response: Optional[AgentResponse]`

### Frontend Components

#### ChatGXY (`client/src/components/ChatGXY.vue`)

Full-page chat interface (982 lines). Features:
- Notebook-style cell UI (query cells + response cells)
- Agent type selector (auto, router, error_analysis, custom_tool, dataset_analyzer, gtn_training)
- Conversation history sidebar with load/clear
- Multi-turn conversations (sends `exchange_id` to continue)
- Feedback buttons (thumbs up/down) persisted to backend
- Markdown rendering via `useMarkdown` composable
- Action suggestion cards via `ActionCard` component
- Response stats: agent type, model name, token count
- Routing badge ("via Router") for handoff responses
- Skeleton loading animation

Registered as activity in `activitySetup.ts`:
```ts
{ id: "chatgxy", title: "ChatGXY", to: "/chatgxy", icon: faComments }
```

Route in `client/src/entry/analysis/router.js`:
```js
{ path: "chatgxy", component: ChatGXY, redirect: redirectAnon() }
```

#### ActionCard (`client/src/components/ChatGXY/ActionCard.vue`)

Renders action suggestion buttons, sorted by priority. Maps action types to FontAwesome icons.

#### Agent Actions Composable (`client/src/composables/agentActions.ts`)

Handles frontend action dispatch:
- `TOOL_RUN`: navigates to tool panel with tool_id
- `SAVE_TOOL`: parses YAML, calls `/api/unprivileged_tools`, redirects to tool editor
- `CONTACT_SUPPORT`: opens support URL
- `VIEW_EXTERNAL`: opens URL in new tab
- `DOCUMENTATION`: navigates to tool help or GTN

#### GalaxyWizard (`client/src/components/GalaxyWizard.vue`)

Updated to use the new `/api/ai/agents/error-analysis` endpoint directly instead of the old chat endpoint. Still used for job error analysis from the DatasetError view.

---

## File Inventory

### New Files (added by PR)

| PR Path | Status | Current Lines | Notes |
|---------|--------|---------------|-------|
| `lib/galaxy/agents/__init__.py` | EXISTS | 40 | Registers 5 agents (PR had 4, tool_recommendation added post-merge) |
| `lib/galaxy/agents/base.py` | EXISTS, MODIFIED | 833 | Significantly expanded since PR (was ~650 lines). Added `_call_agent_from_tool`, `SimpleGalaxyAgent`, better model provider logic |
| `lib/galaxy/agents/registry.py` | EXISTS | 140 | Unchanged from PR |
| `lib/galaxy/agents/router.py` | EXISTS, MODIFIED | 417 | Significantly refactored. PR used structured `RoutingDecision` output; now uses pydantic-ai output functions for handoff |
| `lib/galaxy/agents/orchestrator.py` | EXISTS | 290 | Minor changes from PR |
| `lib/galaxy/agents/error_analysis.py` | EXISTS, MODIFIED | 399 | Added `ConfidenceLiteral` type alias, `normalize_llm_text` usage, expanded parsing |
| `lib/galaxy/agents/custom_tool.py` | EXISTS, MODIFIED | 220 | Switched to `UserToolSource` output type (PR used `CustomToolDefinition`). Added `ModelHTTPError`/`UnexpectedModelBehavior` handlers |
| `lib/galaxy/agents/prompts/router.md` | EXISTS | - | System prompt for router |
| `lib/galaxy/agents/prompts/error_analysis.md` | EXISTS | - | System prompt for error analysis |
| `lib/galaxy/agents/prompts/orchestrator.md` | EXISTS | - | System prompt for orchestrator |
| `lib/galaxy/agents/prompts/custom_tool_structured.md` | EXISTS | - | System prompt for custom tool |
| `lib/galaxy/managers/agents.py` | EXISTS | 136 | Mostly unchanged |
| `lib/galaxy/schema/agents.py` | EXISTS, MODIFIED | 235 | Expanded with forward-looking schemas (DatasetAnalysis, WorkflowOptimization, Metrics) |
| `lib/galaxy/webapps/galaxy/api/agents.py` | EXISTS, MODIFIED | 235 | Removed tool_recommendation endpoint. Added DEPRECATED notice on /query. Cleaned up |
| `client/src/components/ChatGXY.vue` | EXISTS | 982 | New file |
| `client/src/components/ChatGXY/ActionCard.vue` | EXISTS | 126 | New file |
| `client/src/composables/agentActions.ts` | EXISTS | 241 | New file |
| `test/integration/test_agents.py` | EXISTS, MODIFIED | 370 | Expanded with more test cases |
| `test/unit/app/test_agents.py` | EXISTS, MODIFIED | 563 | Expanded with more test cases |
| `packages/app/galaxy/agents` | EXISTS | - | Symlink for package |

### Files NOT in PR but Added Post-Merge

| Current Path | Lines | Notes |
|-------------|-------|-------|
| `lib/galaxy/agents/tools.py` | 550 | `ToolRecommendationAgent` with live toolbox search. NOT in original PR |
| `lib/galaxy/agents/prompts/tool_recommendation.md` | - | System prompt for tool recommendation. NOT in original PR |

### Existing Files Modified by PR

| PR Path | Status | Notes |
|---------|--------|-------|
| `lib/galaxy/managers/chat.py` | EXISTS, MODIFIED | 313 lines. Added `create_general_chat`, `add_message`, `get_chat_history`, `get_user_chat_history`, `set_feedback_for_exchange`, `get_exchange_by_id`. Major expansion from simple job-chat to full conversation support |
| `lib/galaxy/webapps/galaxy/api/chat.py` | EXISTS, MODIFIED | 497 lines. Complete rewrite: added agent system integration, multi-turn conversations, history/feedback endpoints |
| `lib/galaxy/config/__init__.py` | EXISTS, MODIFIED | Added `_load_agent_config()`, `inference_services` handling |
| `lib/galaxy/config/schemas/config_schema.yml` | EXISTS, MODIFIED | Added `inference_services` schema |
| `lib/galaxy/schema/schema.py` | EXISTS, MODIFIED | Extended `ChatPayload` (exchange_id, regenerate), `ChatResponse` (agent_response) |
| `client/src/components/GalaxyWizard.vue` | EXISTS, MODIFIED | 170 lines. Switched from `/api/chat` to `/api/ai/agents/error-analysis` |
| `client/src/stores/activitySetup.ts` | EXISTS, MODIFIED | 269 lines. Added ChatGXY activity entry |
| `client/src/entry/analysis/router.js` | EXISTS, MODIFIED | Added chatgxy route |
| `client/src/components/DatasetInformation/DatasetError.vue` | EXISTS | Modified to integrate with new error analysis |
| `client/src/components/Tool/CustomToolEditor.vue` | EXISTS | Modified for custom tool saving |
| `lib/galaxy/dependencies/__init__.py` | EXISTS | Added `check_pydantic_ai` |
| `lib/galaxy/dependencies/pinned-requirements.txt` | EXISTS | Added pydantic-ai pins |
| `lib/galaxy/webapps/galaxy/api/__init__.py` | EXISTS | Added `unstable` decorator support |
| `lib/galaxy/webapps/galaxy/fast_app.py` | EXISTS | Registered agent API router |
| `lib/galaxy/managers/configuration.py` | EXISTS | Exposed `has_chat` config to frontend |
| `lib/galaxy/util/unittest_utils/__init__.py` | EXISTS | Added `pytestmark_live_llm` marker |
| `pyproject.toml` | EXISTS | Added `pydantic-ai>=1.56.0` dependency |

---

## Key Patterns and Conventions

### How Agents Are Defined

1. Create a class inheriting from `BaseGalaxyAgent` (or `SimpleGalaxyAgent`)
2. Set `agent_type` class attribute (string constant from `AgentType`)
3. Implement `_create_agent()` returning a `pydantic_ai.Agent` instance
4. Implement `get_system_prompt()` (typically reads from `prompts/*.md`)
5. Optionally override `process()` for custom flow (otherwise base class handles retry + format)
6. System prompts stored as markdown files in `lib/galaxy/agents/prompts/`

### How Agents Are Registered

In `lib/galaxy/agents/__init__.py` at module load time:
```python
agent_registry.register(AgentType.ROUTER, QueryRouterAgent)
```
The registry maps type strings to classes. Instances are created per-request via `AgentRegistry.get_agent(agent_type, deps)`.

### How the Router/Orchestrator Works

**Router flow** (default path for `/api/chat`):
1. ChatAPI receives query -> calls `AgentService.route_and_execute(agent_type="auto")`
2. Service delegates to router agent
3. Router's pydantic-ai agent chooses one of: direct answer (str), or output function handoff
4. If handoff: specialist agent is instantiated, processes query, result serialized as JSON
5. Router deserializes handoff, returns `AgentResponse` with specialist's agent_type and metadata

**Orchestrator flow** (for complex multi-agent tasks):
1. LLM produces `AgentPlan` (list of agents + sequential flag)
2. Agents executed in parallel or sequence with timeout protection
3. Responses combined into markdown sections

### How Configuration Flows

```
galaxy.yml:
  ai_api_key: "..."
  ai_model: "gpt-4o-mini"
  inference_services:
    default:
      model: "llama-4-scout"
      api_key: "..."
      api_base_url: "http://localhost:4000/v1/"
      temperature: 0.7
      max_tokens: 2000
    custom_tool:
      model: "anthropic:claude-sonnet-4-5"
      api_key: "sk-ant-..."
```

Config loaded in `GalaxyAppConfiguration.__init__()` -> `_load_agent_config()` sets defaults.
At runtime: `BaseGalaxyAgent._get_agent_config(key)` cascades:
agent-specific -> default inference -> global ai_* -> hardcoded.

### How the Frontend Integrates

1. `activitySetup.ts` registers ChatGXY as an activity bar entry
2. `router.js` maps `/chatgxy` to the `ChatGXY.vue` component
3. ChatGXY.vue calls `POST /api/chat` with query + agent_type + exchange_id
4. Response includes `agent_response` (structured) with `suggestions[]`
5. `ActionCard.vue` renders suggestion buttons
6. `agentActions.ts` composable dispatches actions (tool_run, save_tool, etc.)
7. `GalaxyWizard.vue` calls `POST /api/ai/agents/error-analysis` directly for job errors
8. All markdown content rendered via `useMarkdown` composable

---

## Dependencies

### New Python Packages

| Package | Version Constraint | Purpose |
|---------|-------------------|---------|
| `pydantic-ai` | `>=1.56.0` | Core agent framework (structured output, tool calling, multi-provider) |
| `pydantic-ai-slim` | `==1.56.0` | Pinned in requirements |

**Security note**: The version floor (1.56.0) is set due to GHSA-2jrp-274c-jhv3 security advisory.

### Optional Provider Dependencies

- `pydantic-ai[anthropic]` - for Anthropic/Claude support
- `pydantic-ai[google]` - for Google/Gemini support
- OpenAI is the default and always available via pydantic-ai

### Frontend Dependencies

No new npm packages. Uses existing:
- `@fortawesome/fontawesome-svg-core` (icons)
- `bootstrap-vue` (BSkeleton)
- `yaml` (for SAVE_TOOL action YAML parsing)

---

## Cross-references with History Notebooks

### Shared Infrastructure

1. **Markdown Rendering**: Both ChatGXY and history notebooks use the `useMarkdown` composable (`@/composables/markdown`). ChatGXY uses `renderMarkdown()` with `{ openLinksInNewPage: true, removeNewlinesAfterList: true }`. History notebooks likely use the same composable.

2. **Activity Bar**: Both features register as activities in `activitySetup.ts`. ChatGXY is `id: "chatgxy"`. History notebooks would use similar patterns.

3. **Page Infrastructure**: The `ChatResponse` model includes `agent_response: Optional[AgentResponse]` which is imported from `galaxy.schema.agents.AgentResponse`. History notebooks create pages. There's no direct dependency between the two, but both add to `schema.py`.

### No Direct Overlap

- The agent framework does NOT reference notebooks, pages, markdown export, or history content
- Agents work with jobs, tools, and chat exchanges -- not with history items as content
- ChatGXY operates in a separate UI route (`/chatgxy`) from history views
- The `ChatExchange` model (used by agents) is distinct from page/history models

### Potential Future Integration Points

- An agent that analyzes history contents or suggests workflows based on history
- History notebooks could embed agent-assisted analysis cells
- The `dataset_analyzer` agent type (referenced in UI but not yet implemented) could connect to history datasets
- Both use markdown: agent responses are markdown, history notebooks are markdown. Could share rendering pipeline.

### Schema Adjacency

The PR modifies `lib/galaxy/schema/schema.py` to extend `ChatPayload` and `ChatResponse`. History notebooks also touch schema files. No conflicts observed, but both expand the schema surface area.

---

## Notable Design Decisions

1. **Framework-first**: PR description explicitly states individual agents will evolve; the infrastructure is the core value.

2. **Graceful degradation**: `HAS_AGENTS` flag guards imports. If pydantic-ai isn't installed, the system falls back to legacy OpenAI chat.

3. **Model-agnostic**: Prefix-based model routing (`anthropic:`, `google:`, `openai:` or bare) with OpenAI-compatible fallback for local inference.

4. **Structured output flexibility**: Each agent checks `_supports_structured_output()` and falls back to text parsing for models like DeepSeek that lack JSON schema support.

5. **`unstable=True` on all endpoints**: Every new API endpoint uses the `unstable` decorator, which adds a warning to the OpenAPI description.

6. **GTN agent removed before merge**: The PR body mentions a GTN Training Helper agent, but it was removed from the final merge. References remain in the frontend UI (agent type selector includes `gtn_training`).

7. **ToolRecommendation added post-merge**: `lib/galaxy/agents/tools.py` (550 lines) and its prompt file are not in the PR diff. They were added after merge, bringing the actual toolbox search capability with `@agent.tool` decorators.

8. **DEPRECATED /api/ai/agents/query**: The unified query endpoint is already marked deprecated in favor of `/api/chat`, suggesting the chat endpoint is the intended long-term API surface.
