#!/bin/sh
# Replay of faqs/galaxy/workflows_run_trs.md against the `faq_server.sh main` Galaxy, from a gxui session started
# with `gxui start --headless`. Needs training.galaxyproject.org and the trs_url auto-import fix.
set -e
N=wf-gtn-$$
GTN=https://training.galaxyproject.org/training-material
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui note "launch button (path given): /workflows/trs_import?run_form=true&trs_url=<GTN TRS URL>; GTN serves data-qc, its button links data_qc (404)"
gxui workflow-import --launch --trs-url "$GTN/api/ga4gh/trs/v2/tools/assembly-largegenome/versions/galaxy-workflow-data-qc"
gxui url
gxui note "If this does not work: workflows_import with the .ga URL (Import > Fetch URL)"
gxui workflow-import --url "$GTN/topics/assembly/tutorials/largegenome/workflows/Galaxy-Workflow-Data_QC.ga"
