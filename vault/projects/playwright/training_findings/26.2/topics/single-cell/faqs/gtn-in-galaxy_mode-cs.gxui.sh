#!/bin/sh
# Replay of topics/single-cell/faqs/gtn-in-galaxy_mode-cs.md against the `faq_server.sh main` Galaxy, from `gxui start --headless`.
# Single Cell > Case study navigation happens inside the GTN, not Galaxy.
set -e
gxui note "Click the curriculum (graduation-cap) icon in the masthead; the GTN opens over Galaxy"
gxui tutorial-mode
