# Test challenges review — PR #24272

Profile: [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) · Model: claude-opus-5-5 · Effort: low · Reviewed commit: 9a97db13b65324badad105f8e0139864ba1d14ba

Tests are well-layered overall: the integration test reproduces #24267 with a real job conf and populator helpers. No P1/P2. Debrief: [test_challenges_debrief.md](test_challenges_debrief.md).

### P3 1: Unit test for missing selector duplicates the integration test
`test_missing_conditional_gets_default_case` covers the same path as `test_import_without_job_resource_state`, using a hand-built conditional instead of the real injected one. Consider dropping it; keep `test_present_conditional_selector_is_kept`, which guards behavior the integration test doesn't.

### P3 2: Replace `cast(ConditionalWhen, Bunch(...))` with real `ConditionalWhen` objects
If the unit tests stay, build actual `ConditionalWhen` instances (set `value`, `inputs`) so the fixture reads as real types without `cast`.
