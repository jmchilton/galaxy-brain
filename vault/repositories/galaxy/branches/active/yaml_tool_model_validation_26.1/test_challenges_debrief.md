Run via Claude Opus 5.5 (claude-opus-5-5) at low effort.

# yaml_tool_model_validation_26.1 — test challenges debrief (post re-scope)

This is a fresh pass over all 11 commits; the first pass is in [earlier_drafts/1](earlier_drafts/1/test_challenges_debrief.md). Two fixups were autosquashed. New tip `24d7dbfc8bf` (was `70c84ac2398`). Not pushed; the coordinator needs to force-push. Production code is unchanged.

New SHAs from `9d0c7ea0e1a` on: `9d0c7ea0e1a` (Verify collection outputs), `f82d794b5ec`, `1f0a56eca2c`, `4cb6c828b2c`, `5c6c22cffe8`, `117ab8a7d1f` (Validate…), `a3a02b422b6` (container requirement), `24d7dbfc8bf` (citations/hidden). `30f634afe49`, `3797304f268` and `c9f1a8ac86e` are unchanged.

## Changes

1. **Fixed a non-baseline test that passed on base.** `test_classless_tool_skips_invalid_citation_before_profile_26_1` asserted `parse_citations() == []`. On base, YAML `parse_citations` always returns `[]`, so the test passed trivially. It now passes an invalid DOI next to a valid one and asserts that only the valid one is kept. On base it fails with `[] == [('doi', '10.1234/abc.def')]`. This test also keeps unit coverage of a valid YAML citation parse.
2. **Tightened the sibling test.** `test_classless_tool_rejects_invalid_citation_from_profile_26_1` used `pytest.raises(ValueError)`. It now expects `ValidationError` with error types `== ["dynamic_tool.citation_doi_invalid"]`.
3. **Moved `test_citations_load` (unit, GalaxyTool/GalaxyUserTool) to the API layer.** The new `TestToolsApi.test_dynamic_tool_citations` creates an admin `GalaxyTool` (`MINIMAL_TOOL` plus a bibtex citation) and asserts that `GET tools/{id}/citations` returns `[{"format": "bibtex", "content": <sent>}]`.
   - It uses bibtex because a DOI would make the server fetch doi.org.
   - The URL is used once, so the call is written inline, with no populator helper.
   - The GalaxyUserTool unit case wasn't kept, because `parse_citations` doesn't branch on class.
   - The endpoint can't reach user tools. `CitationsManager` resolves tools through `toolbox.get_tool(tool_id)`, which looks only in `_tools_by_id`. User tools are built on demand by uuid (`get_unprivileged_tool` → `dynamic_tool_to_tool`) and are never registered there.
     - Found by reading the code. A one-off API probe didn't run (the fixture didn't load outside `lib/galaxy_test`).
     - See "For coordinator".
4. **Dropped `test_hidden_collection_output_loads_hidden` (unit).** It only checked the parsed attribute, and the API test `test_hidden_collection_output_is_hidden` covers the same path end to end, through to HDCA visibility.
5. **Strengthened `test_yaml_tool_test_keeps_collection_type_and_metadata_assertions`** (in `9d0c7ea0e1a`). It now asserts the output names `== ["out"]` before the tuple unpack. On base it used to fail with a `ValueError` on the unpack; it now fails at its own assertion with `['out', 'pair'] == ['out']`.

## Kept, and why

- **`LEGACY_DIALECT` / `test_galaxy_tool_rejects_legacy_dialect`, including the new `container_requirement` case:** a scope table with exact error locations. Every case fails on base with `DID NOT RAISE`.
- **The trust-file admin/class-less pairs and the model tests in `test_user_tool_source_validation.py`:** each fails on base at its own `raises`.
- **`test_stored_galaxy_tool_that_fails_its_model_is_refused` (unit):** no API path can create an invalid stored row, so the unit layer is the only place to test it.
- **The collection, element-file and stdout test-parsing unit tests:** the framework tests pass vacuously when this parsing is missing, which is how `collection_creates_pair_y` hid.
- **The baseline commit:** `TestClasslessYamlLoader`, the class-less trust tests, `test_canonical_tool_loads`, `test_classless_tool_keeps_legacy_dialect` and `test_validation_leaves_mapping_outputs_in_place` pin current behavior and pass at `30f634afe49`.
- **The API tests** `test_dynamic_tool_from_path_rejects_legacy_dialect` (uses the `*_raw` populator helper) and `test_hidden_collection_output_is_hidden` (uses the existing populators).

## Not acted on

- **No mocks, `SimpleNamespace` or layout faking** in the new tests, so nothing to replace.
- **No E2E test.** Hidden collections are covered at the API layer, and citations render through the existing tool-footer UI.
- **The converted `TestYamlLoader` asserts are near-vacuous** (`parse_command() is None` and similar), because the fixture simply lacks those keys. They're harmless and were left.
- **`test_dynamic_tool_from_path_rejects_legacy_dialect` writes to a local tempdir.** That assumes the server shares the test's filesystem, the same assumption as its sibling `test_dynamic_tool_from_path`.

## Red/green evidence

- **Baseline:** the baseline commit's 3 files at `30f634afe49`: 122 passed.
- **Unit tests red on base (`19281d57645`):** HEAD's new unit tests all fail at their own assertion.
  - `test_parsing` + `test_yaml_tool_source_validation`: 4 test-parsing failures plus 12 `LEGACY_DIALECT` cases plus 2 citation tests.
  - Trust, model and stored-row tests: 17 failures.
  - The three tests changed in this pass (the two citation tests and `keeps_collection_type`) were confirmed red after the change.
- **API tests:** the citations and hidden tests are red at `aed21454479` (pre-citations, with HEAD's test files) and green at HEAD. Run one at a time.
  - `test_dynamic_tool_citations` fails red with `[] == [{'content': '@article{...}', 'format': 'bibtex'}]` and passes green.
  - `test_hidden_collection_output_is_hidden` fails red with `{'hidden': True} != {'hidden': False}` and passes green.
  - `test_dynamic_tool_from_path_rejects_legacy_dialect` is red at `5c6c22cffe8` (parent of Validate, helper present, HEAD's `test_tools.py`) with `Request status code (200) was not expected value 400`, because the legacy tool was created. It passes at HEAD.
- **`doc/source/dev/writing_tests.md`:** the new API test follows the HTTP-method and populator guidance (`_get`, `_assert_status_code_is`, `create_tool`), and the `*_raw` helper follows the documented pattern. Nothing to change.
- **Touched unit modules at every commit:** all 9 (`test_parsing`, the yaml validation, trust, source validation and fixtures files, linters, ontologies, user-defined tool loading, deserialization) pass at each commit: 333/333/333/336/337/339/340/344/360/361/363.
- **No conflict markers in any commit.** ruff, black and isort are clean, and the pre-commit hooks pass.

## For coordinator

- Force-push is needed (old tip `70c84ac2398`, new tip `24d7dbfc8bf`).
- **The PR-body claim "user-tool citations now render" looks wrong.**
  - What does work: user-tool citations are now parsed, `tool.citations` is filled, and the tool form's `citations: true` flag is set.
  - What fails: the footer fetches `api/tools/{id}/citations`, which can't find user tools by id (see Changes item 3), so it most likely gets a "not found" error entry.
  - The doi.org-fetch line is likewise only true for admin `GalaxyTool`s.
  - Fixing this is a production gap and out of scope for this pass. Either reword the PR body, or verify in the UI or with an API probe first.
