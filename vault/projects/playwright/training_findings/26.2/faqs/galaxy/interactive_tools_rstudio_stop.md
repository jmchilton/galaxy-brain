# faqs/galaxy/interactive_tools_rstudio_stop.md — 26.2, UI run

GTN `45d4932d33`. Embedded by galaxy-interface/rstudio.

UI run on `faq_server.sh main` with real Docker ITs behind gx-it-proxy (Galaxy `3293319e399`); replay in the `.gxui.sh`. Coverage: `test/integration_selenium/test_interactive_tools_panel.py` (stubbed entry points, no Docker).

Galaxy bug found and fixed: with one IT active, a newly started one never appeared in the panel until reload (`entryPointStore.updateEntryPoints`); queued as gx_issues `interactive_tools_panel_drops_new_entry_point`.

- `it-rstudio-user-menu-stale`: no **User** menu, and no checkbox + bottom **Stop** button; each row has its own stop icon. Snippet interactive_tools_stop.md instead.
