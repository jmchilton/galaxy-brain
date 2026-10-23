#!/bin/sh
# Replay of faqs/galaxy/datasets_undelete.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=undelete-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "undelete faq"
for i in 1 2 3; do gxui upload-paste "line $i" --ext txt --name "d$i.txt"; done
gxui history-delete 1 2
gxui note "Type deleted:true in the search box: the trash counter (Include deleted) lights up and only deleted items show"
gxui history-filter deleted:true
gxui note "Select Items, tick 1, Selection menu (n of N selected) > Undelete, confirm Restore"
gxui history-undelete 1
gxui note "Alternative: trash counter (Include deleted) > the item's Undelete icon"
gxui dataset-undelete 2
gxui history-items --deleted
