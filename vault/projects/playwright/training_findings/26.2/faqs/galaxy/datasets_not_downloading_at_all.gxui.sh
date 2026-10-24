#!/bin/sh
# Replay of faqs/galaxy/datasets_not_downloading_at_all.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`.
set -e
N=nodl-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "download faq"
gxui upload-paste "a b" --ext txt --name a.txt
gxui note "Step 2: the username menu > Preferences > Manage Galaxy API Key; notes: Set Dataset Permissions for New Histories, Make All Data Private"
gxui preferences
gxui note "Step 3: pencil > Edit Dataset Attributes > Permissions (a new 26.2 user's data is private)"
gxui dataset-permissions 1
gxui note "Notes: Set Dataset Permissions for New Histories is the Make new datasets private switch"
gxui preferences-new-datasets-private --off
gxui preferences-new-datasets-private
