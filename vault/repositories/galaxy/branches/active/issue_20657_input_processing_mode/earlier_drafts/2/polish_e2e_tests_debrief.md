Polished the two processing-hint E2E tests: added a shared hint assertion, screenshots of every hint state plus the dropdown marker, a navigation.yml target for the dropdown menu to replace timing on the fade transition, and a wait in place of the sleep in `tool_form_clear_multiselect_tags`. Commit `d1a3d309271`.

## Changes

- `test_tool_form.py`
  - New `_assert_processing_hint(parameter, mode, *texts)` helper, decorated with `retry_assertion_during_transitions`. It replaces three near-identical inline closures.
  - Screenshots: these are the only E2E tests for the hint and marker, so each state is captured: `tool_form_data_input_map_over_hint`, `tool_form_data_input_map_over_marker` (dropdown open), `tool_form_data_input_reduction_hint` (already present), and `tool_form_data_input_nested_map_over_hint` (new).
  - The tests now wait for the dropdown menu to close before checking hints and taking screenshots. On the first Playwright run, the screenshots caught the vue-multiselect fade (0.15s opacity): the dropdown was half-transparent over the hint, and the "marker" shot showed no menu at all. Playwright counts opacity:0 as visible, so `wait_for_visible` alone did not wait for the fade.
- `navigation.yml`: new `tool_form.parameter_data_select_menu`, the `.multiselect__content-wrapper` with `:not(.multiselect-enter-active)`. Excluding the enter-transition class means the menu only counts as visible once it has settled, on both drivers. The menu is rendered with `v-if`, so `wait_for_absent_or_hidden` covers the close.
- `NavigatesGalaxy.tool_form_clear_multiselect_tags`: replaced the fixed 20-iteration loop with `sleep_for(UX_RENDER)` by a `while` loop. Each step waits (`_wait_on`, UX_RENDER) for the tag count to drop. It no longer gives up silently after 20 tags. This also affects `RunsToolTests`, which uses the same helper.

No assertions were removed or weakened. Selectors in these tests already went through navigation.yml. The one remaining raw-selector path is `select_set_value`'s internal `sleep_for`, which predates this branch and is not touched.

## Runs (one at a time, Galaxy 8080 + Vite 5173, servers stopped afterwards)

- Playwright (headless): `test_data_input_map_over_hint` passed, `test_data_input_reduction_hint` passed. Screenshots checked by eye: no menu overlay, marker visible.
- Selenium (chromedriver): both passed.

## Left

- Cosmetic, outside this branch's scope: in the screenshots, the close "x" on the selected multiselect tag chip overlaps the chip text.
- Still open from the test challenge: the admin/roles XPath selectors use `/i[contains(@class,'multiselect__tag-icon')]` and are probably stale.
