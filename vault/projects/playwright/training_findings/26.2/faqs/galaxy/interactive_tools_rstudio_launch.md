# faqs/galaxy/interactive_tools_rstudio_launch.md — 26.2, text review

GTN `45d4932d33`. Embedded by 10 tutorials (data-science, evolution, galaxy-interface/rstudio, statistics, transcriptomics).

Text review: ITs need Docker plus the proxy, which the FAQ server lacks. Checked against `InteractiveToolsPanel.vue` / `InteractiveTools.vue` (Galaxy `b6077811fd5`). Coverage: `test/integration_selenium/test_entry_point_sse.py`.

- `it-rstudio-user-menu-stale`: step 4's **User** > **Active InteractiveTools** is gone; it's Activity Bar **Interactive Tools**.
