# Galaxy Agent Testing: Alternatives Analysis

## Context

Galaxy's agent system has three possible testing strategies. This document compares them and recommends a layered approach.

**Current state:** DI refactoring (AGENT_DI.md) is merged. `AgentRegistry` is injected into `AgentService` via Lagom container. `deps.model_factory` exists as a hook for test model injection. One `TestModel`-based unit test exists but is skipped due to pydantic-ai API changes.

## The Three Approaches

### 1. Mock-Based (Current)

Patches at `_run_with_retry`, `_create_agent`, or `create_dependencies` level with `unittest.mock`.

```python
# Integration test pattern (test_agents.py)
def _create_deps_with_mock_model(self, trans, user):
    return GalaxyAgentDependencies(
        ...,
        get_agent=_registry.get_agent,
        model_factory=lambda: MagicMock(),
    )

# Unit test pattern (test_agents.py)
with mock.patch.object(router, "_run_with_retry") as mock_run:
    mock_result = mock.Mock(spec=["output"])
    mock_result.output = "Hello!"
    mock_run.return_value = mock_result
```

### 2. pydantic-ai TestModel / FunctionModel

Drop-in model replacements from `pydantic_ai.models.test`. No LLM calls — pure procedural Python.

**TestModel** auto-calls all registered tools and generates placeholder data from JSON schemas (`'a'` for strings, `'2024-01-01'` for dates). No ML/AI — just procedural code satisfying schema validation. Configurable via:
- `custom_output_text="Hello"` — fixed text response
- `custom_output_args={...}` — fixed structured output args
- `call_tools=['tool_a']` or `'all'` — control which tools get called
- `seed=42` — reproducible random data generation

**FunctionModel** gives full control — you write a function `(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse` that decides which tools to call and with what args.

**Agent.override** is a context manager that swaps the model without touching application code:

```python
with weather_agent.override(model=TestModel()):
    result = await weather_agent.run("What's the forecast?")
```

**ALLOW_MODEL_REQUESTS = False** is a global safety guard that errors if any code accidentally hits a real LLM during tests.

**Galaxy already has the plumbing for this:**
- `deps.model_factory` (`base.py:233`) — `_get_model()` checks it first (`base.py:646-647`)
- `test_router_with_test_model` (`test_agents.py:278`) — exists but **skipped** because pydantic-ai's `TestModel` API changed. The router's output type evolved from `RoutingDecision` to `AgentResponse` and the test broke.
- Integration tests inject `model_factory=lambda: MagicMock()` — this could be `model_factory=lambda: TestModel()` instead

### 3. Static YAML Backend via DI (AGENT_TESTING_V2.md)

Subclass `AgentRegistry` with `StaticAgentRegistry` that returns `StaticAgent` instances doing YAML rule matching. Swap at the DI container level — no mocks, no pydantic-ai.

```yaml
rules:
  - match:
      agent_type: router
      query: "(?i)hello|hi"
    response:
      content: "Hello! How can I help?"
      confidence: high
      agent_type: router
fallback:
  content: "Static backend: no matching rule."
  confidence: low
  agent_type: unknown
```

```python
# In app.py — the only existing code touched
if config.static_agents_config:
    registry = StaticAgentRegistry(config.static_agents_config)
else:
    registry = build_default_registry(config)
self._register_singleton(AgentRegistry, registry)
```

## Comparison

| | Mock-Based | TestModel/FunctionModel | Static YAML Backend |
|---|---|---|---|
| **Layer tested** | Whatever you patch | pydantic-ai Agent wiring, tool schemas, output parsing | Full HTTP → API → AgentService → Registry → Agent → Response |
| **What's exercised** | Depends on mock granularity | Tool registration, system prompts, structured output extraction | Routing, DI wiring, config, persistence, API serialization |
| **What's replaced** | Arbitrary internals | Only the LLM model | The entire agent (pydantic-ai not loaded) |
| **Setup effort** | Per-test mock wiring | `Agent.override(model=TestModel())` or `model_factory` in deps | `static_agents_config` in Galaxy config |
| **Determinism** | Full (you control the mock) | High but schema-dependent (placeholder values) | Full (you write exact responses in YAML) |
| **Fragility** | High — breaks when internals change | Medium — breaks if tool schemas change | Low — only depends on `process()` contract |
| **Domain-meaningful responses** | Yes (you write them) | No (placeholder data) | Yes (you write them in YAML) |
| **pydantic-ai coverage** | None (mocked out) | Yes — tool schemas, output parsing, retry logic | None (pydantic-ai not loaded) |
| **HTTP/API stack coverage** | None (unit tests) or partial (integration w/ patching) | None (unit tests) | Full |
| **Agent-to-agent calls** | Manual `deps.get_agent` side effects | Works if model is overridden on all agents | Automatic via static registry |
| **Reusable outside tests** | No | No | Yes — demo mode, dev servers |

## What Each Approach Cannot Do

### TestModel / FunctionModel Cannot:
- Test the HTTP → AgentService → Registry path (operates below that layer)
- Produce domain-meaningful responses ("Galaxy has RNA-seq tools...") — returns schema placeholders
- Test routing logic (which agent handles which query type)
- Work without pydantic-ai being fully initialized and configured
- Test config-driven behavior (agent enable/disable, `static_agents_config` flag)

### Static YAML Backend Cannot:
- Verify tool schemas are valid JSON Schema
- Test that `_create_agent()` wires tools correctly
- Test structured output extraction (`_format_response`, `extract_structured_output`)
- Exercise `_run_with_retry`, prompt construction, system prompt injection
- Catch regressions in pydantic-ai integration (version upgrades, API changes)

### Mock-Based Cannot:
- Guarantee stability across refactors (patches are path-dependent)
- Test the real dependency injection path
- Be reused across test types without duplication
- Scale to new agent types without new mock wiring per agent

## Recommendation: Layered Testing

Use all three at their natural layers. They are complementary, not competing.

### Layer 1: Unit Tests — TestModel / FunctionModel

**Purpose:** Verify pydantic-ai agent wiring, tool schemas, output parsing.

**Where:** `test/unit/app/test_agents.py`

**Pattern:** Use `model_factory` in deps (hook already exists) or `Agent.override`:

```python
@pytest.fixture
def test_model():
    return TestModel(custom_output_text="Hello! I can help with Galaxy.")

@pytest.mark.asyncio
async def test_router_creates_valid_agent(test_deps):
    """Verify router's _create_agent() produces a working pydantic-ai Agent."""
    test_deps.model_factory = lambda: TestModel(
        custom_output_text="I can help with Galaxy workflows."
    )
    router = QueryRouterAgent(test_deps)
    response = await router.process("Help me with workflows")
    assert response.agent_type == "router"
    assert response.content  # TestModel produced valid output
```

For tool-calling verification, use `FunctionModel`:

```python
async def test_error_analysis_calls_job_tool(test_deps):
    """Verify error_analysis agent registers and calls the job lookup tool."""
    def custom_model(messages, info):
        # Verify job_lookup tool is in the schema
        tool_names = [t.name for t in info.function_tools]
        assert "get_job_details" in tool_names
        # Call it with specific args
        return ModelResponse(parts=[
            ToolCallPart("get_job_details", {"job_id": 123})
        ])

    test_deps.model_factory = lambda: FunctionModel(custom_model)
    agent = ErrorAnalysisAgent(test_deps)
    # ... exercise and assert
```

**Immediate action:** Fix the skipped `test_router_with_test_model` — the `model_factory` hook makes this straightforward now that DI is wired.

### Layer 2: Integration Tests — Static YAML Backend

**Purpose:** Test the full HTTP → API → AgentService → Registry → Agent → Response stack with deterministic, domain-meaningful responses.

**Where:** `test/integration/test_agents_static.py`

**Pattern:** Config-driven, no mocks:

```python
class TestAgentsStaticBackend(IntegrationTestCase):
    @classmethod
    def handle_galaxy_config_kwds(cls, config):
        config["static_agents_config"] = os.path.join(
            os.path.dirname(__file__), "static_agents.yml"
        )

    def test_chat_greeting(self):
        response = self._post("chat", data={"query": "Hello"})
        assert "Hello" in response.json()["content"]

    def test_chat_exchange_persistence(self):
        resp = self._post("chat", data={"query": "Hello"})
        exchange_id = resp.json()["exchange_id"]
        messages = self._get(f"chat/{exchange_id}/messages")
        assert len(messages.json()) >= 2  # user + assistant
```

**Replaces:** `TestAgentsApiMocked` and all its `unittest.mock.patch` wiring.

### Layer 3: Live LLM Smoke Tests (Existing)

**Purpose:** Verify real LLM integration works end-to-end.

**Where:** `test/integration/test_agents.py::TestAgentsApiLiveLLM`

**Pattern:** Requires `GALAXY_TEST_AI_API_KEY` env var, skipped in normal CI. Unchanged by this work.

## Implementation Priority

1. **Ship static YAML backend (AGENT_TESTING_V2.md)** — biggest impact, eliminates all mock-based integration tests, exercises the real stack. Only touches `app.py` in existing code.

2. **Fix `test_router_with_test_model`** — small follow-up. Use `model_factory=lambda: TestModel(custom_output_text=...)` instead of patching `_create_agent`. Validates the pydantic-ai layer works.

3. **Add FunctionModel tests for tool verification** — optional, for agents with important tool schemas (error_analysis job lookup, custom_tool structured output). Write as needed when tool schemas change.

4. **Delete `TestAgentsApiMocked`** — once static backend integration tests cover the same scenarios, remove the mock-based class and its `_create_deps_with_mock_model` helper.

5. **Set `ALLOW_MODEL_REQUESTS = False`** — add to test conftest as a safety net once TestModel tests are working. Prevents accidental real LLM calls in CI.

## Open Questions

1. Should `model_factory` return `TestModel()` or should we use `Agent.override()`? `model_factory` is already wired and doesn't require access to the `Agent` instance. `Agent.override` is the pydantic-ai blessed pattern but requires patching at the agent object level. Recommendation: stick with `model_factory` — it's Galaxy's own hook and doesn't depend on pydantic-ai's override API stability.
2. For FunctionModel tests, should the custom function assert on message content (brittle, prompt-dependent) or just on tool schemas (stable)?
3. `ALLOW_MODEL_REQUESTS = False` — set in conftest globally, or per-test-class? Global is safer but requires explicit opt-out for `TestAgentsApiLiveLLM`.
