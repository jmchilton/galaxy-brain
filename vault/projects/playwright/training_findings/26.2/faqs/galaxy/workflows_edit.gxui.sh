#!/bin/sh
# Replay of faqs/galaxy/workflows_edit.md against the `faq_server.sh main` Galaxy, from a gxui session started
# with `gxui start --headless`.
set -e
N=wf-edit-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui workflow-new "FAQ edit"
gxui note "steps 1-2: Workflows > Edit on the workflow's card"
gxui workflow-edit "FAQ edit"
gxui note "step 3: make a change"
gxui workflow-add-input --label reads
gxui note "step 4: Save (activity bar, or the icon at the top right while unsaved; 26.2 has no Save + Exit)"
gxui workflow-save
gxui workflow-steps
