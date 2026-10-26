#!/bin/sh
# Replay of faqs/galaxy/workflows_publish.md against the `faq_server.sh main` Galaxy, from a gxui session started
# with `gxui start --headless`.
set -e
N=wf-pub-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui workflow-new "FAQ publish"
gxui note "steps 1-4: Workflows > Share on the card; Make Workflow accessible, then publicly available"
gxui workflow-publish "FAQ publish"
gxui call navigate_to_published_workflows
