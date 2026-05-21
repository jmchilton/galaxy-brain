---
type: research
subtype: pr
tags:
  - research/pr
  - galaxy/api
  - galaxy/client
  - galaxy/testing
github_pr: 22070
github_repo: galaxyproject/galaxy
status: draft
created: 2026-05-21
revised: 2026-05-21
revision: 1
ai_generated: true
summary: "Static YAML agent backend replaces mocked tests with deterministic API and Selenium coverage; drive-by detect_errors.xml fix"
sources:
  - "https://github.com/galaxyproject/galaxy/pull/22070"
related_notes:
  - "[[PR 21434 - AI Agent Framework and ChatGXY]]"
  - "[[PR 21692 - Standardize Agent API Schemas]]"
  - "[[PR 21942 - Shared Agent Operations and MCP Server]]"
  - "[[PR 21706 - Data Analysis Agent Integration]]"
  - "[[PR 21463 - Jupyternaut Adapter for JupyterLite]]"
  - "[[Component - Agents Backend]]"
  - "[[Component - Agents UX]]"
  - "[[Component - Agents ChatGXY Persistence]]"
  - "[[Component - E2E Tests - Writing]]"
---

# PR #22070 Research: Static YAML Agent Backend for Deterministic Testing

## PR Overview

| Field | Value |
|-------|-------|
| Author | jmchilton |
| State | MERGED |
| Created | 2026-03-11 |
| Merged | 2026-03-19 |
| Merge SHA | `ad7b1e49d0` |
| Verified against `origin/dev` | `d9d00352ba` |
| Labels | kind/enhancement, area/UI-UX, area/testing, area/API, area/dependencies, area/testing/api, area/testing/integration, area/testing/selenium |

Builds on [[PR 21434 - AI Agent Framework and ChatGXY]] and [[PR 21692 - Standardize Agent API Schemas]]; coexists with [[PR 21942 - Shared Agent Operations and MCP Server]].

## Summary

Replaces `unittest.mock`-based agent tests with a real `AgentRegistry` subclass (`StaticAgentRegistry`) that returns canned `AgentResponse` objects driven by a YAML rule file. The static backend swaps in at the DI container level via a new `build_agent_registry` factory so every layer of the agent stack still executes — only the LLM call is replaced. API tests move from `test/integration/test_agents.py` to `lib/galaxy_test/api/test_agents.py` and adapt assertion strength based on a new `llm_registry_type` config field (`"static"` vs `"default"`); new Selenium suites exercise the full ChatGXY and GalaxyWizard browser flows deterministically. Drive-by fixes: `detect_errors.xml` stderr redirect (`>2&` → `>&2`) and a matching stdout/stderr line-count flip in the parser test.

## Architecture

### Static backend — `lib/galaxy/agents/static_backend.py` (NEW, 126 lines)

- `class StaticAgent(BaseGalaxyAgent)` (line 24) — `__init__(self, agent_type_str, rules, fallback, defaults)` deliberately skips `super().__init__()` so no `pydantic-ai.Agent` is constructed. Rebinds `agent_type` on the instance.
- `async def process(self, query, context=None) -> AgentResponse` (line 52) — first matching rule wins; falls through to the fallback rule when present.
- `_rule_matches(rule, query, context)` (line 58) — AND across three optional predicates: `agent_type` equality, `query` via `re.search`, and `context` (dict of `field → regex` patterns; rule fails closed if `context is None`). Non-string context fields get coerced via `str(context[field])` before search.
- `_make_response(rule, query)` (line 71) — always injects `metadata["static_backend"] = True` so callers can distinguish canned from real LLM output.
- `class StaticAgentRegistry(AgentRegistry)` (line 84) — subclass for DI type compatibility. `get_agent(agent_type)` (line 105) returns a `StaticAgent` filtered to rules for that type; `is_registered` (line 110) is `True` for any type with rules OR if a fallback exists.

### Registry factory — `lib/galaxy/agents/factory.py` (NEW, 29 lines)

- `def build_registry(config: "GalaxyAppConfiguration") -> AgentRegistry` (line 18) — reads `config.inference_services["static_responses"]` via safe `getattr` + `isinstance(dict)` guard (lines 24–25), returns `StaticAgentRegistry(path)` when set or delegates to `build_default_registry(config)` otherwise.

### DI wiring — `lib/galaxy/app/__init__.py`

- Import at line 28: `from galaxy.agents.factory import build_registry as build_agent_registry` (replaces direct import of `build_default_registry`).
- Call site at line 877: `agent_registry = build_agent_registry(self.config)`; passed to `_register_singleton(AgentRegistry, agent_registry)`.
- File path note: PR targeted `lib/galaxy/app.py`; subsequent commit `dbfcdb8bc9` ("python packages: convert to pure namespace packages") moved this to `lib/galaxy/app/__init__.py`. Import and call site survived intact.

### Config plumbing

- `lib/galaxy/config/schemas/config_schema.yml` lines 4195–4207: documents `inference_services.static_responses` as a YAML path to canned responses. Example in the docstring references `test/integration/static_agents.yml` but the actual shipped fixture lives at `lib/galaxy_test/base/data/static_agents.yml` — minor documentation drift, see Cross-checks.
- `lib/galaxy/managers/configuration.py`:
  - `_get_registry_type(config)` helper at lines 23–27 — returns `"static"` if `inference_services.static_responses` is set, else `"default"`.
  - `llm_registry_type` lambda registered at line 244 on the `/api/configuration` payload (sits alongside the pre-existing `llm_api_configured` at line 241).

### Static YAML fixture — `lib/galaxy_test/base/data/static_agents.yml` (NEW)

- PR shipped 67 lines; file now 90 lines after `4afd63a9a9` ("History notebooks.") added rules.
- Original rules cover: `router` (greeting, RNA-seq domain query, generic catchall), `custom_tool` (returns a `Line Counter` tool YAML + `save_tool` suggestion), `error_analysis`, plus a global fallback. `defaults` provide stock `suggestions`, `reasoning`, and `metadata` blocks injected when a rule omits them.

### Driver autoconfig — `lib/galaxy_test/driver/driver_util.py:310-314`

```py
static_agents_path = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", "base", "data", "static_agents.yml"))
if os.path.exists(static_agents_path):
    config["inference_services"] = {"static_responses": static_agents_path}
```

Every test-framework-launched Galaxy instance picks up the static backend automatically when the fixture exists — no per-test opt-in required.

### `skip_without_agents` decorator — `lib/galaxy_test/base/populators.py:226-237`

- Skips a test when `/api/configuration.llm_api_configured` is false. Uses `anonymous_galaxy_interactor` + `api_asserts.assert_status_code_is_ok`.
- Does **not** gate on `llm_registry_type`, so live-LLM Galaxy instances also satisfy the decorator and run with the weak-assertion branch.

### Selenium helpers — `lib/galaxy/selenium/navigates_galaxy.py`

PR added six helpers; post-merge `56a9dfd0fc` renamed the four ChatGXY-prefixed ones to `galaxyai_*`. Current state at SHA `d9d0035`:

- `navigate_to_galaxyai` (line 1649)
- `galaxyai_ensure_new_chat` (1653)
- `galaxyai_send_message` (1661)
- `_galaxyai_assert_chat_empty`
- `navigate_to_dataset_error(self, hid)` (1675) — unchanged from PR
- `galaxy_wizard_analyze(self)` (1683) — unchanged from PR

### Frontend test attributes

- `client/src/components/GalaxyWizard.vue` lines 94, 100, 106, 115, 127, 134, 142, 147 — eight `data-description` attributes (wizard outer div, analyze button, loading skeleton, response, feedback section, feedback up/down, feedback ack).
- `client/src/components/DatasetInformation/DatasetError.vue:158` — `data-description="galaxy wizard card"` on the wrapping `BCard`.

### Navigation selectors — `client/src/utils/navigation/navigation.yml`

- PR added two top-level blocks; post-merge `fad68caba1` rebranded the first:
  - `chatgxy:` (PR) → `galaxyai:` (current, line 1639). CSS selectors moved from `.chatgxy-*`/`#activity-chatgxy` to `.galaxyai-*`/`#activity-galaxyai`.
  - `galaxy_wizard:` (line 1671) — unchanged; all eight `data-description` selectors intact.

### `detect_errors.xml` fix — `test/functional/tools/detect_errors.xml:18`

- PR corrected `>2& echo '$stderrmsg'` (broken — fd 2 not redirected) to `>&2 echo '$stderrmsg'`. Without this the GalaxyWizard test cannot produce a dataset with non-empty `tool_stderr`.
- Matching adjustment in `test/unit/tool_util/test_parsing.py:951-952`: assertion now reads `assert len(test_0["stderr"]) == 2` / `assert len(test_0["stdout"]) == 1` (counts swapped from 1/2 to reflect the corrected redirect).

## Tests

### Unit — `test/unit/app/test_static_agent_backend.py` (NEW, 395 lines)

- `TestStaticAgent` (~21 tests): exact match, query regex, agent_type + query AND, fallthrough, fallback path, metadata-flag injection, defaults inheritance, suggestions, reasoning, context match (single field, multiple fields, missing context fails, non-string coercion).
- `TestStaticAgentRegistry` (~9 tests): `list_agents`, `get_agent`, `is_registered` (with and without fallback), `agent_info` shape, end-to-end query + fallback, `AgentRegistry` subtyping. All async tests carry `pytest.mark.asyncio`.

### API — `lib/galaxy_test/api/test_agents.py` (NEW, 133 lines)

- `class TestAgentsApi(ApiTestCase)` — 9 `@skip_without_agents` tests: `test_configuration_reports_agents`, `test_list_agents`, `test_list_agents_includes_custom_tool`, `test_chat_greeting`, `test_chat_domain_query`, `test_chat_fallback`, `test_response_metadata`, `test_custom_tool_agent`, `test_error_analysis_agent`.
- Each test reads `llm_registry_type` from `/api/configuration` and branches: static → strong assertions (e.g. `"HISAT2" in content`); default → weak assertions (`len(content) > 0`).

### Selenium — `lib/galaxy_test/selenium/test_galaxyai.py` (was `test_chatgxy.py`), `test_galaxy_wizard.py`

- `TestGalaxyAI` (renamed from `TestChatGXY` by `56a9dfd0fc`, 3 tests):
  - `test_chat_greeting_flow` (line 20) — send greeting, receive static response, thumbs-up feedback, metadata tag visible.
  - `test_multi_turn_and_new_chat` (line 54) — multi-turn conversation, new-chat resets state.
  - `test_delete_chats_via_selection` (line 79) — bulk delete via selection UI.
- `TestGalaxyWizard.test_wizard_error_analysis_flow` (line 35) — runs `detect_errors` tool to produce a failed dataset, navigates to error view, clicks "Let our Help Wizard Figure it out!", verifies the static error-analysis response, submits feedback.

### Integration cleanup — `test/integration/test_agents.py`

- PR removed ~230 lines (the `TestAgentsApiMocked` class plus `_create_deps_with_mock_model` / `_registry = build_default_registry()` scaffolding). The live-LLM suite (`pytestmark_live_llm`) is the only thing left from the original file.
- Subsequent PRs reshaped the integration file (now 565 lines) — `72e93fcfbb` (more mocked-test removal), `d195665086` (tightened error-analysis assertion), and others added IWC/UDT/MCP suites. Mock removal stuck.

## Cross-checks vs PR body

- **"Removed ~230 lines of mock-based tests"** — diff confirms 230 lines removed in `test/integration/test_agents.py`. ✓
- **`AgentService.create_dependencies` was the mocked DI point** — original mock was `@patch("galaxy.managers.agents.AgentService.create_dependencies", _create_deps_with_mock_model)`. ✓
- **`/api/configuration` exposes `llm_registry_type`** — verified at `lib/galaxy/managers/configuration.py:244`. ✓
- **`skip_without_agents` checks `llm_api_configured`** — verified at `populators.py:232`. ✓ Note: does not gate on `llm_registry_type`, so live-LLM Galaxy instances also pass the gate (relying on the in-test branch for assertion strength).
- **`StaticAgentRegistry` subclasses `AgentRegistry` for DI type compatibility** — verified at `static_backend.py:84`. ✓
- **"29 unit tests for the static backend"** in test plan — counting `def test_` across both classes yields ~28–30 methods; approximation, not a strict mismatch.
- **`detect_errors.xml` stderr fix** — verified at `test/functional/tools/detect_errors.xml:18`. ✓
- **`build_default_registry` import dropped from app entry** — verified at `lib/galaxy/app/__init__.py:28` (only `build_registry as build_agent_registry` imported). ✓
- **Schema docstring example `inference_services: { static_responses: test/integration/static_agents.yml }`** — FALSE PATH: shipped fixture lives at `lib/galaxy_test/base/data/static_agents.yml`. Minor documentation drift; example string was not corrected.
- **"All `chatgxy_*` selenium helpers/selectors persist"** — FALSE at current `dev`: rebrand commits `fad68caba1` + `56a9dfd0fc` renamed every ChatGXY surface to GalaxyAI (selenium helpers, `navigation.yml` block, test file + class). Anyone running PR's `test_chatgxy.py` against current `dev` would get import errors. Static backend, YAML fixture, and `galaxy_wizard` surfaces are untouched by the rebrand.

## Unresolved questions

- `skip_without_agents` gates on `llm_api_configured` only; assertions inside tests gate on `llm_registry_type == "static"`. Should there be a separate `skip_without_static_agents` for the strong-assertion path so partial-real-LLM CI runs don't silently degrade coverage?
- `StaticAgent.__init__` skips `super().__init__()` and rebinds `agent_type` on the instance. Does any consumer (router, orchestrator, registry walkers) assume class-level `agent_type` and misbehave when handed a `StaticAgent`?
- The `context` predicate does `re.search(pattern, str(context[field]))` — non-string fields (lists, dicts) get coerced via `str()`. Intentional or latent fragility?
- Schema docstring example points at `test/integration/static_agents.yml`, but the shipped fixture is `lib/galaxy_test/base/data/static_agents.yml`. Bug or intentional placeholder for downstream Galaxy admins?
- Live-LLM API tests in `test/integration/test_agents.py` and the new dual-mode `lib/galaxy_test/api/test_agents.py` partially overlap (`test_list_agents`, etc.). Should the integration suite shrink to LLM-only coverage to avoid duplicated assertions?
- Can a future rule schema express per-agent overrides for mixed-mode CI runs (some agents real, others static) without forking the fixture file?

## Changes since merge

Per-file `git log ad7b1e49..origin/dev --no-merges`:

- Core PR files **byte-identical** at HEAD: `static_backend.py`, `factory.py`, `lib/galaxy_test/api/test_agents.py`, `test/unit/app/test_static_agent_backend.py`, `GalaxyWizard.vue`, `DatasetError.vue`, `detect_errors.xml`, `test_parsing.py:951-952`, `test_galaxy_wizard.py`.
- `lib/galaxy_test/base/data/static_agents.yml` — `4afd63a9a9` added rules (67 → 90 lines).
- `lib/galaxy/managers/configuration.py` — unrelated additions (`enable_sse_*`, `sentry_client_traces_sample_rate`, tool request defaults); `_get_registry_type` and `llm_registry_type` lambda untouched.
- `lib/galaxy/selenium/navigates_galaxy.py` — `56a9dfd0fc` renamed `chatgxy_*` → `galaxyai_*`.
- `client/src/utils/navigation/navigation.yml` — `fad68caba1` renamed `chatgxy:` block → `galaxyai:` block (also flipped underlying CSS selectors).
- `lib/galaxy_test/selenium/test_chatgxy.py` — **renamed** to `test_galaxyai.py` by `56a9dfd0fc` (62 lines changed; class `TestChatGXY` → `TestGalaxyAI`).
- `test/integration/test_agents.py` — extensive rewrites; mock removal preserved. Notable follow-ups: `72e93fcfbb`, `d195665086`, `c38162083a`, plus IWC/UDT/MCP additions.
- `lib/galaxy/app.py` — moved to `lib/galaxy/app/__init__.py` by `dbfcdb8bc9` (namespace-package conversion).
- `lib/galaxy/config/schemas/config_schema.yml` — many unrelated additions; `static_responses` doc block at lines 4195–4207 intact.

### File path migration

| PR path | Current path | Reason |
|---------|--------------|--------|
| `lib/galaxy/app.py` | `lib/galaxy/app/__init__.py` | Namespace-package conversion (`dbfcdb8bc9`). |
| `lib/galaxy_test/selenium/test_chatgxy.py` | `lib/galaxy_test/selenium/test_galaxyai.py` | ChatGXY → GalaxyAI rebrand (`56a9dfd0fc`). |
| `chatgxy_*` helpers in `navigates_galaxy.py` | `galaxyai_*` | Same rebrand. |
| `chatgxy:` block in `navigation.yml` | `galaxyai:` block | Same rebrand. |

## Related

- [[PR 21434 - AI Agent Framework and ChatGXY]] — defines the `AgentRegistry` + `BaseGalaxyAgent` framework this PR subclasses to insert the static backend.
- [[PR 21692 - Standardize Agent API Schemas]] — establishes the `AgentResponse` / `ActionSuggestion` shapes the static backend emits.
- [[PR 21942 - Shared Agent Operations and MCP Server]] — adjacent agent-stack PR; the rewritten integration test file now hosts the `TestAgentOperationsManagerEncoding` cases alongside the residual live-LLM suite this PR pared back.
- [[PR 21706 - Data Analysis Agent Integration]] — sibling agent addition; benefits from deterministic test coverage as a regression guard.
- [[PR 21463 - Jupyternaut Adapter for JupyterLite]] — peer external integration using the same `inference_services` config surface.
- [[Component - Agents Backend]] — backend agent architecture; the static backend is a registered alternate `AgentRegistry` implementation.
- [[Component - Agents UX]] — covers ChatGXY (since rebranded GalaxyAI) and GalaxyWizard surfaces this PR added E2E coverage for.
- [[Component - Agents ChatGXY Persistence]] — touches the same surface; note title still uses ChatGXY but underlying surface is now GalaxyAI.
- [[Component - E2E Tests - Writing]] — Selenium infrastructure (`SeleniumTestCase`, `NavigatesGalaxy`, `data-description` selectors) the new tests build on.
