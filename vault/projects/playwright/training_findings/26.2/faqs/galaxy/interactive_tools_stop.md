# faqs/galaxy/interactive_tools_stop.md — 26.2, UI run

GTN `45d4932d33`. Embedded by introduction/galaxy-intro-rdm.

UI run on `faq_server.sh main` with real Docker ITs behind gx-it-proxy (Galaxy `3293319e399`); replay in the `.gxui.sh`. Coverage: `test/integration_selenium/test_interactive_tools_panel.py` (stubbed entry points, no Docker).

Galaxy bug found and fixed: with one IT active, a newly started one never appeared in the panel until reload (`entryPointStore.updateEntryPoints`); queued as gx_issues `interactive_tools_panel_drops_new_entry_point`.

No findings; panel row has the stop icon ("Stop this interactive tool").
