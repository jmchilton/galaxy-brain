# plugins_test_fake_provider

Status: `branches_need_polish`. Base: `dev` (`45df66e08ed`). Head `9166f4a8620` on `jmchilton/plugins_test_fake_provider` (3 commits). No PR.

Replaces AI mocks and patches in integration tests with local HTTP servers:
- `test/integration/test_plugins.py` (from merged 🔀 #24032): proxy tests run against `FakeAIProvider` instead of `@patch("...plugins.AsyncOpenAI")`.
- `test/integration/test_agents.py`: the TRS `requests.get` patch is gone, live mode now actually reaches the LLM, and a fake-provider test runs a real agent.

[Implementation debrief](implementation_debrief.md)

John asked for this on 2026-10-11, after disliking the mocks in #24032's test file. He then asked for the fake to live in `app_unittest_utils` and to be applied to `test_agents.py`.

## Polish started — 2026-10-11

Live fork CI on `9166f4a8620` has no failed checks; integration and other suites remain running/queued. Rebased cleanly onto actual `dev` (`3347e84bc5e9`), producing `94edbb32faf`. Fresh checklist review identified exception-safe server cleanup and a live-chat assertion that accepts API error text; both are being corrected before the PR description is written. No PR exists.
