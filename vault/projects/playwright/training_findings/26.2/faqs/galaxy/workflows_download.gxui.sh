#!/bin/sh
# Replay of faqs/galaxy/workflows_download.md against the `faq_server.sh main` Galaxy, from a gxui session started
# with `gxui start --headless`.
set -e
N=wf-dl-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui workflow-new "FAQ download"
gxui workflow-add-input --label reads
gxui workflow-add-tool cat1
gxui workflow-connect 0#output 1#input1
gxui workflow-save
gxui note "steps 1-2: Workflows in the activity bar lists your workflows"
gxui call workflow_index_open
gxui note "step 3: the card's Download button (a .ga file)"
gxui workflow-download "FAQ download"
