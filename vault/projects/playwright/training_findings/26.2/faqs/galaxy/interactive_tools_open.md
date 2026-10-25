# faqs/galaxy/interactive_tools_open.md — 26.2, text review

GTN `45d4932d33`. Embedded by 9 tutorials (climate, ecology, imaging, microbiome, statistics).

Text review: ITs need Docker plus the proxy, which the FAQ server lacks. Checked against `InteractiveToolsPanel.vue` / `InteractiveTools.vue` (Galaxy `b6077811fd5`). Coverage: `test/integration_selenium/test_entry_point_sse.py`.

No findings. Activity needs login (not `anonymous`); Job Info column shows Running/Starting; external-link icon only once `target` is set — all as written.
