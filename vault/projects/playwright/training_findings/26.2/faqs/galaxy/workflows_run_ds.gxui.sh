#!/bin/sh
# Replay of faqs/galaxy/workflows_run_ds.md against the `faq_server.sh main` Galaxy, from a gxui session started
# with `gxui start --headless`. Needs Dockstore and the trs_version fix.
set -e
N=wf-ds-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui note "launch button (dockstore_id + version): /workflows/trs_import?...&trs_version=v0.1.3&run_form=true"
gxui workflow-import --launch --trs-id "#workflow/github.com/iwc-workflows/kmer-profiling-hifi-VGP1/main" --version v0.1.3
gxui url
gxui note "no dockstore_id: Workflows > Import > Import from repository > TRS ID, version, Import"
gxui workflow-import --trs-id "#workflow/github.com/jmchilton/galaxy-workflow-dockstore-example-1/mycoolworkflow"
