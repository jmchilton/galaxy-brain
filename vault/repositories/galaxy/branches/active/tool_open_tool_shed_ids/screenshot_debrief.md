# Screenshots

Screenshots were obtained successfully.

- `screenshots/tool_panel_search_by_tool_shed_id.png` comes from `test_tool_open_by_tool_shed_guid` on the Playwright backend. The tool panel search holds `id:toolshed.g2.bx.psu.edu/repos/iuc/compose_text_param/…/0.1.1`, and the panel lists only "Compose text parameter value". On dev the same search shows "No results found".

The test makes this capture itself: it calls `self.screenshot("tool_panel_search_by_tool_shed_id")` after a `UX_RENDER` wait. Without the wait, the capture caught the panel mid-transition, with section headers showing.

This step was done directly rather than by a subagent, as part of the E2E run.
