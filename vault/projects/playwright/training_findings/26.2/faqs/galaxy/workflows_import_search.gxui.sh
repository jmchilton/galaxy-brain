#!/bin/sh
# Replay of faqs/galaxy/workflows_import_search.md against the `faq_server.sh main` Galaxy, from a gxui session started
# with `gxui start --headless`. Needs Dockstore.
set -e
N=wf-trss-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui note "steps 1-2: Workflows > Import"
gxui note "step 3 (26.2: Import from repository > Search workflow registries), the sars-cov-2 tutorial's query"
gxui note "steps 3.3-3.4: click the workflow, pick a version, Import"
gxui workflow-import --trs-search 'organization:"iwc" name:"sars-cov-2"' --pick COVID-19-VARIATION-REPORTING
