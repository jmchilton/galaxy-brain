#!/bin/sh
# Replay of faqs/galaxy/workflows_report_view.md against the `faq_server.sh main` Galaxy, from a gxui session started
# with `gxui start --headless`.
set -e
N=wf-rep-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui workflow-new "FAQ report"
gxui workflow-add-input --label reads
gxui workflow-add-tool cat1
gxui workflow-connect 0#output 1#input1
gxui workflow-save
gxui upload-paste "a" --ext txt --name a
gxui history-wait 1
gxui workflow-run "FAQ report" --inputs '{"reads": 1}' --wait
gxui note "26.2: Workflow Invocations in the activity bar, click the invocation, Report tab"
gxui invocation-report
