#!/bin/sh
# Replay of faqs/galaxy/interactive_tools_stop.md against the `faq_server.sh main` Galaxy (interactive tools in Docker),
# from `gxui start --headless`.
set -e
N=its-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui tool-open interactive_tool_rstudio
gxui tool-run
gxui interactive-tool-wait RStudio
gxui note "Go to Interactive Tools on the Activity Bar; click the stop button next to RStudio"
gxui interactive-tool-stop RStudio
gxui interactive-tools
