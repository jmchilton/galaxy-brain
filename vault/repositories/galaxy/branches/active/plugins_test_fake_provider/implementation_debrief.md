# Implementation debrief

## Why not the static agent backend

`inference_services.static_responses` (`lib/galaxy/agents/static_backend.py`, wired by `driver_util.py`) swaps the pydantic-ai `AgentRegistry`, which serves `/api/ai` agents and the GalaxyAI/wizard Selenium tests. The plugin proxy (`_open_ai_adapter` in `api/plugins.py`) builds `AsyncOpenAI` directly and never touches the registry. The tests also assert what is forwarded upstream, which a canned-response backend can't observe.

## What changed

- `FakeAIProvider` wraps `pytest_httpserver.HTTPServer` (already a pinned test dep): `respond_completion`, `respond_stream`, `respond_error`, `last_request`, `last_body`, `requests`.
- `FakeAIProviderIntegrationTestCase` starts it before `super().setUpClass()`, because Galaxy's config (and its base URLs) is built there, and clears it per test.
- All 14 mocked tests now assert on the received request. `is omit` became "key absent from the request body". The `inference_services` tests use a separate URL path per level (`/jupyterlite/v1`, `/default/v1`, `/global/v1`) and assert the path, the `Authorization` header and `model`.
- Strengthened: the 4 validation tests assert no request reached the provider, and non-streaming success asserts the auth header and `stream: false`.
- Kept the streaming `close()` assertion through a pass-through spy (`patch.object(openai.AsyncOpenAI, "close", ...)` calls the real `close`). This is the only patch left.
- The error test uses 404 because the OpenAI client retries 5xx/429 with backoff.
- `test_index`/`test_show_returns_all_fields` and all validation payloads are unchanged.

## Evidence

- `pytest test/integration/test_plugins.py`: 22 passed (same count as before), about 26s, local venv on openai 3.24.0 (matches the pin).
- Mutation run (reverted): dropping `client.close()`, sending `tools=[]`, and skipping the schema-size check failed exactly `test_streaming_success`, `test_empty_tools_omitted` and `test_tool_schema_too_large`. An earlier spike also caught temperature and `stream_options` changes.
- Pinned ruff/black/isort and pre-commit all pass.

## Open

- `FakeAIProvider` lives in the test file. If `test_agents.py` (live-LLM only, via an OpenAI-compatible base URL) could use it for deterministic runs, lift it into `lib/galaxy_test/driver/`. That means checking whether the galaxy-test-driver package can depend on pytest-httpserver. Not tried.
- Whether to keep the `close()` spy or drop that assertion is John's call.
