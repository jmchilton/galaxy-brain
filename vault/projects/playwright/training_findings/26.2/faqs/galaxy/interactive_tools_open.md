# faqs/galaxy/interactive_tools_open.md — 26.2, UI run

GTN `45d4932d33`. Embedded by 9 tutorials (climate, ecology, imaging, microbiome, statistics).

UI run on `faq_server.sh main` with real Docker ITs behind gx-it-proxy (Galaxy `3293319e399`); replay in the `.gxui.sh`. Coverage: `test/integration_selenium/test_interactive_tools_panel.py` (stubbed entry points, no Docker).

Galaxy bug found and fixed: with one IT active, a newly started one never appeared in the panel until reload (`entryPointStore.updateEntryPoints`); queued as gx_issues `interactive_tools_panel_drops_new_entry_point`.

No findings. Activity needs login (not `anonymous`); Job Info column shows Running/Starting; external-link icon only once `target` is set — all as written.
