# Implementation debrief

## Why not the static agent backend

`inference_services.static_responses` (`lib/galaxy/agents/static_backend.py`, wired by `driver_util.py`) swaps the pydantic-ai `AgentRegistry`, which serves `/api/ai` agents and the GalaxyAI/wizard Selenium tests. The plugin proxy (`_open_ai_adapter` in `api/plugins.py`) builds `AsyncOpenAI` directly and never touches the registry. The tests also assert what is forwarded upstream, which a canned-response backend can't observe.

## Layout (commit 2, `969d9bfe74c`)

- `galaxy.util.unittest_utils.test_http_server` already had Galaxy's own local test server, used by API tests through the `test_http_server` fixture. Added `RecordingHttpServer`: routes at fixed paths, a handler subclass per instance, and every request recorded (`RecordedRequest` with method, path, headers, body and `.json()`). `start_test_http_server` gained a `handler_class` parameter.
- `galaxy.app_unittest_utils.fake_ai_provider.FakeAIProvider` (galaxy-app, where AI code lives) is built on it. It has `respond_completion`, `respond_message`, `respond_tool_call`, `respond_stream`, `respond_error`, `requests`, `last_request`, `last_body`, and a `completion_chunk` helper. No pytest-httpserver dependency.
- `galaxy_test.driver.integration_util.UsesFakeAIProvider` is a mixin that starts the provider before `super().setUpClass()` and clears it per test. Its `_configure_fake_ai_provider(config)` also sets `inference_services = {}` to disable the driver's default static backend.
- The precedent for integration tests importing `app_unittest_utils` is `test_htcondor_runner.py`.

## test_plugins.py (commits 1 and 2)

- All 14 mocked tests now assert on the request that was received. `is omit` became "key absent from the body". The `inference_services` tests use a separate URL path per level and assert the path, `Authorization` and `model`.
- Strengthened: the validation tests assert nothing reached the provider; the non-streaming test checks the auth header and `stream: false`.
- The only remaining patch is a pass-through spy on `AsyncOpenAI.close` (it calls the real one).

## test_agents.py (commit 3, `9166f4a8620`)

- **TRS patch removed.** `TestMCPServerSmoke` starts a `RecordingHttpServer` and writes a `trs_servers_config_file` whose `dockstore` entry points to it (same pattern as `integration_selenium/test_trs_import.py`). The test serves the descriptor at its real TRS path and now also asserts that this was the only request. The driver's `fetch_url_allowlist` already allows `127.0.0.0/24`.
- **Live mode was not live.** With `GALAXY_TEST_ENABLE_LIVE_LLM=1` and the base URL pointing at nothing (`127.0.0.1:9`), 4 of 6 `TestAgentsApiLiveLLM` tests passed on `dev`: the driver's static backend (`Static agent backend loaded` in the log) answered them. After `config.pop("inference_services")` in that class, 4 fail with `APIConnectionError`, so the env-configured endpoint is used. Still passing: `test_chat_history_endpoint` (no LLM) and `test_chat_endpoint_live`. The latter appears to swallow the connection error into the response text; not investigated.
- **New `TestAgentsApiFakeProvider::test_error_analysis_endpoint`** runs the real `ErrorAnalysisAgent` (pydantic-ai, `OpenAIChatModel`) through `/api/ai/agents/error-analysis`. The fake replies with a `final_result` tool call. It asserts the formatted content and confidence, plus the model, auth header, user query and `tools == ["final_result"]` in the sent request. It depends on pydantic-ai's default output tool name.
- Nothing about real-endpoint flexibility was dropped: the live class still runs against `GALAXY_TEST_AI_*`.

## Evidence

- `test_plugins.py`: 22 passed. `test_agents.py`: 18 passed, 6 skipped (live). Live class with an unreachable URL: 4 failed with `APIConnectionError`, as intended.
- Mutation run on `test_plugins.py` (reverted): dropping `close()`, sending `tools=[]` and skipping the schema-size check each failed exactly their target test.
- Pinned ruff/black/isort pass; mypy has no errors in the 3 changed `lib` modules (run from `lib/`).

## Open

- `FakeAIProvider` answers every request to a path with the same reply. Multi-turn agent flows (router handoff, tool loops) would need a reply queue.
- Whether to keep the `close()` spy or drop that assertion is John's call.
- Possible follow-up: more agents through the fake (custom_tool, router), and the Selenium GalaxyAI tests, which stay on the static backend.

## Process note

During a mypy baseline check I ran `git stash` in the worktree. I restored it with `git stash pop stash@{0}` after confirming the entry was this branch's; the other sessions' stashes are untouched.
