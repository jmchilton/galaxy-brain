# Screenshots

Screenshots were obtained successfully.

- `screenshots/tool_panel_search_by_tool_shed_id.png` comes from `test_tool_open_by_tool_shed_guid` on the Playwright backend. The tool panel search holds `id:toolshed.g2.bx.psu.edu/repos/iuc/compose_text_param/…/0.1.1`, and the panel lists only "Compose text parameter value". On dev the same search shows "No results found".
- `screenshots/tools_list_tool_shed_tool_help.png` comes from `test_tools_list_card_by_tool_shed_guid` (added 2026-10-11). It shows the Discover Tools view searched for "compose text", with the help expanded on the "Compose text parameter value" card. The card has no Open button, because the tool is special-form. On dev the test fails before this point, with a CSS parse error on `#g-card-content-toolshed.g2…`.

Each test makes its own capture. The panel test waits for `UX_RENDER` first; without that wait, its capture caught the panel mid-transition, with section headers showing.

This step was done directly rather than by a subagent, as part of the E2E runs.
