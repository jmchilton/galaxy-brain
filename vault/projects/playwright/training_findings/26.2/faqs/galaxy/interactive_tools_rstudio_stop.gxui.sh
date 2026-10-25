#!/bin/sh
# Replay of faqs/galaxy/interactive_tools_rstudio_stop.md against the `faq_server.sh main` Galaxy (interactive tools in Docker),
# from `gxui start --headless`.
set -e
N=itrs-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui tool-open interactive_tool_rstudio
gxui tool-run
gxui interactive-tool-wait RStudio
gxui note "Step 2: no User menu or checkbox + Stop; use the row's stop button in the Interactive Tools panel"
gxui interactive-tool-stop RStudio
gxui interactive-tools
