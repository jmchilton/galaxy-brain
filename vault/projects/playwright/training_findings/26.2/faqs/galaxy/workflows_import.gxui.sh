#!/bin/sh
# Replay of faqs/galaxy/workflows_import.md against the `faq_server.sh main` Galaxy, from a gxui session started
# with `gxui start --headless`.
set -e
N=wf-imp-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui note "steps 1-2: Workflows > Import"
gxui note "steps 3-4 (26.2: Fetch URL card, then Import)"
gxui workflow-import --url https://raw.githubusercontent.com/galaxyproject/galaxy/release_19.09/test/base/data/test_workflow_1.ga
