Run via claude-opus-5-5 at high effort.

**Polished `test_subworkflow_collection_input_map_over`: it now asserts the connection and the input's map-over state, and checks the output before connecting. Its hand-rolled hover-and-screenshot block became a `screenshot_name` option on the shared `assert_node_output_is` helper.**

# Polish E2E tests debrief: editor_subworkflow_map_over_tests

## Changes

All changes are in `lib/galaxy_test/selenium/test_workflow_editor.py`. They were folded into the Selenium commit, which is now `a92b870744e` (previously `53ba9a0284e`). `aa47be35ea6` and `2885dc64873` are unchanged. Nothing is pushed.

- **Removed duplicated hover logic.** The test ended with its own hover, tooltip wait and screenshot, which repeated `assert_node_output_is`. That copy also skipped `css_attribute_value` on the terminal name. `assert_node_output_is` now takes an optional `screenshot_name`, which it captures with `screenshot_if` once the tooltip assertions pass and before it dismisses the tooltip. The test's final step is now one call with `screenshot_name="workflow_editor_subworkflow_mapped_over"`.
- **Added a baseline check.** After the refused `paired` drag, the test asserts that `inner_output` is a plain `list` with no map-over. This shows that the `list:list` connection causes the map-over.
- **Added connection-level assertions.** After connecting `nested_list`, the test calls `workflow_editor_assert_connected` and `workflow_editor_assert_input_mapped("nested_workflow#inner_list")`. The second one checks the input terminal's `mapped-over` class through the existing `input_mapping_icon` navigation.yml target. This was the input-side half of the bug.

## Checklist review

- **Selectors:** the test has no raw CSS or DOM selectors. Every lookup goes through existing navigation.yml targets and `NavigatesGalaxy` helpers.
- **Shared abstractions:** I extended the existing `assert_node_output_is` helper rather than adding a new one.
- **Sleeps:** the test has none. Neither `workflow_editor_try_connect` nor the plain `workflow_editor_connect` path it uses sleeps.
- **Screenshots:** the test records two: `workflow_editor_subworkflow_collection_input_refused` (mid-drag refusal) and `workflow_editor_subworkflow_mapped_over` (mapped-over noodle plus tooltip). I checked the second visually after the polish run.
- **DOM decoration:** not needed. The input terminal already has `mapped-over` and `can-accept`/`is-dragging` classes, the refusal reason is exposed through `aria-describedby`, and the output tooltip text names the map-over.
- **Client refactor:** not needed. The branch also targets `release_26.2`, not `dev`.

## Test results

The run used a built client (`static/dist` from `53ba9a0284e`). This polish changes no client code, so no rebuild was needed. I ran Galaxy directly on `:8091` with Playwright, headless, `-p no:postgresql`, using the session's `run_built.sh`.

- `test_subworkflow_collection_input_map_over`: passed.
- `test_map_over_output_indicator`: passed. It also uses the changed helper, without `screenshot_name`.
- `.venv/bin/ruff check`, `.venv/bin/black --check` and `ruff format --check`: clean.
- The tested tree is identical to `a92b870744e`.

I did not re-run against the unfixed editor. The earlier run showed the test fails at its first assertion without the fix, and this polish only adds assertions after that point. On the unfixed editor, the new `assert_input_mapped` would also fail, as the earlier "before" screenshot shows no map-over.

Galaxy was stopped after the run.
