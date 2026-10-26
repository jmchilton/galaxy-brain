#!/bin/sh
# Replay of faqs/galaxy/workflows_get_id.md against the `faq_server.sh main` Galaxy, from a gxui session started
# with `gxui start --headless`.
set -e
N=wf-id-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui workflow-new "FAQ get id"
gxui note "steps 1-2: Workflows > Edit (or Share) on the card"
gxui workflow-edit "FAQ get id"
gxui note "step 3: the id is after ?id= (26.2: /workflows/edit?id=...)"
gxui url
