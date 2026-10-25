#!/bin/sh
# Replay of faqs/galaxy/tools_rerun.md against the `faq_server.sh main` Galaxy, from `gxui start --headless`.
set -e
N=rerun-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui upload-paste "a b c" --name in.txt
gxui history-wait 1
gxui tool-open cat1
gxui tool-fill '{"input1": 1}'
gxui tool-run
gxui history-wait 2
gxui note "Step 1-2: expand the output and click 'Run Job Again'; the form opens with the job's parameters"
gxui dataset-rerun 2
gxui tool-describe
