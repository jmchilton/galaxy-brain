#!/bin/sh
# Replay of faqs/galaxy/visualisations_igb.md against the `faq_server.sh main` Galaxy, from a gxui
# session started with `gxui start --headless`. Steps 1-2 and the BioViz page are outside Galaxy.
set -e
N=igb-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
TAB=$(printf '\t')
gxui upload-paste "chr1${TAB}100${TAB}200${TAB}a
" --ext bed --name regions.bed
gxui history-wait 1
gxui note "step 3: expand the dataset; set the reference genome (dbkey)"
gxui dataset-change-dbkey 1 hg38
gxui note "steps 4-5: Charts icon (Visualize); 'display in IGB' > View"
gxui dataset-display-apps 1 | grep "display in IGB: View"
