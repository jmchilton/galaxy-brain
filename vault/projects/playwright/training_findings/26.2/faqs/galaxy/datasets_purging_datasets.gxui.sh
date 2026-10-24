#!/bin/sh
# Replay of faqs/galaxy/datasets_purging_datasets.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=purge-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "purge faq"
for i in 1 2 3; do gxui upload-paste "line $i" --ext txt --name "d$i.txt"; done
gxui note "Step 1: User > Datasets is the Activity Bar's Datasets"
gxui datasets-list
gxui note "Notes: delete with the item's trash icon (the old far right X)"
gxui dataset-delete 1
gxui dataset-delete 2
gxui note "Step 2: Select Items > Delete (permanently)"
gxui history-delete 3 --purge
gxui history-items --deleted
gxui note "Step 2: no History menu Purge Deleted Datasets; masthead usage meter > Storage Dashboard > Free up disk space > Deleted datasets"
gxui datasets-purge-deleted
gxui history-items --deleted
