#!/bin/sh
# Replay of faqs/galaxy/tools_favorite.md against the `faq_server.sh main` Galaxy, from `gxui start --headless`.
set -e
N=favorite-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui tool-open cat1
gxui note "Click the star next to the tool name, then the star above the tool search to show favorites"
gxui tool-favorite --show
gxui note "Change the tool panel view: the icon above the tool search lists Full Tool Panel, EDAM Operations, EDAM Topics"
gxui call swap_to_tool_panel_edam_operations
gxui call swap_to_tool_panel default
