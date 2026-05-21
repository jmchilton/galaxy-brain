# Test agent tool dispatch against a real DB in an event loop (aiocop regression guard)

## Summary

Add an integration test that exercises the pydantic-ai `@agent.tool` dispatch chain end-to-end against a real Galaxy DB inside the FastAPI event loop, using `pydantic_ai.models.test.TestModel` to deterministically force the LLM to call every registered tool. This closes the coverage gap that let blocking sync `Session` I/O in `lib/galaxy/agents/history_tools.py` ship undetected (galaxyproject/galaxy#22361 review by @mvdbeek), and turns the aiocop middleware into a real regression guard for the agent tool path.

Placed under `test/integration/` (not `lib/galaxy_test/api/`) because the test requires a custom Galaxy config — the `test_model` agent registry backend — which only the integration test driver supports per-class via `handle_galaxy_config_kwds`. See `doc/source/dev/writing_tests.md` decision tree and the cited precedent `test/integration/test_event_loop_blocking.py`, which uses the same aiocop assertion pattern.

## Why / context

@mvdbeek (galaxyproject/galaxy#22361 review, 2026-05-19) flagged that `history_tools.py` declared `async def` functions doing synchronous SQLAlchemy I/O, awaited from `async def` pydantic-ai tools running on the uvicorn event loop — blocking every concurrent request on the worker. Fix shipped in `c8b77adfde` (threadpool offload via `anyio.to_thread.run_sync(partial(...))` matching `error_analysis.py:79` and `router.py` precedent).

His explicit follow-up question — *"Our aiocop integration should have flagged this, is this executed in our test suite?"* — exposes the real gap: **no.** aiocop is configured correctly (on by default for `run_tests.sh` API/integration suites, fails any request with `X-Aiocop-Violations` severity ≥ 50 via `lib/galaxy_test/base/api.py:237`), but **nothing drives the agent tool dispatch path against a real DB inside an event loop**:

- `test/unit/app/test_history_tools.py` — mocks the session.
- `test/unit/app/test_agents.py::TestPageAssistantAgent` — mocks `_run_with_retry`, so `@agent.tool` wrappers never run.
- `lib/galaxy_test/api/test_agents.py` (galaxyproject/galaxy#22070) — runs under the **static YAML backend** which by design `"skips pydantic-ai Agent creation entirely"` (`static_backend.py:27`). `process()` is YAML rule matching → canned string; no `Agent`, no `@agent.tool`, no tool dispatch.
- No `lib/galaxy_test/api/` or `test/integration/` test posts to `/api/chat` with a `page_id` to drive `PageAssistantAgent` end-to-end.

So aiocop never sees the path, and the next analogous regression slips the same way. galaxyproject/galaxy-architecture#20 adds a `gx-review-async-sync` review-time check for the source pattern — this issue is the runtime-test complement.

## Goal

A regression test that:

1. Runs under `./run_tests.sh -integration` (CI), no external LLM, no opt-in env var.
2. Drives the real `PageAssistantAgent` (real registry, real `@agent.tool` registration, real `await self.agent.run(...)`) against a real DB and real history/page data.
3. Forces pydantic-ai to invoke **every** registered tool deterministically (via `TestModel(call_tools='all')`). For `PageAssistantAgent` the registered tool surface is `list_history_datasets`, `get_dataset_info`, `get_dataset_peek`, `get_collection_structure`, `resolve_hid` (the `@agent.tool` callables in `page_assistant.py:224-317`), each delegating to the corresponding public function in `history_tools.py` (the agent tool is `list_history_datasets`; the wrapped helper is `list_history_items`).
4. Asserts aiocop did not detect a blocking-I/O violation on the request — i.e., the existing `_check_aiocop_violations` in `lib/galaxy_test/base/api.py` is the assertion; no new assertion code needed.
5. Would have **failed** prior to `c8b77adfde` and **passes** after — proving it's a real guard.

## Why TestModel works (mechanism)

`pydantic_ai.models.test.TestModel` default behavior (`call_tools='all'`) iterates the agent's registered function tools and emits a `ToolCallPart` for each, with auto-generated arguments derived from each tool's schema (`pydantic_ai/models/test.py:175-181`, tool-call emission on first request at `:216-228`). That fires each registered `@agent.tool` callable in `page_assistant.py:224-317`, which awaits the corresponding public function in `history_tools.py` (`list_history_items`, `get_dataset_info`, `get_dataset_peek`, `get_collection_structure`, `resolve_hid`). Each public function now wraps its sync body in `await anyio.to_thread.run_sync(partial(_list_history_items_impl, ...))` etc., so the `session.execute(...)` calls run on a worker thread. Without the fix, the `_impl` body runs on the event-loop thread and aiocop's audit hook observes the blocking syscalls there.

`Agent.override(model=...)` (`pydantic_ai/agent/abstract.py:1423`) is the canonical scoped-swap mechanism, but it's a per-call context manager applied at the call site — not a fit for swapping inside a long-lived `BaseGalaxyAgent.agent` that the test code can't easily reach. The implementation uses a registry-level swap (see *Design alternatives* below).

## What can go wrong (load-bearing details)

Two failure modes the design must address explicitly — caught during review and verified against `aiocop.core.blocking_io.BLOCKING_EVENTS_DICT` and pydantic-ai source.

**1. The default `AIOCOP_FAIL_SEVERITY = 50` threshold may not catch a sync `session.execute` on a warm pooled connection.** Severity table:

| Event | Severity |
|---|---|
| `socket.getaddrinfo`, `socket.socket.connect` | **50** (caught by default `_check_aiocop_violations`) |
| `socket.socket.send`, `recv`, `sendall`, `recvfrom`, … | **10** (NOT caught) |
| `sqlite3.connect` | 10 |
| `ssl.SSLSocket.send/recv/read/write` | 10 |

A *first* DB call in a fresh SQLAlchemy pool emits `getaddrinfo` + `socket.connect` (50, caught). Subsequent calls reusing pooled connections emit only `send/recv` (10, not caught). The Galaxy test server warms its pool at startup, so by the time the test request fires, queries are likely pool-reuse and severity-10-only. **Therefore the test cannot rely on the default `_check_aiocop_violations` assertion alone** — it must directly inspect the `X-Aiocop-Violations` header and fail on *any* socket-`send`/`recv` event (which only an event-loop-thread sync DB call can produce inside an async handler). The default high-severity check stays as a separate safety net.

**2. `PageAssistantAgent` declares structured `output_type` (`page_assistant.py:184-211`: `ToolOutput(FullReplacementEdit, ...)`, `ToolOutput(SectionPatchEdit, ...)`).** After the tool-call round, TestModel emits a second response choosing one output tool via `_get_output` (`pydantic_ai/models/test.py:183-205`) and auto-generates args via `gen_tool_args` against the chosen pydantic schema. If auto-generated args fail validation, pydantic-ai retries inside `agent.run`, and `BaseGalaxyAgent._run_with_retry` (`base.py:415+`) retries the whole run on top — burning request budget and potentially returning a 500 that masks the actual aiocop check. **Mitigation:** the registry swap must pass `custom_output_args` to `TestModel` with a hand-crafted valid `FullReplacementEdit` (e.g. `{"new_content": "", "reasoning": ""}`) so the second-round output validates immediately.

## Acceptance criteria

- [ ] New test file under `test/integration/` (e.g. `test_page_assistant_tool_dispatch.py`) that meets the *Goal* above. Integration suite (not API) because the test class needs `handle_galaxy_config_kwds` to enable the `test_model` agent registry — a per-server-run config switch.
- [ ] Test invokes every `@agent.tool` registered in `page_assistant.py:224-317` via the real pydantic-ai dispatch (verifiable from server logs or via `TestModel.last_model_request_parameters`).
- [ ] Test seeded with a user history containing at least one HDA (with a `creating_job` so the `hda.creating_job` lazy load fires) and one HDCA (paired or list collection, so `_get_collection_structure_impl` exercises `hdca.collection.elements` and per-element `elem.hda` lazy loads).
- [ ] Test asserts on the `X-Aiocop-Violations` header directly — fails on *any* `socket.socket.send`/`recv`-class event emitted during the request, not just the default severity-≥50 threshold (see *What can go wrong #1*). Default `_check_aiocop_violations` stays as a complementary safety net.
- [ ] Test passes on current `dev` (post-fix); fails when `c8b77adfde` is reverted. Captured `X-Aiocop-Violations` header from the regressed run included in the PR description as evidence.
- [ ] Test gated with `@pytest.mark.skipif(not AIOCOP_ENABLED, ...)` mirroring `test/integration/test_event_loop_blocking.py` so it doesn't silently no-op when `GALAXY_TEST_AIOCOP` is off.
- [ ] No reliance on `GALAXY_TEST_ENABLE_LIVE_LLM` or external LLM credentials.
- [ ] `skip_without_agents` decorator applied so the test cleanly skips when agents are disabled.

## Proposed implementation

### 1. Add a TestModel-backed registry (mirror `StaticAgentRegistry`)

Pattern is established by galaxyproject/galaxy#22070: `factory.py` checks `inference_services.<switch>` and returns an alternate `AgentRegistry`. Add a parallel switch:

- `lib/galaxy/agents/test_model_backend.py` — `TestModelAgentRegistry(AgentRegistry)`: defers to the *real* `build_default_registry` for agent class registration, then overrides each agent instance's `.agent` (the `pydantic_ai.Agent` constructed in `BaseGalaxyAgent._create_agent`, `base.py:319,322`) with a fresh `Agent(..., model=TestModel(call_tools='all', custom_output_args=<valid output instance for that agent>), tools=<same registered tools>)` — preserving the real `@agent.tool` registration and `deps_type` so the dispatch chain is unchanged from production. The `custom_output_args` per agent type avoids the structured-output retry storm described in *What can go wrong #2*; for `page_assistant` use a minimal valid `FullReplacementEdit`.
- `lib/galaxy/agents/factory.py` — extend with `if inference_config.get("test_model"): return TestModelAgentRegistry(...)`, taking precedence after `static_responses` is not set.
- `lib/galaxy/managers/configuration.py` — expose `llm_registry_type == "test_model"` mirror to the existing `"static"`/`"default"` so tests can detect mode.
- The new integration test class opts in via `handle_galaxy_config_kwds` (writing_tests.md:807 — the canonical per-test Galaxy config mechanism, available on `IntegrationTestCase` only). No `driver_util.py` env-var sentinel wiring is needed; the mode switch is confined to the one test class.

Alternative to a registry subclass: a `TestModelAgentDecorator` that wraps any `AgentRegistry.get_agent` result and patches `.agent` lazily. Smaller surface, but harder to reason about for new maintainers. The subclass route mirrors `StaticAgentRegistry` exactly and is the cited precedent.

### 2. Add the test

`test/integration/test_page_assistant_tool_dispatch.py` (new) — integration test (not API) because it needs `handle_galaxy_config_kwds` to enable the `test_model` agent backend per server run. Mirrors the `@pytest.mark.skipif(not AIOCOP_ENABLED, ...)` gate from `test/integration/test_event_loop_blocking.py`. Sketch:

```python
import pytest

from galaxy_test.base.api import AIOCOP_ENABLED
from galaxy_test.base.populators import DatasetPopulator, skip_without_agents
from galaxy_test.driver import integration_util


# Severity-10 socket events that should never appear on an async handler's
# request — their presence means a sync DB call ran on the event-loop thread.
_LOOP_BLOCKING_SOCKET_EVENTS = (
    "socket.socket.send", "socket.socket.sendall", "socket.socket.sendto",
    "socket.socket.recv", "socket.socket.recv_into", "socket.socket.recvfrom",
)


@pytest.mark.skipif(not AIOCOP_ENABLED, reason="GALAXY_TEST_AIOCOP not set")
@skip_without_agents
class TestPageAssistantToolDispatchIntegration(integration_util.IntegrationTestCase):
    """Drives the real PageAssistantAgent tool chain against a real DB.
    Guards against blocking sync I/O in @agent.tool wrappers (aiocop)."""

    @classmethod
    def handle_galaxy_config_kwds(cls, config):
        super().handle_galaxy_config_kwds(config)
        # Swap to the TestModel-backed registry; the real registry constructs
        # real agents, then TestModelAgentRegistry overrides each
        # BaseGalaxyAgent.agent.model with TestModel(call_tools='all').
        config["inference_services"] = {"test_model": True}

    def setUp(self):
        super().setUp()
        self.dataset_populator = DatasetPopulator(self.galaxy_interactor)

    def test_page_assistant_tool_chain_does_not_block_event_loop(self):
        history_id = self.dataset_populator.new_history()
        # Seed lazy-load paths: an HDA (creating_job lazy load) and a
        # collection (collection/elements/elem.hda lazy loads in
        # _get_collection_structure_impl).
        self.dataset_populator.new_dataset(history_id, content="seq\n")
        # … create a paired/list collection via DatasetCollectionPopulator
        # … create a history-attached page (populator added in #22361)
        page_id = self.dataset_populator.new_history_page(
            history_id=history_id, title="aiocop guard"
        )["id"]
        self.dataset_populator.wait_for_history(history_id)

        response = self._post(
            "chat",
            data={"query": "draft a summary", "page_id": page_id},
            json=True,
        )
        self._assert_status_code_is_ok(response)

        # Direct header inspection: catches severity-10 socket send/recv too,
        # which the default _check_aiocop_violations (>=50) would let through
        # on warm pooled DB connections.
        header = response.headers.get("x-aiocop-violations", "")
        fields = dict(p.split("=", 1) for p in header.split(";") if "=" in p)
        first = fields.get("first", "")
        assert not any(ev in first for ev in _LOOP_BLOCKING_SOCKET_EVENTS), (
            f"Sync DB on event loop detected: {header!r}"
        )
        # Sanity that TestModel swap landed (otherwise tools never fired and
        # the guard is a no-op). Use response metadata showing tools were
        # invoked — see Q6 for the exact assertion shape.
```

### 3. Verify the guard

Reproduction:

```bash
GALAXY_TEST_AIOCOP=1 ./run_tests.sh -integration test/integration/test_page_assistant_tool_dispatch.py
```

Before merge, revert the threadpool-offload changes on `history_tools.py` (pre-rebase SHA `c8b77adfde`; post-#22361-merge: the equivalent diff within the squashed merge commit) locally and rerun. Confirm the test fails with `Sync DB on event loop detected: …socket.socket.send…` (or `recv`). Capture the `X-Aiocop-Violations` header from the regressed run in the PR description as evidence — not "tests pass green," but the actual blocking-event readout the test caught.

## Design alternatives considered

Use `feedback_decision_doc_authoring` UPPER_SNAKE option naming. Recommendation: **TEST_MODEL_VIA_REGISTRY**. Brief table; full write-ups below.

| Option                        | One-liner                                                                                   | In scope?                       |
| ----------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------- |
| **TEST_MODEL_VIA_REGISTRY**   | New `TestModelAgentRegistry` swap mirroring `StaticAgentRegistry`, full real dispatch chain | ✅ Recommended                   |
| **DIRECT_TOOL_INVOCATION**    | API/Python test that calls `await list_history_items(real_session, ...)` directly, no LLM   | Useful, narrower                |
| **LIVE_LLM_IN_CI**            | Run with a real LLM in CI to exercise dispatch                                              | ❌ Rejected                      |
| **STATIC_BACKEND_ONLY**       | Try to make #22070's static backend cover this                                              | ❌ Fundamentally cannot          |
| **MONKEYPATCH_AT_TEST_SETUP** | Patch `BaseGalaxyAgent._create_agent` in test fixtures                                      | ❌ Test server is out-of-process |

### TEST_MODEL_VIA_REGISTRY (recommended)
- **What**: parallel to #22070's `StaticAgentRegistry`. Real registry constructs real agents; we override each `BaseGalaxyAgent.agent` with a pydantic-ai `Agent(model=TestModel(call_tools='all'), ...)` preserving the registered tools. Enabled per-class via integration test's `handle_galaxy_config_kwds`.
- **Pros**: matches an existing established pattern in the same subsystem; exercises the *entire* tool dispatch chain (including the threadpool offload we're guarding); deterministic; no LLM; no external creds; one CI invocation.
- **Cons**: ~150–250 LOC for the registry + factory + config exposure. Real implementation lift, not just a test file. Adds a third backend mode to reason about.

### DIRECT_TOOL_INVOCATION
- **What**: An integration test that fetches a real `trans` from `self._app` and calls `await list_history_items(trans.sa_session, history_id)` directly inside the test, looping over each helper. aiocop sees the syscalls. Still an integration test (not API) because it needs `self._app` and to run under the test server's event loop with aiocop enabled — but it doesn't need a config switch, so could in principle live as a slim integration class without `handle_galaxy_config_kwds`.
- **Pros**: smallest implementation lift — no registry/factory work, no `TestModel`. Still catches a threadpool-fix regression in the helpers.
- **Cons**: does **not** validate the dispatch wiring (`@agent.tool` registration, the `await` in `page_assistant.py:240+`, the agent-deps plumbing). A future regression that breaks just the wrapper layer would slip. Also less natural as a "drive the agent" test that mvdbeek would recognize as answering his question.
- **Use as**: a fast, narrow companion guard, or a fallback if TEST_MODEL_VIA_REGISTRY is deemed too much for this PR.

### LIVE_LLM_IN_CI (rejected)
- **What**: Run the new test against a real configured LLM in CI.
- **Why rejected**: non-deterministic — a given prompt may not coax the LLM into calling specific tools; tests become flaky. Requires LLM credentials in CI (security/cost). The existing `GALAXY_TEST_ENABLE_LIVE_LLM` flag is opt-in by design; promoting it to CI defeats that. Doesn't give a reliable regression guard.

### STATIC_BACKEND_ONLY (rejected)
- **What**: Try to use the static YAML backend from #22070 to cover this.
- **Why rejected**: structurally impossible. `static_backend.py:27,40,52` is explicit — `StaticAgent` "skips pydantic-ai Agent creation entirely", `__init__` "Intentionally skip super().__init__()", `process()` is pure YAML rule matching returning a canned string. No `pydantic_ai.Agent` instance exists, so no `@agent.tool` dispatch fires, so `history_tools.py` is never invoked. aiocop literally has nothing to observe.

### MONKEYPATCH_AT_TEST_SETUP (rejected)
- **What**: `mock.patch` `BaseGalaxyAgent._create_agent` in pytest fixtures to inject TestModel.
- **Why rejected**: agent instances are constructed at app startup (via `factory.py:build_default_registry`), before any test `setUp` runs — so a per-test patch arrives too late. Possible variants exist (session-scoped fixture pre-`init_fast_app`; post-hoc walk every agent in the registry) but they re-invent the registry-swap mechanism that #22070 already established as the conventional injection point. Use the established mechanism — and on the integration suite, `handle_galaxy_config_kwds` already runs before app construction (writing_tests.md:823), so the registry swap lands at the right point in startup.

## Open questions

- **Q1 — registry granularity**: should `TestModelAgentRegistry` swap every agent's model uniformly, or allow per-agent-type opt-out (e.g. keep `router` real, override only the leaf agents)? Probably uniform for simplicity, but worth confirming when `router` is invoked in the page-chat flow.
- **Q2 — should this test ride in #22361 or land separately?** The review summary said *"some of that could be followup"*; this is squarely follow-up scope (test infrastructure, not the fix itself). Filing as a separate issue/PR with a back-link is cleaner and matches mvdbeek's framing. Land under the integration suite — see writing_tests.md decision tree.
- **Q3 — pydantic-ai version skew**: the lockfile (`requirements.txt`) pins `pydantic-ai==1.97.0` / `pydantic-ai-slim==1.97.0` (pyproject only floors at `>=1.56.0`), but the local venv has `1.93.0`. `TestModel.call_tools='all'` and `custom_output_args` exist in both — but the skipped `test_router_with_test_model` at `test_agents.py:286` (decorator at `:284`) cites *"TestModel API changed in pydantic-ai, needs update for new version"*, so something in the call surface drifted. Validate against the *pinned* 1.97.0 version before committing the implementation. Reviving the skipped unit test is adjacent but separable — track in its own task, not this issue.
- **Q4 — collection seeding**: which `DatasetCollectionPopulator` helper produces a paired list with elements that exercise the `hdca.collection.elements` lazy-load path in `_get_collection_structure_impl`? Pick one whose output covers both element types (`elem.hda` and `elem.child_collection`).
- **Q5 — page populator**: `lib/galaxy_test/base/populators.py` (galaxyproject/galaxy#22361) added `new_history_page` etc. — confirm those are public and stable enough to depend on, or stabilize them as part of this work.
- **Q6 — assertion shape**: rely solely on `_maybe_check_aiocop` (implicit pass-on-no-violation), or also assert response metadata showing tools were invoked? The latter guards against the TestModel swap silently no-op'ing (e.g. wrong factory wiring). Recommend both.
- **Q7 — authz coverage**: also seed an unauthorized-page case (different user, no sharing) and assert `POST /api/chat` with that `page_id` returns 403 *before* the tool chain fires. Cheap to add to the same test class; uses the access-check shipped in `88e66d6a5b` (`get_accessible_page`). Closes a small adjacent gap surfaced in guerler's `discussion_r3032429339`.

## Out of scope

- mvdbeek's perf comments on the same review (unbounded queries → SQL `LIMIT/OFFSET`; `element_count` already addressed; N+1 in `_get_collection_structure_impl`). Tracked under separate B-bucket items in the PR review checklist.
- Refactoring `BaseGalaxyAgent` constructor to take a model factory (cleaner but bigger blast radius; the registry-level swap is sufficient).
- General async-DB plumbing for `trans.sa_session` (no Galaxy async-SQLAlchemy infrastructure exists; project-wide initiative).
- Resurrecting the skipped `test_router_with_test_model` — adjacent but separable; flag as a likely-quick fix in Q3.

## Risks

- **Aiocop severity threshold may not catch the regression** *(highest-priority, addressed via direct header inspection)* — see *What can go wrong #1*. The proposed test sidesteps this by parsing the `X-Aiocop-Violations` header for severity-10 socket `send`/`recv` events rather than relying on `_check_aiocop_violations`'s ≥50 gate. If aiocop's header format changes, the test will need updating.
- **Structured `output_type` validation failure storm** *(addressed via `custom_output_args`)* — see *What can go wrong #2*. Without a valid `custom_output_args`, TestModel's auto-generated `FullReplacementEdit` may fail pydantic validation, triggering pydantic-ai retries and the outer `_run_with_retry` (`base.py:415+`), masking the aiocop signal. The registry swap must supply `custom_output_args`.
- **Cross-thread `scoped_session` access** — the threadpool fix and the existing `error_analysis.py`/`router.py` offloads all touch the thread-local `scoped_session` from a worker thread. Implicitly battle-tested in shipped code, not explicitly documented. The new test will exercise this in CI, surfacing any latent issue.
- **TestModel arg generation for tool inputs** — auto-generated `history_id`/`hid` arguments will be `0`/synthetic. Tools return "not found" gracefully, so the aiocop guard goal (fire the query) is unaffected. For *content* assertions we'd need to script TestModel via `FunctionModel` instead.
- **Registry-mode mutual exclusion** — ensure `static_responses` and `test_model` config switches don't both apply; factory should pick one with explicit precedence and log the choice.

## References

- galaxyproject/galaxy#22361 — page assistant agent / notebooks PR
- galaxyproject/galaxy#22361 (review comment) — `https://github.com/galaxyproject/galaxy/pull/22361#discussion_r3268670909` (mvdbeek, blocker)
- galaxyproject/galaxy `c8b77adfde` — threadpool offload fix
- galaxyproject/galaxy#22070 — static YAML agent backend (template for the registry swap)
- jmchilton/galaxy-architecture#20 — review-time guard for the source pattern (companion to this runtime guard)
- `lib/galaxy/agents/history_tools.py` — subject under test
- `lib/galaxy/agents/page_assistant.py:224-317` — `@agent.tool` registration that we want to exercise
- `lib/galaxy/agents/error_analysis.py:79`, `lib/galaxy/agents/router.py:110+` — threadpool precedent cited in the fix
- `lib/galaxy_test/base/api.py:230-276` — aiocop assertion infrastructure (`AIOCOP_FAIL_SEVERITY = 50`, `_check_aiocop_violations`)
- `test/integration/test_event_loop_blocking.py` — existing aiocop integration test pattern; uses `init_fast_app = staticmethod(...)` to inject debug routes, `@pytest.mark.skipif(not AIOCOP_ENABLED, ...)` gate, `socket.getaddrinfo` as the verified severity-50 trigger. Template to mirror for both the gate and the header inspection idiom.
- `lib/galaxy_test/api/test_agents.py` — dual-mode template for `ApiTestCase` + `skip_without_agents`
- `lib/galaxy_test/driver/driver_util.py:533-560,658` — `EmbeddedServerWrapper` (test server runs in a thread in the test process, *not* a separate process)
- `test/unit/app/test_agents.py:42,286` — `from pydantic_ai.models.test import TestModel` (`:42`); skipped `test_router_with_test_model` (`:286`, decorator `:284`)
- pydantic-ai source: `pydantic_ai/models/test.py:61` (`class TestModel(Model)`), `:76` (`call_tools='all'` default), `:175-181` (`_get_tool_calls` iterates all function_tools when `call_tools=='all'`), `:183-205` (`_get_output` for structured output_type), `:216-228` (tool-call emission on first request); `pydantic_ai/agent/abstract.py:1423` (`Agent.override` context manager)
- `aiocop.core.blocking_io.BLOCKING_EVENTS_DICT` — severity table (78 events); load-bearing entries: `socket.socket.send`/`recv` = 10, `socket.socket.connect` = 50, `socket.getaddrinfo` = 50, `sqlite3.connect` = 10
