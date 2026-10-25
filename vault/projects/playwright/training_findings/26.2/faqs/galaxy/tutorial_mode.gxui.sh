#!/bin/sh
# Replay of faqs/galaxy/tutorial_mode.md against the `faq_server.sh main` Galaxy, from `gxui start --headless`.
set -e
gxui home
gxui note "Click the graduation-cap (curriculum) icon in the masthead; the GTN opens over Galaxy"
gxui call tutorial_mode_activate
gxui call switch_to_frame gtn-embed
gxui call wait_for_selector_visible '#top-navbar'
