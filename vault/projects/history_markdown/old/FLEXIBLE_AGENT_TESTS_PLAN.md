# FLEXIBLE_AGENT_TESTS_PLAN.md

## Goal

Migrate agent tests from integration (`test/integration/test_agents_static.py`) to API (`lib/galaxy_test/api/test_agents.py`). Tests should:
- Skip if agents not configured (`llm_api_configured == False`)
- Make **strong assertions** when `llm_registry_type == "static"` (deterministic responses)
- Make **weak assertions** when `llm_registry_type == "default"` (real LLM, non-deterministic)
- Static YAML rules injected by `driver_util.py` so API and future Selenium tests share same config

## Steps

### 1. Move static YAML to shared test data location

- Copy `test/integration/static_agents.yml` → `lib/galaxy_test/base/data/static_agents.yml`
- Create `lib/galaxy_test/base/data/` dir if needed
- Keep integration copy for now (integration test still references it); delete later once integration test removed

### 2. Inject static agent config in `driver_util.py`

In `setup_galaxy_config()`, add `inference_services` to the returned config dict:

```python
static_agents_path = os.path.join(os.path.dirname(__file__), "..", "base", "data", "static_agents.yml")
config["inference_services"] = {"static_responses": os.path.realpath(static_agents_path)}
```

This gives all API and Selenium tests a working agent backend by default. No env vars needed.

### 3. Create `lib/galaxy_test/api/test_agents.py`

New API test class `TestAgentsApi(ApiTestCase)`:
- `setUp`: init `DatasetPopulator`, fetch `/api/configuration` once to cache `llm_api_configured` and `llm_registry_type`
- Helper: `_is_static` property → `self._registry_type == "static"`
- Helper: `_query_agent(query, agent_type)` → POST to `ai/agents/query`, assert 200, return response dict
- Each `@skip_without_agents` test method has two assertion branches

**Tests to migrate:**

| Integration test | API test | Static assertion | Default (LLM) assertion |
|---|---|---|---|
| `test_config_reports_llm_configured` | `test_configuration_reports_agents` | `llm_registry_type == "static"` | `llm_api_configured is True` only |
| `test_list_agents` | `test_list_agents` | `router` and `error_analysis` in types | agent list non-empty |
| `test_chat_greeting` | `test_chat_greeting` | `"Hello"` in content | response has non-empty content |
| `test_chat_rnaseq` | `test_chat_domain_query` | `"HISAT2"` in content | response has non-empty content |
| `test_chat_fallback` | `test_chat_fallback` | `"Galaxy"` in content or non-empty | response has non-empty content |
| `test_static_backend_metadata` | `test_response_metadata` | `metadata.static_backend is True` | metadata dict exists |
| `test_custom_tool_agent` | `test_custom_tool_agent` | exact tool_id, tool_yaml, suggestion checks | response has metadata with tool_id |
| `test_list_agents_includes_custom_tool` | `test_list_agents_includes_custom_tool` | `"custom_tool"` in types | `"custom_tool"` in types (both backends should have it) |
| `test_error_analysis_agent` | `test_error_analysis_agent` | `"error"` or `"configuration"` in content | non-empty content |

### 4. Delete integration test

- Delete `test/integration/test_agents_static.py`
- Delete `test/integration/static_agents.yml` (now lives in `lib/galaxy_test/data/`)
- Keep `test/integration/test_agents.py` (live LLM tests, gated by `GALAXY_TEST_ENABLE_LIVE_LLM`)

### 5. Run tests

- `./run_tests.sh -api lib/galaxy_test/api/test_agents.py` — should pass with static backend
- `./run_tests.sh -unit test/unit/app/test_static_agent_backend.py` — should still pass
- Verify integration tests still pass if desired

## File changes summary

| File | Action |
|---|---|
| `lib/galaxy_test/base/data/static_agents.yml` | **NEW** — copy from `test/integration/` |
| `lib/galaxy_test/driver/driver_util.py` | **EDIT** — inject `inference_services` in `setup_galaxy_config()` |
| `lib/galaxy_test/api/test_agents.py` | **NEW** — flexible API tests |
| `test/integration/test_agents_static.py` | **DELETE** |
| `test/integration/static_agents.yml` | **DELETE** |

## Notes

- `lib/galaxy_test/base/data/` may not exist — create dir if needed (no `__init__.py` required, it's just data)

## Unresolved questions
- Should the live LLM integration tests (`test/integration/test_agents.py`) also move to API tests eventually, or keep as-is?
- If a user runs API tests against a remote Galaxy that has a real LLM configured, the weak assertions should still pass — any edge cases we should worry about (e.g. agent types that only exist in static YAML)?
