#!/bin/sh
# Replay of faqs/galaxy/workflows_get_invocation_id.md against the `faq_server.sh main` Galaxy, from a gxui session started
# with `gxui start --headless`.
set -e
N=wf-inv-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui workflow-new "FAQ invocation"
gxui workflow-add-input --label reads
gxui workflow-add-tool cat1
gxui workflow-connect 0#output 1#input1
gxui workflow-save
gxui upload-paste "a" --ext txt --name a
gxui history-wait 1
gxui workflow-run "FAQ invocation" --inputs '{"reads": 1}' --wait
gxui note "Workflow Invocations in the activity bar, open the newest; the id ends its URL"
gxui invocation-report
