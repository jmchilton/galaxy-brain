Run via Claude Opus at high effort.

# Test challenges debrief

The earlier challenge ([earlier_drafts/1/test_challenges_debrief.md](earlier_drafts/1/test_challenges_debrief.md)) covered the first three commits. This round focuses on the re-scope commit's tests and makes two changes: one unit test is dropped as redundant with the API test, and one moves into the "Baseline tests" commit because it passes without the change. No E2E test was added. The reasoning is the same as last round: all parsing and precedence is server-side, and the run form's select is already checked through the API.

## Changes

- **Dropped `test_text_input_static_restrictions_beat_suggestions_on_load`.** It asserted only that the exported state keeps `restrictions` and drops `suggestions`. `test_text_input_restrictions_and_suggestions_open_restricted` makes exactly those assertions on the downloaded `tool_state` through the same load/export path. It also checks that the run form is a select over the restrictions. The rule is to drop unit tests that only duplicate an API test.
- **Moved `test_text_input_restrict_on_connections_kept_on_load` to the baseline commit.** It passes against the pre-expansion `modules.py` (verified). Before the change, `restrictions` alone with `restrictOnConnections` already loaded as `onConnections`. The test pins that precedence, which an earlier draft of the expansion broke (see [subagents/review_rescope.md](subagents/review_rescope.md)). It now sits in `ba68c159498` and passes on base code there (13 baseline tests pass).
  - It stays a unit test rather than an API test. It pins existing behavior in one function through the real step load/export path, with only the shared `MockTrans`. A server-backed baseline test would add a slow test that can't go red.

## Recheck of the earlier set

Nothing changed in the first three commits' tests, and last round's verdicts still hold:

- the pure parser table and the exhaustive encode/parse property test
- the module-level round-trip, normalization and escaping tests
- the tool-form save-path test
- `test_text_input_static_restrictions_survive_download`, which uses `upload_yaml_workflow`, `create_workflow` and `_download_workflow`

The new API test also uses the existing populator and `_download_workflow` helpers, with no repeated raw HTTP calls. There are no mocks beyond the existing `MockTrans`, so there is nothing to restructure.

## Red/green

- **Unit tests:** with the pre-expansion `modules.py` (from `13c2282e38c`), the dropped test failed at its assertion and the moved test passed. That is why one was dropped and the other moved.
- **API test `test_text_input_restrictions_and_suggestions_open_restricted`:**
  - Pre-expansion `modules.py` (`e86f37fe6c8`): it fails at its first assertion with `KeyError: 'restrictions'`. Suggestions won, so the restrictions were dropped.
  - Branch head: it passes.

## Commits

History was rebuilt locally and not pushed. The only tree difference from the old head `6340eaa04f2` is the dropped unit test, plus the moved test's new position in the file.

- `ba68c159498` Baseline tests (was `948ff7e7f24`), now with `test_text_input_restrict_on_connections_kept_on_load`.
- `b44ecc98312` Fix (was `93f3625a14f`).
- `e86f37fe6c8` Minimal backslash escaping (was `13c2282e38c`).
- `e3ce1d3e8fa` Restrictions beat suggestions (was `6340eaa04f2`). Its unit tests have been removed; its API test is unchanged.

## Results

- Unit tests at the baseline commit, on base code: 13 passed (`-k "static or restrict"`).
- Unit tests at head: 41 passed.
- API `test_text_input_restrictions_and_suggestions_open_restricted`: 1 passed at head, 1 failed with pre-expansion code.
