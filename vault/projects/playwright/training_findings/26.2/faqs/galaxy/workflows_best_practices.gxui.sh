#!/bin/sh
# Replay of faqs/galaxy/workflows_best_practices.md against the `faq_server.sh main` Galaxy, from a
# gxui session started with `gxui start --headless`.
set -e
N=wf-bp-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui note "step 1: open a workflow for editing"
gxui workflow-new "FAQ best practices"
gxui workflow-add-input
gxui note "steps 2-4: Workflow Options > Best Practices (26.2: Best Practices in the editor's activity bar)"
gxui workflow-best-practices
gxui screenshot workflows-best-practices-panel
