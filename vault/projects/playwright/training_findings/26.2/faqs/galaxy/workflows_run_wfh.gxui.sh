#!/bin/sh
# Replay of faqs/galaxy/workflows_run_wfh.md against the `faq_server.sh main` Galaxy (WorkflowHub configured), from a
# gxui session started with `gxui start --headless`. Needs workflowhub.eu and the trs_version fix.
set -e
N=wf-wfh-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui note "launch button (wfhub_id + version): /workflows/trs_import?trs_server=workflowhub.eu&run_form=true&trs_id=1352&trs_version=4"
gxui workflow-import --launch --trs-server workflowhub.eu --trs-id 1352 --version 4
gxui url
gxui note "no wfhub_id: Workflows > Import > Import from repository > TRS ID; TRS Server WorkflowHub; id; version (shown as v0.9)"
gxui workflow-import --trs-server workflowhub.eu --trs-id 1352 --version v0.9
gxui logout
gxui register "$N-s@example.org" --password faqpass123 --username "$N-s"
gxui note "If this does not work (workflows_import_search): search WorkflowHub for name:\"mags-building/main\""
gxui workflow-import --trs-server workflowhub.eu --trs-search 'name:"mags-building/main"' --pick "mags-building/main"
