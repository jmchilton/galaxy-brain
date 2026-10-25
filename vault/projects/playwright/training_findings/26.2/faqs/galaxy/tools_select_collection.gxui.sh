#!/bin/sh
# Replay of faqs/galaxy/tools_select_collection.md against the `faq_server.sh main` Galaxy, from `gxui start --headless`.
set -e
N=selcoll-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui upload-paste "a" --name a.txt
gxui upload-paste "b" --name b.txt
gxui history-wait 2
gxui collection-build list 1,2 --name ab
gxui history-wait 5
gxui tool-open cat1
gxui note "Step 1: click 'Dataset collection' in front of the input; Step 2: pick the collection"
gxui tool-fill '{"input1": 5}'
gxui tool-run
gxui history-wait 6
gxui history-items
