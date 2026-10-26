#!/bin/sh
# Replay of faqs/galaxy/workflows_parameter_set_runtime.md against the `faq_server.sh main` Galaxy, from a gxui session started
# with `gxui start --headless`.
set -e
N=wf-rt-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui workflow-new "FAQ runtime"
gxui workflow-add-tool Cut1
gxui note "steps 1-4: open the tool's step, click the caret by Cut columns: set at runtime"
gxui workflow-param-runtime 0 columnList
gxui workflow-save
