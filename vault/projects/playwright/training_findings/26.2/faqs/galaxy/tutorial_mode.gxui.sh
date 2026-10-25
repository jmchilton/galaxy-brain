#!/bin/sh
# Replay of faqs/galaxy/tutorial_mode.md against the `faq_server.sh main` Galaxy, from `gxui start --headless`.
set -e
gxui note "Click the graduation-cap (curriculum) icon in the masthead; the GTN opens over Galaxy"
gxui tutorial-mode
