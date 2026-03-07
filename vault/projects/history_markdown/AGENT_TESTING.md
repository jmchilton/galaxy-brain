# Static Agent Backend for Testing

## Context

Galaxy's agent system requires a live LLM to test. Existing integration tests in `test/integration/test_agents.py` mock at the pydantic-ai `Agent` class level, which is fragile and bypasses the `AgentService` layer. We need a YAML-driven static backend that returns deterministic responses — enabling reliable CI tests for ChatGXY and (later) PageAssistant without any LLM.

**Two-phase rollout:**
- **Phase 1 (upstream PR):** Static backend + simple ChatGXY integration test
- **Phase 2 (history_pages branch):** PageAssistant tests for chat→proposal→accept flow

## Architecture

**Interception point: `AgentService.execute_agent()`** — the single chokepoint all agent calls funnel through. When `static_agents_config` is set, short-circuit before any pydantic-ai/LLM code runs.

```
POST /api/chat → ChatAPI → AgentService.route_and_execute()
                                    ↓
                           [static_backend set?]
                            yes → YAML match → AgentResponse
                            no  → normal pydantic-ai flow
```

## YAML Schema

```yaml
# Rules evaluated top-to-bottom, first match wins.
defaults:
  confidence: medium

rules:
  - match:
      agent_type: router          # exact match (optional)
      query: "(?i)hello|hi"      # regex on query (optional)
      context:                    # regex on context fields (optional, Phase 2)
        page_content: "(?s)methods"
    response:
      content: "Hello! How can I help?"
      confidence: high
      agent_type: router
      suggestions: []             # optional
      metadata: {}                # optional
      reasoning: null             # optional

fallback:
  content: "Static agent backend: no matching rule."
  confidence: low
  agent_type: unknown
```

Match semantics: all specified fields must match (AND). Omitted fields match anything. First matching rule wins.

## Step 1: `StaticAgentBackend` class

**New file:** `lib/galaxy/agents/static_backend.py`

```python
class StaticAgentBackend:
    def __init__(self, config_path: str): ...  # load YAML
    def match(self, agent_type: str, query: str,
              context: dict | None = None) -> AgentResponse: ...
```

- Load YAML via `yaml.safe_load`
- `_rule_matches()`: check `agent_type` (exact), `query` (regex), `context.<field>` (regex)
- `_build_response()`: construct `AgentResponse` from matched rule + defaults
- Add `static_backend: true` to metadata on every response
- Phase 2: support `__auto__` sentinel in `metadata.original_content_hash` — replaced at match time with DJB2 hash of `context["page_content"]`

Only depends on PyYAML + `galaxy.schema.agents` — no pydantic-ai needed.

## Step 2: Config schema

**File:** `lib/galaxy/config/schemas/config_schema.yml` — add after `inference_services` block (~line 4100):

```yaml
static_agents_config:
  type: str
  required: false
  desc: |
    Path to YAML file defining static agent responses for testing.
    When set, all agent requests return pre-configured responses
    instead of calling an LLM.
```

**File:** `lib/galaxy/config/__init__.py` — modify line 1136 guard to include static config:

```python
if self.ai_api_key or self.ai_api_base_url or getattr(self, "inference_services", None) or getattr(self, "static_agents_config", None):
```

## Step 3: Expose `agents_available` in config API

**File:** `lib/galaxy/managers/configuration.py` — add serializer alongside existing `llm_api_configured` (line 232):

```python
"agents_available": lambda item, key, **context: bool(
    getattr(item, "static_agents_config", None)
    or item.ai_api_key
    or item.ai_api_base_url
    or getattr(item, "inference_services", None)
),
```

## Step 4: Wire static backend into `AgentService`

**File:** `lib/galaxy/managers/agents.py`

Modify `__init__`:
```python
def __init__(self, config, job_manager):
    self.config = config
    self.job_manager = job_manager
    self.static_backend = None

    static_config = getattr(config, "static_agents_config", None)
    if static_config:
        from galaxy.agents.static_backend import StaticAgentBackend
        self.static_backend = StaticAgentBackend(static_config)
        log.info(f"Static agent backend loaded: {static_config}")
    elif not HAS_AGENTS:
        raise ConfigurationError("Agent system is not available")
```

Add early return at top of `execute_agent()`:
```python
if self.static_backend:
    return self.static_backend.match(agent_type, query, context)
```

And `route_and_execute()`:
```python
if self.static_backend:
    effective_type = "router" if agent_type == "auto" else agent_type
    return self.static_backend.match(effective_type, query, context)
```

## Step 5: `skip_without_agents` decorator

**File:** `lib/galaxy_test/base/populators.py` — add alongside `skip_without_asgi` (line 229):

```python
def skip_without_agents(method):
    @wraps(method)
    def wrapped_method(api_test_case, *args, **kwd):
        interactor = api_test_case.anonymous_galaxy_interactor
        resp = interactor.get("configuration")
        api_asserts.assert_status_code_is_ok(resp)
        if not resp.json().get("agents_available", False):
            raise unittest.SkipTest("Agents not available")
        return method(api_test_case, *args, **kwd)
    return wrapped_method
```

## Step 6: Unit tests for `StaticAgentBackend`

**New file:** `test/unit/app/test_static_agent_backend.py`

Tests (write RED first, then implement Step 1):
- `test_exact_agent_type_match` — match on agent_type alone
- `test_query_regex_match` — case-insensitive regex on query
- `test_fallthrough_to_catchall` — more specific rule fails, generic rule matches
- `test_fallback_when_nothing_matches` — returns fallback response
- `test_context_field_matching` — regex on `context["page_content"]` (Phase 2)
- `test_static_backend_metadata_flag` — every response has `static_backend: true`
- `test_auto_hash_sentinel` — `__auto__` replaced with DJB2 hash (Phase 2)

## Step 7: Phase 1 — ChatGXY integration test

**New file:** `test/integration/static_agents.yml`

```yaml
defaults:
  confidence: medium
rules:
  - match:
      agent_type: router
      query: "(?i)hello|hi|hey"
    response:
      content: "Hello! I'm Galaxy's AI assistant. How can I help?"
      confidence: high
      agent_type: router
  - match:
      agent_type: router
      query: "(?i)rna.?seq"
    response:
      content: "Galaxy has several RNA-seq tools including HISAT2 and STAR."
      confidence: high
      agent_type: router
  - match:
      agent_type: error_analysis
    response:
      content: "This error appears to be a tool configuration issue."
      confidence: high
      agent_type: error_analysis
  - match:
      agent_type: router
    response:
      content: "I can help with Galaxy workflows, tools, and data analysis."
      confidence: medium
      agent_type: router
fallback:
  content: "Static backend: no matching rule."
  confidence: low
  agent_type: unknown
```

**New file:** `test/integration/test_agents_static.py`

```python
class TestAgentsStaticBackend(IntegrationTestCase):
    @classmethod
    def handle_galaxy_config_kwds(cls, config):
        config["static_agents_config"] = os.path.join(
            os.path.dirname(__file__), "static_agents.yml"
        )

    # Tests:
    # test_config_reports_agents_available — GET /api/configuration → agents_available: true
    # test_chat_greeting — POST /api/chat?query=Hello → response contains "Hello"
    # test_chat_rnaseq — POST /api/chat?query=RNA-seq → response contains "HISAT2"
    # test_chat_fallback — POST /api/chat?query=xyzzy → gets router catch-all
    # test_chat_exchange_persistence — verify exchange_id returned, can fetch messages
    # test_list_agents — GET /api/ai/agents → agent list returned
```

## Step 8: Phase 2 — PageAssistant tests (history_pages branch)

**New file:** `test/integration/static_agents_pages.yml`

Add rules for `agent_type: page_assistant`:
- Query matching `(?i)add.*section|write.*section` → section_patch response with `edit_mode`, `target_section_heading`, `new_section_content` in metadata
- Query matching `(?i)rewrite|start over` → full_replacement response with `content` in metadata
- Query matching `(?i)what|describe|tell` → conversational text response (no edit metadata)
- `original_content_hash: "__auto__"` for edit proposals

**New file:** `test/integration/test_agents_pages.py`

- `test_page_chat_returns_section_patch` — create page, POST /api/chat with page_id, verify edit_mode=section_patch
- `test_page_chat_returns_full_replacement` — verify edit_mode=full_replacement
- `test_page_chat_conversational` — verify plain text, no edit metadata
- `test_page_chat_content_hash` — verify `__auto__` replaced with DJB2 hash

**Selenium tests** (extend existing test files):
- `test_history_pages.py::test_chat_section_patch_flow` — create page, open chat, send message, verify proposal, accept, verify editor updated
- `test_pages.py::test_standalone_page_chat` — same flow for standalone pages

## Implementation Order (Phase 1 — upstream PR)

1. Write unit tests for `StaticAgentBackend` (RED)
2. Implement `lib/galaxy/agents/static_backend.py` (GREEN)
3. Add `static_agents_config` to config schema
4. Modify `config/__init__.py` guard (line 1136)
5. Add `agents_available` to `ConfigSerializer`
6. Add `skip_without_agents` to `populators.py`
7. Modify `AgentService.__init__` + `execute_agent` + `route_and_execute`
8. Create `test/integration/static_agents.yml`
9. Write integration test `test_agents_static.py` (RED→GREEN)

## Verification

```bash
# Unit tests
pytest test/unit/app/test_static_agent_backend.py -v

# Integration tests (auto-starts Galaxy server w/ static config)
pytest test/integration/test_agents_static.py -v
```

## Open Questions

1. Phase 1 YAML location: `test/integration/static_agents.yml` or `test/functional/test-data/`?
2. For Phase 2 Selenium, do we need multi-turn conversation rules or single-turn sufficient?
3. Should `GET /api/ai/agents` return canned agent list when static backend active, or let it hit the real registry (requires pydantic-ai import)?
