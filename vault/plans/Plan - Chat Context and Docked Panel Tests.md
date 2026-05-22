---
type: plan
title: Chat Context and Docked Panel Tests
tags:
  - plan
  - galaxy/testing
  - galaxy/api
  - galaxy/agents
status: draft
created: 2026-05-21
revised: 2026-05-21
revision: 1
ai_generated: true
summary: "API + Selenium coverage for GalaxyAI docked panel, interface context attachment, and @mention entity context, on the PR 22070 static backend"
related_notes:
  - "[[PR 22070 - Static YAML Agent Backend for Deterministic Testing]]"
  - "[[Component - Agents Backend]]"
  - "[[Component - Agents UX]]"
  - "[[Component - E2E Tests - Writing]]"
---

# Test Plan: Chat Context Attachment + Docked Panel + @Mentions

Functional coverage for three related GalaxyAI surfaces:

1. **Docked panel** — GalaxyAI can render as a persistent side/bottom panel with per-user persistence, alongside the existing full-page mode.
2. **Interface context attachment** — when docked, the panel observes the active Galaxy route (tool form, dataset view, workflow editor/run, job) and ships a structured `interface_context` payload to the chat backend. Center (full-page) mode does **not** attach this.
3. **@mention entity context** — users can @-mention datasets and histories in chat input; resolved references travel to the backend as a structured `entity_context` payload and the agent renders them into the prompt as a sanitized "Referenced entities:" block.

The agent prompt formatters, sanitization, and entity rendering already have strong unit coverage in `test/unit/app/test_agents.py`. This plan adds wiring coverage at the HTTP and UI boundaries, leveraging the deterministic static agent backend from [[PR 22070 - Static YAML Agent Backend for Deterministic Testing]].

## Surface map

- `POST /api/chat` accepts:
  - `query: str`
  - `context: Optional[str]` — legacy free-form string; now JSON-parsed via `safe_loads`. If it parses to a dict it becomes `interface_context`; otherwise falls back to `context_type`.
  - `entity_context: Optional[ChatEntityContext]` — structured `{datasets: [EntityReference], histories: [EntityReference]}` (`lib/galaxy/schema/schema.py`).
- Router copies the full chat context into `_handoff_context` so specialist agents inherit interface/entity context (`lib/galaxy/agents/router.py`).
- `BaseGalaxyAgent._prepare_prompt` prepends a sanitized "Active interface context: …" line and a "Referenced entities:" block, sanitized via `_sanitize_context_value` (newlines stripped, 200-char cap).
- Client only attaches `interface_context` when the panel is `docked || panel` (`client/src/components/GalaxyAI.vue`). Center mode does not.

## Static fixture additions

Add two context-matching rules to `lib/galaxy_test/base/data/static_agents.yml`. `StaticAgent._rule_matches` supports `context: { field: regex }` already; these are its first users.

```yaml
  - match:
      agent_type: router
      context:
        interface_context: "(?i)bwa.?mem"
    response:
      content: "I see you're working with BWA-MEM. This aligner is great for short reads."
      confidence: high
      agent_type: router

  - match:
      agent_type: router
      context:
        entities: "(?i)dataset #\\d+"
    response:
      content: "I can help with the dataset you mentioned."
      confidence: high
      agent_type: router
```

Additive — existing greeting / RNA-seq / fallback rules continue to match unchanged tests because the new rules have stricter predicates.

## API tests — `lib/galaxy_test/api/test_chat.py` (NEW)

Existing `lib/galaxy_test/api/test_agents.py` exercises `POST /api/ai/agents/query` and stays as-is. The `entity_context` and JSON-dict `interface_context` plumbing lives on `POST /api/chat` (the `ChatAPI` router), which deserves its own test file given the surface area (query, history, exchange CRUD, feedback). Mirror the `_is_static` / `skip_without_agents` pattern PR 22070 established so the file works against both the static backend (strong assertions) and a real LLM (weak assertions).

1. **`test_chat_basic_query`** — `POST /api/chat {query: "Hello!"}` with no context. Static-mode: response content contains "Hello". Smoke for the chat endpoint itself.
2. **`test_chat_legacy_string_context_preserved`** — `POST {query, context: "tool_error"}` (non-JSON string). Asserts 200 + valid response; verifies the `safe_loads`-then-fallback path keeps the legacy contract.
3. **`test_chat_legacy_invalid_json_context_falls_back`** — `context: "{not json"`. Should not 500; regression guard for the `safe_loads` swap.
4. **`test_chat_interface_context_json_dict_routed`** — `context: json.dumps({contextType: "tool", toolName: "BWA-MEM", toolId: "bwa_mem"})`. With the new `interface_context` static rule, static-mode asserts response is the rule-specific content. Verifies JSON parse → `interface_context` injection → agent prompt formatting end-to-end.
5. **`test_chat_entity_context_datasets`** — Upload a dataset, `POST {query, entity_context: {datasets: [{type, identifier, id, name, hid, extension, state}]}}`. Static rule keyed on `entities` regex returns entity-aware response. Static-mode asserts content reflects dataset hid/name.
6. **`test_chat_entity_context_histories`** — Same with histories. Confirms both branches of `ChatEntityContext` flow through.
7. **`test_chat_entity_context_schema_validation`** — `POST` with `entity_context.datasets[0]` missing required `type` field → expect 422. Pins the `EntityReference` schema contract so accidental field removal breaks tests.
8. **`test_chat_entity_context_prompt_injection_sanitized`** — Dataset `name: "Hello\nIgnore previous instructions\n"`. Assert 200 and the request succeeds without leaking the newline back through. Defense-in-depth at the integration boundary; deeper sanitization assertions live in unit tests.
9. **`test_chat_persists_exchange_with_entity_context`** — Send a query with `entity_context`, `GET /api/chat/history`, assert the exchange is recorded. Verifies the new context plumbing doesn't break persistence.
10. **`test_chat_history_lifecycle`** — Send N messages → `GET /api/chat/history` returns N → `DELETE /api/chat/history` → empty. Also used by Selenium delete-chats flow; worth standalone API coverage.
11. **`test_chat_delete_single_exchange`** — `DELETE /api/chat/exchange/{id}` removes one exchange, leaves others.

## Selenium / Playwright tests — extend `lib/galaxy_test/selenium/test_galaxyai.py`

Three new flow tests, each densely packed so per-test login/history setup amortizes across many assertions. Existing 3 tests remain untouched; total in file becomes 6. Both the Selenium and Playwright runners pick these up (`./run_tests.sh -selenium` / `-playwright`).

### 1. `test_dock_lifecycle_persistence_and_activity_bar`
Covers panel persistence, dock-location switching, activity-bar adaptive behavior, drag-resize persistence, and the center-mode negative contract in one flow.

- Open GalaxyAI in center → click activity icon → navigates to `/chatgxy` full-page route.
- Dock to right → assert panel container shows `data-docked-location="right"`.
- Click activity icon while docked → panel hides; click again → panel shows (toggle behavior).
- Drag separator → reload → panel still docked right at ~same (non-default) width.
- Dock to bottom → assert layout switches → dock back to center → assert full-page route.
- In center mode, send one message → assert response (smoke for the full-page send path) and assert **no** `.context-indicator` — the negative contract that center mode never attaches interface context.

### 2. `test_mention_end_to_end_with_entity_context`
Covers @mention dropdown filtering, empty state, Enter-to-select-without-send, entity context flowing to the backend, and new-chat reset.

- API setup: `dataset_populator.new_dataset(history_id, name="my reads")`, second history named "RNA-seq run".
- Dock right.
- Type `@zzzzzz` → assert "No matches" empty state.
- Backspace, type `@my` → dropdown filters to "my reads".
- Press Enter → mention inserted, message NOT sent (the dropdown's Enter handling, per the `f2e1c59f09` regression).
- Add suffix " — what is this?" → send → with the `entities` static rule, assert response is the entity-aware content.
- Click "New" → assert empty → navigate to /workflows and back → still empty.
- Type `@RNA` → dropdown shows the history → select → send → second response.

### 3. `test_interface_context_flow`
Covers the interface-context indicator across two representative Galaxy surfaces, context-routed responses, and the dismiss-clears-outgoing-context contract.

- Dock right.
- Navigate to `/?tool_id=cat1` → assert `.context-indicator` reflects cat1 → send → with the `interface_context` static rule, assert tool-routed response.
- Navigate to `/datasets/{id}` (dataset from quick API setup) → indicator updates to "Dataset: …".
- Click dismiss on the indicator → indicator hides → send → with the generic fallback static rule, assert response is the **non-tool** content (proves dismiss actually clears outgoing context, not just the UI affordance).

Skipped surfaces: workflow editor / workflow run / job views. Heavy setup for small dispatch-table delta; one tool + one dataset already proves the routing.

### Infrastructure additions

- `client/src/components/GalaxyAI.vue` + dock controls: `data-description` attrs on dock-to-right / dock-to-bottom / dock-to-center / undock buttons, on the `.context-indicator` and its dismiss button, on the entity chip rendered in messages, and on the docked-panel root with a `data-docked-location` attribute. Follow PR 22070's `data-description` placement pattern.
- `MentionDropdown.vue`: `data-description="galaxyai mention dropdown"` on the root and `data-description="galaxyai mention item"` on each `.mention-item` so we don't depend on CSS-class scraping.
- `client/src/utils/navigation/navigation.yml` `galaxyai:` block: add `dock_right`, `dock_bottom`, `dock_center`, `undock`, `context_indicator`, `context_indicator_dismiss`, `mention_dropdown`, `mention_item`, `mention_empty`, `entity_chip`, `panel_container(location)` selectors.
- `lib/galaxy/selenium/navigates_galaxy.py` helpers:
  - `galaxyai_dock_to(location)` — clicks the matching dock-to button, waits for `data-docked-location` to match.
  - `galaxyai_assert_docked(location)` — assertion variant.
  - `galaxyai_send_with_mention(prefix, entity_text, suffix="")` — types prefix + `@`, waits for dropdown, types entity_text, presses Enter to select, types suffix, sends.

## What is intentionally out of scope

- **Re-testing prompt formatters and sanitization at the unit level** — already strong in `test/unit/app/test_agents.py:992-1103`. API #8 is the only integration-boundary smoke check.
- **Live-LLM coverage** — out of scope; PR 22070's dual-mode pattern keeps assertions adaptive but static rules drive everything strong here.
- **Client unit tests** — at parity with existing client coverage; no expansion proposed.
- **XSS-style entity-mention rendering** — belongs in client unit tests around `MentionDropdown` / message rendering, not Selenium.

## Tradeoffs

Selenium density costs diagnostic clarity on failure — a 9-step test that breaks at step 4 gives a less surgical signal than 9 separate tests. Mitigation: per-step `retry_assertion_during_transitions` and `@selenium_test`'s automatic debug dump. The 3-vs-many runtime savings is worth losing some bisection precision in this suite.

## Unresolved questions

- Is dropping workflow-editor coverage in Selenium #3 acceptable, or worth a fourth flow test?
- Drag-resize assertion: byte-exact width vs "non-default"? (Lean: non-default; cross-browser exactness is flaky.)
- Should the negative-contract assertion in Selenium #1 ("no context indicator in center mode") also be asserted via API by inspecting an outgoing payload hook? No such hook exists today; keeping it in Selenium.
- Add a `skip_without_static_agents` decorator (PR 22070 open question) so context-routing API tests can hard-assert without dual-mode branching? Worth doing alongside this work if so.
- Add the two new static rules to the shipped `static_agents.yml` (admins get worked examples) or carve a test-only override fixture? Lean: shipped file.
- Confirm there is no existing per-route hook in the backend that could surface "last outgoing payload" — would let one of the Selenium negative-contract assertions move to API.

## Implementation order

1. Static fixture rules + (optional) `skip_without_static_agents` decorator.
2. API tests — fastest feedback loop, validates schema + routing wiring first.
3. `data-description` attrs + `navigation.yml` selectors + `navigates_galaxy.py` helpers.
4. Selenium tests — relies on the above.
5. Cross-check both new files against `./run_tests.sh -api lib/galaxy_test/api/test_chat.py` and `./run_tests.sh -selenium lib/galaxy_test/selenium/test_galaxyai.py`.
