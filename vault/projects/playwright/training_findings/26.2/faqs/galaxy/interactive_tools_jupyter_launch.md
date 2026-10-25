# faqs/galaxy/interactive_tools_jupyter_launch.md — 26.2, UI run

GTN `45d4932d33`. Embedded by galaxy-interface/galaxy-intro-jupyter, galaxy-interface/jupyterlab, genome-annotation/gene-centric and three single-cell preambles.

UI run on `faq_server.sh main` with real Docker ITs behind gx-it-proxy (Galaxy `3293319e399`); replay in the `.gxui.sh`. Coverage: `test/integration_selenium/test_interactive_tools_panel.py` (stubbed entry points, no Docker).

Galaxy bug found and fixed: with one IT active, a newly started one never appeared in the panel until reload (`entryPointStore.updateEntryPoints`); queued as gx_issues `interactive_tools_panel_drops_new_entry_point`.

No findings. Activity Bar **Interactive Tools** panel lists **Active Interactive Tools** as described. Local entry point is "Jupyter Interactive Tool"; the FAQ's "JupyTool interactive tool" is usegalaxy.eu's tool (server-dependent, not a finding).
