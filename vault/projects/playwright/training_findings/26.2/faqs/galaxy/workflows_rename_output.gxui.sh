#!/bin/sh
# Replay of faqs/galaxy/workflows_rename_output.md against the `faq_server.sh main` Galaxy, from a gxui session started
# with `gxui start --headless`.
set -e
N=wf-ren-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui workflow-new "FAQ rename"
gxui workflow-add-input --label reads
gxui workflow-add-tool cat1
gxui workflow-connect 0#output 1#input1
gxui note "steps 1-3: click the tool step, Configure Output, Rename dataset"
gxui workflow-output 1 out_file1 --rename "my meaningful name"
gxui workflow-save
