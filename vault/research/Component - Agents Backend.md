---
type: research
subtype: component
tags: [research/component, galaxy/api, galaxy/lib]
status: draft
created: 2026-02-13
revised: 2026-02-13
revision: 1
ai_generated: true
---

# Galaxy Agents Backend: API and Infrastructure Report

## Overview

Galaxy's agent system is a multi-agent AI framework built on [pydantic-ai](https://github.com/pydantic/pydantic-ai). It provides specialized AI assistants for Galaxy users -- answering platform questions, diagnosing job errors, creating custom tools, and recommending tools from the toolbox. The system ships as part of Galaxy core (not a plugin) and is gated behind AI API key configuration.

Key PRs that established this system:
- **#21434** (merged 2025-12-23): Initial agent framework, registry, five agents, ChatGXY 2.0 frontend
- **#21463** (merged 2026-01-06): Jupyternaut/JupyterLite OpenAI-compatible proxy adapter
- **#21692** (merged ~2026-02-11): Schema standardization, metadata consistency, suggestion validation
- **#21706** (OPEN, not merged): Data analysis agent with DSPy + Pyodide browser-side execution

This report covers the **current state** of the codebase on the `history_markdown` branch, which includes all merged PRs but **not** PR #21706.

---

## Package Layout

```
lib/galaxy/agents/
    __init__.py              # Module init, global registry, agent registration
    base.py                  # BaseGalaxyAgent, SimpleGalaxyAgent, AgentResponse, GalaxyAgentDependencies
    registry.py              # AgentRegistry class + global singleton
    router.py                # QueryRouterAgent (primary entry point)
    error_analysis.py        # ErrorAnalysisAgent
    custom_tool.py           # CustomToolAgent
    orchestrator.py          # WorkflowOrchestratorAgent
    tools.py                 # ToolRecommendationAgent
    prompts/
        router.md
        error_analysis.md
        custom_tool_structured.md
        orchestrator.md
        tool_recommendation.md

lib/galaxy/managers/
    agents.py                # AgentService (service layer between API and agents)
    chat.py                  # ChatManager (persistence for chat exchanges)

lib/galaxy/webapps/galaxy/api/
    agents.py                # /api/ai/agents/* endpoints
    chat.py                  # /api/chat/* endpoints
    plugins.py               # /api/plugins/{name}/chat/completions (Jupyternaut adapter)

lib/galaxy/schema/
    agents.py                # Pydantic schemas: AgentResponse, ActionSuggestion, etc.
    schema.py                # ChatPayload, ChatResponse (extended for agents)

lib/galaxy/config/
    __init__.py              # _load_agent_config(), inference_services handling
    chat_prompts.json        # Legacy system prompts for tool_error context
    schemas/config_schema.yml  # ai_api_key, ai_model, inference_services schema

lib/galaxy/model/
    __init__.py              # ChatExchange, ChatExchangeMessage ORM models

lib/galaxy/model/migrations/alembic/versions_gxy/
    cbc46035eba0_chat_exchange_storage.py  # Migration for chat_exchange tables
```

---

## Agent Framework Core

### Base Classes (`lib/galaxy/agents/base.py`)

**`BaseGalaxyAgent`** (ABC, 834 lines) is the foundation for all agents:

- **`agent_type: str`** -- class attribute identifying the agent (e.g., `"router"`, `"error_analysis"`)
- **`agent: Agent[GalaxyAgentDependencies, Any]`** -- a pydantic-ai `Agent` instance created by `_create_agent()`
- **`process(query, context) -> AgentResponse`** -- main entry point. Validates input, prepares prompt, runs agent with retry, formats response
- **`_run_with_retry(prompt, max_retries=3, base_delay=1.0)`** -- exponential backoff for retryable errors (timeouts, rate limits, 502/503/504)
- **`_get_model()`** -- multi-provider model resolution via prefix parsing:
  - `anthropic:claude-sonnet-4-5` -> `AnthropicModel` + `AnthropicProvider`
  - `google:gemini-2.5-pro` -> `GoogleModel` + `GoogleProvider`
  - `openai:gpt-4o` or bare `gpt-4o` -> `OpenAIChatModel` + `OpenAIProvider`
  - Any model + `api_base_url` -> OpenAI-compatible (vLLM, Ollama, LiteLLM)
- **`_get_agent_config(key, default)`** -- 4-level config cascade (agent-specific -> default -> global -> hardcoded)
- **`_build_response()` / `_build_metadata()`** -- standardized response construction with model name, token usage, method tracking
- **`_supports_structured_output()`** -- checks if model supports JSON schema output (false for DeepSeek)
- **`_validate_query(query)`** -- length check + prompt injection pattern logging (logs but does not reject)
- **`_call_agent_from_tool(agent_type, query, ctx)`** -- agent-to-agent delegation helper for use in `@agent.tool` functions

**`SimpleGalaxyAgent`** extends `BaseGalaxyAgent` with text-only output and keyword-based confidence extraction.

**`GalaxyAgentDependencies`** is a `@dataclass` carrying dependency injection context:

```python
@dataclass
class GalaxyAgentDependencies:
    trans: ProvidesUserContext
    user: User
    config: GalaxyAppConfiguration
    job_manager: Optional[JobManager] = None
    dataset_manager: Optional[DatasetManager] = None
    workflow_manager: Optional[WorkflowsManager] = None
    tool_cache: Optional[ToolCache] = None
    toolbox: Optional[ToolBox] = None
    get_agent: Optional[Callable] = None       # For inter-agent calls
    model_factory: Optional[Callable] = None   # For testing
```

**`AgentResponse`** (internal, not the Pydantic schema) carries: `content`, `confidence` (enum), `agent_type`, `suggestions`, `metadata`, `reasoning`.

### Utility Functions

- **`extract_result_content(result)`** -- extracts string from pydantic-ai result (prefers `.output`, falls back to `.data`)
- **`extract_usage_info(result)`** -- pulls `input_tokens`, `output_tokens`, `total_tokens` from pydantic-ai usage
- **`extract_structured_output(result, expected_type)`** -- extracts typed Pydantic model from result, returns `None` if extraction fails
- **`normalize_llm_text(text)`** -- converts literal `\n` to newlines, strips whitespace

### Registry (`lib/galaxy/agents/registry.py`)

Dict-based registry mapping `agent_type` strings to `BaseGalaxyAgent` subclasses:

```python
class AgentRegistry:
    _agents: dict[str, type[BaseGalaxyAgent]]
    _agent_metadata: dict[str, dict]

    register(agent_type, agent_class, metadata)
    get_agent(agent_type, deps) -> BaseGalaxyAgent  # creates new instance per request
    list_agents() -> list[str]
    get_agent_info(agent_type) -> dict
```

A global singleton is instantiated in `__init__.py` and a second in `registry.py` (`_global_registry`). The one used at runtime is in `__init__.py`.

Registration happens at module load time:
```python
agent_registry = AgentRegistry()
agent_registry.register(AgentType.ROUTER, QueryRouterAgent)
agent_registry.register(AgentType.ERROR_ANALYSIS, ErrorAnalysisAgent)
agent_registry.register(AgentType.CUSTOM_TOOL, CustomToolAgent)
agent_registry.register(AgentType.ORCHESTRATOR, WorkflowOrchestratorAgent)
agent_registry.register(AgentType.TOOL_RECOMMENDATION, ToolRecommendationAgent)
```

---

## Individual Agents

### Router Agent (`lib/galaxy/agents/router.py`)

The primary entry point for all chat queries. Uses pydantic-ai **output functions** for specialist handoff:

- Creates three handoff output functions: `hand_off_to_error_analysis`, `hand_off_to_custom_tool`, `hand_off_to_tool_recommendation`
- Agent `output_type` is `[error_handoff, tool_handoff, tool_rec_handoff, str]` -- the LLM chooses which to call
- Each handoff function instantiates the specialist agent, calls `process()`, and serializes the response as JSON with a `__handoff__` marker
- `process()` checks if the result is a serialized handoff and unwraps it into an `AgentResponse` preserving the specialist's agent_type and metadata
- For models without output function support (DeepSeek), falls back to a simpler system prompt
- Keyword-based fallback routing when LLM is unreachable (error keywords, tool creation keywords, training keywords, citation requests)
- Conversation history support: `_build_query_with_context()` prepends last 6 messages from context

System prompt: `lib/galaxy/agents/prompts/router.md`

### Error Analysis Agent (`lib/galaxy/agents/error_analysis.py`)

- **Structured output**: `ErrorAnalysisResult` Pydantic model with `error_category`, `error_severity`, `likely_cause`, `solution_steps`, `alternative_approaches`, `confidence`, `requires_admin`
- Uses `ConfidenceLiteral = Literal["low", "medium", "high"]` to avoid `$defs` references that vLLM cannot handle
- Can fetch job details via `JobManager.get_accessible_job()` -- accesses `stderr`, `stdout`, `exit_code`, `command_line`, `tool_id`, etc.
- Has tool info lookup via `toolbox.get_tool()`
- Keyword-based error pattern matching (memory, permission, command not found) as fallback
- Dual mode: structured output for capable models, regex-parsed text for DeepSeek

System prompt: `lib/galaxy/agents/prompts/error_analysis.md`

### Custom Tool Agent (`lib/galaxy/agents/custom_tool.py`)

- **Requires structured output** (`_requires_structured_output() = True`)
- Output type: `UserToolSource` from `galaxy.tool_util_models` -- Galaxy's tool definition schema
- Converts output to YAML and returns with `SAVE_TOOL` action suggestion
- Validates model capabilities before attempting generation; returns helpful error for models without JSON schema support
- Handles `ModelHTTPError` and `UnexpectedModelBehavior` from pydantic-ai with specific error messages about JSON schema limitations

System prompt: `lib/galaxy/agents/prompts/custom_tool_structured.md`

### Tool Recommendation Agent (`lib/galaxy/agents/tools.py`)

- Uses pydantic-ai `@agent.tool` decorators for live toolbox search:
  - `search_galaxy_tools(query)` -- searches Galaxy's built-in `toolbox_search`
  - `get_galaxy_tool_details(tool_id)` -- tool inputs, outputs, version, requirements
  - `get_galaxy_tool_categories()` -- available panel sections
- Fast path: bypasses LLM for exact tool name matches
- Verifies recommended tools exist in toolbox via `_verify_tool_exists()` before creating `TOOL_RUN` suggestions
- Output type: `SimplifiedToolRecommendationResult` -- avoids nested models for vLLM compatibility

System prompt: `lib/galaxy/agents/prompts/tool_recommendation.md`

### Orchestrator Agent (`lib/galaxy/agents/orchestrator.py`)

- Multi-agent coordination for complex tasks
- Uses LLM to produce `AgentPlan` (list of agent names, sequential flag, reasoning)
- Executes agents in parallel (`asyncio.gather`) or sequentially
- Timeout protection per agent (configurable, default 60s)
- Combines responses into markdown with section headers
- Fallback plan on failure: `["error_analysis"]`

System prompt: `lib/galaxy/agents/prompts/orchestrator.md`

---

## Service Layer

### AgentService (`lib/galaxy/managers/agents.py`)

Bridges the API layer and agent framework:

```python
class AgentService:
    def __init__(self, config, job_manager): ...
    def create_dependencies(self, trans, user) -> GalaxyAgentDependencies: ...
    async def execute_agent(self, agent_type, query, trans, user, context) -> AgentResponse: ...
    async def route_and_execute(self, query, trans, user, context, agent_type="auto") -> AgentResponse: ...
```

- `create_dependencies()` -- assembles `GalaxyAgentDependencies` with toolbox, job_manager, `get_agent` callable
- `execute_agent()` -- looks up agent from registry, runs `process()`, wraps result in schema `AgentResponse`
- `route_and_execute()` -- when `agent_type="auto"`, delegates to router; otherwise executes specific agent
- Falls back to router for unknown agent types (logs warning, sets `fallback=True` in metadata)
- Guarded by `HAS_AGENTS` flag -- raises `ConfigurationError` if pydantic-ai not installed

### ChatManager (`lib/galaxy/managers/chat.py`)

Persistence layer for chat exchanges and messages:

```python
class ChatManager:
    def create(self, trans, job_id, message) -> ChatExchange         # Job-based exchange
    def create_general_chat(self, trans, query, response_data, agent_type) -> ChatExchange  # General chat
    def add_message(self, trans, exchange_id, message) -> ChatExchangeMessage
    def get(self, trans, job_id) -> ChatExchange | None               # Lookup by job
    def get_exchange_by_id(self, trans, exchange_id) -> ChatExchange | None
    def set_feedback_for_exchange(self, trans, exchange_id, feedback)
    def set_feedback_for_job(self, trans, job_id, feedback)
    def get_chat_history(self, trans, exchange_id, format_for_pydantic_ai=False)
    def get_user_chat_history(self, trans, limit=50, include_job_chats=False)
```

- Stores conversations as JSON in `ChatExchangeMessage.message` with structure `{query, response, agent_type, agent_response}`
- Supports pydantic-ai formatted history for agent continuation (`ModelRequest` / `ModelResponse` objects)
- All queries scoped to `user_id` for authorization

---

## API Endpoints

### Agent API (`/api/ai/agents/*`)

File: `lib/galaxy/webapps/galaxy/api/agents.py`
Router tag: `"ai"`
Class: `AgentAPI` (CBV pattern with `@router.cbv`)

| Method | Path | Description | Notes |
|--------|------|-------------|-------|
| GET | `/api/ai/agents` | List available agents | Returns `AgentListResponse` with enabled/disabled status |
| POST | `/api/ai/agents/query` | Unified query with routing | **DEPRECATED** -- use `/api/chat` |
| POST | `/api/ai/agents/error-analysis` | Direct error analysis | Accepts `query`, `job_id`, `error_details`, `save_exchange` |
| POST | `/api/ai/agents/custom-tool` | Direct custom tool creation | Accepts `query`, `context`, `save_exchange` |

All endpoints marked `unstable=True`.

Dependencies injected via `depends()`: `AgentService`, `ChatManager`, `JobManager`.

The `list_agents` endpoint iterates the registry and enriches with config-based enabled/disabled status and hardcoded specialties.

The `save_exchange` parameter (optional bool) enables feedback tracking by creating a `ChatExchange` in the database. For error-analysis with a `job_id`, the exchange is always saved.

### Chat API (`/api/chat/*`)

File: `lib/galaxy/webapps/galaxy/api/chat.py`
Router tag: `"chat"`
Class: `ChatAPI` (CBV)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat` | Main ChatGXY endpoint (job-based and general) |
| GET | `/api/chat/history` | Get user's chat history (non-job exchanges) |
| DELETE | `/api/chat/history` | Clear non-job chat history |
| PUT | `/api/chat/{job_id}/feedback` | Job-based feedback (0 or 1) |
| PUT | `/api/chat/exchange/{exchange_id}/feedback` | General exchange feedback |
| GET | `/api/chat/exchange/{exchange_id}/messages` | Get conversation messages |

All endpoints marked `unstable=True`.

**`POST /api/chat`** is the primary endpoint. Supports two formats:
1. **Old format**: `job_id` query param + `ChatPayload` body (for GalaxyWizard job error analysis)
2. **New format**: `query` + `agent_type` query params (for ChatGXY general chat)

Flow:
1. Extracts query from payload or query params
2. For job-based queries: checks for cached response (skips if `regenerate=True`)
3. Loads conversation history from DB if `exchange_id` provided
4. Calls `AgentService.route_and_execute()` if `HAS_AGENTS`, otherwise falls back to legacy pydantic-ai Agent or direct OpenAI
5. Saves exchange to DB (job-based `create()` or general `create_general_chat()`)
6. Returns `ChatResponse` with `response`, `agent_response`, `exchange_id`, `processing_time`

**Legacy fallback** (`_get_ai_response` / `_call_openai_directly`): Uses a simple pydantic-ai `Agent` or direct `openai.chat.completions.create()` with the system prompt from `chat_prompts.json`. This path is used when the agent framework is not available.

### Plugin AI Proxy (`/api/plugins/{name}/chat/completions`)

File: `lib/galaxy/webapps/galaxy/api/plugins.py`
Router tag: `"plugins"`
Class: `FastAPIPlugins` (CBV)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/plugins/{plugin_name}/chat/completions` | OpenAI-compatible proxy for visualization plugins |

This is a separate system from the agent framework. It's an OpenAI Chat Completions proxy for JupyterLite/Jupyternaut:

- Resolves plugin by name from visualization registry
- Extracts `ai_prompt` from plugin XML `<specs>` config
- Injects Galaxy-controlled system prompt server-side (ignores client system prompts)
- Forwards to configurable OpenAI-compatible backend via `AsyncOpenAI`
- Rate limited: 30 requests/minute via `slowapi`
- Supports both streaming (SSE) and non-streaming
- Message limits: 1024 messages, 128 tools, 16KB per tool
- Token limits: default 1024, max 8192

---

## Database Schema

### ORM Models (`lib/galaxy/model/__init__.py`)

```python
class ChatExchange(Base, RepresentById):
    __tablename__ = "chat_exchange"
    id: int (PK)
    user_id: int (FK -> galaxy_user.id, indexed)
    job_id: Optional[int] (FK -> job.id, indexed, nullable)
    user: relationship -> User
    messages: relationship -> list[ChatExchangeMessage]

class ChatExchangeMessage(Base, RepresentById):
    __tablename__ = "chat_exchange_message"
    id: int (PK)
    chat_exchange_id: int (FK -> chat_exchange.id, indexed)
    create_time: datetime
    message: Text (JSON-encoded conversation data)
    feedback: Optional[int] (0=negative, 1=positive)
    chat_exchange: relationship -> ChatExchange
```

### Migration

File: `lib/galaxy/model/migrations/alembic/versions_gxy/cbc46035eba0_chat_exchange_storage.py`
Revision: `cbc46035eba0`
Date: 2023-06-05

Creates `chat_exchange` and `chat_exchange_message` tables. This migration predates the agent framework -- it was originally for the simpler job-based chat system.

**No additional migrations were added by the agent PRs.** The agent system reuses the existing chat exchange tables, storing richer JSON in the `message` column.

---

## Pydantic Schemas

### Agent Schemas (`lib/galaxy/schema/agents.py`)

Core types used across the API:

| Schema | Purpose |
|--------|---------|
| `ConfidenceLevel` | Enum: `low`, `medium`, `high` |
| `ActionType` | Enum: `tool_run`, `save_tool`, `contact_support`, `view_external`, `documentation` |
| `ActionSuggestion` | Structured action with `action_type`, `description`, `parameters`, `confidence`, `priority`. Has `model_validator` enforcing required params per action type |
| `AgentResponse` | Main response: `content`, `confidence`, `agent_type`, `suggestions`, `metadata`, `reasoning` |
| `AgentQueryRequest` | **DEPRECATED** request for `/api/ai/agents/query` |
| `AgentQueryResponse` | **DEPRECATED** response from `/api/ai/agents/query` |
| `AvailableAgent` | Agent info: `agent_type`, `name`, `description`, `enabled`, `model`, `specialties` |
| `AgentListResponse` | Wrapper: `agents[]`, `total_count` |
| `RoutingDecision` | Router decision model (used internally) |
| `ErrorAnalysisRequest/Response` | Typed error analysis request/response |
| `DatasetAnalysisRequest/Response` | **Forward-looking** -- not yet used |
| `WorkflowOptimizationRequest/Response` | **Forward-looking** -- not yet used |
| `AgentMetrics`, `AgentStatus`, `SystemStatus` | **Forward-looking** monitoring schemas -- not yet used |

### Chat Schemas (`lib/galaxy/schema/schema.py`)

```python
class ChatPayload(Model):
    query: str
    context: Optional[str] = ""
    exchange_id: Optional[int] = None       # Continue existing conversation
    regenerate: Optional[bool] = None       # Force fresh analysis

class ChatResponse(BaseModel):
    response: str
    error_code: Optional[int]
    error_message: Optional[str]
    agent_response: Optional[AgentResponse] = None  # Full structured response
    exchange_id: Optional[int] = None               # For conversation continuity
    processing_time: Optional[float] = None
```

### ActionSuggestion Validation Rules

Enforced by `@model_validator(mode="after")`:
- `TOOL_RUN` requires non-empty `tool_id` parameter
- `SAVE_TOOL` requires non-empty `tool_yaml` parameter
- `VIEW_EXTERNAL` requires non-empty `url` parameter
- `CONTACT_SUPPORT` and `DOCUMENTATION` have no required params

Tool recommendation agent additionally validates `TOOL_RUN` suggestions against the toolbox -- only creates suggestions for tools that actually exist.

---

## Configuration

### Galaxy Config Schema (`lib/galaxy/config/schemas/config_schema.yml`)

```yaml
ai_api_key:
    type: str
    required: false
    deprecated_alias: openai_api_key
    desc: API key for an AI provider

ai_api_base_url:
    type: str
    required: false
    desc: AI API base URL (OpenAI compatible)

ai_model:
    type: str
    default: gpt-4o
    required: false
    deprecated_alias: openai_model
    desc: AI model. Global fallback for all AI agents.

inference_services:
    type: any
    required: false
    desc: Per-agent model, temperature, token settings.
         Agents inherit from 'default', which falls back to ai_model/ai_api_key.
```

### Config Loading (`lib/galaxy/config/__init__.py`)

AI config is loaded when `ai_api_key` or `ai_api_base_url` or `inference_services` is set:

```python
if self.ai_api_key or self.ai_api_base_url or getattr(self, "inference_services", None):
    self._load_chat_prompts()
    self._load_agent_config()
```

`_load_agent_config()` sets default agent configurations (model, temperature, max_tokens, enabled) for router, error_analysis, dataset_analyzer, custom_tool. User config merges on top.

`_load_chat_prompts()` loads `chat_prompts.json` for the legacy `tool_error` prompt used by the non-agent fallback path.

### Config Cascade at Runtime

`BaseGalaxyAgent._get_agent_config(key, default)` resolves values in this order:
1. `inference_services.<agent_type>.<key>` (agent-specific)
2. `inference_services.default.<key>` (default inference)
3. Global: `ai_model` for `"model"`, `ai_api_key` for `"api_key"`, `ai_api_base_url` for `"api_base_url"`
4. Hardcoded default

Example `galaxy.yml`:
```yaml
ai_api_key: "sk-..."
ai_model: "gpt-4o-mini"
inference_services:
    default:
        model: "llama-4-scout"
        api_base_url: "http://localhost:4000/v1/"
        temperature: 0.7
    custom_tool:
        model: "anthropic:claude-sonnet-4-5"
        api_key: "sk-ant-..."
```

### Feature Detection

`lib/galaxy/dependencies/__init__.py` has `check_pydantic_ai()`:
```python
def check_pydantic_ai(self):
    return (
        self.config.get("ai_api_key", None) is not None
        or self.config.get("inference_services", None) is not None
    )
```

---

## Authentication and Authorization

- All agent/chat endpoints require authentication (`DependsOnUser`). Anonymous users cannot access them.
- `ChatManager` scopes all queries by `user_id` -- users can only see their own exchanges.
- The `/api/chat` endpoint uses Galaxy's standard session/API key authentication.
- The plugin proxy at `/api/plugins/{name}/chat/completions` uses rate limiting (30/min) with `slowapi`, keyed by API key, session cookie, or IP.
- No role-based access control on agents -- any authenticated user can use all agents.
- Prompt injection detection is log-only (does not reject queries).

---

## LLM Provider Integration

All LLM integration flows through pydantic-ai. Galaxy supports multiple providers:

| Provider | Model Prefix | Import Required | Notes |
|----------|-------------|-----------------|-------|
| OpenAI | `openai:gpt-4o` or bare `gpt-4o` | Default (always available) | Uses `OpenAIChatModel` + `OpenAIProvider` |
| Anthropic | `anthropic:claude-sonnet-4-5` | `pydantic-ai[anthropic]` | Optional, guarded by `HAS_ANTHROPIC` |
| Google/Gemini | `google:gemini-2.5-pro` | `pydantic-ai[google]` | Optional, guarded by `HAS_GOOGLE` |
| OpenAI-compatible | Any model + `api_base_url` | Default | vLLM, Ollama, LiteLLM, TACC endpoints |

The plugin proxy uses `AsyncOpenAI` directly (not pydantic-ai) since it acts as a transparent OpenAI-compatible proxy.

### Structured Output Considerations

- `_supports_structured_output()` checks model name for known-good patterns
- DeepSeek models: no structured output support
- Local inference (vLLM, LiteLLM): may support simple JSON but fail on complex `$defs` schemas
- `ConfidenceLiteral = Literal["low", "medium", "high"]` used instead of enum references to avoid `$defs` in JSON schema
- Custom tool agent requires structured output and validates capabilities before attempting

---

## Job System Interaction

Agents interact with Galaxy's job system through `JobManager`:

- `ErrorAnalysisAgent.get_job_details(job_id)` fetches: `tool_id`, `tool_version`, `state`, `exit_code`, `stderr` (truncated to 2000 chars), `stdout` (truncated to 1000 chars), `command_line`, `parameters`, timestamps, `external_id`, `destination_id`
- Job lookup: `self.deps.job_manager.get_accessible_job(self.deps.trans, job_id)` -- respects Galaxy's access control
- The `/api/chat` endpoint accepts `job_id` and injects job context (`tool_id`, `state`) into the agent context
- Job-based exchanges have `ChatExchange.job_id` set; general chat exchanges have `job_id=None`

---

## Async Processing

- All agent execution is `async` (uses `asyncio`)
- The orchestrator can run agents in parallel via `asyncio.gather`
- Per-agent timeout protection: `asyncio.wait_for(agent.process(...), timeout=60)`
- Retry with exponential backoff: `_run_with_retry()` with 3 retries, base delay 1s
- **No Celery tasks** are used for agent operations -- all execution happens in the request handler
- The plugin proxy supports async streaming via `StreamingResponse`

---

## Testing

### Unit Tests (`test/unit/app/test_agents.py`)

563 lines. Three test classes:

1. **`TestAgentUnitMocked`** -- always runs, no LLM needed:
   - Config fallback chain
   - Custom tool structured output (mocked)
   - Custom tool capability check (DeepSeek rejection)
   - Agent registry verification
   - Error analysis suggestion generation
   - Router output extraction
   - Orchestrator sequential/parallel/fallback execution

2. **`TestAgentUnitLiveLLM`** -- requires `GALAXY_TEST_ENABLE_LIVE_LLM=1`:
   - Router responses with real LLM
   - Custom tool with Scout model
   - Custom tool with DeepSeek model

3. **`TestAgentConsistencyLiveLLM`** -- parametrized tests across query types

### Integration Tests (`test/integration/test_agents.py`)

370 lines. Two test classes:

1. **`TestAgentsApiMocked`** -- uses Galaxy test framework with mocked LLM:
   - `test_list_agents` -- verifies registry via API
   - `test_query_agent_auto_routing_mocked` -- mocked router handoff
   - `test_query_custom_tool_agent_mocked` -- mocked tool creation with suggestion validation
   - `test_query_error_analysis_agent_mocked` -- mocked error analysis

2. **`TestAgentsApiLiveLLM`** -- requires configured LLM:
   - Auto routing, custom tool, error analysis, chat, chat history endpoints

### Schema Tests (`test/unit/schema/test_action_suggestion.py`)

140 lines. Tests `ActionSuggestion` validation:
- `TOOL_RUN` requires/rejects empty `tool_id`
- `SAVE_TOOL` requires/rejects empty `tool_yaml`
- `VIEW_EXTERNAL` requires/rejects empty `url`
- `CONTACT_SUPPORT` and `DOCUMENTATION` have no required params
- Default and custom priority values

### Test Infrastructure

`lib/galaxy/util/unittest_utils/__init__.py` defines:
```python
pytestmark_live_llm = pytest.mark.skipif(
    not os.environ.get("GALAXY_TEST_ENABLE_LIVE_LLM"),
    reason="Live LLM tests disabled. Set GALAXY_TEST_ENABLE_LIVE_LLM=1 to enable.",
)
```

Integration tests use `_create_deps_with_mock_model` to inject `model_factory=lambda: MagicMock()` for deterministic testing without an LLM.

---

## Dependencies

### Python

| Package | Constraint | Status | Purpose |
|---------|-----------|--------|---------|
| `pydantic-ai` | `>=1.56.0` | Required (in `pyproject.toml`) | Agent framework, structured output, tool calling |
| `pydantic-ai[anthropic]` | Optional | Optional | Anthropic/Claude provider |
| `pydantic-ai[google]` | Optional | Optional | Google/Gemini provider |
| `openai` | Existing dep | Required for plugin proxy | `AsyncOpenAI` for Jupyternaut adapter |
| `slowapi` | Existing dep | Required for plugin proxy | Rate limiting |

Version floor `1.56.0` set due to security advisory GHSA-2jrp-274c-jhv3.

### Graceful Degradation

The entire agent system is optional. Import guards at multiple levels:
- `lib/galaxy/managers/agents.py`: `HAS_AGENTS` flag
- `lib/galaxy/webapps/galaxy/api/agents.py`: `HAS_AGENTS` flag
- `lib/galaxy/webapps/galaxy/api/chat.py`: `HAS_AGENTS` flag
- Individual provider imports: `HAS_ANTHROPIC`, `HAS_GOOGLE` in `base.py`

If pydantic-ai is not installed, the chat API falls back to legacy OpenAI chat.

---

## Not Yet Merged: Data Analysis Agent (PR #21706)

PR #21706 is OPEN and adds a `data_analysis` agent that is architecturally distinct from the existing agents:

- Uses **DSPy** (not pydantic-ai) for planning -- sets `USE_PYDANTIC_AGENT = False`
- Generates Python code executed **in the browser** via Pyodide (WebAssembly)
- Adds new endpoints: dataset download with signed tokens (`itsdangerous`), artifact upload, pyodide result submission, WebSocket streaming
- Adds new dependencies: `dspy-ai==2.5.43`, `itsdangerous==2.2.0`
- Introduces `ChatExecutionService` for managing the pyodide execution lifecycle
- **None of this code exists in the current codebase** -- it is entirely in the unmerged PR

---

## Design Patterns Summary

1. **Registry pattern** for dynamic agent registration and per-request instantiation
2. **Dependency injection** via `GalaxyAgentDependencies` dataclass
3. **Output functions** for router-to-specialist handoff (avoids explicit routing logic)
4. **Config cascade** for per-agent model/temperature customization
5. **Graceful degradation** via `HAS_AGENTS` / `try/except ImportError` guards
6. **Structured output with fallback** -- each agent checks model capabilities and falls back to text parsing
7. **`_build_response()` pattern** ensures consistent metadata across all agents
8. **CBV (Class-Based Views)** with FastAPI for API endpoints
9. **`unstable=True`** decorator on all agent endpoints for OpenAPI documentation
10. **JSON-in-Text storage** for chat messages (conversation data stored as JSON string in `message` column)
