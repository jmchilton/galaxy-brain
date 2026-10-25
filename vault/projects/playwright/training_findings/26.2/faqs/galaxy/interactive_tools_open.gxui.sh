#!/bin/sh
# Replay of faqs/galaxy/interactive_tools_open.md against the `faq_server.sh main` Galaxy (interactive tools in Docker),
# from `gxui start --headless`.
set -e
N=ito-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui tool-open interactive_tool_rstudio
gxui tool-run
gxui note "Go to Interactive Tools on the Activity Bar (logged in); wait for Running"
gxui interactive-tools
gxui interactive-tool-wait RStudio
gxui note "Click the tool name (the external-link icon opens a new tab)"
gxui interactive-tool-open RStudio
gxui interactive-tool-stop RStudio
