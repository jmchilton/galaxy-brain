#!/bin/sh
# Replay of faqs/galaxy/workflows_run.md against the `faq_server.sh main` Galaxy, from a gxui session started
# with `gxui start --headless`. One user publishes a workflow; another runs it from Public workflows.
set -e
A=wf-runa-$$
B=wf-runb-$$
W="FAQ run $$"
gxui register "$B@example.org" --password faqpass123 --username "$B"
gxui logout
gxui register "$A@example.org" --password faqpass123 --username "$A"
gxui workflow-new "$W"
gxui workflow-add-input data_input --label "input text"
gxui workflow-add-tool cat1
gxui workflow-connect "input text#output" "1#input1"
gxui workflow-save
gxui workflow-publish "$W"
gxui logout
gxui login "$B@example.org" --password faqpass123
gxui upload-paste "hello faq" --ext txt --name hello.txt
gxui note "1-6: Workflows > Public workflows tab; search; click the name for the preview; Run (top right; Import is left of it)"
gxui workflow-preview "$W" --tab public --run
gxui note "9: Import this workflow is the upload icon at the top of the run form"
gxui workflow-run-import
gxui note "7-8, 10: Workflow Run Settings (gear) > Send results to a new history; set the input; Run Workflow"
gxui workflow-run --inputs '{"input text": 1}' --new-history "FAQ run results" --wait
gxui note "11: the invocation page; History: FAQ run results (not current) at the top left"
gxui url
