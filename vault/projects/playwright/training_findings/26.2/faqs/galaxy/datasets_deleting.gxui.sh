#!/bin/sh
# Replay of faqs/galaxy/datasets_deleting.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=del-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "deleting faq"
for i in 1 2 3 4; do gxui upload-paste "line $i" --ext txt --name "d$i.txt"; done
gxui note "individually: the item's trash (Delete) button"
gxui dataset-delete 1
gxui note "bulk: Select Items, tick 2 and 3, Selection menu > Delete, confirm"
gxui history-delete 2 3
gxui note "permanently: Select Items, tick 4, Selection menu > Delete (permanently), confirm Purge"
gxui history-delete 4 --purge
gxui history-items --deleted
gxui note "not in the FAQ: Include deleted (trash counter) > the item's Undelete"
gxui dataset-undelete 1
gxui history-items --deleted
