#!/bin/sh
# Replay of faqs/galaxy/tools_select_multiple_datasets.md against the `faq_server.sh main` Galaxy, from `gxui start --headless`.
set -e
N=selmulti-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui upload-paste "a" --name a.txt
gxui upload-paste "b" --name b.txt
gxui history-wait 2
gxui tool-open cat1
gxui note "Step 1: click 'Multiple datasets'; Step 2: click each dataset in the list (no Ctrl needed)"
gxui tool-fill '{"input1": [1, 2]}'
gxui tool-run
gxui history-wait 4
gxui history-items
