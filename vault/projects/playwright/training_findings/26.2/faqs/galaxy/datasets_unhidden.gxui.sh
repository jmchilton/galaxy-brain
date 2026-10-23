#!/bin/sh
# Replay of faqs/galaxy/datasets_unhidden.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=unhide-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "unhide faq"
for i in 1 2 3; do gxui upload-paste "line $i" --ext txt --name "d$i.txt"; done
gxui history-hide 1 2
gxui note "Type visible:hidden in the search box: the eye-slash counter (Include hidden) lights up and only hidden items show"
gxui history-filter visible:hidden
gxui note "Select Items, tick 1, Selection menu (n of N selected) > Unhide, confirm"
gxui history-hide 1 --unhide
gxui note "Alternative: eye-slash counter (Include hidden) > the item's Unhide (eye-slash) icon"
gxui dataset-unhide 2
gxui history-items
