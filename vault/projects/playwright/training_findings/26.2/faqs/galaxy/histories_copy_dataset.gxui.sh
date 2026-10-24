#!/bin/sh
# Replay of faqs/galaxy/histories_copy_dataset.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=cpy-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "copy src"
gxui upload-paste "x	1" --ext tabular --name src.tab
gxui history-wait
gxui note "Method 1: History options (not the gear) > Copy Datasets > select > new history name > Copy Selected Items"
gxui history-copy-datasets 1 --new-history "copy dest"
gxui note "Method 2: History options > Show Histories Side-by-Side, drag the dataset into the target history"
gxui dataset-copy 1 --target "copy dest"
gxui note "Method 3: Activity Bar > Datasets (not User > Datasets); the copy is now listed under both histories"
gxui datasets-list --search src
