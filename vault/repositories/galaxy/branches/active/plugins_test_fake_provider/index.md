# plugins_test_fake_provider

Status: `branches_implemented_needs_ci`. Base: `dev` (`45df66e08ed`). Head `554164241c5` on `jmchilton/plugins_test_fake_provider`. No PR.

Reworks `test/integration/test_plugins.py` (from merged 🔀 #24032) so the plugin chat proxy tests run against a fake OpenAI-compatible server instead of `@patch("...plugins.AsyncOpenAI")` mocks.

[Implementation debrief](implementation_debrief.md)

John asked for this on 2026-10-11, after disliking the mocks in #24032's test file.
