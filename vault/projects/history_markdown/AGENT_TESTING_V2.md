# Static Agent Backend for Testing (v2 — Subclass Approach)

## Context

Galaxy's agent system requires a live LLM to test. The DI refactoring (AGENT_DI.md) moved `AgentRegistry` into the Lagom container and injected it into `AgentService` via constructor — creating a clean seam. This plan exploits that seam: subclass `AgentRegistry` with a `StaticAgentRegistry` that returns `StaticAgent` instances doing YAML rule matching instead of LLM calls. No mocks anywhere.

**Prereq:** AGENT_DI.md changes are merged (branch `agent_testing`).

**Key difference from v1:** v1 intercepted at `AgentService.execute_agent()` with a `StaticAgentBackend` class and `if self.static_backend:` guards. This version swaps the registry itself via DI — `AgentService` code is untouched, the full `AgentService → Registry → Agent → Response` stack is exercised.

## Architecture

```
app.py (startup)
  ├─ static_agents_config set? → StaticAgentRegistry(yaml_path)
  └─ else                      → build_default_registry(config)
       ↓
  _register_singleton(AgentRegistry, registry)
  _register_singleton(AgentService, ...)

POST /api/chat → AgentService.route_and_execute()
                    → self.registry.get_agent(agent_type, deps)
                       ├─ AgentRegistry    → BaseGalaxyAgent(deps) → LLM
                       └─ StaticAgentRegistry → StaticAgent(rules)  → YAML match
                    → agent.process(query, context)
                    → AgentResponse  ← identical schema either way
```

## Why Subclass (not Protocol)

`StaticAgentRegistry` subclasses `AgentRegistry`. `StaticAgent` subclasses `BaseGalaxyAgent`. Both override the methods that touch pydantic-ai. Benefits:

- `_register_singleton(AgentRegistry, static_registry)` is type-safe — no `type: ignore`
- `get_agent()` return type is `BaseGalaxyAgent` — satisfied by `StaticAgent` subclass
- No new protocol files, no annotation changes to existing code
- Lagom container doesn't care — it stores the instance, not the type

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
      suggestions: []
      metadata: {}
      reasoning: null

fallback:
  content: "Static agent backend: no matching rule."
  confidence: low
  agent_type: unknown
```

Match semantics: all specified fields must match (AND). Omitted fields match anything. First matching rule wins.

## Step 1: `StaticAgent` — subclass of `BaseGalaxyAgent`

**New file:** `lib/galaxy/agents/static_backend.py`

```python
class StaticAgent(BaseGalaxyAgent):
    """Agent that returns canned responses from YAML rules.

    Subclasses BaseGalaxyAgent but skips pydantic-ai Agent creation entirely.
    Only process() is meaningful — all other BaseGalaxyAgent methods are stubs.
    """

    agent_type = "static"  # overridden per-instance

    def __init__(self, agent_type_str: str, rules: list, fallback: dict, defaults: dict):
        # Intentionally skip super().__init__() — no pydantic-ai Agent needed.
        # BaseGalaxyAgent.__init__ calls _create_agent() which requires LLM config.
        self.agent_type = agent_type_str
        self._rules = rules
        self._fallback = fallback
        self._defaults = defaults

    def _create_agent(self):
        raise NotImplementedError("StaticAgent does not use pydantic-ai")

    def get_system_prompt(self) -> str:
        return ""

    async def process(self, query: str, context=None) -> AgentResponse:
        for rule in self._rules:
            if self._rule_matches(rule.get("match", {}), query, context):
                return self._build_response(rule["response"])
        return self._build_response(self._fallback)

    def _rule_matches(self, match: dict, query: str, context: dict | None) -> bool:
        if "agent_type" in match and match["agent_type"] != self.agent_type:
            return False
        if "query" in match and not re.search(match["query"], query):
            return False
        if "context" in match and context:
            for field, pattern in match["context"].items():
                if field not in context or not re.search(pattern, str(context[field])):
                    return False
        return True

    def _build_response(self, resp: dict) -> AgentResponse:
        return AgentResponse(
            content=resp.get("content", self._fallback.get("content", "")),
            confidence=resp.get("confidence", self._defaults.get("confidence", "medium")),
            agent_type=resp.get("agent_type", self.agent_type),
            suggestions=resp.get("suggestions", []),
            metadata={**resp.get("metadata", {}), "static_backend": True},
            reasoning=resp.get("reasoning"),
        )
```

No pydantic-ai imports. Only depends on `re`, `yaml`, and `galaxy.agents.base` (for `BaseGalaxyAgent`, `AgentResponse`, `GalaxyAgentDependencies`).

**Why skip `super().__init__()`:** `BaseGalaxyAgent.__init__` calls `self._create_agent()` which builds a pydantic-ai `Agent` requiring LLM model config. Static agents don't need any of that. Skipping super is safe because `process()` is fully overridden — none of the parent's LLM-related machinery (`_run_with_retry`, `_format_response`, `self.agent`) is used.

## Step 2: `StaticAgentRegistry` — subclass of `AgentRegistry`

**Same file:** `lib/galaxy/agents/static_backend.py`

```python
class StaticAgentRegistry(AgentRegistry):
    """Registry that returns StaticAgent instances from YAML config.

    Subclasses AgentRegistry so it's type-compatible with the DI container.
    Overrides get_agent() to return StaticAgent instances instead of
    instantiating real agent classes.
    """

    def __init__(self, config_path: str):
        super().__init__()  # empty _agents, _metadata, _disabled
        with open(config_path) as f:
            self._config = yaml.safe_load(f)
        self._rules = self._config.get("rules", [])
        self._fallback = self._config.get("fallback", {})
        self._defaults = self._config.get("defaults", {})

        # Collect known agent_types from rules
        self._known_types: set[str] = set()
        for rule in self._rules:
            match = rule.get("match", {})
            if "agent_type" in match:
                self._known_types.add(match["agent_type"])

    def get_agent(self, agent_type: str, deps: GalaxyAgentDependencies) -> StaticAgent:
        """Return a StaticAgent that matches rules for this agent_type."""
        # Include rules that target this agent_type OR have no agent_type filter
        applicable = [
            r for r in self._rules
            if r.get("match", {}).get("agent_type", agent_type) == agent_type
        ]
        return StaticAgent(agent_type, applicable, self._fallback, self._defaults)

    def is_registered(self, agent_type: str) -> bool:
        # Any type is "registered" if there are matching rules or a fallback
        return agent_type in self._known_types or bool(self._fallback)

    def list_agents(self) -> list[str]:
        return sorted(self._known_types)

    def get_agent_info(self, agent_type: str) -> dict:
        return {
            "agent_type": agent_type,
            "class_name": "StaticAgent",
            "module": "galaxy.agents.static_backend",
            "metadata": {"static_backend": True},
            "description": "Static test agent",
        }

    def list_agent_info(self) -> list[dict]:
        return [self.get_agent_info(t) for t in sorted(self._known_types)]
```

**Return type:** `StaticAgent` is a subclass of `BaseGalaxyAgent`, so the return type `StaticAgent` satisfies `BaseGalaxyAgent`. No `type: ignore` needed.

## Step 3: Config schema

**File:** `lib/galaxy/config/schemas/config_schema.yml` — add after `inference_services` block:

```yaml
static_agents_config:
  type: str
  required: false
  desc: |
    Path to YAML file defining static agent responses for testing.
    When set, all agent requests return pre-configured responses
    instead of calling an LLM. The static registry replaces the
    real AgentRegistry in the DI container.
```

## Step 4: Wire into `app.py`

**File:** `lib/galaxy/app.py` — replace the current registry creation block:

```python
# AI agent registry and service
static_config = getattr(self.config, "static_agents_config", None)
if static_config:
    from galaxy.agents.static_backend import StaticAgentRegistry
    agent_registry = StaticAgentRegistry(static_config)
    log.info(f"Static agent backend loaded: {static_config}")
else:
    agent_registry = build_default_registry(self.config)
self._register_singleton(AgentRegistry, agent_registry)
self._register_singleton(AgentService, AgentService(self.config, JobQueryManager(self), agent_registry))
```

`StaticAgentRegistry` IS-A `AgentRegistry` — the `_register_singleton(AgentRegistry, ...)` call is type-safe. `AgentService` receives it as its `registry: AgentRegistry` constructor param. No changes to `AgentService` needed.

## Step 5: Expose `agents_available` in config API

**File:** `lib/galaxy/managers/configuration.py` — add alongside existing `llm_api_configured`:

```python
"agents_available": lambda item, key, **context: bool(
    getattr(item, "static_agents_config", None)
    or item.ai_api_key
    or item.ai_api_base_url
    or getattr(item, "inference_services", None)
),
```

## Step 6: `skip_without_agents` decorator

**File:** `lib/galaxy_test/base/populators.py`

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

## Step 7: Unit tests for static backend

**New file:** `test/unit/app/test_static_agent_backend.py`

Tests (write RED first):
- `test_exact_agent_type_match` — rule with `agent_type: router` matches router query
- `test_query_regex_match` — case-insensitive regex on query
- `test_combined_match` — both agent_type and query must match (AND semantics)
- `test_fallthrough_to_catchall` — specific rule fails, generic rule matches
- `test_fallback_when_nothing_matches` — returns fallback response
- `test_static_backend_metadata_flag` — every response has `static_backend: True` in metadata
- `test_defaults_applied` — confidence from `defaults:` block used when rule omits it
- `test_static_registry_list_agents` — returns agent types from rules
- `test_static_registry_get_agent_returns_static_agent` — isinstance check
- `test_static_registry_is_registered` — known types + fallback behavior
- `test_context_field_matching` — regex on `context["page_content"]` (Phase 2)

No mocks needed — these are pure unit tests on the YAML matching logic.

## Step 8: Integration test YAML fixture

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

## Step 9: Integration tests

**New file:** `test/integration/test_agents_static.py`

```python
class TestAgentsStaticBackend(IntegrationTestCase):
    @classmethod
    def handle_galaxy_config_kwds(cls, config):
        config["static_agents_config"] = os.path.join(
            os.path.dirname(__file__), "static_agents.yml"
        )
```

Tests:
- `test_config_reports_agents_available` — `GET /api/configuration` → `agents_available: true`
- `test_list_agents` — `GET /api/ai/agents` → returns agent list from YAML
- `test_chat_greeting` — `POST /api/chat` with query="Hello" → response contains "Hello"
- `test_chat_rnaseq` — query="RNA-seq" → response contains "HISAT2"
- `test_chat_fallback` — query="xyzzy" → gets router catch-all response
- `test_chat_exchange_persistence` — verify exchange_id returned, can fetch via messages API
- `test_error_analysis` — `POST /api/ai/agents/error-analysis` → static error response

These exercise the **full HTTP→API→AgentService→Registry→Agent→Response** stack. The only thing replaced is the LLM — everything else is real Galaxy code.

## Implementation Order

1. Write RED unit tests for `StaticAgent` + `StaticAgentRegistry` (Step 7)
2. Implement `lib/galaxy/agents/static_backend.py` (Steps 1-2) → GREEN
3. Add `static_agents_config` to config schema (Step 3)
4. Wire conditional registry in `app.py` (Step 4)
5. Add `agents_available` to config serializer (Step 5)
6. Add `skip_without_agents` decorator (Step 6)
7. Create `test/integration/static_agents.yml` (Step 8)
8. Write integration tests (Step 9) → RED → GREEN

## What This Replaces in `test/integration/test_agents.py`

The existing `TestAgentsApiMocked` class patches `AgentService.create_dependencies` with a `model_factory` and then patches individual agent classes to return mock responses. With the static backend:

- `TestAgentsApiMocked` can be **replaced entirely** by `TestAgentsStaticBackend`
- No `unittest.mock.patch` calls needed
- No `AsyncMock` or `MagicMock`
- The `_create_deps_with_mock_model` helper becomes unnecessary
- `TestAgentsApiLiveLLM` stays as-is for live LLM smoke tests

## Phase 2: PageAssistant Tests (history_pages branch)

Add to `static_agents.yml`:
```yaml
  - match:
      agent_type: page_assistant
      query: "(?i)add.*section|write.*section"
    response:
      content: "Here's the new section content."
      confidence: high
      agent_type: page_assistant
      metadata:
        edit_mode: section_patch
        target_section_heading: "Methods"
        new_section_content: "## Methods\nNew content here."
        original_content_hash: "__auto__"
```

`StaticAgent._build_response()` can replace `__auto__` sentinel with a hash of `context["page_content"]` when present.

## Verification

```bash
# Unit tests (no server needed)
pytest test/unit/app/test_static_agent_backend.py -v

# Integration tests (auto-starts Galaxy w/ static config)
pytest test/integration/test_agents_static.py -v

# Mypy
mypy lib/galaxy/agents/static_backend.py

# Verify no type errors in existing code
mypy lib/galaxy/app.py lib/galaxy/managers/agents.py
```

## Critical Files

| File | Change |
|------|--------|
| `lib/galaxy/agents/static_backend.py` | **NEW** — `StaticAgent` + `StaticAgentRegistry` |
| `lib/galaxy/config/schemas/config_schema.yml` | Add `static_agents_config` |
| `lib/galaxy/app.py` | Conditional registry creation |
| `lib/galaxy/managers/configuration.py` | Add `agents_available` serializer |
| `lib/galaxy_test/base/populators.py` | Add `skip_without_agents` |
| `test/unit/app/test_static_agent_backend.py` | **NEW** — unit tests |
| `test/integration/static_agents.yml` | **NEW** — YAML fixture |
| `test/integration/test_agents_static.py` | **NEW** — integration tests |

**Existing agent code touched: only `app.py`** (4 lines changed). Everything else is additive.

## Open Questions

1. Should `StaticAgentRegistry.is_registered()` return True for ANY type (because fallback exists), or only types explicitly in rules?
2. Delete `TestAgentsApiMocked` now or keep it alongside static tests for one release?
3. YAML fixture location: `test/integration/` or `test/functional/test-data/`?
4. Should `StaticAgent.process()` add artificial latency (sleep) to simulate LLM timing, or always instant?
