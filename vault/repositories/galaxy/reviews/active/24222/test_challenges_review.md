# Test challenges review — #24222

Profile: [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md). Model: claude-opus-5-5. Effort: low. Reviewed commit: `8e75e467e47c8f8e5586ab71a5a594bf3dead977`. Scope/target accepted; test quality only. Details: [debrief](test_challenges_debrief.md).

Client tests are mounted-component/behavior tests and hold up; no drops recommended. Earlier-round P2 regression coverage (plain keyword, `#favorites`, `unknown:term`) is present.

### P3 1: Hidden-tool filtering of `/api/tags/tool_tags` only unit-tested

`curated_tool_tags_by_id` now filters by user visibility, tested only in `test/unit/app/tools/test_toolbox.py` by monkeypatching `allow_user_access` with a lambda and then `del`-ing it. The behavior is an API contract; `lib/galaxy_test/api/test_tools.py::test_search_curated_tool_tags` already calls the endpoint. Add an assertion there that a hidden/inaccessible tool's tags are absent, and split the unit test's two cases (or drop the `del` fallback trick) for readability.

### P3 2: No E2E coverage for the tag picker

`lib/galaxy_test/selenium/test_tool_discovery_view.py` is untouched. One case selecting a tag in the picker and asserting narrowed results + chip (optionally: picker disabled under a plain keyword search) would cover the full store/API/UI path that unit tests mock out.
