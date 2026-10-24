#!/bin/sh
# Replay of faqs/galaxy/datasets_multiple.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=multi-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "multiple faq"
for i in 1 2 3 4; do gxui upload-paste "line $i" --ext txt --name "d$i.txt"; done
gxui note "Select Items (checkbox under the history size), tick 1 and 2, 2 of 4 selected > Hide"
gxui history-hide 1 2
gxui note "tick 3 > Delete"
gxui history-delete 3
gxui note "tick 4 > Delete (permanently)"
gxui history-delete 4 --purge
gxui history-items --deleted
