#!/bin/sh
# Replay of faqs/galaxy/datasets_working_with_deleted_datasets.md against the `faq_server.sh main`
# Galaxy, from `gxui start --headless`.
set -e
N=deleted-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "deleted datasets faq"
for i in 1 2 3; do gxui upload-paste "line $i" --ext txt --name "d$i.txt"; done
gxui history-delete 1 2 3
gxui note "Show deleted: the trash counter at the top of the history (Include deleted), not a link"
gxui note "One dataset: expanding shows no deleted message; its Undelete icon restores it"
gxui dataset-undelete 1
gxui note "Purge one: Select Items, tick, Selection menu (n of N selected) > Delete (permanently)"
gxui history-delete 3 --purge
gxui note "Many: Select Items, tick, Selection menu > Undelete, confirm Restore"
gxui history-undelete 2
gxui history-items --deleted
