Follow-up to 🔀 #24032 — exercise the plugin chat proxy through the real OpenAI client and a local HTTP provider, and reuse that provider for agent integration tests.

Mocked client calls can verify Python arguments while missing what the provider receives. These tests now observe the serialized request, authentication header, selected endpoint, streaming response and provider error body across a real HTTP boundary.

| Test boundary | Evidence this branch checks |
| --- | --- |
| Plugin → provider | Received JSON, omitted fields, endpoint/model/key precedence, SSE content and upstream errors |
| Agent → provider | A real error-analysis agent parses structured output and returns formatted content and confidence |
| MCP → TRS | The existing smoke test fetches its descriptor from a local server at the expected TRS path |

The real HTTP tests also exposed blocking setup in production async handlers. Plugin client construction and lazy SDK resource loading now run in worker threads, as does agent construction (capability/prompt reads and provider setup), including nested handoffs. Provider requests remain asynchronous.

Opting into live LLM tests previously left the driver's static agent backend enabled. With an unreachable local provider, four of the six live-class tests passed on `dev`. This branch disables that backend in live mode and requires the chat test to reject API errors and agent fallback responses.

***The fake provider makes request and response contracts deterministic; it does not establish the quality of answers from a real LLM. Live inference remains an opt-in test.***

***The fake covers plugin proxy contracts and one real error-analysis agent; other agent types and multi-turn conversations remain outside this change’s coverage.***

<details><summary>Shared helpers and limits</summary>

`FakeAIProvider` lives in `galaxy.app_unittest_utils`, built on Galaxy's existing test HTTP server. It supplies JSON completions, structured-output tool calls, SSE chunks and error replies, and records received requests. Each instance has isolated routes and a request log; integration fixtures clear state per test and stop their servers even when Galaxy setup or teardown fails.

The TRS response patch is replaced with a local descriptor route. Plugin tests use the real SDK throughout; the remaining `AsyncOpenAI.close` spy calls the real method to retain the streaming cleanup assertion.

Each route returns one scripted reply. Multi-turn agent conversations and other agent types are outside this change's coverage.

</details>

## Risks

Agent and SDK initialization now runs in worker threads, while inference remains on the serving event loop. API contracts and provider configuration are unchanged. Opt-in live tests will expose missing or unreachable provider configuration that static responses previously hid.

## Context

Builds on 🔀 #24032's plugin proxy tests. The shared fake also covers the existing agent integration suite without an external LLM account or a new test-server dependency.

## John's Checklist

- [ ] Did a human read every test and every comment?
- [x] What does the user see when it fails? Developers get failures against received HTTP requests, response bodies or agent output.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes—the tests exercise observable HTTP and API behavior.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.—what purpose do they serve? N/A.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Run the deterministic integration tests</summary>

```sh
GALAXY_TEST_AIOCOP=1 \
GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false \
GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES=true \
GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS=true \
./run_tests.sh -integration test/integration/test_plugins.py -- test/integration/test_agents.py
```

Initial test-infrastructure verification: **40 passed, 6 skipped**. After the production fix: **23 passed** across all plugin tests and the real error-analysis agent test with `GALAXY_TEST_AIOCOP=1`; agent unit tests: **135 passed, 15 skipped**. Against an unreachable local provider, the five live inference tests fail and the chat-history test passes.

The six live-class tests are skipped unless `GALAXY_TEST_ENABLE_LIVE_LLM=1`; configure `GALAXY_TEST_AI_API_KEY`, `GALAXY_TEST_AI_MODEL` and `GALAXY_TEST_AI_API_BASE_URL` to run them.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
