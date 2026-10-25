# faqs/galaxy/interactive_tools_stop.md — 26.2, text review

GTN `45d4932d33`. Embedded by introduction/galaxy-intro-rdm.

Text review: ITs need Docker plus the proxy, which the FAQ server lacks. Checked against `InteractiveToolsPanel.vue` / `InteractiveTools.vue` (Galaxy `b6077811fd5`). Coverage: `test/integration_selenium/test_entry_point_sse.py`.

No findings; panel row has the stop icon ("Stop this interactive tool").
