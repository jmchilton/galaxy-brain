#!/bin/sh
# Replay of faqs/galaxy/interactive_tools_rstudio_launch.md against the `faq_server.sh main` Galaxy (interactive tools in Docker),
# from `gxui start --headless`.
set -e
N=itr-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui note "Open the RStudio tool"
gxui tool-open interactive_tool_rstudio
gxui note "Click Run Tool"
gxui tool-run
gxui note "Step 4 is stale: active ITs are in the Activity Bar's Interactive Tools panel, not the User menu"
gxui interactive-tool-wait RStudio
gxui interactive-tool-open RStudio
gxui interactive-tool-stop RStudio
