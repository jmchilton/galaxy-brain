#!/bin/sh
# Replay of faqs/galaxy/datasets_upload.md against the `faq_server.sh main` Galaxy, from
# `gxui start --headless`, after `eval "$(faq_server.sh env)"` (for GXUI_GALAXY_ROOT).
set -e
N=upload-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "upload faq"
gxui note "Step 1: Activity Bar > Upload (there is no Upload Data at the top of the tool panel)"
gxui note "Steps 2-3: Upload from Computer > Browse Files (or Drag files here), pick the files at once, Start; there is no Close"
gxui upload-file "$GXUI_GALAXY_ROOT/test-data/1.bed" "$GXUI_GALAXY_ROOT/test-data/1.fasta"
gxui history-items
