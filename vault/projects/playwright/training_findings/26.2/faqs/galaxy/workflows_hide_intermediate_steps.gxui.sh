#!/bin/sh
# Replay of faqs/galaxy/workflows_hide_intermediate_steps.md against the `faq_server.sh main` Galaxy, from a gxui session started
# with `gxui start --headless`.
set -e
N=wf-hide-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui workflow-new "FAQ hide"
gxui workflow-add-input --label reads
gxui workflow-add-tool cat1
gxui workflow-connect 0#output 1#input1
gxui note "click the eye on out_file1: runs hide that dataset in the history"
gxui workflow-output 1 out_file1 --hide
gxui workflow-save
gxui screenshot workflows-hide-output
