#!/bin/sh
# Replay of faqs/galaxy/workflows_extract_from_history.md against the `faq_server.sh main` Galaxy, from a gxui session started
# with `gxui start --headless`.
set -e
N=wf-ext-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "extract faq"
gxui upload-paste "a" --ext txt --name a
gxui tool-open cat1
gxui tool-fill '{"input1": 1}'
gxui tool-run
gxui history-wait 2
gxui note "step 2: History options > Extract Workflow"
gxui note "steps 3-6: name it, rename the input (pencil on its card), keep both steps, Create Workflow"
gxui workflow-extract "FAQ extracted" --input-names "My input"
gxui workflow-edit "FAQ extracted"
