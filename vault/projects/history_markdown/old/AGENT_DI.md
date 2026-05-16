# Inject AgentRegistry into Lagom DI Container

## Context

Galaxy's `AgentRegistry` is a module-level global singleton created in `lib/galaxy/agents/__init__.py`. This breaks Galaxy's DI pattern — every other manager/service uses Lagom container injection via `depends(Type)`. The registry is imported directly by 4 consumers (`AgentService`, `AgentAPI`, orchestrator, tests), making it hard to test and inconsistent with the codebase.

Additionally, `pydantic-ai` is now an unconditional dependency (`pyproject.toml` line 78: `"pydantic-ai>=1.56.0"`), but the codebase still has legacy `try/except ImportError` + `HAS_AGENTS` guards from when it was optional. These should be replaced with direct imports.

There's also a duplicate dead `_global_registry` instance in `registry.py` (never used).

**This refactoring:**
1. Moves registry creation into a factory, registered as a Lagom singleton
2. Injects it into `AgentService` via constructor; explicitly registers `AgentService` in `app.py`
3. API layer delegates to `AgentService` instead of accessing registry directly
4. Orchestrator uses `deps.get_agent` callback instead of direct registry import
5. Replaces `try/except ImportError` guards with direct imports (pydantic-ai is unconditional)

## Current State

### Registry singleton (`agents/__init__.py:34-43`)
```python
agent_registry = AgentRegistry()
agent_registry.register(AgentType.ROUTER, QueryRouterAgent)
# ... 5 more registrations
```

### 4 Consumers
1. **`managers/agents.py`** — `AgentService` imports `agent_registry`, uses `.get_agent()` in `execute_agent()` and `create_dependencies()`
2. **`api/agents.py`** — `AgentAPI.list_agents()` imports `agent_registry`, iterates `.list_agents()` / `.get_agent_info()`
3. **`agents/orchestrator.py`** — inline `from galaxy.agents import agent_registry` in `_execute_sequential()`/`_execute_parallel()` (despite `deps.get_agent` being available)
4. **Tests** — `test_agents.py` (unit + integration) import `agent_registry` for verification and mock patching

### Dead code (`registry.py:124-141`)
`_global_registry`, `get_global_registry()`, `register_agent()`, `get_agent()` — never imported anywhere.

### Legacy `HAS_AGENTS` guards
`managers/agents.py`, `api/agents.py` — `try/except ImportError` around `from galaxy.agents import ...` with `HAS_AGENTS = False` fallback. No longer needed since pydantic-ai is required.

## Step 1: Clean up `registry.py` — remove dead code, add factory

**File:** `lib/galaxy/agents/registry.py`

- Delete lines 124-141 (`_global_registry` + 3 module-level functions)
- Add `build_default_registry()` factory function at bottom:

```python
def build_default_registry() -> AgentRegistry:
    """Create an AgentRegistry with all default Galaxy agents."""
    from .base import AgentType
    from .custom_tool import CustomToolAgent
    from .error_analysis import ErrorAnalysisAgent
    from .orchestrator import WorkflowOrchestratorAgent
    from .page_assistant import PageAssistantAgent
    from .router import QueryRouterAgent
    from .tools import ToolRecommendationAgent

    registry = AgentRegistry()
    registry.register(AgentType.ROUTER, QueryRouterAgent)
    registry.register(AgentType.ERROR_ANALYSIS, ErrorAnalysisAgent)
    registry.register(AgentType.CUSTOM_TOOL, CustomToolAgent)
    registry.register(AgentType.ORCHESTRATOR, WorkflowOrchestratorAgent)
    registry.register(AgentType.TOOL_RECOMMENDATION, ToolRecommendationAgent)
    registry.register(AgentType.PAGE_ASSISTANT, PageAssistantAgent)
    return registry
```

Inline imports in the factory keep `registry.py` focused on the class definition and avoid pulling in all agent modules just to define `AgentRegistry`. No circular import concerns — agents import `.base`, not `.registry`.

**Unit test (RED first):**
```python
def test_build_default_registry():
    from galaxy.agents.registry import build_default_registry
    registry = build_default_registry()
    assert registry.is_registered("router")
    assert registry.is_registered("page_assistant")
    assert len(registry.list_agents()) == 6
```

## Step 2: Strip singleton from `__init__.py`

**File:** `lib/galaxy/agents/__init__.py`

- Remove lines 34-43 (the `agent_registry = AgentRegistry()` + all `.register()` calls)
- Keep all class imports (lines 8-19) — they're still needed for re-export via `__all__`
- Add `build_default_registry` to imports and `__all__`:
  ```python
  from .registry import AgentRegistry, build_default_registry
  ```

## Step 3: Register `AgentRegistry` and `AgentService` in Lagom container

**File:** `lib/galaxy/app.py`

In `GalaxyManagerApplication.__init__()`, after `self.job_manager = self._register_singleton(JobManager)` (line 643):

```python
from galaxy.agents.registry import AgentRegistry, build_default_registry
self._register_singleton(AgentRegistry, build_default_registry())

from galaxy.managers.agents import AgentService
self._register_singleton(AgentService)
```

Direct imports — no `try/except`. pydantic-ai is a required dependency; if it's missing, Galaxy is broken and should fail fast. Explicit `AgentService` registration makes the dependency visible in the same place as all other managers and ensures Lagom caches it as a singleton (otherwise each `depends(AgentService)` call would create a new instance).

## Step 4: Inject registry into `AgentService`, remove `HAS_AGENTS`

**File:** `lib/galaxy/managers/agents.py`

Replace legacy guarded imports with direct imports:
```python
from galaxy.agents import GalaxyAgentDependencies
from galaxy.agents.registry import AgentRegistry
from galaxy.agents.error_analysis import ErrorAnalysisAgent
from galaxy.agents.router import QueryRouterAgent
```

Remove `HAS_AGENTS` flag entirely — it's vestigial.

Constructor:
```python
def __init__(
    self,
    config: GalaxyAppConfiguration,
    job_manager: JobManager,
    registry: AgentRegistry,
):
    self.config = config
    self.job_manager = job_manager
    self.registry = registry
```

Update call sites:
- `create_dependencies()`: `get_agent=self.registry.get_agent`
- `execute_agent()`: `agent = self.registry.get_agent(agent_type, deps)`

Add passthrough methods for API layer:
```python
def list_agents(self) -> list[str]:
    return self.registry.list_agents()

def get_agent_info(self, agent_type: str) -> dict:
    return self.registry.get_agent_info(agent_type)
```

## Step 5: Update `AgentAPI` — delegate to `AgentService`, remove `HAS_AGENTS`

**File:** `lib/galaxy/webapps/galaxy/api/agents.py`

- Remove `from galaxy.agents import agent_registry` import and `HAS_AGENTS` guard (lines 34-40)
- Remove `HAS_AGENTS` checks from `list_agents()` and `query_agent()` — `AgentService` handles availability at construction time
- In `list_agents()`: replace `agent_registry.list_agents()` / `agent_registry.get_agent_info()` with `self.agent_service.list_agents()` / `self.agent_service.get_agent_info()`

## Step 6: Fix orchestrator to use `deps.get_agent`

**File:** `lib/galaxy/agents/orchestrator.py`

`_execute_sequential()` (line 194) and `_execute_parallel()` (line 228) both do:
```python
from galaxy.agents import agent_registry
agent = agent_registry.get_agent(agent_name, self.deps)
```

Replace with:
```python
agent = self.deps.get_agent(agent_name, self.deps)
```

Remove both inline imports. The `deps.get_agent` callback was designed for exactly this — `AgentService.create_dependencies()` sets it to `self.registry.get_agent`.

## Step 7: Update tests

### `test/unit/app/test_agents.py`

Import change:
```python
from galaxy.agents.registry import build_default_registry
agent_registry = build_default_registry()  # module-level for test use
```

Keep `from galaxy.agents import ...` for class imports (those still work).

**Orchestrator mock patches** (lines 286, 316, 368): currently patch `galaxy.agents.agent_registry.get_agent`. After Step 6, the orchestrator uses `self.deps.get_agent`. Change to:
```python
# Before:
with patch("galaxy.agents.agent_registry.get_agent") as mock_get_agent:
    ...

# After: set get_agent on the deps object directly
self.deps.get_agent = MagicMock(side_effect=...)
```

### `test/integration/test_agents.py`

Import change:
```python
from galaxy.agents.registry import build_default_registry
```

In `_create_deps_with_mock_model()` (line 84):
```python
_registry = build_default_registry()
# ...
get_agent=_registry.get_agent,
```

## Step 8: Verify no remaining references

Grep for:
- `from galaxy.agents import agent_registry` — should be zero
- `galaxy.agents.agent_registry` — should be zero
- `HAS_AGENTS` in `managers/agents.py` and `api/agents.py` — should be zero

## Implementation Order

Must be atomic — removing the singleton breaks all consumers:

1. Write RED tests for `build_default_registry()` and dead code removal
2. Implement Step 1 (registry.py cleanup + factory) → GREEN
3. Steps 2-6 together (strip singleton, app.py registration, AgentService injection, API delegation, orchestrator fix)
4. Step 7 (update all tests) → GREEN
5. Step 8 (verify grep)
6. Run full test suite

## Verification

```bash
# Unit tests
pytest test/unit/app/test_agents.py -v

# Integration tests
pytest test/integration/test_agents.py::TestAgentsApiMocked -v

# Mypy
mypy lib/galaxy/managers/agents.py lib/galaxy/agents/registry.py

# Grep for stale references
grep -r "from galaxy.agents import agent_registry" lib/ test/
grep -r "galaxy.agents.agent_registry" lib/ test/
grep -r "HAS_AGENTS" lib/galaxy/managers/agents.py lib/galaxy/webapps/galaxy/api/agents.py
```

## Critical Files

| File | Change |
|------|--------|
| `lib/galaxy/agents/registry.py` | Remove dead code, add `build_default_registry()` |
| `lib/galaxy/agents/__init__.py` | Remove singleton + registrations, export factory |
| `lib/galaxy/app.py` | Register `AgentRegistry` + `AgentService` explicitly |
| `lib/galaxy/managers/agents.py` | Constructor injection, remove `HAS_AGENTS`, add passthroughs |
| `lib/galaxy/webapps/galaxy/api/agents.py` | Delegate to `AgentService`, remove `HAS_AGENTS` |
| `lib/galaxy/agents/orchestrator.py` | Use `deps.get_agent` instead of direct registry import |
| `test/unit/app/test_agents.py` | Update imports, fix orchestrator mock patches |
| `test/integration/test_agents.py` | Update imports |

## Open Questions

1. `__init__.py` still imports all agent classes for re-export (`__all__`). Safe to keep — they're used by tests and other modules. Removing would be a separate cleanup.
2. `api/chat.py` also has `HAS_AGENTS` guard (gates legacy OpenAI fallback path). Clean that up too or keep scope focused? (Recommend separate PR — the chat fallback logic is more involved.)
3. `ChatManager` has no registry dependency, no changes needed.
