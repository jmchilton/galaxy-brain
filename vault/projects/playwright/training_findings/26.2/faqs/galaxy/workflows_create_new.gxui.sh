#!/bin/sh
# Replay of faqs/galaxy/workflows_create_new.md against the `faq_server.sh main` Galaxy, from a
# gxui session started with `gxui start --headless`.
set -e
N=wf-new-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui note "step 1: Workflow on the top bar (26.2: Workflows in the left activity bar)"
gxui home
gxui component workflows.activity click
gxui note "step 2: the new workflow button (26.2: Create)"
gxui component workflows.new_button visible
gxui note "steps 2-4: Create opens the editor at once; name it in Attributes, then Save"
gxui workflow-new "FAQ new workflow"
gxui screenshot workflows-create-new-editor
