#!/bin/sh
# Replay of faqs/galaxy/workflows_share.md against the `faq_server.sh main` Galaxy, from a gxui session started
# with `gxui start --headless`.
set -e
A=wf-sha-$$
B=wf-shb-$$
W="FAQ share $$"
gxui register "$B@example.org" --password faqpass123 --username "$B"
gxui logout
gxui register "$A@example.org" --password faqpass123 --username "$A"
gxui workflow-new "$W"
gxui note "1-4: Workflows > Share on the card > Share Workflow with Individual Users; email; Save (missing from the FAQ)"
gxui workflow-share "$W" "$B@example.org"
gxui logout
gxui login "$B@example.org" --password faqpass123
gxui note "5: the other user finds it under Workflows shared with me"
gxui workflow-preview "$W" --tab shared
