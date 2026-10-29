# yaml_tool_model_validation_26.1 — re-scope debrief

The first hardening pass ended at `1a5b68ca6b2`. Its scope evaluation recommended a modest expansion (Scope 2): close the three remaining places where the `GalaxyTool` model accepts a field that the loader drops. Per the workhorse re-scope process, the original scope is kept as `yaml_tool_model_validation_26.1_alt_original_scope` (`1a5b68ca6b2`, [alt](alts/original_scope.md)), and the first-pass debriefs move to `earlier_drafts/1/`.

## What the expansion added (on top of `1a5b68ca6b2`)

- `aed21454479` **Drop the container requirement from the GalaxyTool authoring model.**
  - `requirements: [{type: container}]` validated, but the loader reads only the root `container`, so the tool ran without one.
  - The requirement leaves `_DynamicToolSourceBase`'s union, and the unused `ContainerRequirement` class goes with it. The `UserToolSourceAuthoringView.requirements` override, which already excluded it, is now redundant and also goes. `schema.ts` was regenerated.
  - I had worried that stored user tools would need a lift. They don't: `UserToolSource` already rejected the form.
- `70c84ac2398` **Load citations and honor hidden collection outputs in YAML tools.**
  - `YamlToolSource.parse_citations` now reads `citations`, which were previously always empty. That covers both classes and class-less YAML.
  - XML's profile rule (skip invalid citations with a warning before 26.1, error from 26.1) is shared via `ToolSource._parse_citation_list`.
  - A collection output's `hidden` now reaches `ToolOutputCollection`, and `create_collection` creates its HDCA hidden.

## Review

[Normal review 2](subagents/normal_review_2.md). Both bugs were fixed red→green:
- Collection `hidden` had no runtime effect. Fixed at runtime, with an API test.
- Class-less YAML lost the soft-fail on bad citations. Fixed with the shared helper.

## Validation

- The new unit tests were red before each fix.
- `test_yaml_tool_source_validation.py`, `test_parsing.py` (including the XML citation tests), `test_container_shape_lint.py`, `tool_util_models`, `test_tool_deserialization.py`, `test_user_defined_tool_loading.py` and `test_DynamicToolManager.py` pass.
- The broad `tool_util`/`tool_util_models` run passes apart from the known env failures. That run came before the citation helper.
- All 7 tests in the API module `test_unprivileged_tools_labels.py` pass, including the new hidden-collection test (red before).
- ruff, black and isort are clean.

## For the PR body

- Removing `ContainerRequirement` breaks a public import in the 25.1/26.0 `galaxy-tool-util-models` releases. No known consumers.
- Admin `GalaxyTool` citations now render (API-tested), and their DOIs trigger server-side doi.org fetches, as XML tools already do. User-tool citations are parsed but likely not shown. The test-challenge pass found by code reading that the footer's `api/tools/{id}/citations` looks tools up by id, and user tools are only reachable by uuid. This is unverified in the UI and is a pre-existing endpoint gap.
- Mapped-over (implicit) collections don't apply `hidden`.

Next: re-harden, with every hardening step run fresh.
