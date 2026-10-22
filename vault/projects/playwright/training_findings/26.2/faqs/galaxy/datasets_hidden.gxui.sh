#!/bin/sh
# Replay of faqs/galaxy/datasets_hidden.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=hide-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "hidden faq"
for i in 1 2 3; do gxui upload-paste "line $i" --ext txt --name "d$i.txt"; done
gxui note "Select Items, tick 1 and 2, Selection menu (n of N selected) > Hide, confirm Hide"
gxui history-hide 1 2
gxui history-items
gxui note "not in the FAQ: Include hidden (eye-slash counter), select, Unhide"
gxui history-hide 1 --unhide
gxui history-items
