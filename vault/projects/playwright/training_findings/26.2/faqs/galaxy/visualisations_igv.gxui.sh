#!/bin/sh
# Replay of faqs/galaxy/visualisations_igv.md against the `faq_server.sh main` Galaxy, from a gxui
# session started with `gxui start --headless`. Steps 1-3 (IGV desktop) are outside Galaxy.
set -e
N=igv-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
TAB=$(printf '\t')
gxui upload-paste "chr1${TAB}100${TAB}200${TAB}a
" --ext bed --name regions.bed
gxui history-wait 1
gxui note "step 4: expand the dataset; set the reference genome (dbkey)"
gxui dataset-change-dbkey 1 hg38
gxui note "step 4: 'display in IGV > local' (26.2: not on the expanded dataset; Visualize tab, 'display with IGV' > local)"
gxui dataset-display-apps 1 | grep "display with IGV: local"
