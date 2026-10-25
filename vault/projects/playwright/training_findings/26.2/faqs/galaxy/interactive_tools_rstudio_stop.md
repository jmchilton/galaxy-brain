# faqs/galaxy/interactive_tools_rstudio_stop.md — 26.2, text review

GTN `45d4932d33`. Embedded by galaxy-interface/rstudio.

Text review: ITs need Docker plus the proxy, which the FAQ server lacks. Checked against `InteractiveToolsPanel.vue` / `InteractiveTools.vue` (Galaxy `b6077811fd5`). Coverage: `test/integration_selenium/test_entry_point_sse.py`.

- `it-rstudio-user-menu-stale`: no **User** menu, and no checkbox + bottom **Stop** button; each row has its own stop icon. Snippet interactive_tools_stop.md instead.
